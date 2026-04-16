import { memo, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { roomStyle } from "../lib/constants";
import type { AgentState } from "../lib/types";

function sessionNum(name: string): number {
  const m = name.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : -1;
}

interface JumpOverlayProps {
  agents: AgentState[];
  onSelect: (agent: AgentState) => void;
  onClose: () => void;
}

export const JumpOverlay = memo(function JumpOverlay({
  agents,
  onSelect,
  onClose,
}: JumpOverlayProps) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return agents;
    const q = query.toLowerCase().trim();
    // "8 1" or "8.1" → session prefix 8, window index 1
    const numMatch = q.match(/^(\d+)\s*[.\s]\s*(\d+)$/);
    if (numMatch) {
      const sNum = parseInt(numMatch[1], 10);
      const wIdx = parseInt(numMatch[2], 10);
      return agents.filter(a => sessionNum(a.session) === sNum && a.windowIndex === wIdx);
    }
    if (/^\d+$/.test(q)) {
      const num = parseInt(q, 10);
      const exact = agents.filter(a => sessionNum(a.session) === num);
      if (exact.length > 0) return exact;
    }
    return agents.filter(a => {
      const haystack = `${a.name} ${a.session} ${a.target}`.toLowerCase();
      return q.split(/\s+/).every(word => haystack.includes(word));
    });
  }, [agents, query]);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0) { onSelect(filtered[selectedIdx]); onClose(); }
      return;
    }
  }, [filtered, selectedIdx, onSelect, onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "12vh",
        background: "rgba(2,2,8,0.88)",
        backdropFilter: "blur(8px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        display: "flex", flexDirection: "column",
        width: "100%", maxWidth: 560, maxHeight: "70vh",
        background: "#0a0b16",
        border: "1px solid rgba(90,140,255,0.2)",
        borderRadius: 12,
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        overflow: "hidden",
        fontFamily: "'Silkscreen', 'SF Mono', monospace",
      }}>
        {/* Search input */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <span style={{ color: "#5a8cff", fontSize: 16, flexShrink: 0 }}>⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "rgba(255,255,255,0.9)", caretColor: "#5a8cff",
              fontFamily: "monospace", fontSize: 13,
            }}
            placeholder="Jump to agent... (8 1 = session 8 window 1)"
            spellCheck={false}
            autoComplete="off"
            autoFocus
          />
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", flexShrink: 0 }}>
            {filtered.length}/{agents.length}
          </span>
        </div>

        {/* Results list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "monospace" }}>
              No match
            </div>
          )}
          {filtered.map((agent, i) => {
            const style = roomStyle(agent.session);
            const displayName = agent.name.replace(/-oracle$/, "").replace(/-/g, " ");
            const statusColor = agent.status === "busy" ? "oklch(0.85 0.20 142)" : agent.status === "ready" ? "#22d3ee" : "#555";
            const isSelected = i === selectedIdx;
            return (
              <div
                key={agent.target}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 16px",
                  cursor: "pointer",
                  background: isSelected ? `${style.accent}15` : "transparent",
                  borderLeft: `3px solid ${isSelected ? style.accent : "transparent"}`,
                  transition: "background 0.1s",
                }}
                onClick={() => { onSelect(agent); onClose(); }}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                <kbd style={{
                  width: 28, height: 28, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 6, fontSize: 10, fontWeight: "bold", fontFamily: "monospace",
                  background: `${style.accent}20`, color: style.accent, border: `1px solid ${style.accent}30`,
                }}>
                  {sessionNum(agent.session) >= 0 ? sessionNum(agent.session) : "·"}
                </kbd>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: statusColor,
                  boxShadow: agent.status !== "idle" ? `0 0 4px ${statusColor}` : undefined,
                }} />
                <span style={{
                  fontSize: 11, fontFamily: "monospace", fontWeight: "bold",
                  color: isSelected ? style.accent : "#cdd6f4",
                }}>
                  {displayName}
                </span>
                <span style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>
                  {agent.session}:{agent.windowIndex}
                </span>
                <span style={{
                  fontSize: 8, fontFamily: "monospace",
                  padding: "2px 6px", borderRadius: 4,
                  background: agent.status === "busy" ? "oklch(0.85 0.20 142)18" : agent.status === "ready" ? "#22d3ee14" : "rgba(255,255,255,0.04)",
                  color: statusColor,
                }}>
                  {agent.status}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer hints */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 16px",
          background: "#08080c", borderTop: "1px solid rgba(255,255,255,0.04)",
          fontSize: 8, fontFamily: "monospace", color: "rgba(255,255,255,0.2)",
        }}>
          <span>↑↓ navigate · Enter open · Esc close</span>
          <span>J or Ctrl+K to jump</span>
        </div>
      </div>
    </div>
  );
});
