import { memo, useState, useEffect, useRef, useMemo } from "react";
import { ansiToHtml, processCapture } from "../lib/ansi";
import { roomStyle, agentCategory, CATEGORY_ROOM, type AgentCategory } from "../lib/constants";
import { useFps } from "./FpsCounter";
import { useViewport } from "../hooks/useViewport";
import type { AgentState, Session } from "../lib/types";

function sessionNum(name: string): number {
  const m = name.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : -1;
}

interface OverviewGridProps {
  sessions: Session[];
  agents: AgentState[];
  saiyanTargets: Set<string>;
  connected: boolean;
  send: (msg: object) => void;
  onSelectAgent: (agent: AgentState) => void;
}

const OverviewTile = memo(function OverviewTile({
  agent,
  accent,
  shortcutKey,
  onClick,
}: {
  agent: AgentState;
  accent: string;
  shortcutKey?: number;
  onClick: () => void;
}) {
  const [content, setContent] = useState("");
  const tileRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(true);

  const displayName = agent.name.replace(/-oracle$/, "").replace(/-/g, " ");
  const isBusy = agent.status === "busy";
  const statusColor = isBusy ? "#ffa726" : agent.status === "ready" ? "#22C55E" : "#555";

  // IntersectionObserver — only poll when visible
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = tileRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Poll capture only when visible
  useEffect(() => {
    if (!visible) return;
    activeRef.current = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (!activeRef.current) return;
      try {
        const res = await fetch(`/api/capture?target=${encodeURIComponent(agent.target)}`);
        const data = await res.json();
        if (activeRef.current) setContent(data.content || "");
      } catch {}
      if (activeRef.current) timer = setTimeout(poll, 2000);
    }
    poll();
    return () => { activeRef.current = false; clearTimeout(timer); };
  }, [agent.target, visible]);

  const trimmed = useMemo(() => processCapture(content), [content]);

  useEffect(() => {
    const el = termRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [trimmed]);

  return (
    <div
      ref={tileRef}
      style={{
        display: "flex", flexDirection: "column",
        borderRadius: 10, overflow: "hidden",
        cursor: "pointer",
        background: "#0c0c14",
        border: `1px solid ${isBusy ? accent + "40" : "rgba(255,255,255,0.06)"}`,
        boxShadow: isBusy ? `0 0 20px ${accent}10` : "0 2px 8px rgba(0,0,0,0.3)",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onClick={onClick}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.01)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px",
        background: `${accent}08`,
        borderBottom: `1px solid ${accent}15`,
        flexShrink: 0,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: statusColor,
          boxShadow: agent.status !== "idle" ? `0 0 6px ${statusColor}` : undefined,
        }} />
        <span style={{
          fontSize: 10, fontWeight: "bold", letterSpacing: 1,
          color: accent, fontFamily: "'Press Start 2P', monospace",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          flex: 1,
        }}>
          {displayName}
        </span>
        {shortcutKey != null && (
          <kbd style={{
            fontSize: 8, fontFamily: "monospace",
            padding: "2px 5px", borderRadius: 4,
            background: `${accent}15`, color: `${accent}80`,
            flexShrink: 0,
          }}>
            {shortcutKey}
          </kbd>
        )}
        <span style={{ fontSize: 8, fontFamily: "monospace", color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
          {agent.session}
        </span>
        <span style={{
          fontSize: 8, fontFamily: "monospace",
          padding: "2px 6px", borderRadius: 4, flexShrink: 0,
          background: isBusy ? "#ffa72618" : agent.status === "ready" ? "#22C55E14" : "rgba(255,255,255,0.04)",
          color: statusColor,
        }}>
          {agent.status}
        </span>
      </div>

      {/* Terminal content */}
      <div
        ref={termRef}
        style={{
          flex: 1, padding: "6px 8px",
          overflowY: "auto", overflowX: "hidden",
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          fontSize: 9, lineHeight: 1.35,
          color: "#cdd6f4",
          whiteSpace: "pre-wrap", wordBreak: "break-all",
          background: "#08080c",
          minHeight: 180, maxHeight: 300,
        }}
        dangerouslySetInnerHTML={{ __html: ansiToHtml(trimmed) }}
      />
    </div>
  );
});

export const OverviewGrid = memo(function OverviewGrid({
  sessions,
  agents,
  saiyanTargets: _st,
  connected: _c,
  send: _s,
  onSelectAgent,
}: OverviewGridProps) {
  const fps = useFps();
  const { isMobile, isTablet } = useViewport();
  const busyCount = agents.filter(a => a.status === "busy").length;
  const readyCount = agents.filter(a => a.status === "ready").length;
  const idleCount = agents.length - busyCount - readyCount;

  const sessionGroups = useMemo(() => {
    // First group by session
    const map = new Map<string, AgentState[]>();
    for (const a of agents) {
      const arr = map.get(a.session) || [];
      arr.push(a);
      map.set(a.session, arr);
    }
    // Split sessions with multiple categories into virtual groups
    const ORDER: AgentCategory[] = ["local", "cloud", "gemini", "terminal"];
    const result: [string, AgentState[], { accent: string; label: string } | null][] = [];
    for (const [sessionName, sessionAgents] of map) {
      const cats = new Set(sessionAgents.map(a => agentCategory(a.name)));
      if (cats.size <= 1) {
        result.push([sessionName, sessionAgents, null]);
      } else {
        for (const cat of ORDER) {
          const ag = sessionAgents.filter(a => agentCategory(a.name) === cat);
          if (ag.length === 0) continue;
          const cr = CATEGORY_ROOM[cat];
          result.push([`${sessionName}:${cat}`, ag, { accent: cr.accent, label: cr.label }]);
        }
      }
    }
    return result.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [agents]);

  return (
    <div style={{ width: "100%", minHeight: "100%", background: "#0a0a12", overflowY: "auto" }}>
      {/* Summary bar */}
      <div style={{
        maxWidth: 1600, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "12px 14px" : "16px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: "monospace", fontSize: 12 }}>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, letterSpacing: 4, fontFamily: "'Press Start 2P', monospace" }}>
            OVERVIEW
          </span>
          <span style={{ color: "rgba(255,255,255,0.6)" }}>{sessionGroups.length} rooms</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
          <span style={{ color: "rgba(255,255,255,0.6)" }}>{agents.length} agents</span>
          {!isMobile && <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>}
          {!isMobile && <span style={{ color: fps >= 50 ? "#4caf50" : fps >= 30 ? "#ffa726" : "#ef5350" }}>{fps} fps</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontFamily: "monospace", fontSize: 12 }}>
          {busyCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffa726", boxShadow: "0 0 8px #ffa726", animation: "agent-pulse 1s infinite" }} />
              <span style={{ color: "#ffa726" }}>{busyCount} busy</span>
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4caf50", boxShadow: "0 0 4px #4caf50" }} />
            <span style={{ color: "#4caf50" }}>{readyCount} ready</span>
          </span>
          {!isMobile && idleCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>{idleCount} idle</span>
            </span>
          )}
          {!isMobile && <span style={{ fontSize: 8, color: "rgba(255,255,255,0.15)", fontFamily: "'Press Start 2P', monospace" }}>J → JUMP</span>}
        </div>
      </div>

      {/* Session groups */}
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: isMobile ? "12px" : "24px", display: "flex", flexDirection: "column", gap: 24 }}>
        {sessionGroups.map(([groupKey, groupAgents, catOverride]) => {
          const baseStyle = roomStyle(groupKey);
          const accent = catOverride?.accent ?? baseStyle.accent;
          const displayLabel = catOverride?.label ?? groupKey;
          const hasBusy = groupAgents.some(a => a.status === "busy");
          const num = sessionNum(groupKey);
          return (
            <section key={groupKey}>
              {/* Session header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "0 4px" }}>
                <kbd style={{
                  width: 24, height: 24, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 5, fontSize: 9, fontWeight: "bold", fontFamily: "monospace",
                  background: `${accent}15`, color: `${accent}80`, border: `1px solid ${accent}25`,
                }}>
                  {num >= 0 ? num : "·"}
                </kbd>
                <span style={{
                  width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                  background: hasBusy ? "#ffa726" : "#22C55E",
                  boxShadow: hasBusy ? "0 0 8px #ffa726" : "0 0 4px #22C55E",
                }} />
                <h3 style={{
                  fontSize: 10, fontWeight: "bold", letterSpacing: 3,
                  color: accent, fontFamily: "'Press Start 2P', monospace",
                  textTransform: "uppercase", margin: 0,
                }}>
                  {displayLabel}
                </h3>
                {catOverride && (
                  <span style={{ fontSize: 8, fontFamily: "monospace", color: `${accent}60`, letterSpacing: 2, textTransform: "uppercase" }}>
                    {groupKey.split(":")[1]}
                  </span>
                )}
                <span style={{
                  fontSize: 9, fontFamily: "monospace",
                  padding: "2px 8px", borderRadius: 4,
                  background: `${accent}18`, color: accent,
                }}>
                  {groupAgents.length} agent{groupAgents.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Agent tiles grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(auto-fill, minmax(280px, 1fr))" : "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 12,
              }}>
                {groupAgents.map((agent, i) => (
                  <OverviewTile
                    key={agent.target}
                    agent={agent}
                    accent={accent}
                    shortcutKey={i + 1}
                    onClick={() => onSelectAgent(agent)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {agents.length === 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: 256, color: "rgba(255,255,255,0.2)",
          fontFamily: "monospace", fontSize: 12,
        }}>
          No agents online
        </div>
      )}
    </div>
  );
});
