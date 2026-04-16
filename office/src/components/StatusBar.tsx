import { memo, useState } from "react";
import { useViewport } from "../hooks/useViewport";

interface StatusBarProps {
  connected: boolean;
  agentCount: number;
  sessionCount: number;
  activeView?: string;
  onJump?: () => void;
}

const NAV_ITEMS = [
  { href: "/office/#office",    label: "OFFICE",    id: "office"    },
  { href: "/office/#fleet",     label: "FLEET",     id: "fleet"     },
  { href: "/office/#overview",  label: "OVERVIEW",  id: "overview"  },
  { href: "/office/#worktree",  label: "WORKTREE",  id: "worktree"  },
  { href: "/",                  label: "TERMINAL",  id: "terminal"  },
];

const VIEW_TITLE: Record<string, string> = {
  office:   "LOKI PIXFICE",
  fleet:    "FLEET",
  overview: "OVERVIEW",
  worktree: "WORKTREES",
};

const NAV_ICONS: Record<string, string> = {
  office: "🏢", fleet: "🚀", overview: "📊", worktree: "🌿", terminal: "💻",
};

export const StatusBar = memo(function StatusBar({
  connected,
  agentCount,
  sessionCount,
  activeView = "office",
  onJump,
}: StatusBarProps) {
  const title = VIEW_TITLE[activeView] ?? "LOKI PIXFICE";
  const { isMobile } = useViewport();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ position: "relative", zIndex: 10, flexShrink: 0 }}>
      <div
        style={{
          background: "#0a0b16",
          borderBottom: "2px solid #1e2840",
          padding: isMobile ? "8px 14px" : "10px 20px",
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 10 : 18,
          fontFamily: "'Silkscreen', 'SF Mono', monospace",
          imageRendering: "pixelated",
        }}
      >
        {/* Pixel logo */}
        <div style={{
          width: 10, height: 10, background: "#5a8cff", flexShrink: 0,
          boxShadow: "0 0 8px #5a8cff80",
          animation: "pixel-glow 2s ease-in-out infinite",
        }} />

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: isMobile ? 10 : 14, color: "#5a8cff", letterSpacing: isMobile ? 1 : 3 }}>
            {isMobile ? title : title}
          </span>
          {!isMobile && <span style={{ fontSize: 7, color: "#2a3a60", letterSpacing: 2 }}>HEADQUARTERS</span>}
        </div>

        {!isMobile && <div style={{ width: 2, height: 36, background: "#1e2840", flexShrink: 0 }} />}

        {/* Counters — hide on mobile to save space */}
        {!isMobile && (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 22, color: "#8090c0", fontWeight: "bold", lineHeight: 1 }}>{agentCount}</span>
              <span style={{ fontSize: 7, color: "#445566" }}>AGENTS</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 22, color: "#5a8cff", fontWeight: "bold", lineHeight: 1 }}>{sessionCount}</span>
              <span style={{ fontSize: 7, color: "#445566" }}>ROOMS</span>
            </div>
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Jump button — desktop only */}
        {onJump && !isMobile && (
          <button
            onClick={onJump}
            title="Jump to agent (J / Ctrl+K)"
            style={{
              padding: "6px 12px", borderRadius: 6,
              fontSize: 9, cursor: "pointer",
              fontFamily: "'Silkscreen', 'SF Mono', monospace",
              background: "rgba(90,140,255,0.15)",
              color: "#5a8cff",
              border: "1px solid rgba(90,140,255,0.25)",
              flexShrink: 0,
            }}
          >
            ⌘J JUMP
          </button>
        )}

        {/* Desktop: nav links inline */}
        {!isMobile && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  style={{
                    fontSize: 10,
                    fontFamily: "'Silkscreen', 'SF Mono', monospace",
                    color: activeView === item.id ? "#5a8cff" : "#5a6a80",
                    textDecoration: "none",
                    borderBottom: activeView === item.id ? "2px solid #5a8cff" : "2px solid transparent",
                    paddingBottom: 3,
                    letterSpacing: 1,
                    transition: "color 0.15s",
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div style={{ width: 2, height: 36, background: "#1e2840", flexShrink: 0 }} />
          </>
        )}

        {/* Connection */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div style={{
            width: 8, height: 8,
            background: connected ? "#22d3ee" : "#ff6b6b",
            animation: connected ? "pixel-glow 2s ease-in-out infinite" : "agent-pulse 0.8s ease-in-out infinite",
          }} />
          {!isMobile && (
            <span style={{ fontSize: 9, color: connected ? "#22d3ee" : "#ff6b6b" }}>
              {connected ? "LIVE" : "DISC"}
            </span>
          )}
        </div>

        {/* Mobile: hamburger menu button */}
        {isMobile && (
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              background: menuOpen ? "#5a8cff20" : "none",
              border: `1px solid ${menuOpen ? "#5a8cff60" : "#2a3a50"}`,
              color: menuOpen ? "#5a8cff" : "#8090c0",
              fontSize: 18,
              padding: "4px 10px",
              cursor: "pointer",
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        )}
      </div>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#0a0b16",
            borderBottom: "2px solid #1e2840",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = activeView === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 20px",
                  textDecoration: "none",
                  fontFamily: "'Silkscreen', 'SF Mono', monospace",
                  fontSize: 10,
                  color: active ? "#5a8cff" : "#5a6a80",
                  background: active ? "#5a8cff10" : "transparent",
                  borderLeft: active ? "3px solid #5a8cff" : "3px solid transparent",
                  borderBottom: "1px solid #1a2030",
                }}
              >
                <span style={{ fontSize: 18 }}>{NAV_ICONS[item.id] ?? "▶"}</span>
                <span>{item.label}</span>
              </a>
            );
          })}
          {/* Stats row in dropdown */}
          <div style={{
            display: "flex", gap: 20, padding: "10px 20px",
            fontFamily: "'Silkscreen', 'SF Mono', monospace",
            borderTop: "1px solid #1e2840",
          }}>
            <span style={{ fontSize: 8, color: "#445566" }}>
              <span style={{ color: "#8090c0", fontSize: 14 }}>{agentCount}</span> AGENTS
            </span>
            <span style={{ fontSize: 8, color: "#445566" }}>
              <span style={{ color: "#5a8cff", fontSize: 14 }}>{sessionCount}</span> ROOMS
            </span>
            {onJump && (
              <button onClick={() => { setMenuOpen(false); onJump(); }} style={{
                marginLeft: "auto", background: "rgba(90,140,255,0.15)",
                border: "1px solid rgba(90,140,255,0.25)", color: "#5a8cff",
                fontSize: 8, fontFamily: "'Silkscreen', 'SF Mono', monospace",
                padding: "4px 10px", cursor: "pointer",
              }}>⌘J JUMP</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
