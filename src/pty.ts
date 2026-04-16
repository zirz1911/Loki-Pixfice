/**
 * PTY module — spawns pty-worker.mjs (Node.js) per connection.
 *
 * Root cause of the original approach: node-pty's native bindings require a
 * stable Node.js event loop. Bun's event loop causes the PTY process to exit
 * immediately. Fix: spawn pty-worker.mjs via `node`, communicate over stdio
 * with newline-delimited JSON.
 *
 * Protocol (pty-worker.mjs):
 *   stdin  → { type: "attach"|"key"|"resize"|"detach", ... }
 *   stdout ← { type: "data"|"attached"|"exit"|"error", ... }
 */

import type { ServerWebSocket } from "bun";
import { loadConfig } from "./config";

const _cfg = loadConfig();
const MAW_HOST = process.env.MAW_HOST || _cfg.host;
const IS_LOCAL = MAW_HOST === "local" || MAW_HOST === "localhost";

const WORKER_PATH = new URL("./pty-worker.mjs", import.meta.url).pathname;
const NODE_BIN = process.env.NODE_BIN || "node";

let nextPtyId = 0;
function newPtySessionName() {
  return `loki-pty-${Date.now()}-${++nextPtyId}`;
}

// ── Per-WebSocket PTY worker process ─────────────────────────────────────────

interface PtyWorker {
  proc: ReturnType<typeof Bun.spawn>;
  ptySessionName: string;
  target: string;
}

const workers = new Map<ServerWebSocket<any>, PtyWorker>();

function spawnWorker(
  ws: ServerWebSocket<any>,
  target: string,
  cols: number,
  rows: number,
): void {
  const ptySessionName = newPtySessionName();

  const proc = Bun.spawn([NODE_BIN, WORKER_PATH], {
    stdin:  "pipe",
    stdout: "pipe",
    stderr: "ignore",
    env:    process.env as Record<string, string>,
  });

  const worker: PtyWorker = { proc, ptySessionName, target };
  workers.set(ws, worker);

  // Send attach command
  sendToWorker(proc, { type: "attach", target, ptySessionName, cols, rows });

  // Read stdout line by line
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  async function readLoop() {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop()!; // keep incomplete line
        for (const line of lines) {
          if (!line.trim()) continue;
          handleWorkerMessage(ws, line);
        }
      }
      // Worker exited — send pty-exit if still connected
      if (workers.get(ws) === worker) {
        workers.delete(ws);
        try { ws.send(JSON.stringify({ type: "pty-exit" })); } catch {}
      }
    } catch {
      // ws closed or worker killed
    }
  }

  readLoop();
}

function sendToWorker(proc: ReturnType<typeof Bun.spawn>, msg: object) {
  try {
    const line = JSON.stringify(msg) + "\n";
    proc.stdin.write(line);
    proc.stdin.flush?.();
  } catch {}
}

function handleWorkerMessage(ws: ServerWebSocket<any>, line: string) {
  let msg: any;
  try { msg = JSON.parse(line); } catch { return; }

  if (msg.type === "data") {
    // Binary PTY data — decode base64 → Buffer → send as binary frame
    try {
      const buf = Buffer.from(msg.data, "base64");
      ws.send(buf);
    } catch {}
  } else if (msg.type === "attached") {
    try { ws.send(JSON.stringify({ type: "pty-attached", target: msg.target, session: msg.session })); } catch {}
  } else if (msg.type === "exit") {
    if (workers.get(ws)) {
      workers.delete(ws);
      try { ws.send(JSON.stringify({ type: "pty-exit" })); } catch {}
    }
  } else if (msg.type === "error") {
    try { ws.send(JSON.stringify({ type: "pty-error", error: msg.error })); } catch {}
  }
}

// ── WebSocket handlers ────────────────────────────────────────────────────────

export async function handlePtyMessage(ws: ServerWebSocket<any>, msg: string | Buffer) {
  let data: any;
  try { data = JSON.parse(msg as string); } catch { return; }

  if (data.type === "pty-attach") {
    detachWorker(ws);

    if (!IS_LOCAL) {
      ws.send(JSON.stringify({ type: "pty-error", error: "Remote PTY not supported — use IS_LOCAL=true" }));
      return;
    }

    const { target, cols = 220, rows = 50 } = data;
    if (!target) {
      ws.send(JSON.stringify({ type: "pty-error", error: "target required" }));
      return;
    }

    spawnWorker(ws, target, cols, rows);

  } else if (data.type === "pty-key") {
    const worker = workers.get(ws);
    if (!worker) return;
    sendToWorker(worker.proc, { type: "key", data: data.data });

  } else if (data.type === "pty-resize") {
    const worker = workers.get(ws);
    if (!worker) return;
    const { cols, rows } = data;
    if (cols > 0 && rows > 0) {
      sendToWorker(worker.proc, { type: "resize", cols, rows });
    }

  } else if (data.type === "pty-detach") {
    detachWorker(ws);

  } else if (data.type === "capture-subscribe") {
    const { target } = data;
    if (!target) return;
    detachWorker(ws);
    startCaptureLoop(ws, target);

  } else if (data.type === "capture-unsubscribe") {
    stopCaptureLoop(ws);

  } else if (data.type === "tmux-send") {
    // Send literal bytes to pane — works for text, Thai, control chars, arrows.
    // -l flag bypasses tmux key-name interpretation.
    const { target, text } = data;
    if (!target || text === undefined) return;
    try {
      Bun.spawnSync(
        ["tmux", "send-keys", "-t", target, "-l", text],
        { env: process.env as Record<string, string>, stdin: null, stdout: null, stderr: null },
      );
    } catch {}
  }
}

export async function handlePtyClose(ws: ServerWebSocket<any>) {
  detachWorker(ws);
  stopCaptureLoop(ws);
}

// ── Capture-pane subscription ─────────────────────────────────────────────────
// Uses `tmux capture-pane -p -e` instead of PTY attach.
// Output is clean ANSI text — no raw VT100 cursor sequences, no status bar.

const captures = new Map<ServerWebSocket<any>, { target: string; timer: ReturnType<typeof setInterval> }>();

function startCaptureLoop(ws: ServerWebSocket<any>, target: string) {
  stopCaptureLoop(ws);

  function doCapture() {
    try {
      const proc = Bun.spawnSync(
        ["tmux", "capture-pane", "-p", "-e", "-t", target],
        { env: process.env as Record<string, string> },
      );
      if (proc.exitCode !== 0) return;
      const content = new TextDecoder().decode(proc.stdout);
      try { ws.send(JSON.stringify({ type: "capture", content })); } catch {}
    } catch {}
  }

  doCapture(); // immediate first frame
  const timer = setInterval(doCapture, 250);
  captures.set(ws, { target, timer });
}

function stopCaptureLoop(ws: ServerWebSocket<any>) {
  const state = captures.get(ws);
  if (!state) return;
  clearInterval(state.timer);
  captures.delete(ws);
}

function detachWorker(ws: ServerWebSocket<any>) {
  const worker = workers.get(ws);
  if (!worker) return;
  workers.delete(ws);
  sendToWorker(worker.proc, { type: "detach" });
  // Give worker 500ms to clean up, then kill
  setTimeout(() => {
    try { worker.proc.kill(); } catch {}
  }, 500);
}
