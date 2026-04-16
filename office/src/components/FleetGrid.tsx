import { memo, useMemo, useState, useEffect, useRef, useCallback } from "react";
import { StageSection } from "./StageSection";
import { AgentRow } from "./AgentRow";
import type { FeedLogEntry } from "./AgentRow";
import { roomStyle, agentCategory, CATEGORY_ROOM, type AgentCategory } from "../lib/constants";
import { BottomStats } from "./BottomStats";
import { useFps } from "./FpsCounter";
import { useViewport } from "../hooks/useViewport";
import { useFleetStore, type RecentEntry } from "../lib/store";
import type { AgentState, Session, AgentEvent } from "../lib/types";
import { describeActivity, type FeedEvent } from "../lib/feed";

interface FleetGridProps {
  sessions: Session[];
  agents: AgentState[];
  connected: boolean;
  send: (msg: object) => void;
  onSelectAgent: (agent: AgentState) => void;
  eventLog: AgentEvent[];
  addEvent: (target: string, type: AgentEvent["type"], detail: string) => void;
  feedActive?: Map<string, FeedEvent>;
  agentFeedLog?: Map<string, FeedEvent[]>;
}

function useVisibleTargets(send: (msg: object) => void) {
  const visibleRef = useRef(new Set<string>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const syncToServer = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      send({ type: "subscribe-previews", targets: [...visibleRef.current] });
    }, 150);
  }, [send]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        let changed = false;
        for (const entry of entries) {
          const target = (entry.target as HTMLElement).dataset.target;
          if (!target) continue;
          if (entry.isIntersecting) {
            if (!visibleRef.current.has(target)) { visibleRef.current.add(target); changed = true; }
          } else {
            if (visibleRef.current.has(target)) { visibleRef.current.delete(target); changed = true; }
          }
        }
        if (changed) syncToServer();
      },
      { rootMargin: "100px" }
    );
    return () => { observerRef.current?.disconnect(); clearTimeout(debounceRef.current); };
  }, [syncToServer]);

  const observe = useCallback((el: HTMLElement | null, target: string) => {
    if (!el || !observerRef.current) return;
    el.dataset.target = target;
    observerRef.current.observe(el);
  }, []);

  return observe;
}

function sortRooms(sessions: Session[], agentMap: Map<string, AgentState[]>, mode: "active" | "name") {
  return [...sessions].sort((a, b) => {
    if (mode === "active") {
      const aBusy = (agentMap.get(a.name) || []).filter(ag => ag.status === "busy").length;
      const bBusy = (agentMap.get(b.name) || []).filter(ag => ag.status === "busy").length;
      if (aBusy !== bBusy) return bBusy - aBusy;
      const aLen = (agentMap.get(a.name) || []).length;
      const bLen = (agentMap.get(b.name) || []).length;
      if (aLen !== bLen) return bLen - aLen;
    }
    return a.name.localeCompare(b.name);
  });
}

