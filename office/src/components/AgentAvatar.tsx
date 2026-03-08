import { memo } from "react";
import { agentEmoji } from "../lib/constants";
import type { PaneStatus } from "../lib/types";

// ── Pixel sprite: 16 cols × 19 rows, pixel size PS ───────────────────────────
// Key: 0=transparent H=hair S=skin E=eyewhite P=pupil M=mouthcorner W=mouthopen
//      C=clothes A=accent L=legs B=boots
const SPRITE: string[] = [
  '0000HHHHHHHH0000',  // 0  hair top
  '000HHHHHHHHHH000',  // 1  hair
  '000HSSSSSSSSSH00',  // 2  forehead
  '00HSSSSSSSSSSSH0',  // 3  face top
  '00HSEPPSEPSSSH00',  // 4  eyes
  '00HSSSSSSSSSSSH0',  // 5  face mid
  '00HSSSMWWMSSSH00',  // 6  mouth
  '00HSSSSSSSSSH000',  // 7  chin
  '000SSSSSSSS00000',  // 8  neck
  '00CCCSSSSCCC0000',  // 9  collar
  '0CCCCCCCCCCCCC00',  // 10 shoulders
  '1CCCCCCCCCCCCC00',  // 11 torso
  '0CAAACCCCAAACCC0',  // 12 torso detail
  '0CCCCCCCCCCCCC00',  // 13 waist
  '00LLLLCCCLLLL000',  // 14 upper legs
  '000LLLL0LLLLL000',  // 15 legs
  '000LLLL0LLLLL000',  // 16 lower legs
  '000BBBB0BBBBB000',  // 17 boots
  '00BBBBB00BBBBB00',  // 18 boots bottom
];

interface Palette { H:string; S:string; E:string; P:string; M:string; W:string; C:string; A:string; L:string; B:string; }

const PALETTES: Record<string, Palette> = {
  default:  { H:'#6b3a2a', S:'#fde2c8', E:'#ffffff', P:'#2c1b0e', M:'#6b3030', W:'#e0c08a', C:'#4a7a2c', A:'#6aaa4c', L:'#4060a0', B:'#2a3070' },
  odin:     { H:'#c8a830', S:'#d4956b', E:'#ffffff', P:'#1a1008', M:'#603020', W:'#e0c080', C:'#1e1040', A:'#f5c518', L:'#2c1848', B:'#180830' },
  thor:     { H:'#d4b050', S:'#fde2c8', E:'#ffffff', P:'#1a1040', M:'#503020', W:'#fae8c8', C:'#2050a8', A:'#4fc3f7', L:'#183080', B:'#102060' },
  loki:     { H:'#1a0a30', S:'#c88060', E:'#ffffff', P:'#3a1060', M:'#501840', W:'#d0a0b0', C:'#5a2080', A:'#c060e0', L:'#3a1060', B:'#200840' },
  heimdall: { H:'#d4c080', S:'#fde2c8', E:'#ffffff', P:'#103830', M:'#305040', W:'#e8f0e8', C:'#1a6858', A:'#40d0b0', L:'#0e3838', B:'#082828' },
  tyr:      { H:'#802020', S:'#fde2c8', E:'#ffffff', P:'#401010', M:'#601010', W:'#f0d0d0', C:'#802020', A:'#ff6060', L:'#601010', B:'#400808' },
  ymir:     { H:'#a0c0d8', S:'#c0d8f0', E:'#90b8d0', P:'#304858', M:'#4a6878', W:'#d0e8f8', C:'#4878a0', A:'#90d0f8', L:'#305070', B:'#203040' },
};

const STATUS_FX: Record<PaneStatus, { glow: string; anim: string; sparkle: boolean }> = {
  ready: { glow: '#4caf50', anim: 'pixel-idle 2s ease-in-out infinite', sparkle: false },
  busy:  { glow: '#fdd835', anim: 'pixel-bob 0.35s ease-in-out infinite', sparkle: true },
  idle:  { glow: '#555',    anim: 'none',                                  sparkle: false },
};

