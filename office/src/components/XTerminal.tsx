/**
 * XTerminal — real PTY-backed terminal component using xterm.js.
 *
 * Connects to /ws/pty and drives xterm.js directly with raw PTY output.
 * "attached" event is sent by the server only after the first PTY data
 * arrives, preventing black-screen on slow panes.
 *
 * Key encoding: input is captured by xterm, serialized to base64, and
 * sent as { type: "pty-key", data: "<base64>" }.
 */

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

// Catppuccin Mocha theme
const CATPPUCCIN_MOCHA = {
  background:    "#1e1e2e",
  foreground:    "#cdd6f4",
  cursor:        "#f5e0dc",
  cursorAccent:  "#1e1e2e",
  black:         "#45475a",
  red:           "#f38ba8",
  green:         "#a6e3a1",
  yellow:        "#f9e2af",
  blue:          "#89b4fa",
  magenta:       "#f5c2e7",
  cyan:          "#94e2d5",
  white:         "#bac2de",
  brightBlack:   "#585b70",
  brightRed:     "#f38ba8",
  brightGreen:   "#a6e3a1",
  brightYellow:  "#f9e2af",
  brightBlue:    "#89b4fa",
  brightMagenta: "#f5c2e7",
  brightCyan:    "#94e2d5",
  brightWhite:   "#a6adc8",
  selectionBackground: "#585b7060",
};

export interface XTerminalHandle {
  /** Send raw input bytes (e.g. from PixelKey buttons) to the PTY */
  sendInput: (seq: string) => void;
}

interface XTerminalProps {
  target: string;
  onAttached?: () => void;
  onExit?: () => void;
  style?: React.CSSProperties;
}

export const XTerminal = forwardRef<XTerminalHandle, XTerminalProps>(
function XTerminal({ target, onAttached, onExit, style }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Expose sendInput to parent via ref
  useImperativeHandle(ref, () => ({
    sendInput(seq: string) {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const b64 = btoa(
        Array.from(new TextEncoder().encode(seq), (b) => String.fromCharCode(b)).join("")
      );
      ws.send(JSON.stringify({ type: "pty-key", data: b64 }));
    },
  }), []);

  useEffect(() => {
    if (!containerRef.current) return;

    // ── Create terminal ───────────────────────────────────────────────────────
    const term = new Terminal({
      theme: CATPPUCCIN_MOCHA,
      fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
      fontSize: 13,
      lineHeight: 1.3,
      cursorBlink: true,
      scrollback: 1000,
      allowProposedApi: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    termRef.current = term;
    fitRef.current = fit;

    // ── WebSocket connection ──────────────────────────────────────────────────
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${location.host}/ws/pty`);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "pty-attach", target }));
    };

    ws.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        // Raw PTY bytes → write to xterm
        term.write(new Uint8Array(e.data));
      } else {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "pty-attached") {
            onAttached?.();
          } else if (msg.type === "pty-exit") {
            onExit?.();
            term.write("\r\n\x1b[33m[session ended]\x1b[0m\r\n");
          } else if (msg.type === "pty-error") {
            term.write(`\r\n\x1b[31m[pty error: ${msg.error}]\x1b[0m\r\n`);
          }
        } catch {
          // Not JSON — raw terminal string data from node-pty
          term.write(e.data as string);
        }
      }
    };

    ws.onclose = () => {
      term.write("\r\n\x1b[33m[disconnected]\x1b[0m\r\n");
    };

    ws.onerror = () => ws.close();

    // ── Forward keyboard input ────────────────────────────────────────────────
    term.onData((data) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      // Encode as base64 to safely carry arbitrary bytes in JSON
      const b64 = btoa(
        Array.from(new TextEncoder().encode(data), (b) => String.fromCharCode(b)).join("")
      );
      ws.send(JSON.stringify({ type: "pty-key", data: b64 }));
    });

    // ── Resize observer ───────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      fit.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "pty-resize",
          cols: term.cols,
          rows: term.rows,
        }));
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      ws.send(JSON.stringify({ type: "pty-detach" }));
      ws.close();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      wsRef.current = null;
    };
  // Only re-mount when target changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        background: CATPPUCCIN_MOCHA.background,
        ...style,
      }}
    />
  );
});
