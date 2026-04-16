import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { listSessions, capture, sendKeys, selectWindow } from "./ssh";
import type { ServerWebSocket } from "bun";
import { parseLine } from "../office/src/lib/feed";
import { handlePtyMessage, handlePtyClose } from "./pty";
import { loadConfig } from "./config";
import * as fs from "fs";

const FEED_LOG = process.env.FEED_LOG || "/tmp/loki-feed.log";

const app = new Hono();
app.use("/api/*", cors());

// API routes (keep for CLI compatibility)
app.get("/api/sessions", async (c) => c.json(await listSessions()));

app.get("/api/capture", async (c) => {
  const target = c.req.query("target");
  if (!target) return c.json({ error: "target required" }, 400);
  return c.json({ content: await capture(target) });
});

// ── Conversation parser ─────────────────────────────────────────────────────

export interface ConvTurn {
  role: 'user' | 'assistant' | 'tool';
  text: string;
}

function stripAnsiRaw(s: string): string {
  // Strip all ANSI escape sequences (colors, cursor moves, etc.)
  return s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')
           .replace(/\x1b\][^\x07]*\x07/g, '')
           .replace(/\x1b[()][AB012]/g, '')
           .replace(/\x1b./g, '');
}

const BOX_CHARS = /^[╭╰╮╯│─═▐▛▜▝▞▘▙▟◀▶\s]+$/;
const SPINNER_CHARS = /^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏\s]+$/;
const SKIP_PREFIXES = ['✻ Welcome', 'Tips for', 'cwd:', '? for shortcuts', 'Claude Code', '▐', '▛', '▝', '▜', '· claude', '· sonnet', '· haiku', '· opus'];
const TOKEN_LINE = /\d+k?\s*(input|output|tokens|context)/i;
const BASH_PROMPT = /^[\w.\-]+@[\w.\-]+:[~\/].*[$#]\s/;  // paji@machine:~/path$ cmd
const SHELL_CMD = /^(unset|export|cd|ls|echo|bash|bun|node|npm|yarn|python|git)\s/i;

export function parseConversation(raw: string): ConvTurn[] {
  const lines = stripAnsiRaw(raw).split('\n');
  const turns: ConvTurn[] = [];
  let currentRole: ConvTurn['role'] | null = null;
  let currentText: string[] = [];
  // Only parse content after the first ❯ prompt — skips all startup noise
  let seenPrompt = false;

  function flush() {
    if (currentRole && currentText.length > 0) {
      let text = currentText.join('\n').trim();
      // Strip leading ● marker from assistant messages (Claude Code response indicator)
      if (currentRole === 'assistant') text = text.replace(/^●\s+/, '');
      if (text.length > 2) turns.push({ role: currentRole, text });
    }
    currentRole = null;
    currentText = [];
  }

  // Detect Gemini CLI output (has status bar with /model)
  const isGemini = /\/model\s+(Auto|Gemini|Flash|Pro)/i.test(raw);

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    // Skip Gemini UI chrome: block chars border and status bar
    if (isGemini && /^[▀▄█\s]+$/.test(trimmed)) continue;
    if (isGemini && /\/model\s+(Auto|Gemini|Flash|Pro)/i.test(trimmed)) continue;
    if (isGemini && /YOLO ctrl\+y/.test(trimmed)) continue;

    // User prompt line:
    //   Claude Code → ❯ text
    //   Gemini CLI  → " * text" (leading space + asterisk)
    const isGeminiUser = isGemini && /^\*\s+\S/.test(trimmed) && !trimmed.startsWith('**');
    const isUserPrompt = trimmed.startsWith('❯') || isGeminiUser;
    if (isUserPrompt) {
      seenPrompt = true;
      flush();
      let text = '';
      if (trimmed.startsWith('❯ ')) text = trimmed.slice(2).trim();
      else if (isGeminiUser) text = trimmed.replace(/^\*\s+/, '').trim();
      if (text) turns.push({ role: 'user', text });
      continue;
    }

    // Skip everything before the first prompt (startup noise, banners, shell cmds)
    if (!seenPrompt) continue;

    if (!trimmed) {
      if (currentRole) currentText.push('');
      continue;
    }

    // Skip box-drawing, spinners, token counts
    if (BOX_CHARS.test(trimmed)) continue;
    if (SPINNER_CHARS.test(trimmed)) continue;
    if (TOKEN_LINE.test(trimmed)) continue;
    if (SKIP_PREFIXES.some(p => trimmed.toLowerCase().startsWith(p.toLowerCase()))) continue;

    // Skip separator lines (─── ▪▪▪ ─ etc)
    if (/^[─═▪▸▹\-\s]+$/.test(trimmed)) continue;

    // Tool call/result: ● ToolName(, ◆ thinking, ✔/✗ result, ⎿ output
    // Note: ● followed by plain text = assistant message, not tool
    const isToolCall = /^●\s+\w+\s*\(/.test(trimmed)   // ● ToolName(args)
      || /^[◆✔✗⎿▶]/.test(trimmed);                     // other tool markers
    if (isToolCall) {
      if (currentRole === 'assistant') flush();
      if (currentRole !== 'tool') { flush(); currentRole = 'tool'; }
      currentText.push(trimmed);
      continue;
    }

    // End tool block on non-tool, non-indented content
    if (currentRole === 'tool' && !line.startsWith('  ') && !line.startsWith('\t')) {
      flush();
    }

    // Default: assistant response
    if (currentRole !== 'assistant') { flush(); currentRole = 'assistant'; }
    currentText.push(trimmed);
  }

  flush();
  return turns;
}

app.get("/api/conversation", async (c) => {
  const target = c.req.query("target");
  if (!target) return c.json({ error: "target required" }, 400);
  const raw = await capture(target, 400);
  // Trim bottom 15% to exclude tmux statusline + Claude footer
  const allLines = raw.split('\n');
  const cutoff = Math.max(1, Math.floor(allLines.length * 0.85));
  const trimmed = allLines.slice(0, cutoff).join('\n');
  return c.json({ turns: parseConversation(trimmed) });
});

app.post("/api/send", async (c) => {
  const { target, text } = await c.req.json();
  if (!target || !text) return c.json({ error: "target and text required" }, 400);
  await sendKeys(target, text);
  return c.json({ ok: true, target, text });
});

app.post("/api/select", async (c) => {
  const { target } = await c.req.json();
  if (!target) return c.json({ error: "target required" }, 400);
  await selectWindow(target);
  return c.json({ ok: true, target });
});

// ── Worktrees API ─────────────────────────────────────────────────────────────

interface Worktree {
  path: string;
  branch: string;
  head: string;
  bare: boolean;
  prunable: boolean;
}

async function parseWorktrees(): Promise<Worktree[]> {
  try {
    const proc = Bun.spawn(["git", "worktree", "list", "--porcelain"], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: process.cwd(),
    });
    const text = await new Response(proc.stdout).text();
    await proc.exited;

    const worktrees: Worktree[] = [];
    let current: Partial<Worktree> = {};

    for (const line of text.split("\n")) {
      if (line.startsWith("worktree ")) {
        if (current.path !== undefined) worktrees.push(current as Worktree);
        current = { path: line.slice("worktree ".length).trim(), branch: "", head: "", bare: false, prunable: false };
      } else if (line.startsWith("HEAD ")) {
        current.head = line.slice("HEAD ".length).trim().slice(0, 8);
      } else if (line.startsWith("branch ")) {
        current.branch = line.slice("branch ".length).trim().replace("refs/heads/", "");
      } else if (line === "bare") {
        current.bare = true;
      } else if (line.startsWith("prunable ")) {
        current.prunable = true;
      } else if (line === "") {
        if (current.path !== undefined) { worktrees.push(current as Worktree); current = {}; }
      }
    }
    if (current.path !== undefined) worktrees.push(current as Worktree);
    return worktrees;
  } catch {
    return [];
  }
}

