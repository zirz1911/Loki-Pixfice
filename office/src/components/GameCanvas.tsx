import { useEffect, useRef, useCallback } from "react";
import { roomStyle, agentEmoji } from "../lib/constants";
import type { AgentState, Session } from "../lib/types";

// ── Sprite ────────────────────────────────────────────────────────────────────
const PS = 2;
const SW = 16 * PS;   // 32
const SH = 19 * PS;   // 38

const SPRITE_ROWS = [
  '0000HHHHHHHH0000',  // 0  hair
  '000HHHHHHHHHH000',  // 1
  '000HSSSSSSSSSH00',  // 2  forehead
  '00HSSSSSSSSSSSH0',  // 3
  '00HSEPPSEPSSSH00',  // 4  eyes
  '00HSSSSSSSSSSSH0',  // 5
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

interface Pal { H:string;S:string;E:string;P:string;M:string;W:string;C:string;A:string;L:string;B:string }

const PALETTES: Record<string, Pal> = {
  default:  { H:'#6b3a2a',S:'#fde2c8',E:'#fff',P:'#2c1b0e',M:'#6b3030',W:'#e0c08a',C:'#4a7a2c',A:'#6aaa4c',L:'#4060a0',B:'#2a3070' },
  odin:     { H:'#c8a830',S:'#d4956b',E:'#fff',P:'#1a1008',M:'#603020',W:'#e0c080',C:'#1e1040',A:'#f5c518',L:'#2c1848',B:'#180830' },
  thor:     { H:'#d4b050',S:'#fde2c8',E:'#fff',P:'#1a1040',M:'#503020',W:'#fae8c8',C:'#2050a8',A:'#4fc3f7',L:'#183080',B:'#102060' },
  loki:     { H:'#1a0a30',S:'#c88060',E:'#fff',P:'#3a1060',M:'#501840',W:'#d0a0b0',C:'#5a2080',A:'#c060e0',L:'#3a1060',B:'#200840' },
  heimdall: { H:'#d4c080',S:'#fde2c8',E:'#fff',P:'#103830',M:'#305040',W:'#e8f0e8',C:'#1a6858',A:'#40d0b0',L:'#0e3838',B:'#082828' },
  tyr:      { H:'#802020',S:'#fde2c8',E:'#fff',P:'#401010',M:'#601010',W:'#f0d0d0',C:'#802020',A:'#ff6060',L:'#601010',B:'#400808' },
  ymir:     { H:'#a0c0d8',S:'#c0d8f0',E:'#90b8d0',P:'#304858',M:'#4a6878',W:'#d0e8f8',C:'#4878a0',A:'#90d0f8',L:'#305070',B:'#203040' },
};

function getPalette(name: string): Pal {
  const key = name.toLowerCase().replace(/-oracle$/, '');
  const pk = Object.keys(PALETTES).find(k => k !== 'default' && key.startsWith(k)) ?? 'default';
  return PALETTES[pk];
}

function drawSprite(ctx: CanvasRenderingContext2D, x: number, y: number, pal: Pal) {
  const cmap: Record<string, string> = {
    H:pal.H, S:pal.S, E:pal.E, P:pal.P, M:pal.M,
    W:pal.W, C:pal.C, A:pal.A, L:pal.L, B:pal.B, '1':pal.C,
  };
  for (let r = 0; r < SPRITE_ROWS.length; r++) {
    const row = SPRITE_ROWS[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '0') continue;
      const color = cmap[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + c * PS, y + r * PS, PS, PS);
    }
  }
}

// ── Realm colours (from constants + extras) ───────────────────────────────────
interface Realm {
  label: string;
  rune: string;
  accent: string;
  headerBg: string;
  floor1: string;
  floor2: string;
  wall: string;
  deskDark: string;
  deskMid: string;
  deskLight: string;
  monBusy: string;
  monGlow: string;
}