const PS = 2; // SVG units per sprite pixel (sprite = 32×38)

interface Props { name: string; target: string; status: PaneStatus; preview: string; accent: string; saiyan?: boolean; onClick: () => void; }

export const AgentAvatar = memo(function AgentAvatar({ name, target, status, preview, accent, saiyan, onClick }: Props) {
  const key = name.toLowerCase().replace(/-oracle$/, '');
  const pk  = Object.keys(PALETTES).find(k => k !== 'default' && key.startsWith(k)) ?? 'default';
  const pal = PALETTES[pk];
  const emoji = agentEmoji(name);
  const fx = STATUS_FX[status];
  const filterId = `glow-${target.replace(/[^a-z0-9]/gi, '-')}`;

  const cmap: Record<string, string> = {
    H: pal.H, S: pal.S, E: pal.E, P: pal.P,
    M: pal.M, W: pal.W, C: pal.C, A: pal.A,
    L: pal.L, B: pal.B,
    '1': pal.C,
  };

  const SW = 16 * PS; // sprite width  = 32
  const SH = 19 * PS; // sprite height = 38

  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick}>
      <defs>
        <filter id={filterId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
        </filter>
      </defs>

      {/* Ground shadow / glow */}
      {status !== 'idle' && (
        <ellipse cx={SW / 2} cy={SH + 5} rx={14} ry={4}
          fill={fx.glow} opacity={0.4} filter={`url(#${filterId})`}
          style={{ animation: 'pixel-glow 1.5s ease-in-out infinite' }} />
      )}

      {/* Saiyan power ring */}
      {saiyan && (
        <circle cx={SW / 2} cy={SH / 2} r={30}
          fill="none" stroke={fx.glow} strokeWidth={2} opacity={0.5}
          style={{ animation: 'saiyan-ring 1.5s ease-out infinite' }} />
      )}

      {/* Sprite body — animated */}
      <g style={{ animation: fx.anim }}>
        {SPRITE.map((row, ri) =>
          row.split('').map((ch, ci) => {
            if (ch === '0') return null;
            const color = cmap[ch];
            if (!color) return null;
            return <rect key={`${ri}-${ci}`} x={ci * PS} y={ri * PS} width={PS} height={PS} fill={color} />;
          })
        )}
      </g>

      {/* Status pixel dot (top-right) */}
      <rect x={SW - PS * 2} y={0} width={PS * 2} height={PS * 2} fill={fx.glow}
        style={status === 'busy' ? { animation: 'agent-pulse 0.5s ease-in-out infinite' } : {}} />

      {/* Busy sparkles */}
      {fx.sparkle && (
        <>
          {[{ x: -8, y: 4, d: 0 }, { x: SW + 4, y: 8, d: 0.4 }, { x: -6, y: 16, d: 0.8 }, { x: SW + 2, y: 20, d: 1.2 }].map((s, i) => (
            <g key={i} transform={`translate(${s.x},${s.y})`}
              style={{ animation: `sparkle 1.2s ease-in-out ${s.d}s infinite` }}>
              <rect x={-2} y={0} width={4} height={2} fill={fx.glow} />
              <rect x={0} y={-2} width={2} height={4} fill={fx.glow} />
            </g>
          ))}
        </>
      )}

      {/* Emoji badge above head */}
      {emoji && (
        <text x={SW / 2} y={-4} textAnchor="middle" fontSize={12}
          style={{ filter: `drop-shadow(0 0 3px ${pal.A})` }}>
          {emoji}
        </text>
      )}

      {/* Floating code (busy) */}
      {status === 'busy' && preview && (
        <foreignObject x={-16} y={-26} width={64} height={14} style={{ pointerEvents: 'none' }}>
          <div style={{
            animation: 'float-code 3s ease-in-out infinite',
            fontSize: '5px', color: accent,
            fontFamily: "'Press Start 2P', monospace",
            textAlign: 'center', whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.9,
          }}>{preview.slice(0, 18)}</div>
        </foreignObject>
      )}
    </g>
  );
});
