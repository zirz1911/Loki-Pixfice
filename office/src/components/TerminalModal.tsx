/**
 * TerminalModal — full-screen overlay terminal (Paji-Exo style)
 *
 * Mobile keyboard fix:
 *   position: fixed + height: 100dvh (NOT 100vh, NOT bottom:0).
 *   dvh = dynamic viewport height — shrinks when the keyboard opens.
 */
import { useRef, useCallback, useState } from "react";
import { CapturePane, type CapturePaneHandle } from "./CapturePane";
import { PixelKey, NAV_KEYS, CTRL_KEYS } from "./PixelKey";
import { C, statusColor } from "../lib/theme";
import { useViewport } from "../hooks/useViewport";
import type { AgentState } from "../lib/types";

interface TerminalModalProps {
  agent: AgentState;
  onClose: () => void;
  onNavigate: (dir: -1 | 1) => void;
  onSelectSibling: (agent: AgentState) => void;
  siblings: AgentState[];
}

function cleanName(name: string) {
  return name.replace(/-oracle$/, "").replace(/-/g, " ").toUpperCase();
}

export function TerminalModal({ agent, onClose, onNavigate, onSelectSibling, siblings }: TerminalModalProps) {
  const { isMobile } = useViewport();
  const captureRef = useRef<CapturePaneHandle>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const [inputVal, setInputVal] = useState("");

  const sc = statusColor(agent.status);

  const sendKey = useCallback((seq: string) => {
    captureRef.current?.sendInput(seq);
  }, []);

  const submitInput = useCallback(() => {
    if (!inputVal) return;
    captureRef.current?.sendInput(inputVal + "\r");
    setInputVal("");
    inputRef.current?.focus();
  }, [inputVal]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.altKey && e.key === "ArrowLeft")  { e.preventDefault(); onNavigate(-1); return; }
    if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); onNavigate(1);  return; }
    if (e.altKey && e.key >= "1" && e.key <= "9") {
      const idx = parseInt(e.key) - 1;
      if (idx < siblings.length) { e.preventDefault(); onSelectSibling(siblings[idx]); }
    }
  }, [onClose, onNavigate, siblings, onSelectSibling]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        height: "100dvh",
        zIndex: 100,
        display: "flex",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "center",
        background: isMobile ? C.bg : "rgba(0,0,0,0.82)",
        fontFamily: C.font,
      }}
      onClick={(e) => { if (!isMobile && e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
    >
      <div style={isMobile ? {
        width: "100%", height: "100%",
        background: C.bg,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      } : {
        width: "90vw", maxWidth: 960,
        height: "82vh",
        background: "#0a0a0f",
        border: `1px solid ${sc}40`,
        boxShadow: `0 0 40px ${sc}12, 0 24px 80px rgba(0,0,0,0.85)`,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* ── Title bar ─────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "0 12px",
          height: 36,
          background: C.panel,
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          {/* macOS dots */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={onClose}
              style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57", border: "none", cursor: "pointer", padding: 0 }} />
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#febc2e", display: "block" }} />
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c840", display: "block" }} />
          </div>

          <div style={{ width: 1, height: 16, background: C.border2, flexShrink: 0 }} />

          {/* Sibling tabs */}
          <div style={{ display: "flex", alignItems: "stretch", height: "100%", overflowX: "auto", flex: 1 }}>
            {siblings.map((s, i) => {
              const active = s.target === agent.target;
              const ssc = statusColor(s.status);
              return (
                <button key={s.target} onClick={() => onSelectSibling(s)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "0 10px",
                    background: "transparent",
                    border: "none",
                    borderBottom: active ? `2px solid ${ssc}` : "2px solid transparent",
                    color: active ? C.text : C.textMid,
                    fontSize: 7, fontFamily: C.font,
                    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  }}
                >
                  <span style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: ssc, flexShrink: 0,
                    boxShadow: s.status === "busy" ? `0 0 4px ${ssc}` : undefined,
                    animation: s.status === "busy" ? "agent-pulse 1s infinite" : undefined,
                  }} />
                  {i < 9 && <span style={{ fontSize: 6, color: C.textDim }}>{i+1}</span>}
                  {cleanName(s.name)}
                </button>
              );
            })}
          </div>

          {/* Status + close */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{
              fontSize: 6, color: sc,
              background: `${sc}10`, padding: "2px 7px",
              border: `1px solid ${sc}25`,
            }}>
              {agent.status.toUpperCase()}
            </span>
            {siblings.length > 1 && (
              <span style={{ fontSize: 6, color: C.textDim }}>ALT+1-{Math.min(9, siblings.length)}</span>
            )}
            <button onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: C.textMid, padding: "0 2px", lineHeight: 1 }}
              title="Close (Esc)"
            >×</button>
          </div>
        </div>

        {/* ── Agent strip ───────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "4px 12px",
          background: C.panel,
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: sc, flexShrink: 0,
            boxShadow: agent.status === "busy" ? `0 0 6px ${sc}` : undefined,
            animation: agent.status === "busy" ? "agent-pulse 1s infinite" : undefined,
          }} />
          <span style={{ fontSize: 8, color: sc, letterSpacing: 1 }}>{cleanName(agent.name)}</span>
          <span style={{ fontSize: 7, color: C.textDim }}>{agent.target}</span>
        </div>

        {/* ── CapturePane ───────────────────────────── */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <CapturePane
            ref={captureRef}
            target={agent.target}
            style={{ position: "absolute", inset: 0 }}
          />
        </div>

        {/* ── Input bar ─────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 10px",
          background: C.panel,
          borderTop: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: sc, flexShrink: 0, userSelect: "none", lineHeight: 1 }}>›</span>
          <input
            ref={inputRef}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") { e.preventDefault(); submitInput(); }
            }}
            placeholder="พิมพ์ที่นี่ แล้วกด Enter ส่ง…"
            autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
            style={{
              flex: 1,
              background: C.bg,
              border: `1px solid ${sc}30`,
              color: C.text,
              fontSize: 12,
              fontFamily: C.fontMono,
              padding: "4px 8px",
              outline: "none",
              caretColor: sc,
            }}
          />
          <button onClick={submitInput}
            style={{
              background: `${sc}12`,
              border: `1px solid ${sc}40`,
              color: sc,
              fontSize: 7, fontFamily: C.font,
              padding: "4px 10px",
              cursor: "pointer", flexShrink: 0,
            }}
          >SEND</button>
        </div>

        {/* ── Key row ───────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px",
          background: "#080808",
          borderTop: `1px solid ${C.border}`,
          flexShrink: 0, flexWrap: "wrap",
          paddingBottom: isMobile ? "calc(4px + env(safe-area-inset-bottom, 0px))" : 4,
        }}>
          {NAV_KEYS.slice(0, 6).map(({ label, seq }) => (
            <PixelKey key={label} label={label} seq={seq} dotColor={sc} sendKey={sendKey} small />
          ))}
          <div style={{ width: 1, height: 12, background: C.border2, flexShrink: 0 }} />
          {CTRL_KEYS.map(({ label, seq, title }) => (
            <PixelKey key={label} label={label} seq={seq} dotColor={sc} sendKey={sendKey} title={title} accent small />
          ))}
          <div style={{ flex: 1 }} />
          {siblings.length > 1 && (
            <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
              <button onClick={() => onNavigate(-1)}
                style={{ background: "none", border: `1px solid ${C.border2}`, color: C.textMid, fontSize: 7, cursor: "pointer", padding: "2px 6px", fontFamily: C.font }}>←</button>
              <button onClick={() => onNavigate(1)}
                style={{ background: "none", border: `1px solid ${C.border2}`, color: C.textMid, fontSize: 7, cursor: "pointer", padding: "2px 6px", fontFamily: C.font }}>→</button>
            </div>
          )}
          {!isMobile && <span style={{ fontSize: 6, color: C.textDim, flexShrink: 0 }}>ESC closes · ALT+← → nav</span>}
        </div>
      </div>
    </div>
  );
}