const REALM_ASGARD:    Realm = { label:'ASGARD',    rune:'ᚱ', accent:'#f5c518', headerBg:'#0c0820', floor1:'#1e1640', floor2:'#2a1e50', wall:'#c9a020', deskDark:'#3d1e08', deskMid:'#6b3a14', deskLight:'#9a5820', monBusy:'#1a1804', monGlow:'#f5c518' };
const REALM_MIDGARD:   Realm = { label:'MIDGARD',   rune:'ᚠ', accent:'#6acc4c', headerBg:'#081408', floor1:'#142210', floor2:'#1e2c14', wall:'#4a8c34', deskDark:'#2a1808', deskMid:'#4a3018', deskLight:'#7a5030', monBusy:'#102010', monGlow:'#6acc4c' };
const REALM_JOTUNHEIM: Realm = { label:'JOTUNHEIM', rune:'ᚢ', accent:'#80b0e0', headerBg:'#060a1a', floor1:'#0e1630', floor2:'#141e3c', wall:'#405878', deskDark:'#0a1020', deskMid:'#162038', deskLight:'#243060', monBusy:'#0c1828', monGlow:'#80b0e0' };
const REALM_NIFLHEIM:  Realm = { label:'NIFLHEIM',  rune:'ᚦ', accent:'#a0c0d8', headerBg:'#08101a', floor1:'#101828', floor2:'#182030', wall:'#283848', deskDark:'#0c1420', deskMid:'#182030', deskLight:'#243040', monBusy:'#101820', monGlow:'#a0c0d8' };
const REALM_MUSPELHEIM:Realm = { label:'MUSPELHEIM',rune:'ᚨ', accent:'#ff7040', headerBg:'#180800', floor1:'#2a0c08', floor2:'#380e08', wall:'#802010', deskDark:'#2a0808', deskMid:'#501010', deskLight:'#802010', monBusy:'#1a0c08', monGlow:'#ff7040' };
const REALM_VANAHEIM:  Realm = { label:'VANAHEIM',  rune:'ᚷ', accent:'#40c8b0', headerBg:'#041410', floor1:'#0a2018', floor2:'#102820', wall:'#106050', deskDark:'#081810', deskMid:'#143020', deskLight:'#205040', monBusy:'#0a1810', monGlow:'#40c8b0' };
const REALM_ALFHEIM:   Realm = { label:'ALFHEIM',   rune:'ᚾ', accent:'#c060e0', headerBg:'#100818', floor1:'#1e0e30', floor2:'#280e40', wall:'#503868', deskDark:'#1a0828', deskMid:'#2c1040', deskLight:'#481860', monBusy:'#180830', monGlow:'#c060e0' };

const SESSION_REALMS: Record<string, Realm> = {
  'loki-oracle': REALM_ASGARD,
  'midgard':     REALM_MIDGARD,
  'jotunheim':   REALM_JOTUNHEIM,
  'niflheim':    REALM_NIFLHEIM,
  'muspelheim':  REALM_MUSPELHEIM,
  'vanaheim':    REALM_VANAHEIM,
  'alfheim':     REALM_ALFHEIM,
};
const FALLBACK_REALMS = [REALM_ASGARD, REALM_MIDGARD, REALM_JOTUNHEIM, REALM_NIFLHEIM, REALM_MUSPELHEIM];

function assignRealm(sessionName: string, idx: number): Realm {
  if (SESSION_REALMS[sessionName]) return SESSION_REALMS[sessionName];
  const n = sessionName.toLowerCase();
  if (n.includes('asgard') || n.includes('oracle') || n.includes('odin')) return REALM_ASGARD;
  if (n.includes('mid') || n.includes('office')) return REALM_MIDGARD;
  if (n.includes('jotun') || n.includes('yot') || n.includes('frost')) return REALM_JOTUNHEIM;
  if (n.includes('nifl') || n.includes('ice')) return REALM_NIFLHEIM;
  if (n.includes('musp') || n.includes('fire') || n.includes('flame')) return REALM_MUSPELHEIM;
  if (n.includes('vana') || n.includes('water')) return REALM_VANAHEIM;
  if (n.includes('alf') || n.includes('light')) return REALM_ALFHEIM;
  return FALLBACK_REALMS[idx % FALLBACK_REALMS.length];
}

