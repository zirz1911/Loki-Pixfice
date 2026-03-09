import { memo, useMemo, useState } from "react";
import { LeftSidebar } from "./LeftSidebar";
import { DepartmentRoom } from "./DepartmentRoom";
import { ChatPanel } from "./ChatPanel";
import { UniverseBg } from "./UniverseBg";
import { useViewport } from "../hooks/useViewport";
import type { AgentState, Session } from "../lib/types";
import type { ActivityMsg } from "../hooks/useMessages";

interface CEOBarProps {
  agents: AgentState[];
  sessions: Session[];
  connected: boolean;
  isMobile: boolean;
  onChatToggle?: () => void;
  chatOpen?: boolean;
}

const TOP_NAV = [
  { href: "/office/#office",  label: "OFFICE",   id: "office"   },
  { href: "/office/#mission", label: "MISSION",  id: "mission"  },
  { href: "/office/#game",    label: "GAME",     id: "game"     },
  { href: "/",                label: "TERMINAL", id: "terminal" },
];

const MOBILE_NAV = [
  { href: "/office/#office",  label: "OFFICE",  icon: "🏢", id: "office"  },
  { href: "/office/#mission", label: "MISSION", icon: "🌌", id: "mission" },
  { href: "/office/#game",    label: "GAME",    icon: "🎮", id: "game"    },
];

