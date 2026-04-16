import { C } from "../lib/theme";

interface TopNavProps {
  route: string;
  connected: boolean;
  agentCount: number;
  onJump: () => void;
}

const ROUTES = [
  { id: "office",   label: "ROOMS"    },
  { id: "overview", label: "OVERVIEW" },
  { id: "fleet",    label: "FLEET"    },
  { id: "worktree", label: "WORKTREE" },
];

export function TopNav({ route, connected, agentCount, onJump }: TopNavProps) {
  const activeRoute = route || "office";

  return (
    <nav style={{
      height: 40,
      background: C.panel,
      borderBottom: `1px solid ${C.border}`,
      display: "flex",
      alignItems: "center",
      padding: "0 14px",
      flexShrink: 0,
      fontFamily: C.font,
      overflow: "hidden",
    }}>
      {/* Brand */}
      <span style={{
        fontSize: 9,
        color: C.green,
        letterSpacing: 3,
        marginRight: 16,
        textShadow: `0 0 8px ${C.green}`,
        flexShrink: 0,
      }}>
        PIXFICE
      </span>

      <div style={{ width: 1, height: 18, background: C.border2, marginRight: 12, flexShrink: 0 }} />

      {/* Route tabs */}
      <div style={{ display: "flex", alignItems: "stretch", height: "100%", overflowX: "auto" }}>
        {ROUTES.map(({ id, label }) => {
          const active = activeRoute === id;
          return (
            <a
              key={id}
              href={`#${id}`}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                fontSize: 8,
                color: active ? C.green : C.textMid,
                textDecoration: "none",
                borderBottom: active ? `2px solid ${C.green}` : "2px solid transparent",
                letterSpacing: 1.5,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {label}
            </a>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* Jump */}
      <button
        onClick={onJump}
        style={{
          background: "transparent",
          border: `1px solid ${C.border2}`,
          color: C.textMid,
          fontSize: 7,
          fontFamily: C.font,
          padding: "3px 10px",
          cursor: "pointer",
          letterSpacing: 1,
          marginRight: 12,
          flexShrink: 0,
        }}
        title="Jump to agent (J / Ctrl+K)"
      >
        J → JUMP
      </button>

      {/* Agent count */}
      <span style={{ fontSize: 7, color: C.textMid, marginRight: 10, flexShrink: 0 }}>
        {agentCount} agents
      </span>

      {/* Connection dot */}
      <span style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: connected ? C.green : "#ff4444",
        boxShadow: connected ? `0 0 6px ${C.green}` : "none",
        display: "inline-block",
        flexShrink: 0,
      }} />
    </nav>
  );
}
