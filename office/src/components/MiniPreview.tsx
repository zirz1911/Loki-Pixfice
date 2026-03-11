import { useState, useEffect, memo } from "react";
import { ansiToHtml, processCapture } from "../lib/ansi";

interface MiniPreviewProps {
  agent: { target: string; name: string; status: string };
  accent: string;
  roomLabel: string;
}

const STATUS_COLORS: Record<string, string> = {
  busy: "#fdd835",
  ready: "#4caf50",
  idle: "#666",
};

export const MiniPreview = memo(function MiniPreview({ agent, accent, roomLabel }: MiniPreviewProps) {
  const [content, setContent] = useState("");
  const displayName = agent.name.replace(/-oracle$/, "").replace(/-/g, " ");
  const statusColor = STATUS_COLORS[agent.status] || "#666";

  useEffect(() => {
    let active = true;
    fetch(`/api/capture?target=${encodeURIComponent(agent.target)}`)
      .then(r => r.json())
      .then(d => { if (active) setContent(d.content || ""); })
      .catch(() => {});
    return () => { active = false; };
  }, [agent.target]);

  return (
    <div style={{
      background: "#0a0a0f", width: 320, borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px",
        borderBottom: `1px solid ${accent}20`,
      }}>
        <span style={{ fontSize: 12, fontWeight: "bold", letterSpacing: 2, textTransform: "uppercase", color: accent }}>
          {displayName}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor }} />
          <span style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", color: statusColor }}>
            {agent.status}
          </span>
        </span>
        <span style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.25)" }}>{roomLabel}</span>
      </div>

      {/* Terminal snippet */}
      <div style={{
        padding: "8px 10px",
        fontFamily: "monospace", fontSize: 9, lineHeight: 1.35,
        color: "#cdd6f4", whiteSpace: "pre-wrap", wordBreak: "break-all",
        overflow: "hidden", maxHeight: 120,
        background: "#08080c",
      }}
        dangerouslySetInnerHTML={{ __html: ansiToHtml(processCapture(content)) }}
      />

      {/* Click hint */}
      <div style={{
        padding: "4px 10px", fontSize: 8, fontFamily: "monospace",
        color: "rgba(255,255,255,0.15)", textAlign: "center",
        background: "#0a0a0f", borderTop: "1px solid rgba(255,255,255,0.04)",
      }}>
        click to open
      </div>
    </div>
  );
});
