import type { ReactNode } from "react";
import { C } from "../lib/theme";
import { TopNav } from "./TopNav";
import { AgentSidebar } from "./AgentSidebar";
import { useViewport } from "../hooks/useViewport";
import type { AgentState, Session } from "../lib/types";

interface ShellProps {
  route: string;
  agents: AgentState[];
  sessions: Session[];
  connected: boolean;
  selectedAgent: AgentState | null;
  onSelectAgent: (agent: AgentState) => void;
  onJump: () => void;
  children: ReactNode;
}

export function Shell({
  route,
  agents,
  sessions: _sessions,
  connected,
  selectedAgent,
  onSelectAgent,
  onJump,
  children,
}: ShellProps) {
  const { isMobile, isTablet } = useViewport();

  return (
    // 100dvh = dynamic viewport height — shrinks when keyboard opens on mobile.
    // This is the correct fix for mobile keyboard layout issues.
    <div style={{
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: C.bg,
      color: C.text,
      fontFamily: C.font,
      overflow: "hidden",
    }}>
      <TopNav
        route={route}
        connected={connected}
        agentCount={agents.length}
        onJump={onJump}
      />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Sidebar: desktop only (tablet uses Jump overlay) */}
        {!isMobile && !isTablet && (
          <AgentSidebar
            agents={agents}
            selectedTarget={selectedAgent?.target}
            onSelect={onSelectAgent}
          />
        )}

        {/* Main content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0 }}>
          {children}
        </div>

      </div>
    </div>
  );
}
