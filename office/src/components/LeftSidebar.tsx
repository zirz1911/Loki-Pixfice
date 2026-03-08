import { memo } from "react";
import { getRoomStyle } from "./DepartmentRoom";
import type { AgentState, Session } from "../lib/types";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "office",  label: "Office",   icon: "🏢", href: "/office/#office"  },
  { id: "mission", label: "Mission",  icon: "🌌", href: "/office/#mission" },
  { id: "game",    label: "Game",     icon: "🎮", href: "/office/#game"    },
  { id: "agents",  label: "Agents",   icon: "⚔️",  href: "/office/#office"  },
  { id: "tasks",   label: "Tasks",    icon: "📋", href: "/office/#office"  },
  { id: "config",  label: "Settings", icon: "⚙️", href: "/office/#office"  },
];

interface DeptStatusProps {
  session: Session;
  agents: AgentState[];
  idx: number;
}

function DeptStatus({ session, agents, idx }: DeptStatusProps) {
  const style = getRoomStyle(session.name, idx);
  const busy = agents.filter((a) => a.status === "busy").length;
  const total = agents.length;
  const pct = total > 0 ? (busy / total) * 100 : 0;

  return (
    <div style={{ padding: "4px 6px" }}>
      {/* Dept name row */}
      <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 2 }}>
        <div
          style={{
            width: 7, height: 7, background: style.accent, flexShrink: 0,
            boxShadow: busy > 0 ? `0 0 4px ${style.accent}` : "none",
          }}
        />
        <span
          style={{
            fontSize: 6, fontFamily: "'Press Start 2P', monospace",
            color: style.accent,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            maxWidth: 42,
          }}
          title={session.name}
        >
          {style.label.slice(0, 6)}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 6, fontFamily: "'Press Start 2P', monospace", color: "#445566" }}>
          {busy}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "#1a2030" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: busy > 0 ? style.accent : "#2a3a50",
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}

interface LeftSidebarProps {
  sessions: Session[];
  agents: AgentState[];
  activeView: string;
}

export const LeftSidebar = memo(function LeftSidebar({ sessions, agents, activeView }: LeftSidebarProps) {
  const totalBusy = agents.filter((a) => a.status === "busy").length;

  return (
    <div
      style={{
        width: 72,
        flexShrink: 0,
        background: "#07080f",
        borderRight: "2px solid #1a2030",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        fontFamily: "'Press Start 2P', monospace",
        imageRendering: "pixelated",
      }}
    >
      {/* Logo */}
      <div
        style={{
          borderBottom: "2px solid #1a2030",
          padding: "8px 0",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 28, height: 28, background: "#5a8cff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
            boxShadow: "0 0 8px #5a8cff60",
          }}
        >
          🔮
        </div>
      </div>

      {/* Nav icons */}
      <div style={{ flex: "0 0 auto" }}>
        {NAV_ITEMS.map((item) => {
          const active = activeView === item.id;
          return (
            <a
              key={item.id}
              href={item.href}
              title={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 0",
                gap: 3,
                textDecoration: "none",
                background: active ? "#5a8cff18" : "transparent",
                borderLeft: `2px solid ${active ? "#5a8cff" : "transparent"}`,
                borderRight: `2px solid ${active ? "#5a8cff" : "transparent"}`,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 6, color: active ? "#5a8cff" : "#2a3a50", letterSpacing: 0 }}>
                {item.label.toUpperCase().slice(0, 3)}
              </span>
            </a>
          );
        })}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Department status (bottom) */}
      <div
        style={{
          borderTop: "2px solid #1a2030",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Global busy indicator */}
        <div
          style={{
            padding: "4px 0",
            textAlign: "center",
            borderBottom: "1px solid #1a2030",
          }}
        >
          <div
            style={{
              width: 8, height: 8, background: totalBusy > 0 ? "#fdd835" : "#2a3a50",
              margin: "0 auto",
              animation: totalBusy > 0 ? "agent-pulse 0.8s infinite" : "none",
            }}
          />
          <div style={{ fontSize: 7, color: totalBusy > 0 ? "#fdd835" : "#2a3a50", marginTop: 2 }}>
            {totalBusy}
          </div>
        </div>

        {/* Per-session dept status */}
        {sessions.map((s, i) => {
          const sAgents = agents.filter((a) => a.session === s.name);
          return <DeptStatus key={s.name} session={s} agents={sAgents} idx={i} />;
        })}
      </div>
    </div>
  );
});
