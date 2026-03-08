import { memo, useState } from "react";
import { AgentAvatar } from "./AgentAvatar";
import type { AgentState } from "../lib/types";

interface AgentCardProps {
  agent: AgentState;
  accent: string;
  saiyan?: boolean;
  onClick: () => void;
}

export const AgentCard = memo(function AgentCard({ agent, accent, saiyan, onClick }: AgentCardProps) {
  const [hovered, setHovered] = useState(false);
  const displayName = agent.name.replace(/-oracle$/, "").replace(/-/g, " ");

  return (
    <div
      className="relative flex flex-col items-center gap-1"
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* AgentAvatar is now HTML (CSS box-shadow pixel art), no SVG wrapper needed */}
      <AgentAvatar
        name={agent.name}
        target={agent.target}
        status={agent.status}
        preview={agent.preview}
        accent={accent}
        saiyan={saiyan}
        onClick={onClick}
      />

      <span
        className="text-[7px] font-bold truncate max-w-[80px] text-center leading-tight mt-1"
        style={{ color: accent, fontFamily: "'Press Start 2P', monospace" }}
      >
        {displayName}
      </span>

      {/* Pixel tooltip */}
      {hovered && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 px-3 py-2 whitespace-nowrap pointer-events-none"
          style={{
            background: '#1a1008',
            border: `4px solid ${accent}`,
            boxShadow: `4px 4px 0 0 rgba(0,0,0,0.8)`,
            fontFamily: "'Press Start 2P', monospace",
            imageRendering: 'pixelated',
          }}
        >
          <div className="text-[8px] font-bold mb-1" style={{ color: accent }}>{displayName}</div>
          <div className="text-[7px]" style={{ color: '#c8a870' }}>
            {agent.status} · {agent.target}
          </div>
          {agent.preview && (
            <div className="text-[6px] mt-1 max-w-[200px] truncate" style={{ color: '#8a7860' }}>
              {agent.preview.slice(0, 50)}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
