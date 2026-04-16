import { memo } from "react";
import type { AgentState } from "../lib/types";

interface BottomStatsProps {
  agents: AgentState[];
}

export const BottomStats = memo(function BottomStats({ agents }: BottomStatsProps) {
  const busyCount = agents.filter((a) => a.status === "busy").length;
  const readyCount = agents.filter((a) => a.status === "ready").length;
  const idleCount = agents.filter((a) => a.status === "idle").length;
  const busyPct = Math.min(100, (busyCount / Math.max(1, agents.length)) * 100);
  const barColor = busyCount > 5 ? "#ef5350" : busyCount > 2 ? "oklch(0.85 0.20 142)" : "#22d3ee";

  return (
    <div style={{
      position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
      display: "flex", alignItems: "center", gap: 24,
      padding: "8px 24px", borderRadius: 12,
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      border: "1px solid rgba(255,255,255,0.04)",
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "oklch(0.85 0.20 142)" }} />
        <strong style={{ color: "oklch(0.85 0.20 142)", fontSize: 12 }}>{busyCount}</strong>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>busy</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22d3ee" }} />
        <strong style={{ color: "#22d3ee", fontSize: 12 }}>{readyCount}</strong>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>ready</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />
        <strong style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{idleCount}</strong>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>idle</span>
      </span>
      <div style={{ width: 96, height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 3,
          width: `${busyPct}%`,
          background: barColor,
          transition: "width 0.7s, background 0.7s",
        }} />
      </div>
    </div>
  );
});
