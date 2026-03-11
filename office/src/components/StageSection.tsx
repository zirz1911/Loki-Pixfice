import { memo, useMemo } from "react";
import { AgentAvatar } from "./AgentAvatar";
import { roomStyle } from "../lib/constants";
import type { RecentEntry } from "../lib/store";
import type { AgentState } from "../lib/types";

interface StageSectionProps {
  busyAgents: AgentState[];
  recentlyActive: (AgentState | RecentEntry)[];
  saiyanTargets: Set<string>;
  recentMap: Record<string, RecentEntry>;
  showPreview: (agent: AgentState, accent: string, label: string, e: React.MouseEvent) => void;
  hidePreview: () => void;
  onAgentClick: (agent: AgentState, accent: string, label: string, e: React.MouseEvent) => void;
}

const SHRINK_MS = 60_000;
const SIZE_BIG = 112;
const SIZE_SMALL = 56;

function ghostSize(lastBusy: number): number {
  const elapsed = Date.now() - lastBusy;
  if (elapsed <= 0) return SIZE_BIG;
  if (elapsed >= SHRINK_MS) return SIZE_SMALL;
  const t = elapsed / SHRINK_MS;
  return Math.round(SIZE_BIG - (SIZE_BIG - SIZE_SMALL) * t);
}

