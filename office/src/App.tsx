import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { useSessions } from "./hooks/useSessions";
import { useMessages } from "./hooks/useMessages";
import { PixelOfficeView } from "./components/PixelOfficeView";
import { GameCanvas } from "./components/GameCanvas";
import { StatusBar } from "./components/StatusBar";
import { EditToolbar } from "./components/EditToolbar";
import { UniverseBg } from "./components/UniverseBg";
import { TerminalModal } from "./components/TerminalModal";
import { MissionControl } from "./components/MissionControl";
import { ShortcutOverlay } from "./components/ShortcutOverlay";
import { SaiyanToasts } from "./components/SaiyanToasts";
import { JumpOverlay } from "./components/JumpOverlay";
import { OverviewGrid } from "./components/OverviewGrid";
import { unlockAudio, isAudioUnlocked, setSoundMuted } from "./lib/sounds";
import { roomStyle } from "./lib/constants";
import type { AgentState } from "./lib/types";
import type { FurnitureType } from "./lib/officeLayout";

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash.slice(1) || "office");
  useEffect(() => {
    const onHash = () => setHash(window.location.hash.slice(1) || "office");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash;
}

function useAudioUnlock() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const handler = () => {
      if (!isAudioUnlocked()) { unlockAudio(); setReady(true); }
    };
    window.addEventListener("click", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, []);
  return ready;
}

