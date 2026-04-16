import { useRef, useCallback } from "react";
import { XTerminal, type XTerminalHandle } from "./XTerminal";
import { PixelKey, NAV_KEYS, CTRL_KEYS } from "./PixelKey";
import { C, statusColor } from "../lib/theme";
import type { AgentState } from "../lib/types";

interface TerminalPaneProps {
  agent: AgentState;
  onClose: () => void;
  onNavigate: (dir: -1 | 1) => void;
  siblings: AgentState[];
  onSelectSibling: (agent: AgentState) => void;
  /** true on mobile — fills full remaining viewport height, no border */
  fullscreen?: boolean;
  /** override panel width (default 420, tablet uses "40vw") */
  paneWidth?: number | string;
}

export function TerminalPane({
  agent, onClose, onNavigate, siblings, onSelectSibling, fullscreen, paneWidth = 420,
}: TerminalPaneProps) {
  const xtermRef = useRef<XTerminalHandle>(null);
  const sc = statusColor(agent.status);
  const name = agent.name.replace(/-oracle$/, "").replace(/-/g, " ").toUpperCase();

  const sendKey = useCallback((seq: string) => {
    xtermRef.current?.sendInput(seq);
  }, []);

  return (
    // No position:fixed — fills height of flex parent (100dvh − topNav).
    // This is the definitive mobile keyboard fix: the parent shrinks with
    // the visual viewport via 100dvh, we just fill it with flex.
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: fullscreen ? "100%" : paneWidth,
      height: "100%",
      background: "#0a0a0f",
      borderLeft: fullscreen ? "none" : `1px solid ${C.border}`,
      flexShrink: 0,
      overflow: "hidden",
      fontFamily: C.font,
    }}>

      {/* ── Header ─────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 12px",
        height: 36,
        background: C.panel,
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: sc,
          boxShadow: `0 0 5px ${sc}`,
          flexShrink: 0,
          animation: agent.status === "busy" ? "agent-pulse 1s infinite" : undefined,
        }} />
        <span style={{ fontSize: 8, color: sc, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </span>
        <span style={{ fontSize: 7, color: C.textMid, flexShrink: 0 }}>
          {agent.target}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 16, color: C.textMid, lineHeight: 1,
            padding: "0 2px", marginLeft: 4, flexShrink: 0,
          }}
          title="Close (Esc)"
        >
          ×
        </button>
      </div>

      {/* ── Sibling tabs ───────────────────────── */}
      {siblings.length > 1 && (
        <div style={{
          display: "flex",
          overflowX: "auto",
          background: "#0c0c14",
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          {siblings.map((s, i) => {
            const active = s.target === agent.target;
            const ssc = statusColor(s.status);
            const sname = s.name.replace(/-oracle$/, "").replace(/-/g, " ");
            return (
              <button
                key={s.target}
                onClick={() => onSelectSibling(s)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "4px 10px",
                  background: "transparent",
                  border: "none",
                  borderBottom: active ? `2px solid ${ssc}` : "2px solid transparent",
                  color: active ? C.text : C.textMid,
                  fontSize: 7,
                  fontFamily: C.font,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: ssc, flexShrink: 0 }} />
                {i < 9 && <span style={{ fontSize: 6, color: C.textDim }}>{i + 1}</span>}
                {sname}
              </button>
            );
          })}
        </div>
      )}

      {/* ── XTerminal ──────────────────────────── */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <XTerminal
          ref={xtermRef}
          target={agent.target}
          style={{ position: "absolute", inset: 0 }}
        />
      </div>

      {/* ── Key row ────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 10px",
        background: "#080910",
        borderTop: `1px solid ${C.border}`,
        flexShrink: 0,
        flexWrap: "wrap",
        paddingBottom: fullscreen ? "calc(5px + env(safe-area-inset-bottom, 0px))" : 5,
      }}>
        {NAV_KEYS.slice(0, 6).map(({ label, seq }) => (
          <PixelKey key={label} label={label} seq={seq} dotColor={sc} sendKey={sendKey} small />
        ))}
        <div style={{ width: 1, height: 14, background: C.border2, flexShrink: 0 }} />
        {CTRL_KEYS.map(({ label, seq, title }) => (
          <PixelKey key={label} label={label} seq={seq} dotColor={sc} sendKey={sendKey} title={title} accent small />
        ))}
        {siblings.length > 1 && (
          <>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => onNavigate(-1)}
              style={{ background: "none", border: `1px solid ${C.border2}`, color: C.textMid, fontSize: 7, cursor: "pointer", padding: "2px 7px", fontFamily: C.font }}
            >←</button>
            <button
              onClick={() => onNavigate(1)}
              style={{ background: "none", border: `1px solid ${C.border2}`, color: C.textMid, fontSize: 7, cursor: "pointer", padding: "2px 7px", fontFamily: C.font }}
            >→</button>
          </>
        )}
      </div>
    </div>
  );
}
