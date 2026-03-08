import { memo } from "react";

interface StatusBarProps {
  connected: boolean;
  agentCount: number;
  sessionCount: number;
  activeView?: string;
}

const NAV_ITEMS = [
  { href: "/office/#office",   label: "Office",   id: "office"   },
  { href: "/office/#mission",  label: "Mission",  id: "mission"  },
  { href: "/",                 label: "Terminal", id: "terminal" },
];

export const StatusBar = memo(function StatusBar({ connected, agentCount, sessionCount, activeView = "office" }: StatusBarProps) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-4 mx-4 mt-4 px-4 py-3"
      style={{
        background: '#1a1008',
        border: '4px solid #8b6340',
        boxShadow: '4px 4px 0 0 rgba(0,0,0,0.7)',
        fontFamily: "'Press Start 2P', monospace",
        imageRendering: 'pixelated',
      }}
    >
      {/* Title */}
      <div className="flex items-center gap-2">
        <div style={{ width: 12, height: 12, background: '#f5c518', flexShrink: 0 }} />
        <h1 className="text-[10px] font-bold" style={{ color: '#f5c518', letterSpacing: '2px' }}>
          {activeView === "mission" ? "MISSION CTL" : "LOKI PIXFICE"}
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-4">
        {/* Connection status */}
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 8, height: 8,
              background: connected ? '#4caf50' : '#ef5350',
              animation: connected ? 'none' : 'agent-pulse 0.8s ease-in-out infinite',
            }}
          />
          <span className="text-[7px]" style={{ color: connected ? '#4caf50' : '#ef5350' }}>
            {connected ? 'LIVE' : '...'}
          </span>
        </div>

        {/* Counters */}
        <span className="text-[7px]" style={{ color: '#4fc3f7' }}>
          {agentCount} agents
        </span>
        <span className="text-[7px]" style={{ color: '#a855f7' }}>
          {sessionCount} realms
        </span>

        {/* Nav */}
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="text-[7px] transition-colors"
            style={{
              color: activeView === item.id ? '#f5c518' : '#8a7860',
              textDecoration: 'none',
              borderBottom: activeView === item.id ? '2px solid #f5c518' : 'none',
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
