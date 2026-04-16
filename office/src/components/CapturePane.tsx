/**
 * CapturePane — tmux capture-pane based terminal display.
 *
 * Replaces xterm.js: instead of attaching as a PTY client (which causes
 * VT100 cursor-positioning garbage in xterm.js), this polls
 * `tmux capture-pane -p -e` every 250ms and renders the ANSI-colored
 * plain-text output as HTML.
 *
 * Input is sent via `tmux send-keys -l` (literal bytes), which correctly
 * handles Thai/Unicode, control characters (^C, ESC, Tab), and arrows.
 *
 * ANSI parser ported from Athena-Kvasir/office/terminal.html.
 */
import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export interface CapturePaneHandle {
  /** Send input to the tmux pane (text, control sequences, arrows, etc.) */
  sendInput: (seq: string) => void;
}

interface CapturePaneProps {
  target: string;
  onAttached?: () => void;
  onExit?: () => void;
  style?: React.CSSProperties;
}

// ── ANSI → HTML parser ────────────────────────────────────────────────────────
const ANSI_COLORS = [
  "#000","#c00","#0a0","#c50","#00c","#c0c","#0cc","#ccc",
  "#555","#f55","#5f5","#ff5","#55f","#f5f","#5ff","#fff",
];

function color256(n: number): string {
  if (n < 16) return ANSI_COLORS[n];
  if (n < 232) {
    n -= 16;
    return `rgb(${Math.floor(n/36)*51},${Math.floor(n/6)%6*51},${n%6*51})`;
  }
  const v = (n - 232) * 10 + 8;
  return `rgb(${v},${v},${v})`;
}

function escHtml(s: string): string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function parseAnsi(text: string): string {
  let html = "";
  let fg: string|null = null, bg: string|null = null;
  let bold = 0, dim = 0, italic = 0, under = 0, strike = 0, spanOpen = 0;

  for (const part of text.split(/(\x1b\[[0-9;]*m)/)) {
    const m = part.match(/^\x1b\[([0-9;]*)m$/);
    if (!m) { html += escHtml(part); continue; }

    if (spanOpen) { html += "</span>"; spanOpen = 0; }

    const codes = m[1] ? m[1].split(";").map(Number) : [0];
    for (let j = 0; j < codes.length; j++) {
      const c = codes[j];
      if (!c) { fg = bg = null; bold = dim = italic = under = strike = 0; }
      else if (c===1) bold=1;   else if (c===2) dim=1;
      else if (c===3) italic=1; else if (c===4) under=1; else if (c===9) strike=1;
      else if (c===22) { bold=0; dim=0; } else if (c===23) italic=0;
      else if (c===24) under=0; else if (c===29) strike=0;
      else if (c>=30&&c<=37) fg=ANSI_COLORS[c-30]; else if (c===39) fg=null;
      else if (c===38&&codes[j+1]===5) { fg=color256(codes[j+2]); j+=2; }
      else if (c===38&&codes[j+1]===2) { fg=`rgb(${codes[j+2]},${codes[j+3]},${codes[j+4]})`; j+=4; }
      else if (c>=40&&c<=47) bg=ANSI_COLORS[c-40]; else if (c===49) bg=null;
      else if (c===48&&codes[j+1]===5) { bg=color256(codes[j+2]); j+=2; }
      else if (c===48&&codes[j+1]===2) { bg=`rgb(${codes[j+2]},${codes[j+3]},${codes[j+4]})`; j+=4; }
      else if (c>=90&&c<=97) fg=ANSI_COLORS[c-82];
      else if (c>=100&&c<=107) bg=ANSI_COLORS[c-92];
    }

    const styles: string[] = [];
    if (fg) styles.push("color:"+fg);
    if (bg) styles.push("background:"+bg);
    if (bold) styles.push("font-weight:bold");
    if (dim)  styles.push("opacity:0.6");
    if (italic) styles.push("font-style:italic");
    if (under || strike) styles.push("text-decoration:"+(under?"underline":"")+(under&&strike?" ":"")+(strike?"line-through":""));
    if (styles.length) { html += `<span style="${styles.join(";")}">`, spanOpen = 1; }
  }
  if (spanOpen) html += "</span>";
  return html;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const CapturePane = forwardRef<CapturePaneHandle, CapturePaneProps>(
function CapturePane({ target, onAttached, onExit, style }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef        = useRef<WebSocket | null>(null);
  const targetRef    = useRef(target);
  const attachedRef  = useRef(false);
  targetRef.current  = target;

  useImperativeHandle(ref, () => ({
    sendInput(seq: string) {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: "tmux-send", target: targetRef.current, text: seq }));
    },
  }), []);

  useEffect(() => {
    attachedRef.current = false;
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${location.host}/ws/pty`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "capture-subscribe", target }));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === "capture") {
          if (!attachedRef.current && msg.content?.trim()) {
            attachedRef.current = true;
            onAttached?.();
          }
          const el = containerRef.current;
          if (!el) return;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          el.innerHTML = `<pre style="margin:0;white-space:pre-wrap;word-break:break-all;">${parseAnsi(msg.content ?? "")}</pre>`;
          if (atBottom) el.scrollTop = el.scrollHeight;
        } else if (msg.type === "pty-error") {
          const el = containerRef.current;
          if (el) el.innerHTML = `<pre style="margin:0;color:#f38ba8;">[error: ${escHtml(msg.error ?? "")}]</pre>`;
          onExit?.();
        }
      } catch {}
    };

    ws.onclose = () => {
      const el = containerRef.current;
      if (el) el.innerHTML = `<pre style="margin:0;color:#585b70;">[disconnected]</pre>`;
    };
    ws.onerror = () => ws.close();

    return () => {
      try { ws.send(JSON.stringify({ type: "capture-unsubscribe" })); } catch {}
      ws.close();
      wsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        background: "#0a0a0f",
        color: "#cccccc",
        fontFamily: "'SF Mono','Fira Code','JetBrains Mono',monospace",
        fontSize: 13,
        lineHeight: 1.4,
        padding: "10px 14px",
        overflow: "auto",
        boxSizing: "border-box",
        ...style,
      }}
    />
  );
});