export const StageSection = memo(function StageSection({
  busyAgents, recentlyActive, saiyanTargets, recentMap, showPreview, hidePreview, onAgentClick,
}: StageSectionProps) {
  const activeAgents = useMemo(() => {
    const seenNames = new Set<string>();
    const result: AgentState[] = [];
    for (const a of busyAgents) {
      if (!seenNames.has(a.name)) { seenNames.add(a.name); result.push(a); }
    }
    for (const entry of recentlyActive) {
      if (seenNames.has(entry.name)) continue;
      if (!saiyanTargets.has(entry.target)) continue;
      seenNames.add(entry.name);
      if ("status" in entry) result.push(entry as AgentState);
      else result.push({ target: entry.target, name: entry.name, session: entry.session, windowIndex: 0, active: false, preview: "", status: "busy" });
    }
    result.sort((a, b) => (recentMap[b.target]?.lastBusy || 0) - (recentMap[a.target]?.lastBusy || 0));
    return result;
  }, [busyAgents, recentlyActive, saiyanTargets, recentMap]);

  const ghostAgents = useMemo(() => {
    const activeNames = new Set(activeAgents.map(a => a.name));
    const seenNames = new Set<string>();
    return recentlyActive
      .filter(e => !activeNames.has(e.name))
      .filter(e => { if (seenNames.has(e.name)) return false; seenNames.add(e.name); return true; })
      .slice(0, 5)
      .map(e => {
        if ("status" in e) return e as AgentState;
        return { target: e.target, name: e.name, session: e.session, windowIndex: 0, active: false, preview: "", status: "idle" as const };
      });
  }, [activeAgents, recentlyActive]);

  if (activeAgents.length === 0 && ghostAgents.length === 0) return null;

  const hasBusy = activeAgents.length > 0;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 24px 8px" }}>
      <div style={{
        position: "relative", borderRadius: 16, overflow: "hidden",
        background: hasBusy
          ? "linear-gradient(180deg, #1a1510 0%, #0f0d0a 60%, #0a0a12 100%)"
          : "linear-gradient(180deg, #121218 0%, #0e0e14 60%, #0a0a12 100%)",
        border: hasBusy ? "1px solid rgba(251,191,36,0.15)" : "1px solid rgba(255,255,255,0.06)",
        boxShadow: hasBusy
          ? "0 0 40px rgba(251,191,36,0.06), inset 0 -2px 20px rgba(0,0,0,0.4)"
          : "0 2px 12px rgba(0,0,0,0.3)",
      }}>
        {/* Stage lights glow */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 96, pointerEvents: "none",
          background: hasBusy
            ? "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(251,191,36,0.08) 0%, transparent 70%)"
            : "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(255,255,255,0.02) 0%, transparent 70%)",
        }} />

        {/* Spotlight cones */}
        {hasBusy && (
          <>
            <div style={{ position: "absolute", top: 0, left: "20%", width: 1, height: 64, pointerEvents: "none", background: "linear-gradient(180deg, rgba(251,191,36,0.15), transparent)" }} />
            <div style={{ position: "absolute", top: 0, left: "50%", width: 1, height: 80, pointerEvents: "none", background: "linear-gradient(180deg, rgba(251,191,36,0.2), transparent)" }} />
            <div style={{ position: "absolute", top: 0, left: "80%", width: 1, height: 64, pointerEvents: "none", background: "linear-gradient(180deg, rgba(251,191,36,0.15), transparent)" }} />
          </>
        )}

        {/* Header */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "16px 24px 8px" }}>
          <span style={{
            width: 10, height: 10, borderRadius: "50%",
            background: hasBusy ? "#fbbf24" : "#64748B",
            boxShadow: hasBusy ? "0 0 10px #ffa726" : "none",
            animation: hasBusy ? "agent-pulse 2s infinite" : "none",
          }} />
          <span style={{
            fontSize: 11, letterSpacing: 6, textTransform: "uppercase", fontFamily: "monospace",
            color: hasBusy ? "rgba(251,191,36,0.7)" : "rgba(255,255,255,0.25)",
          }}>
            On Stage
          </span>
          <span style={{
            fontSize: 12, fontFamily: "monospace", fontWeight: "bold",
            padding: "2px 10px", borderRadius: 6,
            background: hasBusy ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.05)",
            color: hasBusy ? "#fbbf24" : "#64748B",
          }}>
            {activeAgents.length}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%",
                background: hasBusy ? "#fbbf24" : "#64748B",
                opacity: hasBusy ? 0.2 + (i % 2) * 0.15 : 0.1 + (i % 2) * 0.05,
                boxShadow: hasBusy ? "0 0 3px rgba(251,191,36,0.3)" : "none",
              }} />
            ))}
          </div>
        </div>

        {/* Stage floor */}
        <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", padding: "8px 24px 20px" }}>
          {/* Floor line */}
          <div style={{
            position: "absolute", bottom: 0, left: 24, right: 24, height: 1,
            background: hasBusy
              ? "linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.12) 30%, rgba(251,191,36,0.12) 70%, transparent 100%)"
              : "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.04) 70%, transparent 100%)",
          }} />

          {/* Active performers */}
          {activeAgents.map((agent) => {
            const rs = roomStyle(agent.session);
            const isSaiyan = saiyanTargets.has(agent.target);
            const displayName = agent.name.replace(/-oracle$/, "").replace(/-/g, " ");
            return (
              <div
                key={`stage-${agent.target}`}
                style={{
                  position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  padding: "12px 16px", borderRadius: 12, cursor: "pointer", minWidth: 120,
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1.1) translateY(-4px)";
                  showPreview(agent, rs.accent, rs.label, e);
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  hidePreview();
                }}
                onClick={(e) => onAgentClick(agent, rs.accent, rs.label, e)}
              >
                <div style={{
                  position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                  width: 96, height: 112, pointerEvents: "none",
                  background: `radial-gradient(ellipse at 50% 0%, ${rs.accent}15 0%, transparent 70%)`,
                }} />
                <svg viewBox="-40 -50 80 80" width={112} height={112} overflow="visible">
                  <AgentAvatar
                    name={agent.name} target={agent.target} status={agent.status}
                    preview={agent.preview} accent={rs.accent} saiyan={isSaiyan} onClick={() => {}}
                  />
                </svg>
                <span style={{
                  fontSize: 12, fontWeight: 600, textAlign: "center",
                  maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  color: rs.accent,
                }}>
                  {displayName}
                </span>
                {isSaiyan && (
                  <span style={{
                    fontSize: 9, fontFamily: "monospace", padding: "2px 8px", borderRadius: 4,
                    background: "rgba(251,191,36,0.2)", color: "#fbbf24",
                  }}>⚡</span>
                )}
              </div>
            );
          })}

          {/* Ghost agents */}
          {ghostAgents.map((agent) => {
            const rs = roomStyle(agent.session);
            const displayName = agent.name.replace(/-oracle$/, "").replace(/-/g, " ");
            const lastBusy = recentMap[agent.target]?.lastBusy || 0;
            const size = ghostSize(lastBusy);
            const t = Math.min(1, (Date.now() - lastBusy) / SHRINK_MS);
            const opacity = 0.6 - t * 0.3;
            const grayscale = 0.3 + t * 0.4;
            return (
              <div
                key={`ghost-${agent.target}`}
                style={{
                  position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  padding: "12px", borderRadius: 12, cursor: "pointer",
                  minWidth: size > 80 ? 120 : 76,
                  opacity, filter: `grayscale(${grayscale})`,
                  transition: "all 2s ease-out",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
                  showPreview(agent, rs.accent, rs.label, e);
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  hidePreview();
                }}
                onClick={(e) => onAgentClick(agent, rs.accent, rs.label, e)}
              >
                <svg viewBox="-40 -50 80 80" width={size} height={size} overflow="visible"
                  style={{ transition: "width 2s ease-out, height 2s ease-out" }}>
                  <AgentAvatar
                    name={agent.name} target={agent.target} status={agent.status}
                    preview={agent.preview} accent={rs.accent} saiyan={false} onClick={() => {}}
                  />
                </svg>
                <span style={{
                  fontWeight: 600, textAlign: "center", color: "#64748B",
                  fontSize: size > 80 ? 12 : 10, maxWidth: size > 80 ? 120 : 76,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  transition: "all 2s ease-out",
                }}>
                  {displayName}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footlights */}
        <div style={{
          height: 4, borderRadius: "0 0 16px 16px",
          background: hasBusy
            ? "linear-gradient(90deg, transparent 5%, rgba(251,191,36,0.2) 20%, rgba(251,191,36,0.3) 50%, rgba(251,191,36,0.2) 80%, transparent 95%)"
            : "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.04) 80%, transparent 95%)",
        }} />
      </div>
    </div>
  );
});