export const FleetGrid = memo(function FleetGrid({
  sessions, agents, connected: _c, send, onSelectAgent, eventLog, addEvent, feedActive: _fa, agentFeedLog,
}: FleetGridProps) {
  const fps = useFps();
  const { isMobile } = useViewport();
  const observe = useVisibleTargets(send);

  const { recentMap, markBusy, pruneRecent, sortMode, setSortMode, grouped, toggleGrouped, collapsed, toggleCollapsed } = useFleetStore();
  const isCollapsed = useCallback((key: string) => collapsed.includes(key), [collapsed]);

  useEffect(() => {
    // Track both busy AND ready agents (ready = just finished) so Recently Active stays fresh
    const activeAgentsData = agents.filter(a => a.status !== "idle").map(a => ({ target: a.target, name: a.name, session: a.session }));
    if (activeAgentsData.length > 0) markBusy(activeAgentsData);
    pruneRecent();
  }, [agents, markBusy, pruneRecent]);

  const showPreview = useCallback((_agent: AgentState, _accent: string, _label: string, _e: React.MouseEvent) => {}, []);
  const hidePreview = useCallback(() => {}, []);

  const onAgentClick = useCallback((agent: AgentState, _accent: string, _label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectAgent(agent);
  }, [onSelectAgent]);

  const onSendDone = useCallback((agent: AgentState) => {
    onSelectAgent(agent);
  }, [onSelectAgent]);

  const sessionAgents = useMemo(() => {
    const map = new Map<string, AgentState[]>();
    for (const a of agents) { const arr = map.get(a.session) || []; arr.push(a); map.set(a.session, arr); }
    return map;
  }, [agents]);

  const sorted = useMemo(() => sortRooms(sessions, sessionAgents, sortMode), [sessions, sessionAgents, sortMode]);

  type VRoom = { key: string; label: string; accent: string; floor: string; agents: AgentState[]; hasBusy: boolean; busyCount: number; dept?: string };

  // Split a session's agents into virtual rooms by category
  function splitByCategory(sessionName: string, agents: AgentState[]): VRoom[] {
    const buckets = new Map<AgentCategory, AgentState[]>();
    for (const a of agents) {
      const cat = agentCategory(a.name);
      const arr = buckets.get(cat) || [];
      arr.push(a);
      buckets.set(cat, arr);
    }
    // If only one category — return as single room (no split needed)
    if (buckets.size <= 1) {
      const st = roomStyle(sessionName);
      const ba = agents.filter(a => a.status === "busy");
      return [{ key: sessionName, label: sessionName, accent: st.accent, floor: st.floor, agents, hasBusy: ba.length > 0, busyCount: ba.length }];
    }
    const ORDER: AgentCategory[] = ["local", "cloud", "gemini", "terminal"];
    return ORDER.flatMap(cat => {
      const ag = buckets.get(cat);
      if (!ag || ag.length === 0) return [];
      const cr = CATEGORY_ROOM[cat];
      const ba = ag.filter(a => a.status === "busy");
      return [{ key: `${sessionName}:${cat}`, label: cr.label, dept: cr.dept, accent: cr.accent, floor: cr.floor, agents: ag, hasBusy: ba.length > 0, busyCount: ba.length }];
    });
  }

  const visualRooms = useMemo((): VRoom[] => {
    const result: VRoom[] = [];
    for (const s of sorted) {
      const ra = sessionAgents.get(s.name) || [];
      result.push(...splitByCategory(s.name, ra));
    }
    return result;
  }, [sorted, sessionAgents]);

  const getAgentFeedLog = useCallback((agentName: string): FeedLogEntry[] | null => {
    if (!agentFeedLog) return null;
    if (!agentName.endsWith("-oracle")) return null;
    const oracleName = agentName.replace(/-oracle$/, "");
    const events = agentFeedLog.get(oracleName);
    if (!events || events.length === 0) return null;
    return events.map(e => ({ text: describeActivity(e), ts: e.ts }));
  }, [agentFeedLog]);

  const busyAgents = useMemo(() => agents.filter(a => a.status === "busy"), [agents]);
  const busyCount = busyAgents.length;
  const readyCount = agents.filter(a => a.status === "ready").length;
  const idleCount = agents.length - busyCount - readyCount;

  const recentlyActive = useMemo((): (AgentState | RecentEntry)[] => {
    const agentMap = new Map(agents.map(a => [a.target, a]));
    const busyTargets = new Set(busyAgents.map(a => a.target));
    const seenNames = new Set<string>();
    const dedupBusy = busyAgents.filter(a => {
      if (seenNames.has(a.name)) return false;
      seenNames.add(a.name);
      return true;
    });
    const recentByName = new Map<string, RecentEntry>();
    for (const e of Object.values(recentMap)) {
      if (busyTargets.has(e.target)) continue;
      const prev = recentByName.get(e.name);
      if (!prev || e.lastBusy > prev.lastBusy) recentByName.set(e.name, e);
    }
    const recentGone = [...recentByName.values()]
      .filter(e => !seenNames.has(e.name))
      .sort((a, b) => b.lastBusy - a.lastBusy)
      .slice(0, 10)
      .map(e => agentMap.get(e.target) || e);
    return [...dedupBusy, ...recentGone];
  }, [agents, busyAgents, recentMap]);

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100vh", background: "#0d0d0d" }}>
      {/* Summary bar */}
      <div style={{
        maxWidth: isMobile ? "100%" : 800, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "12px 14px" : "20px 32px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: "monospace", fontSize: 14 }}>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: 4, fontFamily: "'Silkscreen', 'SF Mono', monospace" }}>FLEET</span>
          <span style={{ color: "rgba(255,255,255,0.6)" }}>{visualRooms.length} rooms</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
          <span style={{ color: "rgba(255,255,255,0.6)" }}>{agents.length} agents</span>
          {!isMobile && <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>}
          {!isMobile && <span style={{ color: fps >= 50 ? "#22d3ee" : fps >= 30 ? "oklch(0.85 0.20 142)" : "#ef5350" }}>{fps} fps</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 20, fontFamily: "monospace", fontSize: 14 }}>
          {busyCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "oklch(0.85 0.20 142)", boxShadow: "0 0 8px oklch(0.85 0.20 142)", animation: "agent-pulse 1s infinite" }} />
              <span style={{ color: "oklch(0.85 0.20 142)" }}>{busyCount} busy</span>
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 4px #22d3ee" }} />
            <span style={{ color: "#22d3ee" }}>{readyCount} ready</span>
          </span>
          {idleCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>{idleCount} idle</span>
            </span>
          )}
          {!isMobile && (
            <>
              <span style={{ color: "rgba(255,255,255,0.1)" }}>|</span>
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                <button
                  style={{
                    padding: "4px 12px", fontSize: 10, fontFamily: "monospace", cursor: "pointer", border: "none",
                    background: sortMode === "active" ? "rgba(251,191,36,0.15)" : "transparent",
                    color: sortMode === "active" ? "oklch(0.85 0.20 142)" : "#64748B",
                    transition: "background 0.15s, color 0.15s",
                  }}
                  onClick={() => setSortMode("active")}>Active first</button>
                <button
                  style={{
                    padding: "4px 12px", fontSize: 10, fontFamily: "monospace", cursor: "pointer", border: "none",
                    background: sortMode === "name" ? "rgba(255,255,255,0.08)" : "transparent",
                    color: sortMode === "name" ? "#E2E8F0" : "#64748B",
                    transition: "background 0.15s, color 0.15s",
                  }}
                  onClick={() => setSortMode("name")}>By room</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stage */}
      <StageSection
        busyAgents={busyAgents}
        recentlyActive={recentlyActive}
        recentMap={recentMap}
        showPreview={showPreview}
        hidePreview={hidePreview}
        onAgentClick={onAgentClick}
      />

      {/* Rooms */}
      <div style={{ maxWidth: isMobile ? "100%" : 800, margin: "0 auto", display: "flex", flexDirection: "column", padding: isMobile ? "12px" : "24px", gap: 16 }}>
        {/* Recently Active */}
        <section style={{
          borderRadius: 16, overflow: "hidden",
          background: "#12121c",
          border: "1px solid rgba(251,191,36,0.15)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: isMobile ? 12 : 20,
              padding: isMobile ? "12px 14px" : "16px 24px", cursor: "pointer", userSelect: "none",
              background: "rgba(251,191,36,0.03)",
            }}
            onClick={() => toggleCollapsed("_recent")}
            role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCollapsed("_recent"); } }}
          >
            <div style={{ width: 12, height: 12, borderRadius: "50%", flexShrink: 0, background: "oklch(0.85 0.20 142)", boxShadow: "0 0 6px oklch(0.85 0.20 142)" }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: "bold", letterSpacing: 4, textTransform: "uppercase", color: "oklch(0.85 0.20 142)", fontFamily: "'Silkscreen', 'SF Mono', monospace" }}>
              Recently Active
            </h3>
            <span style={{
              fontSize: 12, fontFamily: "monospace", fontWeight: "bold",
              padding: "4px 10px", borderRadius: 6,
              background: "rgba(251,191,36,0.15)", color: "oklch(0.85 0.20 142)",
            }}>
              {recentlyActive.length}
            </span>
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{
              marginLeft: "auto", flexShrink: 0,
              transform: isCollapsed("_recent") ? "rotate(-90deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}>
              <path d="M4 6l4 4 4-4" stroke="oklch(0.85 0.20 142)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
            </svg>
          </div>
          {!isCollapsed("_recent") && <div style={{ height: 1, background: "rgba(251,191,36,0.12)" }} />}
          {!isCollapsed("_recent") && (
            <div>
              {recentlyActive.length === 0 && (
                <div style={{ padding: "16px 24px", fontSize: 13, fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>
                  No recent activity yet
                </div>
              )}
              {recentlyActive.map((entry, i) => {
                const rs = roomStyle(entry.session);
                const isBusyNow = "status" in entry && (entry as AgentState).status === "busy";
                const lastBusy = recentMap[entry.target]?.lastBusy || 0;
                const ago = Math.round((Date.now() - lastBusy) / 1000);
                const agoLabel = isBusyNow ? undefined : (ago < 60 ? `${ago}s ago` : `${Math.floor(ago / 60)}m ago`);
                const agent: AgentState = "status" in entry
                  ? entry as AgentState
                  : { target: entry.target, name: entry.name, session: entry.session, windowIndex: 0, active: false, preview: "", status: "idle" };
                return (
                  <AgentRow key={`recent-${entry.target}`}
                    agent={agent} accent={rs.accent} roomLabel={rs.label}
                    isLast={i === recentlyActive.length - 1}
                    featured={i === 0} agoLabel={agoLabel} feedLog={getAgentFeedLog(agent.name)}
                    observe={observe} showPreview={showPreview} hidePreview={hidePreview} onAgentClick={onAgentClick}
                    send={send} onSendDone={onSendDone}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Room cards */}
        {visualRooms.map((vr) => (
          <section key={vr.key}
            style={{
              borderRadius: 16, overflow: "hidden",
              background: "#12121c",
              border: `1px solid ${vr.hasBusy ? vr.accent + "40" : vr.accent + "18"}`,
              boxShadow: vr.hasBusy ? `0 0 24px ${vr.accent}12` : "0 2px 8px rgba(0,0,0,0.3)",
            }}
            aria-label={`${vr.label} room with ${vr.agents.length} agents`}
          >
            <div
              style={{
                display: "flex", alignItems: "center", gap: isMobile ? 12 : 20,
                padding: isMobile ? "12px 14px" : "16px 24px", cursor: "pointer", userSelect: "none",
                background: `${vr.accent}08`,
                transition: "background 0.15s",
              }}
              onClick={() => toggleCollapsed(vr.key)}
              role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCollapsed(vr.key); } }}
            >
              <div style={{
                width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                background: vr.hasBusy ? "oklch(0.85 0.20 142)" : "#22d3ee",
                boxShadow: vr.hasBusy ? "0 0 10px oklch(0.85 0.20 142)" : "0 0 6px #22d3ee",
              }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <h3 style={{
                  margin: 0, fontSize: 14, fontWeight: "bold", letterSpacing: 4,
                  textTransform: "uppercase", color: vr.accent,
                  fontFamily: "'Silkscreen', 'SF Mono', monospace",
                }}>
                  {vr.label}
                </h3>
                {vr.dept && (
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: `${vr.accent}80`, letterSpacing: 2, textTransform: "uppercase" }}>
                    {vr.dept}
                  </span>
                )}
              </div>
              <span style={{
                fontSize: 12, fontFamily: "monospace", fontWeight: "bold",
                padding: "4px 10px", borderRadius: 6,
                background: `${vr.accent}20`, color: vr.accent,
              }}>
                {vr.agents.length}
              </span>
              {vr.hasBusy && (
                <span style={{
                  fontSize: 12, fontFamily: "monospace", fontWeight: "bold",
                  padding: "4px 10px", borderRadius: 6,
                  background: "rgba(251,191,36,0.15)", color: "oklch(0.85 0.20 142)",
                }}>
                  {vr.busyCount} busy
                </span>
              )}
              <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{
                marginLeft: "auto", flexShrink: 0,
                transform: isCollapsed(vr.key) ? "rotate(-90deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}>
                <path d="M4 6l4 4 4-4" stroke={vr.accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
              </svg>
            </div>
            {!isCollapsed(vr.key) && <div style={{ height: 1, background: `${vr.accent}25` }} />}
            {!isCollapsed(vr.key) && (
              <div>
                {vr.agents.map((agent, i) => (
                  <AgentRow key={agent.target}
                    agent={agent} accent={vr.accent} roomLabel={vr.label}
                    isLast={i === vr.agents.length - 1}
                    feedLog={getAgentFeedLog(agent.name)}
                    observe={observe} showPreview={showPreview} hidePreview={hidePreview} onAgentClick={onAgentClick}
                    send={send} onSendDone={onSendDone}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Group toggle */}
      <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", justifyContent: "center", padding: "16px 0" }}>
        <button
          style={{
            fontSize: 11, fontFamily: "monospace", padding: "8px 16px", borderRadius: 8,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#94A3B8", cursor: "pointer", transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
          onClick={toggleGrouped}
        >
          {grouped ? "Show all rooms" : "Group solo oracles"}
        </button>
      </div>

      <BottomStats agents={agents} />
    </div>
  );
});
