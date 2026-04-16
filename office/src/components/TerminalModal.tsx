import { useRef, useCallback, useEffect } from "react";
import { PixelKey } from "./PixelKey";
import { XTerminal, type XTerminalHandle } from "./XTerminal";
import type { AgentState } from "../lib/types";
import { useViewport } from "../hooks/useViewport";

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

export function TerminalModal({ agent, send: _send, onClose, onNavigate, onSelectSibling, siblings }: TerminalModalProps) {
  const { isMobile } = useViewport();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminalHandle>(null);

  const sendKey = useCallback((seq: string) => {
    xtermRef.current?.sendInput(seq);
  }, []);

  // Mobile: adjust modal height when keyboard opens/closes
  useEffect(() => {
    if (!isMobile) return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    function onViewportChange() {
      const el = wrapperRef.current;
      if (!el) return;
      el.style.height = viewport!.height + "px";
      el.style.top = viewport!.offsetTop + "px";
    }
    viewport.addEventListener("resize", onViewportChange);
    viewport.addEventListener("scroll", onViewportChange);
    return () => {
      viewport.removeEventListener("resize", onViewportChange);
      viewport.removeEventListener("scroll", onViewportChange);
    };
  }, [isMobile]);

  // XTerminal handles its own keyboard/paste — we only need outer modal nav shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); onNavigate(-1); return; }
    if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); onNavigate(1); return; }
    if (e.altKey && e.key >= "1" && e.key <= "9") {
      const idx = parseInt(e.key) - 1;
      if (idx < siblings.length) { e.preventDefault(); onSelectSibling(siblings[idx]); }
      return;
    }
  }, [onClose, onNavigate, siblings, onSelectSibling]);

  const dotColor = STATUS_COLOR[agent.status] ?? "#445566";

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        height: isMobile ? "100dvh" : "100vh",
        zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.88)",
        fontFamily: "'Press Start 2P', monospace",
        imageRendering: "pixelated",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKeyDown}
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
              x
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

        {/* ── XTerminal (real PTY via /ws/pty) */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <XTerminal
            ref={xtermRef}
            target={agent.target}
            style={{ position: "absolute", inset: 0 }}
          />
        </div>

        {/* ── Key buttons row (mobile shortcuts + quick actions) */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 14px",
          background: "#080910",
          borderTop: "1px solid #1a2030",
          flexShrink: 0,
          flexWrap: "wrap",
          overflowX: "auto",
        }}>
          {[
            { label: "ESC", seq: "\x1b" },
            { label: "TAB", seq: "\t" },
            { label: "UP", seq: "\x1b[A" },
            { label: "DN", seq: "\x1b[B" },
            { label: "LT", seq: "\x1b[D" },
            { label: "RT", seq: "\x1b[C" },
          ].map(({ label, seq }) => (
            <PixelKey key={label} label={label} seq={seq} dotColor={dotColor} sendKey={sendKey} />
          ))}
          <div style={{ width: 1, height: 18, background: "#1a2030", flexShrink: 0 }} />
          {[
            { label: "^C", seq: "\x03", title: "Ctrl+C" },
            { label: "^D", seq: "\x04", title: "Ctrl+D" },
          ].map(({ label, seq, title }) => (
            <PixelKey key={label} label={label} seq={seq} dotColor={dotColor} sendKey={sendKey} title={title} accent />
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 7, color: "#2a3a50" }}>ESC closes  ALT+arrows nav</span>
        </div>
      </div>
    </div>
  );
}
