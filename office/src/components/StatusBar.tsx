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
        background: '#08041a',
        border: '4px solid #c9a020',
        boxShadow: '4px 4px 0 0 rgba(0,0,0,0.9), 0 0 16px #c9a02050',
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      {/* Rune corner left */}
      <span style={{ color: '#c9a02060', fontSize: '14px', lineHeight: 1 }}>ᚨ</span>

      {/* Title */}
      <div className="flex items-center gap-2">
        <div style={{
          width: 12, height: 12,
          background: '#f5c518',
          boxShadow: '0 0 8px #f5c51880',
          flexShrink: 0,
          animation: 'gold-shimmer 2s ease-in-out infinite',
        }} />
        <h1
          className="text-[10px] font-bold"
          style={{ color: '#f5c518', letterSpacing: '3px' }}
        >
          {activeView === "mission" ? "MISSION CTL" : "LOKI PIXFICE"}
        </h1>
        <div style={{ width: 12, height: 12, background: '#f5c518', flexShrink: 0,
          animation: 'gold-shimmer 2s ease-in-out 1s infinite' }} />
      </div>

      <div className="ml-auto flex items-center gap-4">

        {/* Connection */}
        <div className="flex items-center gap-2">
          <div style={{
            width: 8, height: 8,
            background: connected ? '#4caf50' : '#ef5350',
            boxShadow: connected ? '0 0 6px #4caf5080' : 'none',
            animation: connected ? 'pixel-glow 2s ease-in-out infinite' : 'agent-pulse 0.8s ease-in-out infinite',
          }} />
          <span className="text-[7px]" style={{ color: connected ? '#4caf50' : '#ef5350' }}>
            {connected ? 'LIVE' : '...'}
          </span>
        </div>

        {/* Counters */}
        <span className="text-[7px]" style={{ color: '#f5c518' }}>
          {agentCount}✦
        </span>
        <span className="text-[7px]" style={{ color: '#c9a020' }}>
          {sessionCount} realms
        </span>

        {/* Nav */}
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="text-[7px]"
            style={{
              color: activeView === item.id ? '#f5c518' : '#6a5830',
              textDecoration: 'none',
              borderBottom: activeView === item.id ? '2px solid #f5c518' : 'none',
              paddingBottom: '2px',
            }}
          >
            {item.label.toUpperCase()}
          </a>
        ))}

        {/* Rune corner right */}
        <span style={{ color: '#c9a02060', fontSize: '14px', lineHeight: 1 }}>ᚠ</span>
      </div>
    </header>
  );
});
