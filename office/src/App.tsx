import { useState, useCallback, useEffect, useRef } from "react";
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
import { unlockAudio, isAudioUnlocked } from "./lib/sounds";
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
  const [editMode, setEditMode] = useState(false);
  const [placingType, setPlacingType] = useState<FurnitureType | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPlacingType(null); return; }
      if (e.key === "?" && !(e.target instanceof HTMLInputElement)) setShowShortcuts(true);
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

  const { sessions, agents, saiyanTargets, handleMessage } = useSessions();
  const { connected, send } = useWebSocket(handleMessage);
  const { msgs } = useMessages(agents);

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
      </>
    );
  }

  // ── Route: #mission — galaxy map view ──────────────────────────────────────
  if (route === "mission") {
    return (
      <div style={{ position: "relative", height: "100vh", width: "100vw", overflow: "hidden", background: "#060614" }}>
        <UniverseBg />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
          <StatusBar connected={connected} agentCount={agents.length} sessionCount={sessions.length} activeView="mission" />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <MissionControl
              sessions={sessions}
              agents={agents}
              saiyanTargets={saiyanTargets}
              connected={connected}
              send={send}
              onSelectAgent={onSelectAgent}
            />
          </div>
        </div>
        {terminalModal}
        {shortcutOverlay}
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
            <StatusBar connected={connected} agentCount={agents.length} sessionCount={sessions.length} activeView="game" />
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
