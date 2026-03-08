import { memo, useMemo } from "react";
import { roomStyle } from "../lib/constants";
import { AgentCard } from "./AgentCard";
import type { AgentState, Session } from "../lib/types";

interface RoomGridProps {
  sessions: Session[];
  agents: AgentState[];
  saiyanTargets: Set<string>;
  onSelectAgent: (agent: AgentState) => void;
}

// Pixel-art style "wooden plank" background using repeating CSS gradient
function floorStyle(floor: string) {
  return {
    background: `repeating-linear-gradient(
      180deg,
      ${floor}        0px,
      ${floor}        10px,
      ${floor}dd      10px,
      ${floor}dd      11px
    )`,
  };
}

export const RoomGrid = memo(function RoomGrid({ sessions, agents, saiyanTargets, onSelectAgent }: RoomGridProps) {
  const sessionAgents = useMemo(() => {
    const map = new Map<string, AgentState[]>();
    for (const a of agents) {
      const arr = map.get(a.session) ?? [];
      arr.push(a);
      map.set(a.session, arr);
    }
    return map;
  }, [agents]);

  const busyCount = agents.filter(a => a.status === "busy").length;

  return (
    <div className="max-w-[960px] mx-auto px-6 pt-6 pb-10">
      {/* Pixel HUD — power level */}
      <div
        className="flex items-center gap-3 mb-5 px-3 py-2"
        style={{
          background: '#1a1008',
          border: '4px solid #8b6340',
          boxShadow: '4px 4px 0 0 rgba(0,0,0,0.6)',
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        <span className="text-[7px]" style={{ color: '#c8a870' }}>PWR</span>
        <div className="w-24 h-3 relative" style={{ background: '#2a1808', border: '2px solid #6b4320' }}>
          <div
            className="absolute inset-y-0 left-0 transition-all duration-500"
            style={{
              width: `${Math.min(100, (busyCount / Math.max(1, agents.length)) * 100)}%`,
              background: busyCount > 5 ? '#ef5350' : busyCount > 2 ? '#ffa726' : '#4caf50',
              imageRendering: 'pixelated',
            }}
          />
        </div>
        <span className="text-[7px] tabular-nums" style={{ color: '#f5c518' }}>
          {busyCount}/{agents.length}
        </span>
      </div>

      {/* Building grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sessions.map((s) => {
          const style = roomStyle(s.name);
          const roomAgents = sessionAgents.get(s.name) ?? [];
          const hasBusy = roomAgents.some(a => a.status === "busy");

          return (
            <div
              key={s.name}
              style={{
                border: `4px solid ${style.dark}`,
                boxShadow: hasBusy
                  ? `4px 4px 0 0 rgba(0,0,0,0.7), 0 0 20px ${style.accent}40`
                  : '4px 4px 0 0 rgba(0,0,0,0.7)',
                imageRendering: 'pixelated',
              }}
            >
              {/* Building roof / sign bar */}
              <div
                className="flex items-center justify-between px-3 py-2"
                style={{
                  background: style.dark,
                  borderBottom: `4px solid ${style.wall}`,
                  fontFamily: "'Press Start 2P', monospace",
                }}
              >
                {/* Pixel sign */}
                <div className="flex items-center gap-2">
                  <div style={{ width: 8, height: 8, background: style.accent, flexShrink: 0 }} />
                  <span className="text-[8px] font-bold uppercase" style={{ color: style.accent }}>
                    {style.label}
                  </span>
                </div>
                <span
                  className="text-[7px] px-2 py-0.5"
                  style={{
                    color: style.accent,
                    background: `${style.accent}25`,
                    border: `2px solid ${style.accent}80`,
                  }}
                >
                  {roomAgents.length}
                </span>
              </div>

              {/* 2px accent line */}
              <div style={{ height: 4, background: style.accent, opacity: hasBusy ? 1 : 0.5 }} />

              {/* Floor — wood planks */}
              <div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4 min-h-[150px]"
                style={floorStyle(style.floor)}
              >
                {roomAgents.map((agent) => (
                  <AgentCard
                    key={agent.target}
                    agent={agent}
                    accent={style.accent}
                    saiyan={saiyanTargets.has(agent.target)}
                    onClick={() => onSelectAgent(agent)}
                  />
                ))}
                {roomAgents.length === 0 && (
                  <div
                    className="col-span-full text-center py-6"
                    style={{ color: `${style.accent}60`, fontFamily: "'Press Start 2P', monospace", fontSize: '7px' }}
                  >
                    [ empty ]
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
