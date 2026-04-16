import { memo, useState, useEffect, useRef } from "react";
import { ansiToHtml, processCapture } from "../lib/ansi";

interface MiniMonitorProps {
  target: string;
  accent: string;
  busy: boolean;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent) => void;
}

function quickHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

export const MiniMonitor = memo(function MiniMonitor({
  target,
  accent,
  busy,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: MiniMonitorProps) {
  const [content, setContent] = useState("");
  const [activity, setActivity] = useState<"active" | "stale" | "idle">("idle");
  const ref = useRef<HTMLDivElement>(null);
  const prevHashRef = useRef<number>(0);
  const staleCountRef = useRef(0);
  const [hovered, setHovered] = useState(false);

  const shouldPoll = busy || hovered;
  const pollInterval = busy ? 500 : 1000;

  useEffect(() => {
    if (!busy) {
      setActivity((prev) => prev === "active" ? "stale" : prev);
      const t = setTimeout(() => setActivity("idle"), 3000);
      return () => clearTimeout(t);
    }
  }, [busy]);

  useEffect(() => {
    if (!shouldPoll) return;
    let active = true;
    async function poll() {
      try {
        const res = await fetch(`/api/capture?target=${encodeURIComponent(target)}`);
        const data = await res.json();
        const text = data.content || "";
        if (!active) return;
        const hash = quickHash(text);
        if (prevHashRef.current !== 0 && hash !== prevHashRef.current) {
          setActivity(busy ? "active" : "stale");
          staleCountRef.current = 0;
        } else if (prevHashRef.current !== 0) {
          staleCountRef.current++;
          if (staleCountRef.current >= 3) setActivity("idle");
          else setActivity("stale");
        }
        prevHashRef.current = hash;
        setContent(text);
      } catch {}
      if (active) setTimeout(poll, pollInterval);
    }
    poll();
    return () => { active = false; };
  }, [target, shouldPoll, pollInterval, busy]);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    fetch(`/api/capture?target=${encodeURIComponent(target)}`)
      .then(r => r.json())
      .then(data => {
        const text = data.content || "";
        prevHashRef.current = quickHash(text);
        setContent(text);
      })
      .catch(() => {});
  }, [target]);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [content]);

  const html = ansiToHtml(processCapture(content));
  const isActive = activity === "active";
  const isStale = activity === "stale";
  const borderColor = isActive ? `${accent}80` : isStale ? `${accent}30` : "rgba(255,255,255,0.08)";
  const glowShadow = isActive
    ? `0 0 16px ${accent}30, inset 0 0 8px ${accent}10`
    : isStale ? `0 0 6px ${accent}10` : "none";

  return (
    <div
      style={{
        width: 80, height: 56,
        flexShrink: 0, borderRadius: 8, overflow: "hidden", cursor: "pointer",
        border: `1px solid ${borderColor}`,
        background: "#08080c",
        boxShadow: glowShadow,
        transition: "border-color 0.5s, box-shadow 0.5s",
        position: "relative",
      }}
      onMouseEnter={(e) => { setHovered(true); onMouseEnter(e); }}
      onMouseLeave={() => { setHovered(false); onMouseLeave(); }}
      onClick={onClick}
    >
      {/* Activity LED */}
      <div style={{
        position: "absolute", top: 3, right: 3, zIndex: 20,
        width: 5, height: 5, borderRadius: "50%",
        background: isActive ? "#22d3ee" : isStale ? "oklch(0.85 0.20 142)" : "#333",
        boxShadow: isActive ? "0 0 6px #22d3ee, 0 0 2px #22d3ee" : isStale ? "0 0 4px oklch(0.85 0.20 142)" : "none",
        transition: "all 0.5s",
        animation: isActive ? "agent-pulse 1s ease-in-out infinite" : "none",
      }} />

      {/* Scanline CRT overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10, borderRadius: 8,
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 3px)",
        mixBlendMode: "multiply",
      }} />

      {/* ANSI content */}
      <div
        ref={ref}
        style={{
          width: "100%", height: "100%",
          padding: "2px 3px",
          overflow: "hidden",
          fontFamily: "monospace",
          fontSize: "3.5px",
          lineHeight: 1.3,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          color: "#cdd6f4",
          opacity: activity === "idle" ? 0.5 : 1,
          transition: "opacity 0.5s",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Screen reflection */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "40%",
        pointerEvents: "none", zIndex: 10, borderRadius: "8px 8px 0 0",
        background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)",
      }} />
    </div>
  );
});