// ── CEO Bar ────────────────────────────────────────────────────────────────────
const CEOBar = memo(function CEOBar({
  agents, sessions, connected, isMobile, onChatToggle, chatOpen,
}: CEOBarProps) {
  const busy  = agents.filter((a) => a.status === "busy").length;
  const ready = agents.filter((a) => a.status === "ready").length;
  const total = agents.length;

  const stat = (label: string, val: number, color: string, anim?: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{
        fontSize: isMobile ? 24 : 28, color, fontWeight: "bold",
        fontFamily: "'Press Start 2P', monospace",
        animation: anim && val > 0 ? "agent-pulse 1s infinite" : "none",
        lineHeight: 1,
      }}>
        {val}
      </span>
      <span style={{ fontSize: isMobile ? 6 : 8, color: "#445566", fontFamily: "'Press Start 2P', monospace" }}>
        {label}
      </span>
    </div>
  );

  return (
    <div style={{
      background: "#0a0b16",
      borderBottom: "2px solid #1e2840",
      padding: isMobile ? "10px 14px" : "12px 20px",
      display: "flex",
      alignItems: "center",
      gap: isMobile ? 12 : 20,
      flexShrink: 0,
      fontFamily: "'Press Start 2P', monospace",
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
      {stat("WORK", busy, "#fdd835", true)}
      {!isMobile && stat("READY", ready, "#4caf50")}
      {!isMobile && stat("ROOMS", sessions.length, "#5a8cff")}

      {/* Power bar */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 40 }}>
        <div style={{ height: 8, background: "#1a2030" }}>
          <div style={{
            height: "100%",
            width: `${total > 0 ? (busy / total) * 100 : 0}%`,
            background: busy > 4 ? "#ff6040" : busy > 2 ? "#ffa040" : "#fdd835",
            transition: "width 0.5s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 7, color: "#2a3a50" }}>PWR</span>
          <span style={{ fontSize: 7, color: "#fdd835" }}>
            {total > 0 ? Math.round((busy / total) * 100) : 0}%
          </span>
        </div>
      </div>

      <div style={{ width: 2, height: 36, background: "#1e2840", flexShrink: 0 }} />

      {/* Desktop nav */}
      {!isMobile && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {TOP_NAV.map((n) => (
              <a key={n.id} href={n.href} style={{
                fontSize: 10,
                fontFamily: "'Press Start 2P', monospace",
                color: n.id === "office" ? "#5a8cff" : "#5a6a80",
                textDecoration: "none",
                borderBottom: n.id === "office" ? "2px solid #5a8cff" : "2px solid transparent",
                paddingBottom: 3,
                letterSpacing: 1,
                transition: "color 0.15s",
              }}>
                {n.label}
              </a>
            ))}
          </div>
          <div style={{ width: 2, height: 36, background: "#1e2840", flexShrink: 0 }} />
        </>
      )}

      {/* Connection status */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <div style={{
          width: 10, height: 10,
          background: connected ? "#4caf50" : "#ff6b6b",
          animation: connected ? "pixel-glow 2s infinite" : "agent-pulse 0.8s infinite",
        }} />
        <span style={{ fontSize: isMobile ? 7 : 9, color: connected ? "#4caf50" : "#ff6b6b" }}>
          {connected ? "LIVE" : "DISC"}
        </span>
      </div>

      {/* Mobile: chat toggle button */}
      {isMobile && (
        <button
          onClick={onChatToggle}
          style={{
            background: chatOpen ? "#5a8cff30" : "#111828",
            border: `2px solid ${chatOpen ? "#5a8cff" : "#2a3a50"}`,
            color: chatOpen ? "#5a8cff" : "#8090c0",
            fontSize: 18,
            padding: "4px 8px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          💬
        </button>
      )}
    </div>
  );
});

// ── Bottom mobile nav ──────────────────────────────────────────────────────────
function MobileBottomNav() {
  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: "#07080f",
      borderTop: "2px solid #1e2840",
      display: "flex",
      height: 62,
      fontFamily: "'Press Start 2P', monospace",
      imageRendering: "pixelated",
    }}>
      {MOBILE_NAV.map((item) => (
        <a
          key={item.id}
          href={item.href}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            textDecoration: "none",
            color: item.id === "office" ? "#5a8cff" : "#445566",
            borderTop: item.id === "office" ? "3px solid #5a8cff" : "3px solid transparent",
          }}
        >
          <span style={{ fontSize: 22 }}>{item.icon}</span>
          <span style={{ fontSize: 7, letterSpacing: 0 }}>{item.label}</span>
        </a>
      ))}
    </div>
  );
}

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

  const sessionAgents = useMemo(() => {
    const map = new Map<string, AgentState[]>();
    for (const a of agents) {
      const arr = map.get(a.session) ?? [];
      arr.push(a);
      map.set(a.session, arr);
    }
    return map;
  }, [agents]);

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
    }}>
      <UniverseBg />

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
        />

        {/* Room grid */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: isMobile ? "12px 10px" : "16px 20px",
          paddingBottom: isMobile ? 80 : 16,
        }}>
          {sessions.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "60%", gap: 20,
              fontFamily: "'Press Start 2P', monospace",
            }}>
              <div style={{ fontSize: 56, opacity: 0.3 }}>🔮</div>
              <div style={{ fontSize: isMobile ? 10 : 14, color: "#2a3a50" }}>NO SESSIONS FOUND</div>
              <div style={{ fontSize: isMobile ? 7 : 9, color: "#1a2030" }}>start a tmux session to populate rooms</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: isMobile ? "12px" : "18px" }}>
              {sessions.map((s, i) => (
                <DepartmentRoom
                  key={s.name}
                  session={s}
                  agents={sessionAgents.get(s.name) ?? []}
                  sessionIdx={i}
                  onSelectAgent={onSelectAgent}
                  isMobile={isMobile}
                />
              ))}
            </div>
          )}
          <div style={{ height: 32 }} />
        </div>
      </div>

      {/* Right chat panel — desktop inline, mobile overlay */}
      {!isMobile && (
        <div style={{ position: "relative", zIndex: 1, height: "100vh" }}>
          {chatPanel}
        </div>
      )}

      {isMobile && chatOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          display: "flex",
          flexDirection: "column",
          background: "#07080f",
        }}>
          {/* Close bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            background: "#0a0b16",
            borderBottom: "2px solid #1e2840",
            flexShrink: 0,
            fontFamily: "'Press Start 2P', monospace",
          }}>
            <span style={{ fontSize: 11, color: "#5a8cff", letterSpacing: 2 }}>CHAT</span>
            <button
              onClick={() => setChatOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "#445566",
                fontSize: 22,
                cursor: "pointer",
                lineHeight: 1,
                padding: "0 4px",
              }}
            >x</button>
          </div>
          {/* Full height chat */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {chatPanel}
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      {isMobile && <MobileBottomNav />}
    </div>
  );
});
