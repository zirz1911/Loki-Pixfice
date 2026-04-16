import { memo, useMemo } from "react";
import { C, statusColor } from "../lib/theme";
import type { AgentState, Session } from "../lib/types";

interface RoomsViewProps {
  sessions: Session[];
  agents: AgentState[];
  onSelectAgent: (agent: AgentState) => void;
}

export const RoomsView = memo(function RoomsView({ sessions: _s, agents, onSelectAgent }: RoomsViewProps) {
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

  const busyTotal = agents.filter(a => a.status === "busy").length;
  const readyTotal = agents.filter(a => a.status === "ready").length;

  if (agents.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: C.textMid,
        fontSize: 9,
        fontFamily: C.font,
        letterSpacing: 2,
        background: C.bg,
      }}>
        NO AGENTS ONLINE
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.bg }}>
      {/* Summary strip */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "8px 16px",
        borderBottom: `1px solid ${C.border}`,
        fontFamily: C.font,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 7, color: C.textDim, letterSpacing: 3 }}>ROOMS</span>
        <span style={{ fontSize: 7, color: C.textMid }}>{groups.length} sessions</span>
        <span style={{ fontSize: 7, color: C.textDim }}>/</span>
        <span style={{ fontSize: 7, color: C.textMid }}>{agents.length} agents</span>
        {busyTotal > 0 && (
          <>
            <span style={{ fontSize: 7, color: C.textDim }}>/</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 5px ${C.green}`, animation: "agent-pulse 1s infinite" }} />
              <span style={{ fontSize: 7, color: C.green }}>{busyTotal} busy</span>
            </span>
          </>
        )}
        {readyTotal > 0 && (
          <>
            <span style={{ fontSize: 7, color: C.textDim }}>/</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.ready }} />
              <span style={{ fontSize: 7, color: C.ready }}>{readyTotal} ready</span>
            </span>
          </>
        )}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
          alignContent: "start",
        }}>
          {groups.map(([session, sessionAgents]) => {
            const busy = sessionAgents.filter(a => a.status === "busy").length;
            const ready = sessionAgents.filter(a => a.status === "ready").length;
            return (
              <div key={session} style={{
                background: C.card,
                border: `1px solid ${busy > 0 ? `${C.green}35` : C.border}`,
                boxShadow: busy > 0 ? `0 0 18px ${C.green}0a` : undefined,
                overflow: "hidden",
              }}>
                {/* Session header */}
                <div style={{
                  padding: "7px 12px",
                  borderBottom: `1px solid ${C.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: busy > 0 ? `${C.green}08` : "transparent",
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: busy > 0 ? C.green : ready > 0 ? C.ready : C.textDim,
                    boxShadow: busy > 0 ? `0 0 6px ${C.green}` : undefined,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 8,
                    color: C.green,
                    fontFamily: C.font,
                    flex: 1,
                    letterSpacing: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textShadow: busy > 0 ? `0 0 6px ${C.green}` : undefined,
                  }}>
                    {session.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 7, color: C.textMid, fontFamily: C.font, flexShrink: 0 }}>
                    {sessionAgents.length}
                  </span>
                </div>

                {/* Agent rows */}
                {sessionAgents.map(agent => {
                  const sc = statusColor(agent.status);
                  const name = agent.name.replace(/-oracle$/, "").replace(/-/g, " ");
                  return (
                    <button
                      key={agent.target}
                      onClick={() => onSelectAgent(agent)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "6px 12px",
                        background: "transparent",
                        border: "none",
                        borderBottom: `1px solid ${C.border}`,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: C.font,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = `${C.green}08`)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: sc, flexShrink: 0,
                        boxShadow: agent.status !== "idle" ? `0 0 4px ${sc}` : undefined,
                        animation: agent.status === "busy" ? "agent-pulse 1s infinite" : undefined,
                      }} />
                      <span style={{
                        fontSize: 8,
                        color: agent.status === "idle" ? C.textMid : C.text,
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {name}
                      </span>
                      <span style={{ fontSize: 7, color: sc, flexShrink: 0 }}>
                        {agent.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
