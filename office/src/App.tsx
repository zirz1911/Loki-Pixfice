import { useState, useCallback, useEffect } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { useSessions } from "./hooks/useSessions";
import { useMessages } from "./hooks/useMessages";
import { PixelOfficeView } from "./components/PixelOfficeView";
import { StatusBar } from "./components/StatusBar";
import { TerminalModal } from "./components/TerminalModal";
import { ShortcutOverlay } from "./components/ShortcutOverlay";
import { JumpOverlay } from "./components/JumpOverlay";
import { OverviewGrid } from "./components/OverviewGrid";
import { FleetGrid } from "./components/FleetGrid";
import { WorktreeView } from "./components/WorktreeView";
import type { AgentState } from "./lib/types";

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash.slice(1) || "office");
  useEffect(() => {
    const onHash = () => setHash(window.location.hash.slice(1) || "office");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash;
}

export function App() {
  const route = useHashRoute();
  const [selectedAgent, setSelectedAgent] = useState<AgentState | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showJump, setShowJump] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setShowJump(false); return; }
      if (e.key === "?" && !(e.target instanceof HTMLInputElement)) { setShowShortcuts(true); return; }
      if ((e.key === "j" || e.key === "J") && !(e.target instanceof HTMLInputElement) && !e.ctrlKey && !e.metaKey) { setShowJump(true); return; }
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setShowJump(true); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    let tapCount = 0;
    let tapTimer: ReturnType<typeof setTimeout>;
    const handler = () => {
      tapCount++;
      clearTimeout(tapTimer);
      if (tapCount >= 3) { tapCount = 0; setShowShortcuts(true); }
      else tapTimer = setTimeout(() => { tapCount = 0; }, 400);
    };
    window.addEventListener("touchend", handler);
    return () => window.removeEventListener("touchend", handler);
  }, []);

  const { sessions, agents, eventLog, addEvent, handleMessage, feedActive, agentFeedLog } = useSessions();
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

  const jumpOverlay = showJump && (
    <JumpOverlay
      agents={agents}
      onSelect={(agent) => { onSelectAgent(agent); setShowJump(false); }}
      onClose={() => setShowJump(false)}
    />
  );

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

  if (route === "overview") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", background: "#0a0a12", overflow: "hidden" }}>
        <StatusBar connected={connected} agentCount={agents.length} sessionCount={sessions.length} activeView="overview" onJump={() => setShowJump(true)} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <OverviewGrid sessions={sessions} agents={agents} connected={connected} send={send} onSelectAgent={onSelectAgent} />
        </div>
        {terminalModal}{jumpOverlay}{shortcutOverlay}
      </div>
    );
  }

  if (route === "fleet") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", background: "#0a0a12", overflow: "hidden" }}>
        <StatusBar connected={connected} agentCount={agents.length} sessionCount={sessions.length} activeView="fleet" onJump={() => setShowJump(true)} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <FleetGrid
            sessions={sessions} agents={agents}
            connected={connected} send={send} onSelectAgent={onSelectAgent}
            eventLog={eventLog} addEvent={addEvent}
            feedActive={feedActive} agentFeedLog={agentFeedLog}
          />
        </div>
        {terminalModal}{jumpOverlay}{shortcutOverlay}
      </div>
    );
  }

  if (route === "worktree") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", background: "#0a0a12", overflow: "hidden" }}>
        <StatusBar connected={connected} agentCount={agents.length} sessionCount={sessions.length} activeView="worktree" onJump={() => setShowJump(true)} />
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          <WorktreeView accentColor="#5a8cff" maxHeight="none" />
        </div>
        {terminalModal}{jumpOverlay}{shortcutOverlay}
      </div>
    );
  }

  window.location.hash = "office";
  return null;
}