// ── Layout constants ───────────────────────────────────────────────────────────
const HEADER_H  = 52;    // section header height
const GRID_PAD  = 20;    // padding inside section
const CELL_W    = 108;   // desk cell width
const CELL_GAP  = 14;    // gap between cells
const DESK_W    = 86;    // desk surface width
const DESK_H    = 24;    // desk surface height (2.5D front face visible)
const DESK_TOP  = 6;     // "desk top rail" height
const MON_W     = 28;    // monitor width
const MON_H     = 24;    // monitor height (side view)
const CELL_CONTENT_H = MON_H + 4 + DESK_TOP + DESK_H + 4 + SH + 14;  // ≈ 102

// ── Desk cell drawing ─────────────────────────────────────────────────────────
function drawDeskCell(
  ctx: CanvasRenderingContext2D,
  cx: number,           // center x of cell
  cellY: number,        // top y of cell
  agent: AgentState,
  realm: Realm,
  isSaiyan: boolean,
  now: number,
) {
  const pal     = getPalette(agent.name);
  const isBusy  = agent.status === 'busy';
  const isReady = agent.status === 'ready';
  const deskX   = Math.round(cx - DESK_W / 2);

  // Layout (top → bottom):
  // cellY + 0              : monitor top
  // cellY + MON_H          : monitor bottom
  // cellY + MON_H+4        : desk top rail
  // cellY + MON_H+4+DESK_TOP : desk surface
  // cellY + MON_H+4+DESK_TOP+DESK_H+4 : agent sprite
  const monTop    = cellY;
  const deskTopY  = monTop + MON_H + 4;
  const deskSurfY = deskTopY + DESK_TOP;
  const spriteY   = deskSurfY + DESK_H + 4;
  const labelY    = spriteY + SH + 10;

  // ── Busy floor glow ───────────────────────────────────────────────────────
  if (isBusy) {
    ctx.save();
    ctx.globalAlpha = 0.06 + Math.sin(now / 500) * 0.04;
    ctx.fillStyle = realm.accent;
    ctx.fillRect(deskX - 6, cellY, DESK_W + 12, CELL_CONTENT_H);
    ctx.restore();
  }

  // ── Monitor (2.5D side view) ─────────────────────────────────────────────
  const monX = Math.round(cx - MON_W / 2);

  // Monitor body
  ctx.fillStyle = '#141020';
  ctx.fillRect(monX, monTop, MON_W, MON_H);
  // Top highlight
  ctx.fillStyle = realm.deskLight;
  ctx.fillRect(monX, monTop, MON_W, 2);
  ctx.fillRect(monX, monTop, 2, MON_H);
  // Right/bottom shadow
  ctx.fillStyle = realm.deskDark;
  ctx.fillRect(monX + MON_W - 2, monTop, 2, MON_H);
  ctx.fillRect(monX, monTop + MON_H - 2, MON_W, 2);

  // Screen area
  const scrX = monX + 3; const scrY = monTop + 3;
  const scrW = MON_W - 6; const scrH = MON_H - 8;
  ctx.fillStyle = isBusy ? realm.monBusy : '#08060c';
  ctx.fillRect(scrX, scrY, scrW, scrH);

  if (isBusy) {
    // Screen glow
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(now / 350) * 0.2;
    ctx.fillStyle = realm.monGlow;
    ctx.fillRect(scrX, scrY, scrW, scrH);
    ctx.restore();
    // Code lines (scrolling)
    ctx.fillStyle = realm.accent;
    const off = Math.floor(now / 160) % 4;
    for (let i = 0; i < 3; i++) {
      const lw = [4, 10, 6, 12, 7][(i * 2 + off) % 5];
      ctx.fillRect(scrX + 2, scrY + 2 + i * 4, lw, 1);
    }
  }

  // Monitor stand
  ctx.fillStyle = realm.deskDark;
  ctx.fillRect(monX + MON_W / 2 - 2, monTop + MON_H, 4, 3);
  ctx.fillRect(monX + MON_W / 2 - 6, monTop + MON_H + 3, 12, 2);

  // Busy typing dots above monitor
  if (isBusy) {
    const nDots = 1 + Math.floor(now / 300) % 3;
    ctx.save();
    ctx.globalAlpha = 0.8 + Math.sin(now / 200) * 0.2;
    ctx.fillStyle = realm.accent;
    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('•'.repeat(nDots), cx, monTop - 3);
    ctx.restore();
  }

  // ── Desk top rail ─────────────────────────────────────────────────────────
  ctx.fillStyle = realm.deskDark;
  ctx.fillRect(deskX, deskTopY, DESK_W, DESK_TOP);
  ctx.fillStyle = realm.deskLight;
  ctx.fillRect(deskX, deskTopY, DESK_W, 2);

  // ── Agent sprite ─────────────────────────────────────────────────────────
  const spriteX = Math.round(cx - SW / 2);

  // Saiyan ring
  if (isSaiyan) {
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(now / 200) * 0.3;
    ctx.strokeStyle = '#fdd835';
    ctx.lineWidth = 2;
    ctx.strokeRect(spriteX - 4, spriteY - 4, SW + 8, SH + 8);
    ctx.restore();
  }

  // Busy/ready aura border
  if (isBusy || isReady) {
    const pulse = Math.sin(now / 300) * 0.25 + 0.45;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = isBusy ? '#fdd835' : '#4caf50';
    ctx.lineWidth = 2;
    ctx.strokeRect(spriteX - 2, spriteY - 2, SW + 4, SH + 4);
    ctx.restore();
  }

  drawSprite(ctx, spriteX, spriteY, pal);

  // Status dot (top-right of sprite)
  ctx.fillStyle = isBusy ? '#fdd835' : isReady ? '#4caf50' : '#444';
  ctx.fillRect(spriteX + 14 * PS, spriteY, PS * 2, PS * 2);

  // Emoji badge above head
  const emoji = agentEmoji(agent.name);
  if (emoji) {
    ctx.save();
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, cx, spriteY - 3);
    ctx.restore();
  }

  // Floating preview text (busy)
  if (isBusy && agent.preview) {
    ctx.save();
    const floatAlpha = 0.5 + Math.sin(now / 600) * 0.3;
    ctx.globalAlpha = floatAlpha;
    ctx.fillStyle = realm.accent;
    ctx.font = "4px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.fillText(agent.preview.slice(0, 16), cx, spriteY - 14);
    ctx.restore();
  }

  // ── Desk surface (drawn OVER agent's feet → standing-at-desk look) ────────
  // Main surface
  ctx.fillStyle = realm.deskMid;
  ctx.fillRect(deskX, deskSurfY, DESK_W, DESK_H);
  // Top highlight
  ctx.fillStyle = realm.deskLight;
  ctx.fillRect(deskX, deskSurfY, DESK_W, 2);
  ctx.fillRect(deskX, deskSurfY, 2, DESK_H);
  // Right / bottom shadow
  ctx.fillStyle = realm.deskDark;
  ctx.fillRect(deskX + DESK_W - 2, deskSurfY, 2, DESK_H);
  ctx.fillRect(deskX, deskSurfY + DESK_H - 2, DESK_W, 2);

  // Papers
  ctx.fillStyle = '#f0e8d4';
  ctx.fillRect(deskX + 6, deskSurfY + 5, 20, 14);
  ctx.fillStyle = '#e0d8c0';
  ctx.fillRect(deskX + 8, deskSurfY + 3, 20, 14);
  // Pencil
  ctx.fillStyle = '#a09040';
  ctx.fillRect(deskX + 28, deskSurfY + 4, 2, 14);

  // Keyboard
  ctx.fillStyle = '#1a1428';
  ctx.fillRect(deskX + DESK_W - 36, deskSurfY + 4, 28, 14);
  ctx.fillStyle = '#28203a';
  for (let ki = 0; ki < 4; ki++) {
    for (let kj = 0; kj < 2; kj++) {
      ctx.fillRect(deskX + DESK_W - 34 + ki * 6, deskSurfY + 6 + kj * 6, 4, 4);
    }
  }
  // Busy — keyboard glow
  if (isBusy) {
    ctx.save();
    ctx.globalAlpha = 0.2 + Math.sin(now / 180) * 0.15;
    ctx.fillStyle = realm.monGlow;
    ctx.fillRect(deskX + DESK_W - 36, deskSurfY + 4, 28, 14);
    ctx.restore();
  }

  // ── Name label ───────────────────────────────────────────────────────────
  ctx.save();
  ctx.font = "5px 'Press Start 2P', monospace";
  ctx.textAlign = 'center';
  ctx.fillStyle = realm.accent;
  const shortName = agent.name.replace(/-oracle$/, '').toUpperCase().slice(0, 10);
  ctx.fillText(shortName, cx, labelY);

  // Status indicator dot
  const dotColor = isBusy ? '#fdd835' : isReady ? '#4caf50' : '#555';
  if (isBusy) {
    const dp = Math.sin(now / 250) * 0.3 + 0.7;
    ctx.save();
    ctx.globalAlpha = dp;
  }
  ctx.fillStyle = dotColor;
  ctx.fillRect(Math.round(cx - 2), labelY + 5, 4, 4);
  if (isBusy) ctx.restore();

  ctx.restore();
}

