import { memo } from "react";

// Deterministic pixel stars — avoid random on every render
const STARS = Array.from({ length: 72 }, (_, i) => ({
  x: +((i * 137.508) % 100).toFixed(1),
  y: +((i * 89.201) % 100).toFixed(1),
  size: [1, 1, 1, 1, 2, 2, 3][i % 7],
  delay: +((i * 0.37) % 3).toFixed(2),
  dur:   +(1.5 + (i * 0.29) % 2).toFixed(2),
  color: ['#c8d8ff', '#a0b8f0', '#8090c8', '#d8e8ff', '#ffffff'][i % 5],
}));

export const UniverseBg = memo(function UniverseBg() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden" style={{ background: '#060614' }}>

      {/* Aurora glow — blue-green at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 240,
        background: `
          radial-gradient(ellipse 70% 120% at 20% -30%, #0a1a5060 0%, transparent 70%),
          radial-gradient(ellipse 60% 100% at 80% -20%, #0a2a1850 0%, transparent 70%)
        `,
        pointerEvents: 'none',
      }} />

      {/* Subtle grid — gives depth to deep space */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(90,140,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(90,140,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
        pointerEvents: 'none',
      }} />

      {/* Pixel stars */}
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: s.color,
            imageRendering: 'pixelated',
            animation: `pixel-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}

      {/* Distant nebula blob — bottom right */}
      <div style={{
        position: 'absolute', bottom: '5%', right: '8%',
        width: 180, height: 120,
        background: 'radial-gradient(ellipse, #1a0a3030 0%, transparent 70%)',
        filter: 'blur(12px)',
        pointerEvents: 'none',
      }} />
    </div>
  );
});
