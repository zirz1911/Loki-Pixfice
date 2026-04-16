import { memo, useCallback, useRef, useState } from "react";
import { MiniMonitor } from "./MiniMonitor";
import { useViewport } from "../hooks/useViewport";
import type { AgentState } from "../lib/types";

export type FeedLogEntry = { text: string; ts: number };

const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

interface AgentRowProps {
  agent: AgentState;
  accent: string;
  roomLabel: string;
  isLast: boolean;
  agoLabel?: string;
  featured?: boolean;
  feedLog?: FeedLogEntry[] | null;
  observe: (el: HTMLElement | null, target: string) => void;
  showPreview: (agent: AgentState, accent: string, label: string, e: React.MouseEvent) => void;
  hidePreview: () => void;
  onAgentClick: (agent: AgentState, accent: string, label: string, e: React.MouseEvent) => void;
  send?: (msg: object) => void;
  onSendDone?: (agent: AgentState, accent: string, roomLabel: string) => void;
}

export const AgentRow = memo(function AgentRow({
  agent, accent, roomLabel, isLast, agoLabel, featured, feedLog,
  observe, showPreview, hidePreview, onAgentClick, send, onSendDone,
}: AgentRowProps) {
  const isBusy = agent.status === "busy";
  const displayName = agent.name.replace(/-oracle$/, "").replace(/-/g, " ");
  const { isMobile } = useViewport();
  const [inputOpen, setInputOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleMic = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputOpen) { setInputOpen(false); return; }
    setInputOpen(true);
    inputRef.current?.focus();
  }, [inputOpen]);

  const handleSend = useCallback(() => {
    if (!text.trim() || !send) return;
    send({ type: "send", target: agent.target, text: text.trim() });
    setTimeout(() => send({ type: "send", target: agent.target, text: "\r" }), 50);
    setText("");
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setInputOpen(false);
      onSendDone?.(agent, accent, roomLabel);
    }, 400);
  }, [text, agent, accent, roomLabel, send, onSendDone]);

  const statusColor = isBusy ? "oklch(0.85 0.20 142)" : agent.status === "ready" ? "#22d3ee" : "#94A3B8";
  const statusBg = isBusy ? "oklch(0.85 0.20 142)20" : agent.status === "ready" ? "#22d3ee18" : "rgba(255,255,255,0.06)";
  const avatarSize = featured ? (isMobile ? 64 : 96) : (isMobile ? 40 : 56);

  return (
    <div ref={(el) => observe(el, agent.target)}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: isMobile ? 10 : 20,
          padding: "14px 24px",
          cursor: "pointer",
          transition: "background 0.15s",
          borderBottom: !isLast && !inputOpen ? "1px solid rgba(255,255,255,0.04)" : "none",
          background: isBusy ? `${accent}06` : "transparent",
        }}
        onClick={(e) => onAgentClick(agent, accent, roomLabel, e)}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isBusy ? `${accent}06` : "transparent"; }}
        role="button"
        tabIndex={0}
        aria-label={`${agent.name} - ${agent.status}`}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.preventDefault(); }}
      >
        {/* Avatar */}
        <div
          style={{
            flexShrink: 0,
            width: avatarSize, height: avatarSize,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onMouseEnter={isTouch ? undefined : (e) => showPreview(agent, accent, roomLabel, e)}
          onMouseLeave={isTouch ? undefined : () => hidePreview()}
        >
          <div style={{
            width: 20, height: 20,
            background: isBusy ? "oklch(0.85 0.20 142)" : agent.status === "ready" ? "#22d3ee" : "#445566",
            boxShadow: isBusy ? "0 0 8px oklch(0.85 0.20 142)" : "none",
          }} />
        </div>

        {/* Mini monitor — desktop only */}
        {!isTouch && (
          <MiniMonitor
            target={agent.target}
            accent={accent}
            busy={isBusy}
            onMouseEnter={(e) => showPreview(agent, accent, roomLabel, e)}
            onMouseLeave={() => hidePreview()}
            onClick={(e) => onAgentClick(agent, accent, roomLabel, e)}
          />
        )}

        {/* Info column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              fontSize: 15, fontWeight: 600,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              color: isBusy ? accent : "#E2E8F0",
            }}>
              {displayName}
            </span>
            <span style={{
              fontSize: 11, fontFamily: "monospace",
              padding: "4px 10px", borderRadius: 6, flexShrink: 0,
              background: statusBg, color: statusColor,
            }}>
              {agent.status}
            </span>
            {agoLabel && (
              <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
                {agoLabel}
              </span>
            )}
          </div>
          <span style={{
            fontSize: 13, color: "#64748B",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {agent.preview?.slice(0, 80) || "\u00a0"}
          </span>
          {feedLog && feedLog.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
              {feedLog.slice(0, 3).map((entry, i) => {
                const ago = Math.round((Date.now() - entry.ts) / 1000);
                const agoStr = ago < 60 ? `${ago}s` : `${Math.floor(ago / 60)}m`;
                return (
                  <span key={i} style={{
                    fontSize: 10, fontFamily: "monospace",
                    color: "oklch(0.85 0.20 142)", opacity: i === 0 ? 0.8 : 0.4 - i * 0.1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {entry.text} <span style={{ color: "rgba(255,255,255,0.12)" }}>{agoStr}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Mic button */}
        {send && (
          <button
            style={{
              width: isMobile ? 44 : 40, height: isMobile ? 44 : 40, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", border: "none",
              background: inputOpen ? accent : `${accent}20`,
              boxShadow: inputOpen ? `0 0 16px ${accent}80` : "none",
              transition: "background 0.2s, box-shadow 0.2s",
            }}
            onClick={handleMic}
            aria-label={`Talk to ${displayName}`}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
              stroke={inputOpen ? "#000" : accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x={9} y={1} width={6} height={11} rx={3} />
              <path d="M19 10v1a7 7 0 01-14 0v-1M12 18v4M8 22h8" />
            </svg>
          </button>
        )}
      </div>

      {/* Inline input */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "0 24px",
          height: inputOpen ? 56 : 0,
          opacity: inputOpen ? 1 : 0,
          overflow: "hidden",
          transition: "height 0.2s, opacity 0.2s",
          background: `${accent}08`,
          borderBottom: inputOpen && !isLast ? "1px solid rgba(255,255,255,0.04)" : "none",
        }}
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSend(); if (e.key === "Escape") setInputOpen(false); }}
          onBlur={() => { if (!text.trim()) setTimeout(() => setInputOpen(false), 200); }}
          placeholder={`Talk to ${displayName}...`}
          style={{
            flex: 1, padding: "12px 16px", borderRadius: 12, fontSize: 15,
            color: "#fff", outline: "none",
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${accent}20`,
          }}
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="off"
          tabIndex={inputOpen ? 0 : -1}
        />
        {sent ? (
          <span style={{
            fontSize: 12, fontFamily: "monospace", padding: "8px 12px", borderRadius: 8,
            background: "#22d3ee20", color: "#22d3ee",
          }}>✓</span>
        ) : (
          <button
            style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0, cursor: "pointer", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: text.trim() ? accent : `${accent}20`,
              transition: "background 0.2s",
            }}
            onClick={handleSend}
            tabIndex={inputOpen ? 0 : -1}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
              stroke={text.trim() ? "#000" : `${accent}50`}
              strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});