export function App() {
  useAudioUnlock();
  const route = useHashRoute();
  const [selectedAgent, setSelectedAgent] = useState<AgentState | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [muted, setMuted] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [placingType, setPlacingType] = useState<FurnitureType | null>(null);

  const toggleMute = useCallback(() => {
    setMuted(m => { setSoundMuted(!m); return !m; });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPlacingType(null); setShowJump(false); return; }
      if (e.key === "?" && !(e.target instanceof HTMLInputElement)) { setShowShortcuts(true); return; }
      if ((e.key === "j" || e.key === "J") && !(e.target instanceof HTMLInputElement) && !e.ctrlKey && !e.metaKey) { setShowJump(true); return; }
      if ((e.key === "k" && (e.ctrlKey || e.metaKey))) { e.preventDefault(); setShowJump(true); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Triple-tap for shortcuts (mobile)
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    const handler = () => {
      tapCount.current++;
      clearTimeout(tapTimer.current);
      if (tapCount.current >= 3) { tapCount.current = 0; setShowShortcuts(true); }
      else tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 400);
    };
    window.addEventListener("touchend", handler);
    return () => { window.removeEventListener("touchend", handler); clearTimeout(tapTimer.current); };
  }, []);

  const { sessions, agents, saiyanTargets, saiyanSources: _ss, eventLog, addEvent, handleMessage } = useSessions();
  const { connected, send } = useWebSocket(handleMessage);
  const { msgs } = useMessages(agents);

  // Build agent positions for SaiyanToasts (accent + label per target)
  const agentPositions = useMemo(() => {
    const map = new Map<string, { accent: string; label: string }>();
    for (const a of agents) {
      const style = roomStyle(a.session);
      map.set(a.target, { accent: style.accent, label: style.label });
    }
    return map;
  }, [agents]);

  const onSelectAgent = useCallback((agent: AgentState) => {
    setSelectedAgent(agent);
    send({ type: "select", target: agent.target });
  }, [send]);

  const siblings = selectedAgent
    ? agents.filter((a) => a.session === selectedAgent.session)
    : [];

  const onNavigate = useCallback((dir: -1 | 1) => {
    if (!selectedAgent || siblings.length <= 1) return;
    const idx = siblings.findIndex((a) => a.target === selectedAgent.target);
    const next = siblings[(idx + dir + siblings.length) % siblings.length];
    setSelectedAgent(next);
    send({ type: "select", target: next.target });
  }, [selectedAgent, siblings, send]);

  const terminalModal = selectedAgent && (
    <TerminalModal
      agent={selectedAgent}
      send={send}
      onClose={() => setSelectedAgent(null)}
      onNavigate={onNavigate}
      onSelectSibling={onSelectAgent}
      siblings={siblings}
    />
  );

  const shortcutOverlay = showShortcuts && (
    <ShortcutOverlay onClose={() => setShowShortcuts(false)} />
  );

  const jumpOverlay = showJump && (
    <JumpOverlay
      agents={agents}
      onSelect={(agent) => { onSelectAgent(agent); }}
      onClose={() => setShowJump(false)}
    />
  );

  // ── Route: #office (default) — new pixel office room grid ─────────────────
  if (route === "office" || route === "") {
    return (
      <>
        <PixelOfficeView
          sessions={sessions}
          agents={agents}
          msgs={msgs}
          connected={connected}
          send={send}
          onSelectAgent={onSelectAgent}
        />
        {terminalModal}
        {shortcutOverlay}
        {jumpOverlay}
      </>
    );
  }

  // ── Route: #overview — live terminal tiles for all agents ──────────────────
  if (route === "overview") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", background: "#0a0a12", overflow: "hidden" }}>
        <StatusBar
          connected={connected} agentCount={agents.length} sessionCount={sessions.length}
          activeView="overview" onJump={() => setShowJump(true)}
          muted={muted} onToggleMute={toggleMute}
        />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <OverviewGrid
            sessions={sessions} agents={agents} saiyanTargets={saiyanTargets}
            connected={connected} send={send} onSelectAgent={onSelectAgent}
          />
        </div>
        {terminalModal}
        {jumpOverlay}
        {shortcutOverlay}
      </div>
    );
  }

  // ── Route: #mission — galaxy map view ──────────────────────────────────────
  if (route === "mission") {
    return (
      <div style={{ position: "relative", height: "100vh", width: "100vw", overflow: "hidden", background: "#060614" }}>
        <UniverseBg />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
          <StatusBar
            connected={connected} agentCount={agents.length} sessionCount={sessions.length}
            activeView="mission" onJump={() => setShowJump(true)}
            muted={muted} onToggleMute={toggleMute}
          />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <MissionControl
              sessions={sessions}
              agents={agents}
              saiyanTargets={saiyanTargets}
              connected={connected}
              send={send}
              onSelectAgent={onSelectAgent}
              eventLog={eventLog}
              addEvent={addEvent}
            />
            <SaiyanToasts
              saiyanTargets={saiyanTargets}
              agents={agents}
              agentPositions={agentPositions}
              onToastClick={(card) => onSelectAgent(card.agent)}
            />
          </div>
        </div>
        {terminalModal}
        {shortcutOverlay}
        {jumpOverlay}
      </div>
    );
  }

  // ── Route: #game — canvas pixel art game view ──────────────────────────────
  if (route === "game") {
    return (
      <div style={{ position: "relative", height: "100vh", width: "100vw", overflow: "hidden", background: "#060614" }}>
        <UniverseBg />
        <GameCanvas
          sessions={sessions} agents={agents}
          saiyanTargets={saiyanTargets} onSelectAgent={onSelectAgent}
          editMode={editMode} placingType={placingType}
          onPlacingDone={() => setPlacingType(null)}
        />
        <div style={{ position: "relative", zIndex: 10, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto" }}>
            <StatusBar
            connected={connected} agentCount={agents.length} sessionCount={sessions.length}
            activeView="game" onJump={() => setShowJump(true)}
            muted={muted} onToggleMute={toggleMute}
          />
          </div>
        </div>
        <div style={{ pointerEvents: "none", position: "fixed", inset: 0, zIndex: 20 }}>
          <EditToolbar
            editMode={editMode}
            placingType={placingType}
            onToggleEdit={() => { setEditMode((v) => !v); setPlacingType(null); }}
            onSelectPlacing={setPlacingType}
          />
        </div>
        {!editMode && terminalModal}
        {shortcutOverlay}
      </div>
    );
  }

  // Fallback → redirect to office
  window.location.hash = "office";
  return null;
}
