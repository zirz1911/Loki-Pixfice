import { useState, useEffect, useRef, useCallback } from "react";
import { ansiToHtml } from "../lib/ansi";
import { PixelKey, NAV_KEYS, CTRL_KEYS } from "./PixelKey";
import type { AgentState } from "../lib/types";
import { useViewport } from "../hooks/useViewport";

function trimCapture(raw: string): string {
  const lines = raw.split("\n");
  while (lines.length > 0) {
    const stripped = lines[lines.length - 1].replace(/\x1b\[[0-9;]*m/g, "").trim();
    if (stripped === "") lines.pop();
    else break;
  }
  return lines.join("\n");
}

interface TerminalModalProps {
  agent: AgentState;
  send: (msg: object) => void;
  onClose: () => void;
  onNavigate: (dir: -1 | 1) => void;
  onSelectSibling: (agent: AgentState) => void;
  siblings: AgentState[];
}

function cleanName(name: string) {
  return name.replace(/-oracle$/, "").replace(/-/g, " ").toUpperCase();
}

const STATUS_COLOR: Record<string, string> = {
  busy: "#fdd835",
  ready: "#4caf50",
  idle: "#445566",
};

export function TerminalModal({ agent, send, onClose, onNavigate, onSelectSibling, siblings }: TerminalModalProps) {
  const { isMobile } = useViewport();
  const [content, setContent] = useState("");
  const [inputBuf, setInputBuf] = useState("");
  const termRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [agent.target]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const refocus = () => { setTimeout(() => inputRef.current?.focus(), 0); };
    el.addEventListener("mousedown", refocus);
    return () => el.removeEventListener("mousedown", refocus);
  }, []);

  useEffect(() => {
    send({ type: "subscribe", target: agent.target });
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/capture?target=${encodeURIComponent(agent.target)}`);
        const data = await res.json();
        setContent(data.content || "");
      } catch {}
    }, 200);
    return () => { clearInterval(poll); send({ type: "subscribe", target: "" }); };
  }, [agent.target, send]);

  const isFirstContent = useRef(true);
  useEffect(() => {
    const el = termRef.current;
    if (el) {
      if (isFirstContent.current && content) {
        isFirstContent.current = false;
        el.scrollTop = el.scrollHeight;
      } else {
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        if (atBottom) el.scrollTop = el.scrollHeight;
      }
    }
  }, [content]);

  useEffect(() => { isFirstContent.current = true; }, [agent.target]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); onNavigate(-1); return; }
    if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); onNavigate(1); return; }
    if (e.altKey && e.key >= "1" && e.key <= "9") {
      const idx = parseInt(e.key) - 1;
      if (idx < siblings.length) { e.preventDefault(); onSelectSibling(siblings[idx]); }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputBuf) { send({ type: "send", target: agent.target, text: inputBuf }); setInputBuf(""); }
    } else if (e.key === "c" && e.ctrlKey) {
      e.preventDefault(); setInputBuf("");
    }
  }, [inputBuf, agent.target, send, onClose, onNavigate, siblings, onSelectSibling]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    if (text) setInputBuf((b) => b + text);
  }, []);

  const sendKey = useCallback((seq: string) => {
    send({ type: "send", target: agent.target, text: seq });
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [agent.target, send]);

  const dotColor = STATUS_COLOR[agent.status] ?? "#445566";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.88)",
        fontFamily: "'Press Start 2P', monospace",
        imageRendering: "pixelated",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      ref={wrapperRef}
    >
      <div style={isMobile ? {
        width: "100%",
        height: "100%",
        maxWidth: "none",
        background: "#07080f",
        border: "none",
        boxShadow: "none",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      } : {
        width: "90vw",
        maxWidth: 900,
        height: "80vh",
        background: "#07080f",
        border: `2px solid ${dotColor}`,
        boxShadow: `0 0 20px ${dotColor}30, 4px 4px 0 #000`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* ── Window title bar */}
        <div style={{
          background: "#0a0b16",
          borderBottom: `2px solid ${dotColor}40`,
          padding: "8px 12px",
          display: "flex", alignItems: "center", gap: 10,
          flexShrink: 0,
        }}>
          {/* Traffic-light row */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              onClick={onClose}
              style={{ width: 12, height: 12, background: "#ff5f57", border: "none", cursor: "pointer", padding: 0 }}
            />
            <span style={{ width: 12, height: 12, background: "#febc2e", display: "block" }} />
            <span style={{ width: 12, height: 12, background: "#28c840", display: "block" }} />
          </div>

          <div style={{ width: 2, height: 24, background: "#1e2840", flexShrink: 0 }} />

          {/* Agent tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, overflowX: "auto", flex: 1 }}>
            {siblings.map((s, i) => {
              const active = s.target === agent.target;
              const sc = STATUS_COLOR[s.status] ?? "#445566";
              return (
                <button
                  key={s.target}
                  onClick={() => onSelectSibling(s)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "4px 8px",
                    background: active ? "#1a2240" : "transparent",
                    border: `1px solid ${active ? sc : "#1e2840"}`,
                    color: active ? "#e0e8ff" : "#445566",
                    fontSize: 8,
                    fontFamily: "'Press Start 2P', monospace",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.1s",
                  }}
                >
                  <span style={{ width: 6, height: 6, background: sc, flexShrink: 0 }} />
                  {i < 9 && (
                    <span style={{ fontSize: 6, color: "#2a3a50" }}>{i + 1}</span>
                  )}
                  {cleanName(s.name)}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {siblings.length > 1 && (
              <span style={{ fontSize: 7, color: "#2a3a50" }}>ALT+1-{Math.min(9, siblings.length)}</span>
            )}
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 18, color: "#445566", lineHeight: 1, padding: "0 2px",
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Agent info strip */}
        <div style={{
          background: "#0a0b16",
          borderBottom: "1px solid #1a2030",
          padding: "5px 14px",
          display: "flex", alignItems: "center", gap: 10,
          flexShrink: 0,
        }}>
          <div style={{ width: 8, height: 8, background: dotColor, animation: agent.status === "busy" ? "agent-pulse 0.8s infinite" : "none" }} />
          <span style={{ fontSize: 9, color: dotColor }}>{cleanName(agent.name)}</span>
          <span style={{ fontSize: 7, color: "#2a3a50" }}>{agent.target}</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 7, color: dotColor, background: `${dotColor}18`, padding: "2px 6px", border: `1px solid ${dotColor}40` }}>
            {agent.status.toUpperCase()}
          </span>
        </div>

        {/* ── Terminal output */}
        <div
          ref={termRef}
          style={{
            flex: 1,
            padding: "12px 16px",
            overflowY: "auto",
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            fontSize: 13,
            lineHeight: 1.4,
            color: "#cdd6f4",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            background: "#07080f",
          }}
          dangerouslySetInnerHTML={{ __html: ansiToHtml(trimCapture(content)) }}
        />

        {/* ── Input line */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 14px",
            background: "#0a0b16",
            borderTop: `2px solid ${dotColor}40`,
            cursor: "text",
            flexShrink: 0,
          }}
          onClick={() => inputRef.current?.focus()}
        >
          <span style={{ fontSize: 11, color: "#22d3ee", fontFamily: "monospace", flexShrink: 0 }}>❯</span>
          <div style={{ flex: 1, position: "relative", minHeight: 20 }}>
            <input
              ref={inputRef}
              type="text"
              value={inputBuf}
              onChange={(e) => setInputBuf(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              style={{
                position: "absolute", inset: 0, width: "100%",
                background: "transparent",
                color: "#e0e8ff",
                outline: "none",
                caretColor: "#22d3ee",
                fontFamily: "'SF Mono', monospace",
                fontSize: 13,
                border: "none",
              }}
              spellCheck={false}
              autoComplete="off"
              autoFocus
            />
          </div>
        </div>

        {/* ── Key buttons */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 14px",
          background: "#080910",
          borderTop: "1px solid #1a2030",
          flexShrink: 0,
          flexWrap: "wrap",
          overflowX: "auto",
        }}>
          {/* Group 1: Navigation */}
          {[
            { label: "ESC", seq: "\x1b" },
            { label: "TAB ⇥", seq: "\t" },
            { label: "↑", seq: "\x1b[A" },
            { label: "↓", seq: "\x1b[B" },
            { label: "←", seq: "\x1b[D" },
            { label: "→", seq: "\x1b[C" },
            { label: "HOME", seq: "\x1b[H" },
            { label: "END", seq: "\x1b[F" },
            { label: "PGUP", seq: "\x1b[5~" },
            { label: "PGDN", seq: "\x1b[6~" },
          ].map(({ label, seq }) => (
            <PixelKey key={label} label={label} seq={seq} dotColor={dotColor} sendKey={sendKey} />
          ))}

          {/* Divider */}
          <div style={{ width: 1, height: 18, background: "#1a2030", flexShrink: 0 }} />

          {/* Group 2: Control */}
          {[
            { label: "^C", seq: "\x03", title: "Ctrl+C — interrupt" },
            { label: "^D", seq: "\x04", title: "Ctrl+D — EOF/exit" },
            { label: "^Z", seq: "\x1a", title: "Ctrl+Z — suspend" },
            { label: "ENTER ↵", seq: "\r" },
          ].map(({ label, seq, title }) => (
            <PixelKey key={label} label={label} seq={seq} dotColor={dotColor} sendKey={sendKey} title={title} accent />
          ))}
        </div>
      </div>
    </div>
  );
}
