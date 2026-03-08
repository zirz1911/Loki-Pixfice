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

// Asgard stone floor — dark tiles with gold mortar lines
function stoneFloor(accent: string) {
  return {
    background: `
      repeating-conic-gradient(#2e2848 0% 25%, #1e1830 0% 50%)
      0 0 / 16px 16px
    `,
    borderTop: `2px solid ${accent}60`,
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

      {/* ── Asgard HUD bar ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 mb-5 px-4 py-2"
        style={{
          background: '#0e0828',
          border: '4px solid #c9a020',
          boxShadow: '4px 4px 0 0 rgba(0,0,0,0.8), 0 0 12px #c9a02040',
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        {/* Rune icon */}
        <span style={{ color: '#f5c518', fontSize: '12px' }}>ᚱ</span>
        <span className="text-[7px]" style={{ color: '#c9a020' }}>PWR</span>

        {/* Power bar */}
        <div
          className="w-28 h-3 relative"
          style={{ background: '#1a1430', border: '2px solid #806810' }}
        >
          <div
            className="absolute inset-y-0 left-0 transition-all duration-500"
            style={{
              width: `${Math.min(100, (busyCount / Math.max(1, agents.length)) * 100)}%`,
              background: busyCount > 5
                ? '#ef5350'
                : busyCount > 2
                ? '#ffa726'
                : '#f5c518',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          />
        </div>

        <span className="text-[7px] tabular-nums" style={{ color: '#f5c518' }}>
          {busyCount}/{agents.length}
        </span>

        {/* Divider rune */}
        <span style={{ color: '#c9a02060', fontSize: '10px', marginLeft: 'auto' }}>
          ᚠ ᚢ ᚦ ᚨ
        </span>
      </div>

      {/* ── Realm grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sessions.map((s) => {
          const style = roomStyle(s.name);
          const roomAgents = sessionAgents.get(s.name) ?? [];
          const hasBusy = roomAgents.some(a => a.status === "busy");

          return (
            <div
              key={s.name}
              style={{
                border: `4px solid ${style.accent}`,
                boxShadow: hasBusy
                  ? `4px 4px 0 0 rgba(0,0,0,0.8), 0 0 24px ${style.accent}50`
                  : `4px 4px 0 0 rgba(0,0,0,0.8), 0 0 8px ${style.accent}20`,
              }}
            >
              {/* ── Chamber header ─────────────────────────────────────────── */}
              <div
                className="flex items-center justify-between px-3 py-2"
                style={{
                  background: style.dark,
                  borderBottom: `4px solid ${style.accent}`,
                  fontFamily: "'Press Start 2P', monospace",
                }}
              >
                <div className="flex items-center gap-2">
                  {/* Gold pixel gem */}
                  <div style={{
                    width: 10, height: 10,
                    background: style.accent,
                    boxShadow: `0 0 6px ${style.accent}80`,
                    flexShrink: 0,
                    animation: hasBusy ? 'pixel-glow 1s ease-in-out infinite' : 'none',
                  }} />
                  <span
                    className="text-[8px] font-bold uppercase tracking-widest"
                    style={{ color: style.accent }}
                  >
                    {style.label}
                  </span>
                </div>

                {/* Agent count badge */}
                <span
                  className="text-[7px] px-2 py-0.5"
                  style={{
                    color: style.dark,
                    background: style.accent,
                    fontFamily: "'Press Start 2P', monospace",
                  }}
                >
                  {roomAgents.length}
                </span>
              </div>

              {/* ── Stone floor ────────────────────────────────────────────── */}
              <div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4 min-h-[150px]"
                style={stoneFloor(style.accent)}
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
                    style={{
                      color: `${style.accent}50`,
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '7px',
                    }}
                  >
                    ᚾ empty ᚾ
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
