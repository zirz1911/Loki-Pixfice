import { useState, useCallback, useEffect } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { useSessions } from "./hooks/useSessions";
import { useMessages } from "./hooks/useMessages";
import { Shell } from "./components/Shell";
import { TerminalModal } from "./components/TerminalModal";
import { RoomsView } from "./components/RoomsView";
import { OverviewGrid } from "./components/OverviewGrid";
import { FleetGrid } from "./components/FleetGrid";
import { ShortcutOverlay } from "./components/ShortcutOverlay";
import { JumpOverlay } from "./components/JumpOverlay";
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")                                                       { setShowJump(false); return; }
      if (e.key === "?" && !(e.target instanceof HTMLInputElement))                 { setShowShortcuts(true); return; }
      if ((e.key === "j" || e.key === "J") && !(e.target instanceof HTMLInputElement) && !e.ctrlKey && !e.metaKey) { setShowJump(true); return; }
      if (e.key === "k" && (e.ctrlKey || e.metaKey))                               { e.preventDefault(); setShowJump(true); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Triple-tap opens shortcuts on mobile
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
  useMessages(agents); // keep alive for chat panel if needed

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

  // Route → main content
  let mainContent: React.ReactNode;
  if (route === "overview") {
    mainContent = (
      <OverviewGrid
        sessions={sessions}
        agents={agents}
        connected={connected}
        send={send}
        onSelectAgent={onSelectAgent}
      />
    );
  } else if (route === "fleet") {
    mainContent = (
      <FleetGrid
        sessions={sessions}
        agents={agents}
        connected={connected}
        send={send}
        onSelectAgent={onSelectAgent}
        eventLog={eventLog}
        addEvent={addEvent}
        feedActive={feedActive}
        agentFeedLog={agentFeedLog}
      />
    );
  } else if (route === "worktree") {
    mainContent = (
      <WorktreeView accentColor="oklch(0.85 0.20 142)" maxHeight="none" />
    );
  } else {
    mainContent = (
      <RoomsView
        sessions={sessions}
        agents={agents}
        onSelectAgent={onSelectAgent}
      />
    );
  }

  return (
    <>
      <Shell
        route={route}
        agents={agents}
        sessions={sessions}
        connected={connected}
        selectedAgent={selectedAgent}
        onSelectAgent={onSelectAgent}
        onJump={() => setShowJump(true)}
      >
        {mainContent}
      </Shell>

      {selectedAgent && (
        <TerminalModal
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onNavigate={onNavigate}
          siblings={siblings}
          onSelectSibling={onSelectAgent}
        />
      )}

      {showShortcuts && (
        <ShortcutOverlay onClose={() => setShowShortcuts(false)} />
      )}
      {showJump && (
        <JumpOverlay
          agents={agents}
          onSelect={(agent) => { onSelectAgent(agent); setShowJump(false); }}
          onClose={() => setShowJump(false)}
        />
      )}
    </>
  );
}
