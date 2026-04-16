import { memo, useMemo } from "react";
import { C, statusColor } from "../lib/theme";
import type { AgentState } from "../lib/types";

interface AgentSidebarProps {
  agents: AgentState[];
  selectedTarget?: string;
  onSelect: (agent: AgentState) => void;
}

export const AgentSidebar = memo(function AgentSidebar({ agents, selectedTarget, onSelect }: AgentSidebarProps) {
  const groups = useMemo(() => {
    const map = new Map<string, AgentState[]>();
    for (const a of agents) {
      const arr = map.get(a.session) ?? [];
      arr.push(a);
      map.set(a.session, arr);
    }
    return [...map.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true })
    );
  }, [agents]);

  return (
    <aside style={{
      width: 180,
      background: C.panel,
      borderRight: `1px solid ${C.border}`,
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {groups.map(([session, sessionAgents]) => (
          <div key={session}>
            <div style={{
              padding: "8px 10px 4px",
              fontSize: 7,
              color: C.textDim,
              letterSpacing: 2,
              borderTop: `1px solid ${C.border}`,
              fontFamily: C.font,
              textTransform: "uppercase",
            }}>
              {session}
            </div>

            {sessionAgents.map((agent) => {
              const active = agent.target === selectedTarget;
              const sc = statusColor(agent.status);
              const name = agent.name.replace(/-oracle$/, "").replace(/-/g, " ");

              return (
                <button
                  key={agent.target}
                  onClick={() => onSelect(agent)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    width: "100%",
                    padding: "5px 10px 5px 8px",
                    background: active ? `${C.green}10` : "transparent",
                    border: "none",
                    borderLeft: active ? `2px solid ${C.green}` : `2px solid transparent`,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: C.font,
                  }}
                >
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: sc,
                    flexShrink: 0,
                    boxShadow: agent.status === "busy" ? `0 0 4px ${sc}` : undefined,
                    animation: agent.status === "busy" ? "agent-pulse 1s infinite" : undefined,
                  }} />
                  <span style={{
                    fontSize: 7,
                    color: active ? C.text : C.textMid,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}>
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        {agents.length === 0 && (
          <div style={{ padding: "16px 10px", fontSize: 7, color: C.textDim, fontFamily: C.font }}>
            no agents
          </div>
        )}
      </div>
    </aside>
  );
});
