/**
 * PTY module — attach to tmux panes via node-pty (real PTY allocation).
 *
 * Design decisions:
 * - node-pty replaces the previous `script -q -c "tmux attach-session"` hack.
 *   PTY is now allocated directly by node-pty, with proper kernel-level resize.
 * - Grouped tmux sessions are still used so we can attach without stealing
 *   keyboard focus from the primary terminal window.
 * - "pty-attached" is sent to the client only AFTER the first PTY data arrives,
 *   preventing xterm.js black-screen on slow panes.
 * - Input is received as base64 JSON and written directly via pty.write().
 * - Resize uses pty.resize(cols, rows) — no tmux resize-window needed.
 */

import type { ServerWebSocket } from "bun";
import * as nodePty from "node-pty";
import { loadConfig } from "./config";

const _cfg = loadConfig();
const MAW_HOST = process.env.MAW_HOST || _cfg.host;
const IS_LOCAL = MAW_HOST === "local" || MAW_HOST === "localhost";

// ── Session ID counter ────────────────────────────────────────────────────────

let nextPtyId = 0;

function newPtySessionName(): string {
  return `loki-pty-${Date.now()}-${++nextPtyId}`;
}

// ── Active PTY sessions ───────────────────────────────────────────────────────

interface PtySession {
  ptySessionName: string;
  proc: nodePty.IPty;
  ws: ServerWebSocket<any>;
  target: string;
  firstDataSent: boolean;
}

const ptySessions = new Map<ServerWebSocket<any>, PtySession>();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function runLocal(cmd: string): Promise<string> {
  const proc = Bun.spawn(["bash", "-c", cmd], { stdout: "pipe", stderr: "pipe" });
  const text = await new Response(proc.stdout).text();
  const code = await proc.exited;
  if (code !== 0) {
    const err = await new Response(proc.stderr).text();
    throw new Error(err.trim() || `exit ${code}`);
  }
  return text.trim();
}

/**
 * Create a tmux grouped session mirroring the target pane, then attach via
 * node-pty so we get a real PTY without stealing keyboard focus.
 */
async function spawnPty(
  target: string,
  ptySessionName: string,
  cols = 220,
  rows = 50,
): Promise<nodePty.IPty> {
  if (!IS_LOCAL) {
    throw new Error("Remote PTY via node-pty is not supported — use IS_LOCAL=true");
  }

  const colonIdx = target.indexOf(":");
  const sourceSession = colonIdx >= 0 ? target.slice(0, colonIdx) : target;
  const windowRef = colonIdx >= 0 ? target.slice(colonIdx + 1) : "0";

  // Resolve window name → index if needed
  let windowIndex = windowRef;
  if (!/^\d+$/.test(windowRef)) {
    try {
      const idx = await runLocal(
        `tmux list-windows -t '${sourceSession}' -F '#{window_index}:#{window_name}' | grep -F ':${windowRef}' | head -1 | cut -d: -f1`
      );
      if (idx) windowIndex = idx;
    } catch { /* use windowRef as-is */ }
  }

  // Create grouped session — shares the window group with sourceSession
  await runLocal(
    `tmux new-session -d -s '${ptySessionName}' -t '${sourceSession}' 2>/dev/null || true`
  );
  await runLocal(
    `tmux select-window -t '${ptySessionName}:${windowIndex}' 2>/dev/null || true`
  );

  // Spawn node-pty directly on tmux attach-session (no `script` wrapper needed)
  const proc = nodePty.spawn("tmux", ["attach-session", "-t", ptySessionName], {
    name: "xterm-256color",
    cols,
    rows,
    env: { ...process.env, TERM: "xterm-256color" } as Record<string, string>,
  });

  return proc;
}

// ── WebSocket handlers ────────────────────────────────────────────────────────

export async function handlePtyMessage(ws: ServerWebSocket<any>, msg: string | Buffer) {
  let data: any;
  try { data = JSON.parse(msg as string); } catch { return; }

  if (data.type === "pty-attach") {
    await detachPty(ws);

    const { target } = data;
    if (!target) {
      ws.send(JSON.stringify({ type: "pty-error", error: "target required" }));
      return;
    }

    const ptySessionName = newPtySessionName();

    let proc: nodePty.IPty;
    try {
      proc = await spawnPty(target, ptySessionName);
    } catch (e: any) {
      ws.send(JSON.stringify({ type: "pty-error", error: e.message }));
      return;
    }

    const session: PtySession = { ptySessionName, proc, ws, target, firstDataSent: false };
    ptySessions.set(ws, session);

    // Stream PTY output → WS as binary frames
    proc.on("data", (chunk: string) => {
      try {
        // Send "attached" on first real data — prevents xterm black screen
        if (!session.firstDataSent) {
          session.firstDataSent = true;
          ws.send(JSON.stringify({ type: "pty-attached", target, session: ptySessionName }));
        }
        // node-pty returns strings; encode as binary buffer for xterm.js
        ws.send(Buffer.from(chunk, "binary"));
      } catch { /* ws closed */ }
    });

    proc.on("exit", () => {
      if (ptySessions.get(ws) === session) {
        ptySessions.delete(ws);
        try { ws.send(JSON.stringify({ type: "pty-exit" })); } catch { /* closed */ }
        cleanupPtySession(ptySessionName);
      }
    });

  } else if (data.type === "pty-key") {
    const session = ptySessions.get(ws);
    if (!session) return;
    try {
      let str: string;
      if (typeof data.data === "string") {
        // base64 → binary string
        str = Buffer.from(data.data, "base64").toString("binary");
      } else {
        str = String.fromCharCode(...new Uint8Array(data.data));
      }
      session.proc.write(str);
    } catch { /* ignore write errors */ }

  } else if (data.type === "pty-resize") {
    const session = ptySessions.get(ws);
    if (!session) return;
    const { cols, rows } = data;
    if (cols > 0 && rows > 0) {
      try {
        session.proc.resize(cols, rows);
      } catch { /* non-fatal */ }
    }

  } else if (data.type === "pty-detach") {
    await detachPty(ws);
  }
}

export async function handlePtyClose(ws: ServerWebSocket<any>) {
  await detachPty(ws);
}

async function detachPty(ws: ServerWebSocket<any>) {
  const session = ptySessions.get(ws);
  if (!session) return;
  ptySessions.delete(ws);
  try { session.proc.kill(); } catch { /* already dead */ }
  cleanupPtySession(session.ptySessionName);
}

function cleanupPtySession(name: string) {
  runLocal(`tmux kill-session -t '${name}' 2>/dev/null || true`).catch(() => {});
}
