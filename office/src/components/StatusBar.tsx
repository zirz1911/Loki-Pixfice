import { memo } from "react";

interface StatusBarProps {
  connected: boolean;
  agentCount: number;
  sessionCount: number;
  activeView?: string;
  onJump?: () => void;
  muted?: boolean;
  onToggleMute?: () => void;
}

const NAV_ITEMS = [
  { href: "/office/#office",    label: "OFFICE",    id: "office"    },
  { href: "/office/#mission",   label: "MISSION",   id: "mission"   },
  { href: "/office/#overview",  label: "OVERVIEW",  id: "overview"  },
  { href: "/office/#game",      label: "GAME",      id: "game"      },
  { href: "/",                  label: "TERMINAL",  id: "terminal"  },
];

const VIEW_TITLE: Record<string, string> = {
  office:   "LOKI PIXFICE",
  mission:  "MISSION CTL",
  overview: "OVERVIEW",
  game:     "GAME VIEW",
};

export const StatusBar = memo(function StatusBar({
  connected,
  agentCount,
  sessionCount,
  activeView = "office",
  onJump,
  muted,
  onToggleMute,
}: StatusBarProps) {
  const title = VIEW_TITLE[activeView] ?? "LOKI PIXFICE";

  return (
    <div
      style={{
        background: "#0a0b16",
        borderBottom: "2px solid #1e2840",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        flexShrink: 0,
        fontFamily: "'Press Start 2P', monospace",
        imageRendering: "pixelated",
        zIndex: 10,
        position: "relative",
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
        <span style={{ fontSize: 14, color: "#5a8cff", letterSpacing: 3 }}>{title}</span>
        <span style={{ fontSize: 7, color: "#2a3a60", letterSpacing: 2 }}>HEADQUARTERS</span>
      </div>

      <div style={{ width: 2, height: 36, background: "#1e2840", flexShrink: 0 }} />

      {/* Counters */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <span style={{ fontSize: 22, color: "#8090c0", fontWeight: "bold", lineHeight: 1 }}>{agentCount}</span>
        <span style={{ fontSize: 7, color: "#445566" }}>AGENTS</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <span style={{ fontSize: 22, color: "#5a8cff", fontWeight: "bold", lineHeight: 1 }}>{sessionCount}</span>
        <span style={{ fontSize: 7, color: "#445566" }}>ROOMS</span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Mute toggle */}
      {onToggleMute && (
        <button
          onClick={onToggleMute}
          title={muted ? "Unmute sounds" : "Mute sounds"}
          style={{
            padding: "6px 10px", borderRadius: 6,
            fontSize: 11, cursor: "pointer",
            background: muted ? "rgba(239,83,80,0.15)" : "rgba(76,175,80,0.15)",
            color: muted ? "#ef5350" : "#4caf50",
            border: `1px solid ${muted ? "rgba(239,83,80,0.25)" : "rgba(76,175,80,0.25)"}`,
            flexShrink: 0,
          }}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      )}

      {/* Jump button (touch) */}
      {onJump && (
        <button
          onClick={onJump}
          title="Jump to agent (J / Ctrl+K)"
          style={{
            padding: "6px 12px", borderRadius: 6,
            fontSize: 9, cursor: "pointer",
            fontFamily: "'Press Start 2P', monospace",
            background: "rgba(90,140,255,0.15)",
            color: "#5a8cff",
            border: "1px solid rgba(90,140,255,0.25)",
            flexShrink: 0,
          }}
        >
          ⌘J JUMP
        </button>
      )}

      {/* Nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={item.href}
            style={{
              fontSize: 10,
              fontFamily: "'Press Start 2P', monospace",
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

      {/* Connection */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{
          width: 10, height: 10,
          background: connected ? "#4caf50" : "#ff6b6b",
          animation: connected ? "pixel-glow 2s ease-in-out infinite" : "agent-pulse 0.8s ease-in-out infinite",
        }} />
        <span style={{ fontSize: 9, color: connected ? "#4caf50" : "#ff6b6b" }}>
          {connected ? "LIVE" : "DISC"}
        </span>
      </div>
    </div>
  );
});
