#!/usr/bin/env bun
process.env.MAW_CLI = "1";

import { listSessions, findWindow, capture, sendKeys, ssh } from "./ssh";
import { startServer } from "./server";

const args = process.argv.slice(2);
const cmd = args[0]?.toLowerCase();

// --- Commands ---

async function cmdList() {
  const sessions = await listSessions();
  for (const s of sessions) {
    console.log(`\x1b[36m${s.name}\x1b[0m`);
    for (const w of s.windows) {
      const dot = w.active ? "\x1b[32m*\x1b[0m" : " ";
      console.log(`  ${dot} ${w.index}: ${w.name}`);
    }
  }
}

async function cmdPeek(query?: string) {
  const sessions = await listSessions();
  if (!query) {
    // Peek all — one line per agent
    for (const s of sessions) {
      for (const w of s.windows) {
        const target = `${s.name}:${w.index}`;
        try {
          const content = await capture(target, 3);
          const lastLine = content.split("\n").filter(l => l.trim()).pop() || "(empty)";
          const dot = w.active ? "\x1b[32m*\x1b[0m" : " ";
          console.log(`${dot} \x1b[36m${w.name.padEnd(22)}\x1b[0m ${lastLine.slice(0, 80)}`);
        } catch {
          console.log(`  \x1b[36m${w.name.padEnd(22)}\x1b[0m (unreachable)`);
        }
      }
    }
    return;
  }
  const target = findWindow(sessions, query);
  if (!target) { console.error(`window not found: ${query}`); process.exit(1); }
  const content = await capture(target);
  console.log(`\x1b[36m--- ${target} ---\x1b[0m`);
  console.log(content);
}

async function cmdSend(query: string, message: string) {
  const sessions = await listSessions();
  const target = findWindow(sessions, query);
  if (!target) { console.error(`window not found: ${query}`); process.exit(1); }
  await sendKeys(target, message);
  console.log(`\x1b[32msent\x1b[0m → ${target}: ${message}`);
}

/**
 * done — kill a tmux window by exact name (case-insensitive).
 *
 * Fix: upstream bug where `maw done neo` would match `neo-mawjs` via substring.
 * We now compare lowercased window name === lowercased query exactly.
 */
async function cmdDone(query?: string) {
  if (!query) { console.error("usage: maw done <window-name>"); process.exit(1); }
  const sessions = await listSessions();
  const q = query.toLowerCase();
  for (const s of sessions) {
    for (const w of s.windows) {
      if (w.name.toLowerCase() === q) {
        const target = `${s.name}:${w.name}`;
        await ssh(`tmux kill-window -t '${target}'`);
        console.log(`\x1b[32mkilled\x1b[0m ${target}`);
        return;
      }
    }
  }
  console.error(`window not found (exact match): ${query}`);
  process.exit(1);
}

/**
 * wake — create a new tmux window in the loki-oracle session and start claude.
 *
 * Fix: before creating a worktree branch, check if it already exists and delete
 * it if stale (leftover from a crashed previous run).
 *
 * Usage: maw wake <oracle-session> [window-name]
 */
async function cmdWake(oracle?: string, windowName?: string) {
  if (!oracle) { console.error("usage: maw wake <oracle> [window-name]"); process.exit(1); }

  const session = oracle;
  const winName = windowName || oracle;

  // Check if the branch already exists — delete if stale
  const branch = `agents/${winName}`;
  try {
    await ssh(`git rev-parse --verify '${branch}' 2>/dev/null`);
    // Branch exists → delete it
    await ssh(`git branch -D '${branch}'`);
    console.log(`\x1b[33m⚡\x1b[0m deleted stale branch: ${branch}`);
  } catch { /* branch doesn't exist, that's fine */ }

  // Create window in the session
  try {
    await ssh(`tmux new-window -t '${session}' -n '${winName}'`);
  } catch (e: any) {
    console.error(`failed to create window '${winName}' in session '${session}': ${e.message}`);
    process.exit(1);
  }

  // Start claude with --continue
  await ssh(`tmux send-keys -t '${session}:${winName}' 'claude --dangerously-skip-permissions --continue' Enter`);
  console.log(`\x1b[32m+\x1b[0m woke '${winName}' in ${session}`);
}

function usage() {
  console.log(`\x1b[36mmaw\x1b[0m — Multi-Agent Workflow

\x1b[33mUsage:\x1b[0m
  maw ls                      List sessions + windows
  maw peek [agent]            Peek agent screen (or all)
  maw hey <agent> <msg...>    Send message to agent
  maw done <window>           Kill tmux window (exact match)
  maw wake <oracle> [window]  Create tmux window + start claude
  maw <agent> <msg...>        Shorthand for hey
  maw <agent>                 Shorthand for peek
  maw serve [port]            Start web UI (default: 3456)

\x1b[33mEnv:\x1b[0m
  MAW_HOST=local              SSH target (default: local)

\x1b[33mInstall:\x1b[0m
  bunx --bun maw@github:Soul-Brews-Studio/maw.js#main ls

\x1b[33mExamples:\x1b[0m
  maw hey neo what is your status
  maw neo /recap
  maw peek mother
  maw serve 8080`);
}

// --- Main ---

if (!cmd || cmd === "--help" || cmd === "-h") {
  usage();
} else if (cmd === "ls" || cmd === "list") {
  await cmdList();
} else if (cmd === "peek" || cmd === "see") {
  await cmdPeek(args[1]);
} else if (cmd === "hey" || cmd === "send") {
  if (!args[1] || !args[2]) { console.error("usage: maw hey <agent> <message>"); process.exit(1); }
  await cmdSend(args[1], args.slice(2).join(" "));
} else if (cmd === "done") {
  await cmdDone(args[1]);
} else if (cmd === "wake") {
  await cmdWake(args[1], args[2]);
} else if (cmd === "serve") {
  startServer(args[1] ? +args[1] : 3456);
} else {
  // Default: agent name
  if (args.length >= 2) {
    // maw neo what's up → send
    await cmdSend(args[0], args.slice(1).join(" "));
  } else {
    // maw neo → peek
    await cmdPeek(args[0]);
  }
}
