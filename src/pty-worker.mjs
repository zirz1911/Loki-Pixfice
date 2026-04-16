#!/usr/bin/env node
/**
 * pty-worker.mjs — runs in Node.js (not Bun) because node-pty requires
 * a stable event loop that Bun does not currently provide for native addons.
 *
 * Protocol (newline-delimited JSON over stdio):
 *   stdin  → { type: "attach", target, ptySessionName, cols, rows }
 *            { type: "key",    data: "<base64>" }
 *            { type: "resize", cols, rows }
 *            { type: "detach" }
 *   stdout ← { type: "data",     data: "<base64>" }
 *            { type: "attached", target, session }
 *            { type: "exit" }
 *            { type: "error",    error: "<msg>" }
 */
import { createRequire } from "module";
import { createInterface } from "readline";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

// Load node-pty from the project's node_modules
const require = createRequire(join(__dir, "..", "package.json"));
let nodePty;
try {
  nodePty = require("node-pty");
} catch (e) {
  send({ type: "error", error: "node-pty not found: " + e.message });
  process.exit(1);
}

let proc = null;
let ptySessionName = null;
let firstDataSent = false;
let attachTarget = null;

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function cleanup() {
  if (proc) {
    try { proc.kill(); } catch {}
    proc = null;
  }
  if (ptySessionName) {
    try { execSync(`tmux kill-session -t '${ptySessionName}' 2>/dev/null || true`); } catch {}
    ptySessionName = null;
  }
}

async function runCmd(cmd) {
  return new Promise((resolve, reject) => {
    try {
      const out = execSync(cmd, { encoding: "utf-8" }).trim();
      resolve(out);
    } catch (e) {
      reject(new Error(e.stderr?.toString()?.trim() || e.message));
    }
  });
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", async (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }

  if (msg.type === "attach") {
    const { target, ptySessionName: sName, cols = 220, rows = 50 } = msg;
    attachTarget = target;
    ptySessionName = sName;
    firstDataSent = false;

    try {
      const colonIdx = target.indexOf(":");
      const sourceSession = colonIdx >= 0 ? target.slice(0, colonIdx) : target;
      const windowRef = colonIdx >= 0 ? target.slice(colonIdx + 1) : "0";

      // Resolve window name → index if needed
      let windowIndex = windowRef;
      if (!/^\d+$/.test(windowRef)) {
        try {
          const idx = await runCmd(
            `tmux list-windows -t '${sourceSession}' -F '#{window_index}:#{window_name}' | grep -F ':${windowRef}' | head -1 | cut -d: -f1`
          );
          if (idx) windowIndex = idx;
        } catch { /* use windowRef as-is */ }
      }

      // Create grouped session
      await runCmd(`tmux new-session -d -s '${ptySessionName}' -t '${sourceSession}' 2>/dev/null || true`);
      await runCmd(`tmux select-window -t '${ptySessionName}:${windowIndex}' 2>/dev/null || true`);

      // Disable visual chrome on the viewer session before attaching.
      // status off     — hides the tab/status bar
      // set-titles off — stops tmux sending \ek...\e\\ title escape sequences
      //                  (xterm.js doesn't handle ESC-k, renders as visible text)
      await runCmd(`tmux set-option -t '${ptySessionName}' status off 2>/dev/null || true`);
      await runCmd(`tmux set-option -t '${ptySessionName}' set-titles off 2>/dev/null || true`);

      // Spawn tmux directly — no sh wrapper, avoids shell init sequences in PTY stream
      proc = nodePty.spawn("tmux", ["attach-session", "-t", ptySessionName], {
        name: "xterm-256color",
        cols,
        rows,
        env: { ...process.env, TERM: "xterm-256color" },
      });

      proc.on("data", (chunk) => {
        if (!firstDataSent) {
          firstDataSent = true;
          send({ type: "attached", target: attachTarget, session: ptySessionName });
        }
        send({ type: "data", data: Buffer.from(chunk, "binary").toString("base64") });
      });

      proc.on("exit", () => {
        send({ type: "exit" });
        cleanup();
        process.exit(0);
      });

    } catch (e) {
      send({ type: "error", error: e.message });
      cleanup();
      process.exit(1);
    }

  } else if (msg.type === "key") {
    if (!proc) return;
    try {
      // Use utf-8 not binary — binary (Latin-1) breaks multi-byte chars (Thai, CJK)
      const str = Buffer.from(msg.data, "base64").toString("utf-8");
      proc.write(str);
    } catch {}

  } else if (msg.type === "resize") {
    if (!proc) return;
    const { cols, rows } = msg;
    if (cols > 0 && rows > 0) {
      try { proc.resize(cols, rows); } catch {}
    }

  } else if (msg.type === "detach") {
    cleanup();
    process.exit(0);
  }
});

rl.on("close", () => {
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => { cleanup(); process.exit(0); });
process.on("SIGINT",  () => { cleanup(); process.exit(0); });