// ── Section header ────────────────────────────────────────────────────────────
function drawSectionHeader(
  ctx: CanvasRenderingContext2D,
  sx: number, sw: number,
  session: Session,
  realm: Realm,
  busyCount: number,
  totalCount: number,
  now: number,
) {
  // Background
  ctx.fillStyle = realm.headerBg;
  ctx.fillRect(sx, 0, sw, HEADER_H);

  // Bottom border
  ctx.fillStyle = realm.accent;
  ctx.globalAlpha = 0.8;
  ctx.fillRect(sx, HEADER_H - 3, sw, 3);
  ctx.globalAlpha = 1;

  // Left rune
  ctx.font = '18px serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = realm.accent;
  ctx.globalAlpha = 0.35;
  ctx.fillText(realm.rune, sx + 10, 34);
  ctx.globalAlpha = 1;

  // Realm label
  ctx.font = "8px 'Press Start 2P', monospace";
  ctx.textAlign = 'center';
  ctx.fillStyle = realm.accent;
  ctx.fillText(realm.label, sx + sw / 2, 22);

  // Session name
  ctx.font = "5px 'Press Start 2P', monospace";
  ctx.fillStyle = realm.accent;
  ctx.globalAlpha = 0.55;
  ctx.fillText(session.name.toUpperCase(), sx + sw / 2, 38);
  ctx.globalAlpha = 1;

  // Agent counter (right)
  ctx.font = "5px 'Press Start 2P', monospace";
  ctx.textAlign = 'right';
  ctx.fillStyle = busyCount > 0 ? '#fdd835' : realm.accent;
  if (busyCount > 0) {
    const p = Math.sin(now / 400) * 0.2 + 0.8;
    ctx.globalAlpha = p;
  }
  ctx.fillText(`${busyCount}/${totalCount}`, sx + sw - 12, 22);
  ctx.globalAlpha = 1;

  // Right rune
  ctx.font = '18px serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = realm.accent;
  ctx.globalAlpha = 0.35;
  ctx.fillText(realm.rune, sx + sw - 10, 34);
  ctx.globalAlpha = 1;
}

