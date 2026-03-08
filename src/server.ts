import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { listSessions, capture, sendKeys, selectWindow } from "./ssh";
import type { ServerWebSocket } from "bun";

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

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    // User prompt line — marks start of real conversation
    if (trimmed.startsWith('❯')) {
      seenPrompt = true;
      flush();
      const text = trimmed.startsWith('❯ ') ? trimmed.slice(2).trim() : '';
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

// Serve UI
const html = Bun.file(import.meta.dir + "/ui.html");
app.get("/", (c) => c.body(html.stream(), { headers: { "Content-Type": "text/html" } }));

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

export function startServer(port = +(process.env.MAW_PORT || 3456)) {

  const server = Bun.serve({
    port,
    fetch(req, server) {
      const url = new URL(req.url);
      // Upgrade WebSocket
      if (url.pathname === "/ws") {
        if (server.upgrade(req, { data: { target: null } })) return;
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return app.fetch(req);
    },
    websocket: {
      open(ws: ServerWebSocket<WSData>) {
        clients.add(ws);
        startIntervals();
        // Send sessions immediately
        listSessions().then(s => ws.send(JSON.stringify({ type: "sessions", sessions: s }))).catch(() => {});
      },
      message(ws: ServerWebSocket<WSData>, msg) {
        try {
          const data = JSON.parse(msg as string);
          if (data.type === "subscribe") {
            ws.data.target = data.target;
            pushCapture(ws); // immediate first push
          } else if (data.type === "select") {
            selectWindow(data.target).catch(() => {});
          } else if (data.type === "send") {
            sendKeys(data.target, data.text)
              .then(() => {
                ws.send(JSON.stringify({ type: "sent", ok: true, target: data.target, text: data.text }));
                // Push capture after short delay to show result
                setTimeout(() => pushCapture(ws), 300);
              })
              .catch(e => ws.send(JSON.stringify({ type: "error", error: e.message })));
          }
        } catch {}
      },
      close(ws: ServerWebSocket<WSData>) {
        clients.delete(ws);
        lastContent.delete(ws);
        stopIntervals();
      },
    },
  });

  console.log(`🔮 loki-office → http://localhost:${port} (ws://localhost:${port}/ws)`);
  return server;
}

// Auto-start unless imported by CLI (CLI sets MAW_CLI=1)
if (!process.env.MAW_CLI) {
  startServer();
}
