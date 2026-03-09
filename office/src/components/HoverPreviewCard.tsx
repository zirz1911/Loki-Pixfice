import { useState, useEffect, useRef, useCallback, memo } from "react";
import { ansiToHtml } from "../lib/ansi";
import { AgentAvatar } from "./AgentAvatar";
import { PixelKey, NAV_KEYS, CTRL_KEYS } from "./PixelKey";
import type { AgentState } from "../lib/types";

interface HoverPreviewCardProps {
  agent: AgentState;
  roomLabel: string;
  accent: string;
  pinned?: boolean;
  send?: (msg: object) => void;
  onFullscreen?: () => void;
  onClose?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  busy: "#fdd835",
  ready: "#4caf50",
  idle: "#445566",
};

function trimCapture(raw: string): string {
  const lines = raw.split("\n");
  while (lines.length > 0) {
    const stripped = lines[lines.length - 1].replace(/\x1b\[[0-9;]*m/g, "").trim();
    if (stripped === "") lines.pop();
    else break;
  }
  return lines.join("\n");
}

export const HoverPreviewCard = memo(function HoverPreviewCard({
  agent,
  roomLabel,
  accent,
  pinned = false,
  send,
  onFullscreen,
  onClose,
}: HoverPreviewCardProps) {
  const [content, setContent] = useState("");
  const [inputBuf, setInputBuf] = useState("");
  const termRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamingRef = useRef(false);

  const displayName = agent.name.replace(/-oracle$/, "").replace(/-/g, " ").toUpperCase();
  const statusColor = STATUS_COLORS[agent.status] ?? "#445566";

  // Auto-focus when pinned
  useEffect(() => {
    if (pinned) {
      inputRef.current?.focus();
      const t = setTimeout(() => { inputRef.current?.focus(); inputRef.current?.click(); }, 50);
      return () => clearTimeout(t);
    }
  }, [pinned, agent.target]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose?.(); return; }
    if (e.key === "F11" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
      e.preventDefault(); onFullscreen?.(); return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (streamingRef.current) {
        send?.({ type: "send", target: agent.target, text: "\r" });
        streamingRef.current = false;
      } else if (inputBuf && send) {
        send({ type: "send", target: agent.target, text: inputBuf });
      }
      setInputBuf("");
      return;
    }
    if (e.key === "Backspace" && streamingRef.current && send) {
      send({ type: "send", target: agent.target, text: "\b" });
    }
  }, [inputBuf, agent.target, send, onClose, onFullscreen]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const prev = inputBuf;
    setInputBuf(val);
    if (!send) return;
    if (val === "/" && prev === "") { streamingRef.current = true; send({ type: "send", target: agent.target, text: "/" }); return; }
    if (streamingRef.current && val.length > prev.length) {
      const newChars = val.slice(prev.length);
      for (const ch of newChars) send({ type: "send", target: agent.target, text: ch });
    }
    if (streamingRef.current && !val.startsWith("/")) streamingRef.current = false;
  }, [inputBuf, agent.target, send]);

  // Poll terminal capture
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch(`/api/capture?target=${encodeURIComponent(agent.target)}`);
        const data = await res.json();
        if (active) setContent(data.content || "");
      } catch {}
      if (active) setTimeout(poll, 500);
    }
    poll();
    return () => { active = false; };
  }, [agent.target]);

  useEffect(() => {
    const el = termRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [content]);

  return (
    <div
      style={{
        width: 400,
        height: "calc(100vh - 120px)",
        maxHeight: 680,
        background: "#07080f",
        border: `2px solid ${accent}`,
        boxShadow: `0 0 20px ${accent}25, 6px 6px 0 #000`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Press Start 2P', monospace",
        imageRendering: "pixelated",
      }}
      onMouseDown={(e) => {
        if (pinned && e.target !== inputRef.current) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }}
    >
      {/* ── Header: pixel avatar + info ─────────────────────────────────── */}
      <div style={{
        background: `${accent}12`,
        borderBottom: `2px solid ${accent}40`,
        padding: "16px 16px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
        position: "relative",
      }}>
        {/* Close button */}
        {pinned && onClose && (
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 8, right: 10,
              background: "none", border: "none",
              color: "#445566", fontSize: 18, cursor: "pointer",
              lineHeight: 1, padding: "0 4px",
            }}
          >×</button>
        )}

        {/* Pixel sprite avatar (big) */}
        <div style={{ transform: "scale(1.6)", transformOrigin: "center bottom", marginBottom: 20, marginTop: 4 }}>
          <AgentAvatar
            name={agent.name}
            target={agent.target}
            status={agent.status}
            preview={agent.preview}
            accent={accent}
            onClick={() => {}}
          />
        </div>

        {/* Agent name */}
        <div style={{ fontSize: 11, color: accent, letterSpacing: 2, textAlign: "center" }}>
          {displayName}
        </div>

        {/* Status + room */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 8, height: 8, background: statusColor,
              animation: agent.status === "busy" ? "agent-pulse 0.8s infinite" : "none",
            }} />
            <span style={{ fontSize: 8, color: statusColor }}>{agent.status.toUpperCase()}</span>
          </div>
          <div style={{ width: 2, height: 14, background: "#1e2840" }} />
          <span style={{ fontSize: 7, color: `${accent}80` }}>{roomLabel.toUpperCase()}</span>
        </div>

        {/* Target ID */}
        <div style={{ fontSize: 6, color: "#2a3a50" }}>{agent.target}</div>
      </div>

      {/* ── Terminal header ──────────────────────────────────────────────── */}
      <div style={{
        background: "#0a0b16",
        borderBottom: `1px solid ${accent}20`,
        padding: "5px 10px",
        display: "flex", alignItems: "center", gap: 6,
        flexShrink: 0,
      }}>
        <div style={{ width: 6, height: 6, background: "#4caf50", animation: "pixel-glow 2s infinite" }} />
        <span style={{ fontSize: 7, color: "#2a3a50", letterSpacing: 2 }}>LIVE TERMINAL</span>
        <div style={{ flex: 1 }} />
        {pinned && onFullscreen && (
          <button
            onClick={onFullscreen}
            title="Fullscreen (Ctrl+Enter)"
            style={{
              background: "#111828", border: "1px solid #2a3a50",
              color: "#5a8cff", fontSize: 9, padding: "2px 8px",
              cursor: "pointer", fontFamily: "'Press Start 2P', monospace",
            }}
          >⛶ FULL</button>
        )}
      </div>

      {/* ── Terminal output ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: "relative", background: "#07080f", overflow: "hidden" }}>
        <div
          ref={termRef}
          style={{
            position: "absolute", inset: 0,
            padding: "8px 12px",
            overflowY: "auto",
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            fontSize: 11,
            lineHeight: 1.4,
            color: "#cdd6f4",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
          dangerouslySetInnerHTML={{ __html: ansiToHtml(trimCapture(content)) }}
        />

      </div>

      {/* ── Input / preview ──────────────────────────────────────────────── */}
      {pinned && send ? (
        <>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px",
              background: "#0a0b16",
              borderTop: `2px solid ${accent}40`,
              cursor: "text",
              flexShrink: 0,
            }}
            onClick={() => inputRef.current?.focus()}
          >
            <span style={{ color: "#22d3ee", fontSize: 13, fontFamily: "monospace", flexShrink: 0 }}>❯</span>
            <input
              ref={inputRef}
              type="text"
              value={inputBuf}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#e0e8ff", caretColor: "#22d3ee",
                fontFamily: "'SF Mono', monospace", fontSize: 12,
              }}
              inputMode="text"
              enterKeyHint="send"
              spellCheck={false}
              autoComplete="off"
              autoFocus
              placeholder="type command..."
            />
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (inputBuf && send) { send({ type: "send", target: agent.target, text: inputBuf }); setInputBuf(""); }
                inputRef.current?.focus();
              }}
              style={{
                background: "#5a8cff", border: "2px solid #8aacff",
                color: "#07080f", fontSize: 8,
                fontFamily: "'Press Start 2P', monospace",
                padding: "5px 10px", cursor: "pointer",
                flexShrink: 0,
              }}
            >SEND</button>
          </div>

          {/* Key buttons */}
          {(() => {
            const sendKey = (seq: string) => {
              send?.({ type: "send", target: agent.target, text: seq });
              inputRef.current?.focus();
            };
            return (
              <div style={{
                display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
                padding: "5px 10px",
                background: "#07080f",
                borderTop: "1px solid #1a2030",
                flexShrink: 0,
              }}>
                {NAV_KEYS.map(({ label, seq }) => (
                  <PixelKey key={label} label={label} seq={seq} dotColor={accent} sendKey={sendKey} small />
                ))}
                <div style={{ width: 1, height: 14, background: "#1a2030", flexShrink: 0 }} />
                {CTRL_KEYS.map(({ label, seq, title }) => (
                  <PixelKey key={label} label={label} seq={seq} dotColor={accent} sendKey={sendKey} title={title} accent small />
                ))}
              </div>
            );
          })()}
        </>
      ) : (
        <div style={{
          padding: "6px 12px",
          background: "#0a0b16",
          borderTop: `1px solid ${accent}20`,
          fontSize: 8, color: "#2a3a50",
          fontFamily: "monospace",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          flexShrink: 0,
        }}>
          {agent.preview || "..."}
        </div>
      )}
    </div>
  );
});
