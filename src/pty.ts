/**
 * PTY module — attach to tmux panes as real pseudo-terminals via Bun.spawn.
 *
 * Design decisions:
 * - Unique session IDs using Date.now() + monotonic counter to prevent collisions
 *   when multiple browser tabs attach to the same tmux target simultaneously.
 * - "attached" is sent to the WebSocket client only AFTER the first PTY data
 *   arrives (not immediately on attach). This prevents xterm.js black-screen on
 *   slow panes — the UI only renders after it has real content.
 * - Uses tmux grouped sessions so we can attach to an existing window without
 *   stealing focus from the real terminal.
 */

import type { ServerWebSocket } from "bun";
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
  proc: ReturnType<typeof Bun.spawn>;
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
 * Create a tmux grouped session that mirrors the target pane, then spawn
 * `tmux attach-session` against it so we get a live PTY stream.
 *
 * A grouped session shares the same window group as the original session,
 * meaning we can attach without stealing the keyboard from the primary pane.
 */
async function spawnPty(target: string, ptySessionName: string): Promise<ReturnType<typeof Bun.spawn>> {
  // target may be "session:window" or "session:index"
  const colonIdx = target.indexOf(":");
  const sourceSession = colonIdx >= 0 ? target.slice(0, colonIdx) : target;
  const windowRef = colonIdx >= 0 ? target.slice(colonIdx + 1) : "0";

  // Get the window index from name or use directly
  let windowIndex = windowRef;
  if (!/^\d+$/.test(windowRef)) {
    try {
      const idx = await runLocal(
        `tmux list-windows -t '${sourceSession}' -F '#{window_index}:#{window_name}' | grep -F ':${windowRef}' | head -1 | cut -d: -f1`
      );
      if (idx) windowIndex = idx;
    } catch { /* use windowRef as-is */ }
  }

  // Create grouped session pointing at the source session
  await runLocal(
    `tmux new-session -d -s '${ptySessionName}' -t '${sourceSession}' 2>/dev/null || true`
  );

  // Select the correct window in the grouped session
  await runLocal(
    `tmux select-window -t '${ptySessionName}:${windowIndex}' 2>/dev/null || true`
  );

  // Attach and stream output via `tmux attach-session`
  // -r = read-only prevents accidental keystrokes corrupting the real pane
  // but we also want to send keys, so we use a writable attach.
  // We use `script` on Linux to allocate a real PTY that xterm can render.
  const attachCmd = IS_LOCAL
    ? `tmux attach-session -t '${ptySessionName}'`
    : `ssh -t '${MAW_HOST}' "tmux attach-session -t '${ptySessionName}'"`;

  const proc = Bun.spawn(["bash", "-c", `script -q -c "${attachCmd}" /dev/null`], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, TERM: "xterm-256color" },
  });

  return proc;
}

// ── WebSocket handlers ────────────────────────────────────────────────────────

export async function handlePtyMessage(ws: ServerWebSocket<any>, msg: string | Buffer) {
  let data: any;
  try { data = JSON.parse(msg as string); } catch { return; }

  if (data.type === "pty-attach") {
    // Detach any existing PTY session for this ws first
    await detachPty(ws);

    const { target } = data;
    if (!target) { ws.send(JSON.stringify({ type: "pty-error", error: "target required" })); return; }

    const ptySessionName = newPtySessionName();

    let proc: ReturnType<typeof Bun.spawn>;
    try {
      proc = await spawnPty(target, ptySessionName);
    } catch (e: any) {
      ws.send(JSON.stringify({ type: "pty-error", error: e.message }));
      return;
    }

    const session: PtySession = { ptySessionName, proc, ws, target, firstDataSent: false };
    ptySessions.set(ws, session);

    // Stream stdout → ws (binary frames for xterm.js)
    (async () => {
      const reader = proc.stdout.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value && value.length > 0) {
            // Send "attached" on first real data — prevents xterm black screen
            if (!session.firstDataSent) {
              session.firstDataSent = true;
              ws.send(JSON.stringify({ type: "pty-attached", target, session: ptySessionName }));
            }
            ws.send(value);
          }
        }
      } catch { /* ws closed */ } finally {
        // Clean up when process exits
        if (ptySessions.get(ws) === session) {
          ptySessions.delete(ws);
          ws.send(JSON.stringify({ type: "pty-exit" }));
          cleanupPtySession(ptySessionName);
        }
      }
    })();

  } else if (data.type === "pty-key") {
    // Forward raw key bytes to the PTY stdin
    const session = ptySessions.get(ws);
    if (!session) return;
    const bytes = data.data; // base64 string or array
    try {
      let buf: Uint8Array;
      if (typeof bytes === "string") {
        buf = Buffer.from(bytes, "base64");
      } else {
        buf = new Uint8Array(bytes);
      }
      session.proc.stdin!.write(buf);
    } catch { /* ignore write errors */ }

  } else if (data.type === "pty-resize") {
    // Resize the tmux pane
    const session = ptySessions.get(ws);
    if (!session) return;
    const { cols, rows } = data;
    if (cols > 0 && rows > 0) {
      try {
        await runLocal(
          `tmux resize-window -t '${session.ptySessionName}' -x ${cols} -y ${rows} 2>/dev/null || true`
        );
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
  // Kill the grouped session we created (non-fatal)
  runLocal(`tmux kill-session -t '${name}' 2>/dev/null || true`).catch(() => {});
}