// ── Floor tiles ───────────────────────────────────────────────────────────────
function drawFloor(
  ctx: CanvasRenderingContext2D,
  sx: number, w: number, h: number,
  realm: Realm,
) {
  const T = 16;
  for (let ty = 0; ty < Math.ceil(h / T); ty++) {
    for (let tx = 0; tx < Math.ceil(w / T); tx++) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? realm.floor1 : realm.floor2;
      ctx.fillRect(sx + tx * T, ty * T, T, T);
    }
  }
}

// ── Layout computation ────────────────────────────────────────────────────────
interface DeskInfo { agent: AgentState; cx: number; cellY: number; }
interface Section {
  session: Session; realm: Realm;
  sx: number; sw: number;
  desks: DeskInfo[];
}

function computeLayout(w: number, h: number, sessions: Session[], agents: AgentState[]): Section[] {
  const agentsBySession = new Map<string, AgentState[]>();
  for (const a of agents) {
    const arr = agentsBySession.get(a.session) ?? [];
    arr.push(a);
    agentsBySession.set(a.session, arr);
  }

  const N  = Math.min(sessions.length, 3);
  const sw = Math.floor(w / N);

  return sessions.slice(0, N).map((session, i) => {
    const realm   = assignRealm(session.name, i);
    const sx      = i * sw;
    const secW    = i === N - 1 ? w - sx : sw;
    const inner   = secW - GRID_PAD * 2;

    const sessionAgents = agentsBySession.get(session.name) ?? [];
    const maxCols = Math.max(1, Math.floor((inner + CELL_GAP) / (CELL_W + CELL_GAP)));
    const cols    = Math.min(3, Math.min(maxCols, Math.max(1, Math.ceil(Math.sqrt(Math.max(1, sessionAgents.length))))));

    const gridW   = cols * CELL_W + (cols - 1) * CELL_GAP;
    const startCX = sx + Math.floor((secW - gridW) / 2) + Math.floor(CELL_W / 2);

    const desks: DeskInfo[] = sessionAgents.map((agent, ai) => ({
      agent,
      cx:    startCX + (ai % cols) * (CELL_W + CELL_GAP),
      cellY: HEADER_H + GRID_PAD + Math.floor(ai / cols) * (CELL_CONTENT_H + CELL_GAP),
    }));

    return { session, realm, sx, sw: secW, desks };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  sessions: Session[];
  agents: AgentState[];
  saiyanTargets: Set<string>;
  onSelectAgent: (agent: AgentState) => void;
}

export function GameCanvas({ sessions, agents, saiyanTargets, onSelectAgent }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const frameRef     = useRef(0);
  const agentsRef    = useRef(agents);
  const sessionsRef  = useRef(sessions);
  const saiyanRef    = useRef(saiyanTargets);
  const onSelectRef  = useRef(onSelectAgent);

  agentsRef.current   = agents;
  sessionsRef.current = sessions;
  saiyanRef.current   = saiyanTargets;
  onSelectRef.current = onSelectAgent;

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const layout = computeLayout(canvas.width, canvas.height, sessionsRef.current, agentsRef.current);
    let best: { agent: AgentState; dist: number } | null = null;

    for (const section of layout) {
      for (const desk of section.desks) {
        const agentCX = desk.cx;
        const agentCY = desk.cellY + MON_H + 4 + DESK_TOP + DESK_H + 4 + SH / 2;
        const dist = Math.hypot(mx - agentCX, my - agentCY);
        if (dist < 44 && (!best || dist < best.dist)) best = { agent: desk.agent, dist };
      }
    }
    if (best) onSelectRef.current(best.agent);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const INTERVAL = 1000 / 12;
    let lastTime = 0;

    function tick(now: number) {
      frameRef.current = requestAnimationFrame(tick);
      if (now - lastTime < INTERVAL) return;
      lastTime = now;

      const ctx = canvas!.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx.imageSmoothingEnabled = false;

      const w = canvas!.width;
      const h = canvas!.height;
      const layout = computeLayout(w, h, sessionsRef.current, agentsRef.current);

      for (const section of layout) {
        const { realm, sx, sw, session, desks } = section;

        // Floor
        drawFloor(ctx, sx, sw, h, realm);

        // Vertical divider (right edge, not on last section)
        ctx.fillStyle = realm.wall;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(sx + sw - 2, HEADER_H, 2, h - HEADER_H);
        ctx.globalAlpha = 1;

        // Header
        const busyCount = desks.filter(d => d.agent.status === 'busy').length;
        drawSectionHeader(ctx, sx, sw, session, realm, busyCount, desks.length, now);

        // Desks
        for (const desk of desks) {
          drawDeskCell(ctx, desk.cx, desk.cellY, desk.agent, realm, saiyanRef.current.has(desk.agent.target), now);
        }
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0"
      style={{ zIndex: 1, imageRendering: 'pixelated', cursor: 'pointer' }}
      onClick={handleClick}
    />
  );
}
