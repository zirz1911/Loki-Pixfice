import { memo, useMemo } from "react";
import { agentEmoji } from "../lib/constants";
import type { PaneStatus } from "../lib/types";

const PS = 4; // pixel size in CSS px

interface Palette { H:string; S:string; E:string; P:string; M:string; W:string; C:string; A:string; L:string; B:string }

const PALETTES: Record<string, Palette> = {
  default:  { H:'#6b3a2a',S:'#fde2c8',E:'#ffffff',P:'#2c1b0e',M:'#5a2020',W:'#c8a070',C:'#4a7a2c',A:'#6aaa4c',L:'#4060a0',B:'#2a3070' },
  odin:     { H:'#c8a830',S:'#d4956b',E:'#ffffff',P:'#1a1008',M:'#603020',W:'#e0c080',C:'#1e1040',A:'#f5c518',L:'#2c1848',B:'#180830' },
  thor:     { H:'#d4b050',S:'#fde2c8',E:'#ffffff',P:'#1a1040',M:'#503020',W:'#fae8c8',C:'#2050a8',A:'#4fc3f7',L:'#183080',B:'#102060' },
  loki:     { H:'#1a0a30',S:'#c88060',E:'#ffffff',P:'#3a1060',M:'#501840',W:'#d0a0b0',C:'#5a2080',A:'#c060e0',L:'#3a1060',B:'#200840' },
  heimdall: { H:'#d4c080',S:'#fde2c8',E:'#ffffff',P:'#103830',M:'#305040',W:'#e8f0e8',C:'#1a6858',A:'#40d0b0',L:'#0e3838',B:'#082828' },
  tyr:      { H:'#802020',S:'#fde2c8',E:'#ffffff',P:'#401010',M:'#601010',W:'#f0d0d0',C:'#802020',A:'#ff6060',L:'#601010',B:'#400808' },
  ymir:     { H:'#a0c0d8',S:'#c0d8f0',E:'#90b8d0',P:'#304858',M:'#4a6878',W:'#d0e8f8',C:'#4878a0',A:'#90d0f8',L:'#305070',B:'#203040' },
};

// 8-col × 12-row pixel sprites — '0' = transparent, letter = palette key
const SPRITES: Record<string, string[]> = {
  odin: [
    '0AAAAA00',  // golden crown teeth
    '0HHHHHH0',  // golden hair / crown band
    '0SSSSSS0',  // forehead
    '0SEPPSS0',  // one lit eye (Odin sacrificed one)
    '0SSSSSS0',  // mid face
    '0SSMSSS0',  // mouth
    '0CCCCCC0',  // dark robe collar
    'CCAACCCC',  // robe body — A = gold rune
    'CCAACCCC',
    '0CCCCCC0',  // waist
    '0LL00LL0',  // thighs
    '0BB00BB0',  // boots
  ],
  thor: [
    '0HHHHHH0',  // thick blonde hair
    '0HHHHHH0',
    '0SSSSSS0',  // face
    '0SEPPSS0',  // eyes
    '0SSSSSS0',
    '0SSMSSS0',  // mouth
    '0CCCCCC0',  // blue armor collar
    'CAAACCCC',  // body — A = lightning cyan
    'CCAACCCC',
    '0CCCCCC0',
    '0LL00LL0',
    '0BB00BB0',
  ],
  loki: [
    '0HHHHHH0',  // dark hair
    'HHHHHHH0',  // hair flows left
    'H0SSSSS0',  // hair frames face
    '0SEPPSS0',  // sly eyes
    '0SSSSSS0',
    '0SWMSSS0',  // smirk — W = tooth gleam
    '0CCCCCC0',  // purple robe
    'CCAACCCC',  // robe — A = magic purple
    'CCAAC000',  // robe flourish (asymmetric)
    '0CCCCCC0',
    '0LL00LL0',
    '0BB00BB0',
  ],
  heimdall: [
    '0HAAHH00',  // rainbow streaks in hair — A = teal
    '0HHHHHH0',
    '0SSSSSS0',
    '0SEEPSS0',  // wide watchful eyes (tall)
    '0SEEPSS0',  // eyes span 2 rows — Heimdall sees all
    '0SSMSSS0',
    '0CCCCCC0',  // teal armor
    'CAACCACC',  // armor — A = teal glow
    'CCAACCCC',
    '0CCCCCC0',
    '0LL00LL0',
    '0BB00BB0',
  ],
  tyr: [
    '0HHHHHH0',  // dark red hair
    '0HHHHHH0',
    '0SSSSSS0',
    '0SEPPSS0',  // determined eyes
    '0SSSSSS0',
    '0SSMSSS0',  // firm mouth
    '0CCCCCC0',  // red armor
    'CCAACCCC',  // armor — A = red highlight
    'ACCCCC00',  // one arm truncated (Tyr's sacrifice)
    '0CCCCCC0',
    '0LL00LL0',
    '0BB00BB0',
  ],
  ymir: [
    'HHHHHHH0',  // icy hair — wide (frost giant)
    'HHHHHHH0',
    'HSSSSSS0',  // wide face — H = frost edge
    'HSEPPSS0',
    'HSSSSSS0',
    'HSSMWSS0',  // large mouth
    'HCCCCCCH',  // wide frost armor
    'CAAACCCA',  // armor — A = ice glow
    'CCAACCCA',
    'HCCCCCCH',  // wide waist
    'HLL00LLH',  // massive legs
    'HBB00BBH',  // boots with frost
  ],
};

