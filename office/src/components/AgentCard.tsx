import { memo, useState } from "react";
import type { AgentState } from "../lib/types";

interface AgentCardProps {
  agent: AgentState;
  accent: string;
  onClick: () => void;
}

export const AgentCard = memo(function AgentCard({ agent, accent, onClick }: AgentCardProps) {
  const [hovered, setHovered] = useState(false);
  const displayName = agent.name.replace(/-oracle$/, "").replace(/-/g, " ");
  const dotColor = agent.status === "busy" ? "#fdd835" : agent.status === "ready" ? "#4caf50" : "#445566";

  return (
    <div
      className="relative flex flex-col items-center gap-1"
      style={{ cursor: "pointer" }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        width: 24, height: 24,
        background: dotColor,
        boxShadow: agent.status === "busy" ? `0 0 8px ${dotColor}` : "none",
      }} />

      <span
        className="text-[7px] font-bold truncate max-w-[80px] text-center leading-tight mt-1"
        style={{ color: accent, fontFamily: "'Press Start 2P', monospace" }}
      >
        {displayName}
      </span>

      {hovered && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 px-3 py-2 whitespace-nowrap pointer-events-none"
          style={{
            background: "#1a1008",
            border: `4px solid ${accent}`,
            boxShadow: "4px 4px 0 0 rgba(0,0,0,0.8)",
            fontFamily: "'Press Start 2P', monospace",
            imageRendering: "pixelated",
          }}
        >
          <div className="text-[8px] font-bold mb-1" style={{ color: accent }}>{displayName}</div>
          <div className="text-[7px]" style={{ color: "#c8a870" }}>
            {agent.status} · {agent.target}
          </div>
          {agent.preview && (
            <div className="text-[6px] mt-1 max-w-[200px] truncate" style={{ color: "#8a7860" }}>
              {agent.preview.slice(0, 50)}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
