import { memo, useMemo, useState, useEffect, useRef } from "react";
import { LeftSidebar } from "./LeftSidebar";
import { DepartmentRoom } from "./DepartmentRoom";
import { ChatPanel } from "./ChatPanel";
import { useViewport } from "../hooks/useViewport";
import { agentCategory, type AgentCategory } from "../lib/constants";
import type { AgentState, Session } from "../lib/types";
import type { ActivityMsg } from "../hooks/useMessages";

interface CEOBarProps {
  agents: AgentState[];
  sessions: Session[];
  connected: boolean;
  isMobile: boolean;
  onChatToggle?: () => void;
  chatOpen?: boolean;
  activeRoute?: string;
}

const ALL_NAV = [
  { href: "/office/#office",    label: "OFFICE",    icon: "🏢", id: "office"    },
  { href: "/office/#fleet",     label: "FLEET",     icon: "🚀", id: "fleet"     },
  { href: "/office/#overview",  label: "OVERVIEW",  icon: "📊", id: "overview"  },
  { href: "/office/#worktree",  label: "WORKTREE",  icon: "🌿", id: "worktree"  },
  { href: "/",                  label: "TERMINAL",  icon: "💻", id: "terminal"  },
];

// ── CEO Bar ────────────────────────────────────────────────────────────────────
const CEOBar = memo(function CEOBar({
  agents, sessions, connected, isMobile, onChatToggle, chatOpen, activeRoute = "office",
}: CEOBarProps) {
  const busy  = agents.filter((a) => a.status === "busy").length;
  const ready = agents.filter((a) => a.status === "ready").length;
  const total = agents.length;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const stat = (label: string, val: number, color: string, anim?: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{
        fontSize: isMobile ? 24 : 28, color, fontWeight: "bold",
        fontFamily: "'Silkscreen', 'SF Mono', monospace",
        animation: anim && val > 0 ? "agent-pulse 1s infinite" : "none",
        lineHeight: 1,
      }}>
        {val}
      </span>
      <span style={{ fontSize: isMobile ? 6 : 8, color: "#445566", fontFamily: "'Silkscreen', 'SF Mono', monospace" }}>
        {label}
      </span>
    </div>
  );

  return (
    <div style={{ position: "relative", flexShrink: 0 }} ref={menuRef}>
      <div style={{
        background: "#0a0b16",
        borderBottom: "2px solid #1e2840",
        padding: isMobile ? "10px 14px" : "12px 20px",
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 12 : 20,
        fontFamily: "'Silkscreen', 'SF Mono', monospace",
        imageRendering: "pixelated",
      }}>
        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: isMobile ? 11 : 17, color: "#5a8cff", letterSpacing: isMobile ? 2 : 4 }}>
            {isMobile ? "PIXFICE" : "LOKI PIXFICE"}
          </span>
          {!isMobile && (
            <span style={{ fontSize: 8, color: "#2a3a60", letterSpacing: 2 }}>HEADQUARTERS</span>
          )}
        </div>

        <div style={{ width: 2, height: 36, background: "#1e2840", flexShrink: 0 }} />

        {/* Stats */}
        {stat("STAFF", total, "#8090c0")}
        {stat("WORK", busy, "oklch(0.85 0.20 142)", true)}
        {!isMobile && stat("READY", ready, "#22d3ee")}
        {!isMobile && stat("ROOMS", sessions.length, "#5a8cff")}

        {/* Power bar */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 40 }}>
          <div style={{ height: 8, background: "#1a2030" }}>
            <div style={{
              height: "100%",
              width: `${total > 0 ? (busy / total) * 100 : 0}%`,
              background: busy > 4 ? "#ff6040" : busy > 2 ? "#ffa040" : "oklch(0.85 0.20 142)",
              transition: "width 0.5s ease",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 7, color: "#2a3a50" }}>PWR</span>
            <span style={{ fontSize: 7, color: "oklch(0.85 0.20 142)" }}>
              {total > 0 ? Math.round((busy / total) * 100) : 0}%
            </span>
          </div>
        </div>

        <div style={{ width: 2, height: 36, background: "#1e2840", flexShrink: 0 }} />

        {/* Desktop nav */}
        {!isMobile && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              {ALL_NAV.map((n) => {
                const active = n.id === activeRoute;
                return (
                  <a key={n.id} href={n.href} style={{
                    fontSize: 10,
                    fontFamily: "'Silkscreen', 'SF Mono', monospace",
                    color: active ? "#5a8cff" : "#5a6a80",
                    textDecoration: "none",
                    borderBottom: active ? "2px solid #5a8cff" : "2px solid transparent",
                    paddingBottom: 3,
                    letterSpacing: 1,
                    transition: "color 0.15s",
                  }}>
                    {n.label}
                  </a>
                );
              })}
            </div>
            <div style={{ width: 2, height: 36, background: "#1e2840", flexShrink: 0 }} />
          </>
        )}

        {/* Connection status */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div style={{
            width: 8, height: 8,
            background: connected ? "#22d3ee" : "#ff6b6b",
            animation: connected ? "pixel-glow 2s infinite" : "agent-pulse 0.8s infinite",
          }} />
          {!isMobile && (
            <span style={{ fontSize: 9, color: connected ? "#22d3ee" : "#ff6b6b" }}>
              {connected ? "LIVE" : "DISC"}
            </span>
          )}
        </div>

        {/* Mobile: chat + hamburger */}
        {isMobile && (
          <>
            <button
              onClick={onChatToggle}
              style={{
                background: chatOpen ? "#5a8cff30" : "#111828",
                border: `2px solid ${chatOpen ? "#5a8cff" : "#2a3a50"}`,
                color: chatOpen ? "#5a8cff" : "#8090c0",
                fontSize: 16, padding: "4px 8px",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              💬
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                background: menuOpen ? "#5a8cff20" : "none",
                border: `1px solid ${menuOpen ? "#5a8cff60" : "#2a3a50"}`,
                color: menuOpen ? "#5a8cff" : "#8090c0",
                fontSize: 18, padding: "4px 10px",
                cursor: "pointer", flexShrink: 0, lineHeight: 1,
              }}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </>
        )}
      </div>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "#0a0b16", borderBottom: "2px solid #1e2840",
          zIndex: 100, display: "flex", flexDirection: "column",
        }}>
          {ALL_NAV.map((item) => {
            const active = item.id === activeRoute;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 20px", textDecoration: "none",
                  fontFamily: "'Silkscreen', 'SF Mono', monospace", fontSize: 10,
                  color: active ? "#5a8cff" : "#5a6a80",
                  background: active ? "#5a8cff10" : "transparent",
                  borderLeft: active ? "3px solid #5a8cff" : "3px solid transparent",
                  borderBottom: "1px solid #1a2030",
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ── Main pixel office view ─────────────────────────────────────────────────────
interface PixelOfficeViewProps {
  sessions: Session[];
  agents: AgentState[];
  msgs: ActivityMsg[];
  connected: boolean;
  send: (msg: object) => void;
  onSelectAgent: (a: AgentState) => void;
}

export const PixelOfficeView = memo(function PixelOfficeView({
  sessions, agents, msgs, connected, send, onSelectAgent,
}: PixelOfficeViewProps) {
  const { isMobile, isTablet } = useViewport();
  const [chatOpen, setChatOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState(window.location.hash.slice(1) || "office");
  useEffect(() => {
    const onHash = () => setActiveRoute(window.location.hash.slice(1) || "office");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Build virtual rooms: split multi-category sessions by agent type
  const virtualRooms = useMemo(() => {
    type VRoom = { key: string; session: Session; agents: AgentState[]; idx: number };
    const result: VRoom[] = [];
    let idx = 0;
    for (const s of sessions) {
      const sa = agents.filter(a => a.session === s.name);
      // Check if session has multiple categories
      const cats = new Set(sa.map(a => agentCategory(a.name)));
      if (cats.size <= 1) {
        result.push({ key: s.name, session: s, agents: sa, idx: idx++ });
      } else {
        const ORDER: AgentCategory[] = ["local", "cloud", "gemini", "terminal"];
        for (const cat of ORDER) {
          const catAgents = sa.filter(a => agentCategory(a.name) === cat);
          if (catAgents.length === 0) continue;
          const virtualSession: Session = { name: `${s.name}:${cat}`, windows: s.windows };
          result.push({ key: `${s.name}:${cat}`, session: virtualSession, agents: catAgents, idx: idx++ });
        }
      }
    }
    return result;
  }, [sessions, agents]);

  // Responsive grid columns
  const gridCols = isMobile
    ? "1fr"
    : isTablet
    ? "repeat(auto-fill, minmax(340px, 1fr))"
    : "repeat(auto-fill, minmax(400px, 1fr))";

  const chatPanel = (
    <ChatPanel
      msgs={msgs}
      agents={agents}
      connected={connected}
      send={send}
      onSelectAgent={onSelectAgent}
      isMobile={isMobile}
    />
  );

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      width: "100vw",
      overflow: "hidden",
      position: "relative",
      background: "#060614",
    }}>

      {/* Left sidebar — desktop only */}
      {!isMobile && (
        <LeftSidebar sessions={sessions} agents={agents} activeView="office" />
      )}

      {/* Center column */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        zIndex: 1,
      }}>
        <CEOBar
          agents={agents}
          sessions={sessions}
          connected={connected}
          isMobile={isMobile}
          onChatToggle={() => setChatOpen((v) => !v)}
          chatOpen={chatOpen}
          activeRoute={activeRoute}
        />

        {/* Mobile chat panel — slides in below navbar, above bottom nav */}
        {isMobile && chatOpen ? (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Close bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 14px", background: "#0a0b16", borderBottom: "2px solid #1e2840",
              flexShrink: 0, fontFamily: "'Silkscreen', 'SF Mono', monospace",
            }}>
              <span style={{ fontSize: 11, color: "#5a8cff", letterSpacing: 2 }}>CHAT</span>
              <button onClick={() => setChatOpen(false)} style={{
                background: "none", border: "none", color: "#445566",
                fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "0 4px",
              }}>✕</button>
            </div>
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {chatPanel}
            </div>
          </div>
        ) : (
          /* Room grid */
          <div style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: isMobile ? "12px 10px" : "16px 20px",
            paddingBottom: 16,
          }}>
            {virtualRooms.length === 0 ? (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", height: "60%", gap: 20,
                fontFamily: "'Silkscreen', 'SF Mono', monospace",
              }}>
                <div style={{ fontSize: 56, opacity: 0.3 }}>🔮</div>
                <div style={{ fontSize: isMobile ? 10 : 14, color: "#2a3a50" }}>NO SESSIONS FOUND</div>
                <div style={{ fontSize: isMobile ? 7 : 9, color: "#1a2030" }}>start a tmux session to populate rooms</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: isMobile ? "12px" : "18px" }}>
                {virtualRooms.map(({ key, session, agents: ra, idx }) => (
                  <DepartmentRoom
                    key={key}
                    session={session}
                    agents={ra}
                    sessionIdx={idx}
                    onSelectAgent={onSelectAgent}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            )}
            <div style={{ height: 32 }} />
          </div>
        )}
      </div>

      {/* Right chat panel — desktop inline only */}
      {!isMobile && (
        <div style={{ position: "relative", zIndex: 1, height: "100vh" }}>
          {chatPanel}
        </div>
      )}

    </div>
  );
});