SPRITES.default = [
  '00HHHH00',
  '0HHHHHH0',
  '0SSSSSS0',
  '0SEPPSS0',
  '0SSSSSS0',
  '0SSMSSS0',
  '0CCCCCC0',
  'CCAACCCC',
  'CCCCCCCC',
  '0CCCCCC0',
  '0LL00LL0',
  '0BB00BB0',
];

function buildBoxShadow(rows: string[], pal: Palette): string {
  const cmap: Record<string, string> = {
    H:pal.H, S:pal.S, E:pal.E, P:pal.P,
    M:pal.M, W:pal.W, C:pal.C, A:pal.A,
    L:pal.L, B:pal.B,
  };
  const parts: string[] = [];
  rows.forEach((row, ry) => {
    for (let cx = 0; cx < row.length; cx++) {
      const ch = row[cx];
      if (ch === '0') continue;
      const color = cmap[ch];
      if (!color) continue;
      parts.push(`${cx * PS}px ${ry * PS}px 0 0 ${color}`);
    }
  });
  return parts.length > 0 ? parts.join(',') : '0 0 0 0 transparent';
}

const SPRITE_COLS = 8;

interface Props {
  name: string;
  target: string;
  status: PaneStatus;
  preview: string;
  accent: string;
  saiyan?: boolean;
  onClick: () => void;
}

export const AgentAvatar = memo(function AgentAvatar({
  name, status, preview, accent, saiyan, onClick,
}: Props) {
  const key = name.toLowerCase().replace(/-oracle$/, '');
  const pk = Object.keys(PALETTES).find(k => k !== 'default' && key.startsWith(k)) ?? 'default';
  const pal = PALETTES[pk];
  const rows = SPRITES[pk] ?? SPRITES.default;
  const emoji = agentEmoji(name);
  const boxShadow = useMemo(() => buildBoxShadow(rows, pal), [rows, pal]);

  const W = SPRITE_COLS * PS;       // 32 px
  const H = rows.length * PS;       // 48 px
  const dotColor = status === 'busy' ? '#fdd835' : status === 'ready' ? '#4caf50' : '#445566';
  const bodyAnim =
    status === 'busy'  ? 'pixel-bob 0.35s ease-in-out infinite' :
    status === 'ready' ? 'pixel-idle 2s ease-in-out infinite'   : 'none';

  return (
    <div
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {/* Emoji badge */}
      {emoji && (
        <div style={{ fontSize: 10, lineHeight: 1, marginBottom: 3, filter: `drop-shadow(0 0 4px ${pal.A})` }}>
          {emoji}
        </div>
      )}

      {/* Ambient glow */}
      {status !== 'idle' && (
        <div style={{
          position: 'absolute',
          top: emoji ? 18 : 4, left: '50%', transform: 'translateX(-50%)',
          width: W + 16, height: H + 8,
          background: dotColor, opacity: 0.13,
          filter: 'blur(8px)', borderRadius: 4,
          animation: 'pixel-glow 1.5s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Saiyan power ring */}
      {saiyan && (
        <div style={{
          position: 'absolute',
          top: emoji ? 8 : -4, left: '50%', transform: 'translateX(-50%)',
          width: W + 24, height: H + 24,
          border: `2px solid ${dotColor}`,
          borderRadius: '50%', opacity: 0.5,
          animation: 'saiyan-ring 1.5s ease-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Sprite */}
      <div style={{ position: 'relative', width: W, height: H, animation: bodyAnim, imageRendering: 'pixelated' }}>
        {/* CSS box-shadow pixel art — anchor at (0,0), each shadow = one pixel */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: PS, height: PS,
          background: 'transparent',
          boxShadow,
        }} />

        {/* Status dot (top-right corner) */}
        <div style={{
          position: 'absolute', top: 0, right: -(PS * 2),
          width: PS * 2, height: PS * 2,
          background: dotColor,
          animation: status === 'busy' ? 'agent-pulse 0.5s ease-in-out infinite' : 'none',
        }} />
      </div>

      {/* Busy sparkles */}
      {status === 'busy' && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {([[-8, 8, 0], [W + 4, 12, 0.4], [-6, 20, 0.8], [W + 2, 24, 1.2]] as [number,number,number][]).map(([sx, sy, sd], i) => (
            <div key={i} style={{
              position: 'absolute',
              left: sx + 4, top: sy + (emoji ? 14 : 0),
              width: 4, height: 2,
              background: dotColor,
              animation: `sparkle 1.2s ease-in-out ${sd}s infinite`,
            }} />
          ))}
        </div>
      )}

      {/* Floating code preview (busy) */}
      {status === 'busy' && preview && (
        <div style={{
          position: 'absolute',
          bottom: H + (emoji ? 28 : 14),
          left: '50%', transform: 'translateX(-50%)',
          fontSize: 4, color: accent,
          fontFamily: "'Press Start 2P', monospace",
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          maxWidth: 70, opacity: 0.9,
          animation: 'float-code 3s ease-in-out infinite',
          pointerEvents: 'none',
        }}>
          {preview.slice(0, 16)}
        </div>
      )}
    </div>
  );
});