app.get("/api/worktrees", async (c) => {
  const worktrees = await parseWorktrees();
  return c.json({ worktrees });
});

app.post("/api/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return c.json({ error: "file required" }, 400);

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const allowed = ["png", "jpg", "jpeg", "gif", "webp"];
    if (!allowed.includes(ext)) return c.json({ error: "unsupported image type" }, 400);

    const dir = "/tmp/loki-uploads";
    fs.mkdirSync(dir, { recursive: true });

    const filename = `${Date.now()}.${ext}`;
    const path = `${dir}/${filename}`;
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(path, Buffer.from(buffer));

    return c.json({ ok: true, path });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Serve UI
const html = Bun.file(import.meta.dir + "/ui.html");
app.get("/", (c) => c.body(html.stream(), { headers: { "Content-Type": "text/html", "Cache-Control": "no-cache, no-store, must-revalidate" } }));

const dashboardHtml = Bun.file(import.meta.dir + "/dashboard.html");
app.get("/dashboard", (c) => c.body(dashboardHtml.stream(), { headers: { "Content-Type": "text/html" } }));

// Serve React office app (built by vite to dist-office/)
app.get("/office", serveStatic({ root: "./dist-office", path: "/index.html" }));
app.get("/office/*", serveStatic({
  root: "./",
  rewriteRequestPath: (p) => p.replace(/^\/office/, "/dist-office"),
}));

app.onError((err, c) => c.json({ error: err.message }, 500));

export { app };

// --- WebSocket + Server ---

type WSData = { target: string | null };

const clients = new Set<ServerWebSocket<WSData>>();

// ── Oracle Feed Tail ──────────────────────────────────────────────────────────

let feedFileSize = 0;

/** Read last N lines from feed.log */
function readFeedLines(n = 50): string[] {
  try {
    const content = fs.readFileSync(FEED_LOG, "utf-8");
    return content.split("\n").filter(l => l.trim()).slice(-n);
  } catch {
    return [];
  }
}

/** Broadcast a single feed event to all connected clients */
function broadcastFeedEvent(line: string) {
  const event = parseLine(line);
  if (!event) return;
  const msg = JSON.stringify({ type: "feed", event });
  for (const ws of clients) ws.send(msg);
}

/** Tail feed.log — check for new lines every second */
function startFeedTail() {
  // Init file size
  try {
    feedFileSize = fs.statSync(FEED_LOG).size;
  } catch {
    feedFileSize = 0;
  }

  setInterval(() => {
    try {
      let stat;
      try { stat = fs.statSync(FEED_LOG); } catch { return; }

      if (stat.size < feedFileSize) {
        // File was truncated/rotated
        feedFileSize = stat.size;
        return;
      }
      if (stat.size === feedFileSize) return;

      // Read new bytes
      const buf = Buffer.alloc(stat.size - feedFileSize);
      const fd = fs.openSync(FEED_LOG, "r");
      fs.readSync(fd, buf, 0, buf.length, feedFileSize);
      fs.closeSync(fd);
      feedFileSize = stat.size;

      const newText = buf.toString("utf-8");
      const lines = newText.split("\n").filter(l => l.trim());
      for (const line of lines) broadcastFeedEvent(line);
    } catch {}
  }, 1000);
}

// Push capture to a specific client (only if changed)
const lastContent = new Map<ServerWebSocket<WSData>, string>();

async function pushCapture(ws: ServerWebSocket<WSData>) {
  if (!ws.data.target) return;
  try {
    const content = await capture(ws.data.target, 80);
    const prev = lastContent.get(ws);
    if (content !== prev) {
      lastContent.set(ws, content);
      ws.send(JSON.stringify({ type: "capture", target: ws.data.target, content }));
    }
  } catch (e: any) {
    ws.send(JSON.stringify({ type: "error", error: e.message }));
  }
}

// Broadcast sessions to all clients
async function broadcastSessions() {
  if (clients.size === 0) return;
  try {
    const sessions = await listSessions();
    const msg = JSON.stringify({ type: "sessions", sessions });
    for (const ws of clients) ws.send(msg);
  } catch {}
}

// Capture loop — push to each subscribed client
let captureInterval: ReturnType<typeof setInterval> | null = null;
let sessionInterval: ReturnType<typeof setInterval> | null = null;

function startIntervals() {
  if (captureInterval) return;
  // Capture every 50ms for real-time feel
  captureInterval = setInterval(() => {
    for (const ws of clients) pushCapture(ws);
  }, 50);
  // Sessions every 5s
  sessionInterval = setInterval(broadcastSessions, 5000);
}

function stopIntervals() {
  if (clients.size > 0) return;
  if (captureInterval) { clearInterval(captureInterval); captureInterval = null; }
  if (sessionInterval) { clearInterval(sessionInterval); sessionInterval = null; }
}

// ── PTY WebSocket data tag ────────────────────────────────────────────────────
type PtyWSData = { isPty: true };

export function startServer(port = +(process.env.MAW_PORT || loadConfig().port)) {

  const server = Bun.serve({
    port,
    fetch(req, server) {
      const url = new URL(req.url);
      // PTY WebSocket — dedicated endpoint for xterm.js
      if (url.pathname === "/ws/pty") {
        if (server.upgrade(req, { data: { isPty: true } })) return;
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      // Regular capture/sessions WebSocket
      if (url.pathname === "/ws") {
        if (server.upgrade(req, { data: { target: null } })) return;
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return app.fetch(req);
    },
    websocket: {
      open(ws: ServerWebSocket<WSData | PtyWSData>) {
        // PTY connections are handled separately
        if ((ws.data as PtyWSData).isPty) return;
        const captureWs = ws as ServerWebSocket<WSData>;
        clients.add(captureWs);
        startIntervals();
        // Send sessions immediately
        listSessions().then(s => captureWs.send(JSON.stringify({ type: "sessions", sessions: s }))).catch(() => {});
        // Send feed history on connect
        try {
          const lines = readFeedLines(50);
          const events = lines.map(l => parseLine(l)).filter(Boolean);
          if (events.length > 0) {
            captureWs.send(JSON.stringify({ type: "feed-history", events }));
          }
        } catch {}
      },
      message(ws: ServerWebSocket<WSData | PtyWSData>, msg) {
        // Route PTY messages
        if ((ws.data as PtyWSData).isPty) {
          handlePtyMessage(ws as ServerWebSocket<PtyWSData>, msg as string).catch(() => {});
          return;
        }
        const captureWs = ws as ServerWebSocket<WSData>;
        try {
          const data = JSON.parse(msg as string);
          if (data.type === "subscribe") {
            captureWs.data.target = data.target;
            pushCapture(captureWs); // immediate first push
          } else if (data.type === "select") {
            selectWindow(data.target).catch(() => {});
          } else if (data.type === "send") {
            sendKeys(data.target, data.text)
              .then(() => {
                captureWs.send(JSON.stringify({ type: "sent", ok: true, target: data.target, text: data.text }));
                // Push capture after short delay to show result
                setTimeout(() => pushCapture(captureWs), 300);
              })
              .catch(e => captureWs.send(JSON.stringify({ type: "error", error: e.message })));
          }
        } catch {}
      },
      close(ws: ServerWebSocket<WSData | PtyWSData>) {
        if ((ws.data as PtyWSData).isPty) {
          handlePtyClose(ws as ServerWebSocket<PtyWSData>).catch(() => {});
          return;
        }
        const captureWs = ws as ServerWebSocket<WSData>;
        clients.delete(captureWs);
        lastContent.delete(captureWs);
        stopIntervals();
      },
    },
  });

  startFeedTail();
  console.log(`🔮 loki-office → http://localhost:${port} (ws://localhost:${port}/ws)`);
  return server;
}

// Auto-start unless imported by CLI (CLI sets MAW_CLI=1)
if (!process.env.MAW_CLI) {
  startServer();
}
