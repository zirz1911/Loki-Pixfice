import { memo } from "react";

interface StatusBarProps {
  connected: boolean;
  agentCount: number;
  sessionCount: number;
  activeView?: string;
}

const NAV_ITEMS = [
  { href: "/office/#office",  label: "Office",   id: "office"   },
  { href: "/office/#mission", label: "Mission",  id: "mission"  },
  { href: "/",                label: "Terminal", id: "terminal" },
];

export const StatusBar = memo(function StatusBar({ connected, agentCount, sessionCount, activeView = "office" }: StatusBarProps) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-4 mx-4 mt-4 px-4 py-3"
      style={{
        background: '#16202e',
        border: '2px solid #5a8cff',
        boxShadow: '4px 4px 0 0 rgba(0,0,0,0.9), 0 0 12px #5a8cff30',
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      {/* Status pixel */}
      <div style={{
        width: 8, height: 8,
        background: '#5a8cff',
        boxShadow: '0 0 6px #5a8cff80',
        flexShrink: 0,
        animation: 'pixel-glow 2s ease-in-out infinite',
      }} />

      {/* Title */}
      <h1
        className="text-[10px] font-bold"
        style={{ color: '#5a8cff', letterSpacing: '3px', textShadow: '2px 2px 0 #0a0a14' }}
      >
        {activeView === "mission" ? "MISSION CTL" : "LOKI PIXFICE"}
      </h1>

      <div className="ml-auto flex items-center gap-4">

        {/* Connection */}
        <div className="flex items-center gap-2">
          <div style={{
            width: 8, height: 8,
            background: connected ? '#5ac88c' : '#ff6b6b',
            boxShadow: connected ? '0 0 6px #5ac88c80' : 'none',
            animation: connected ? 'pixel-glow 2s ease-in-out infinite' : 'agent-pulse 0.8s ease-in-out infinite',
          }} />
          <span className="text-[7px]" style={{ color: connected ? '#5ac88c' : '#ff6b6b' }}>
            {connected ? 'LIVE' : '...'}
          </span>
        </div>

        {/* Counters */}
        <span className="text-[7px]" style={{ color: '#5a8cff' }}>
          {agentCount} agents
        </span>
        <span className="text-[7px]" style={{ color: '#6a7a9a' }}>
          {sessionCount} sessions
        </span>

        {/* Nav */}
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="text-[7px]"
            style={{
              color: activeView === item.id ? '#5a8cff' : '#6a7a9a',
              textDecoration: 'none',
              borderBottom: activeView === item.id ? '2px solid #5a8cff' : 'none',
              paddingBottom: '2px',
            }}
          >
            {item.label.toUpperCase()}
          </a>
        ))}
      </div>
    </header>
  );
});
