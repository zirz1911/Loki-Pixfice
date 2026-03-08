/**
 * GameCanvas — pixel-agents style top-down office
 *
 * Each session = one Norse realm section.
 * Each agent has a desk. When busy → walk to desk, sit & type.
 * When idle/ready → wander the open floor.
 * Everything z-sorted by bottom-Y for proper depth layering.
 */
import { useEffect, useRef, useCallback } from "react";
import { agentEmoji } from "../lib/constants";
import type { AgentState, Session } from "../lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────
const T   = 16;   // floor tile size (px)
const PS  = 2;    // sprite pixel scale
const SW  = 16 * PS;  // sprite width  32
const SH  = 19 * PS;  // sprite height 38

const DESK_W      = 38;   // desk sprite width
const DESK_H      = 22;   // desk sprite height (includes back rail + surface)
const CHAIR_W     = 14;   // chair width
const CHAIR_H     = 10;   // chair height
// When sitting: agent head/body peaks above desk, legs hidden behind desk surface
const SIT_DY      = -26;  // spriteY relative to deskY (negative = above desk top)

const HEADER_H    = 52;   // section header height
const GRID_PAD    = 18;   // padding inside section before desk grid
const CELL_GAP    = 14;   // gap between workstation cells
const CELL_W      = DESK_W + CELL_GAP + 4;  // workstation cell width
const CELL_H      = DESK_H + CHAIR_H + 10;  // workstation cell height

const WALK_SPD    = 1.4;  // px per game frame
const WANDER_MIN  = 70;
const WANDER_MAX  = 200;
const FRAME_TICKS = 5;    // game frames per walk animation frame
const INTERVAL    = 1000 / 12; // ms — 12fps game loop

// ── Sprite rows ───────────────────────────────────────────────────────────────
const SPRITE_TOP = [
  '0000HHHHHHHH0000',
  '000HHHHHHHHHH000',
  '000HSSSSSSSSSH00',
  '00HSSSSSSSSSSSH0',
  '00HSEPPSEPSSSH00',
  '00HSSSSSSSSSSSH0',
  '00HSSSMWWMSSSH00',
  '00HSSSSSSSSSH000',
  '000SSSSSSSS00000',
  '00CCCSSSSCCC0000',
  '0CCCCCCCCCCCCC00',
  '1CCCCCCCCCCCCC00',
  '0CAAACCCCAAACCC0',
  '0CCCCCCCCCCCCC00',
];
const LEGS: string[][] = [
  ['00LLLLCCCLLLL000','000LLLL0LLLLL000','000LLLL0LLLLL000','000BBBB0BBBBB000','00BBBBB00BBBBB00'], // stand
  ['00LLLLCCCLLLL000','00LLLLL0LLLLL000','00LLLLL00LLLL000','00BBBBB00BBBB000','0BBBBBB000BBBBB0'], // walkA
  ['00LLLLCCCLLLL000','000LLLL0LLLLLL00','0000LLLL0LLLLL00','0000BBBB0BBBBB00','00BBBBB000BBBBBB'], // walkB
];

// ── Palettes ──────────────────────────────────────────────────────────────────
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
  const pk  = Object.keys(PALETTES).find(k => k !== 'default' && key.startsWith(k)) ?? 'default';
  return PALETTES[pk];
}

// ── Realm configs ─────────────────────────────────────────────────────────────
interface Realm {
  label: string; rune: string; accent: string;
  headerBg: string; wall: string;
  floor1: string; floor2: string; floorEdge: string;
  deskDark: string; deskMid: string; deskLight: string;
  monGlow: string; chairSeat: string; chairBack: string;
}
const REALM_MAP: Record<string, Realm> = {
  'loki-oracle': { label:'ASGARD',    rune:'ᚱ', accent:'#f5c518', headerBg:'#0c0820', wall:'#c9a020', floor1:'#1e1640', floor2:'#2a1e50', floorEdge:'#c9a01520', deskDark:'#3d1e08', deskMid:'#6b3a14', deskLight:'#9a5820', monGlow:'#f5c518', chairSeat:'#3a1860', chairBack:'#201040' },
  midgard:       { label:'MIDGARD',   rune:'ᚠ', accent:'#6acc4c', headerBg:'#081408', wall:'#4a8c34', floor1:'#142210', floor2:'#1e2c14', floorEdge:'#4a8c3418', deskDark:'#2a1808', deskMid:'#4a3018', deskLight:'#7a5030', monGlow:'#6acc4c', chairSeat:'#1a4028', chairBack:'#102818' },
  jotunheim:     { label:'JOTUNHEIM', rune:'ᚢ', accent:'#80b0e0', headerBg:'#060a1a', wall:'#405878', floor1:'#0e1630', floor2:'#141e3c', floorEdge:'#40587818', deskDark:'#0a1020', deskMid:'#162038', deskLight:'#243060', monGlow:'#80b0e0', chairSeat:'#102040', chairBack:'#081428' },
  niflheim:      { label:'NIFLHEIM',  rune:'ᚦ', accent:'#a0c0d8', headerBg:'#08101a', wall:'#283848', floor1:'#101828', floor2:'#182030', floorEdge:'#28384818', deskDark:'#0c1420', deskMid:'#182030', deskLight:'#243040', monGlow:'#a0c0d8', chairSeat:'#182838', chairBack:'#101820' },
  muspelheim:    { label:'MUSPELHEIM',rune:'ᚨ', accent:'#ff7040', headerBg:'#180800', wall:'#802010', floor1:'#2a0c08', floor2:'#380e08', floorEdge:'#80201018', deskDark:'#2a0808', deskMid:'#501010', deskLight:'#802010', monGlow:'#ff7040', chairSeat:'#3a0c08', chairBack:'#200808' },
  vanaheim:      { label:'VANAHEIM',  rune:'ᚷ', accent:'#40c8b0', headerBg:'#041410', wall:'#106050', floor1:'#0a2018', floor2:'#102820', floorEdge:'#10605018', deskDark:'#081810', deskMid:'#143020', deskLight:'#205040', monGlow:'#40c8b0', chairSeat:'#0c2828', chairBack:'#081818' },
  alfheim:       { label:'ALFHEIM',   rune:'ᚾ', accent:'#c060e0', headerBg:'#100818', wall:'#503868', floor1:'#1e0e30', floor2:'#280e40', floorEdge:'#50386818', deskDark:'#1a0828', deskMid:'#2c1040', deskLight:'#481860', monGlow:'#c060e0', chairSeat:'#2a0848', chairBack:'#180830' },
};
const FALLBACK_REALMS = [REALM_MAP['loki-oracle'], REALM_MAP['midgard'], REALM_MAP['jotunheim'], REALM_MAP['niflheim'], REALM_MAP['muspelheim']];
function getRealm(sessionName: string, idx: number): Realm {
  if (REALM_MAP[sessionName]) return REALM_MAP[sessionName];
  const n = sessionName.toLowerCase();
  if (n.includes('oracle') || n.includes('asgard') || n.includes('odin')) return REALM_MAP['loki-oracle'];
  if (n.includes('mid') || n.includes('office'))                           return REALM_MAP['midgard'];
  if (n.includes('jotun') || n.includes('yot') || n.includes('frost'))    return REALM_MAP['jotunheim'];
  if (n.includes('nifl') || n.includes('ice') || n.includes('cold'))      return REALM_MAP['niflheim'];
  if (n.includes('musp') || n.includes('fire') || n.includes('flame'))    return REALM_MAP['muspelheim'];
  return FALLBACK_REALMS[idx % FALLBACK_REALMS.length];
}

// ── Draw: floor tile ──────────────────────────────────────────────────────────
function drawFloorTile(ctx: CanvasRenderingContext2D, x: number, y: number, realm: Realm, tx: number, ty: number) {
  ctx.fillStyle = (tx + ty) % 2 === 0 ? realm.floor1 : realm.floor2;
  ctx.fillRect(x, y, T, T);
  // subtle edge lines (top + left only)
  ctx.fillStyle = realm.floorEdge;
  ctx.fillRect(x, y, T, 1);
  ctx.fillRect(x, y, 1, T);
}

// ── Draw: desk (top-down 2.5D) ────────────────────────────────────────────────
function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, realm: Realm, isBusy: boolean, now: number) {
  // Back wall shadow (furthest from viewer)
  ctx.fillStyle = realm.deskDark;
  ctx.fillRect(x, y, DESK_W, 3);

  // Desk surface
  ctx.fillStyle = realm.deskMid;
  ctx.fillRect(x, y + 3, DESK_W, DESK_H - 5);

  // Top edge highlight
  ctx.fillStyle = realm.deskLight;
  ctx.fillRect(x, y + 3, DESK_W, 1);
  ctx.fillRect(x, y + 3, 1, DESK_H - 5);

  // Right/bottom shadow
  ctx.fillStyle = realm.deskDark;
  ctx.fillRect(x + DESK_W - 1, y + 3, 1, DESK_H - 5);

  // Monitor (top-down square, left area)
  const mX = x + 4, mY = y + 4;
  ctx.fillStyle = '#141020';
  ctx.fillRect(mX, mY, 14, 12);
  const scrColor = isBusy ? '#0e1408' : '#08060c';
  ctx.fillStyle = scrColor;
  ctx.fillRect(mX + 1, mY + 1, 12, 10);
  if (isBusy) {
    const g = 0.4 + Math.sin(now / 350) * 0.25;
    ctx.save(); ctx.globalAlpha = g;
    ctx.fillStyle = realm.monGlow;
    ctx.fillRect(mX + 1, mY + 1, 12, 10);
    ctx.restore();
    // Code lines scrolling
    ctx.fillStyle = realm.accent;
    const off = Math.floor(now / 170) % 3;
    for (let i = 0; i < 3; i++) {
      const lw = [4, 9, 6][(i + off) % 3];
      ctx.fillRect(mX + 2, mY + 2 + i * 3, lw, 1);
    }
  }

  // Papers
  ctx.fillStyle = '#f0e8d4';
  ctx.fillRect(x + 20, y + 4, 10, 8);
  ctx.fillStyle = '#e0d8c0';
  ctx.fillRect(x + 22, y + 3, 10, 8);

  // Keyboard
  ctx.fillStyle = '#1a1428';
  ctx.fillRect(x + 20, y + 13, 16, 6);
  ctx.fillStyle = '#26203a';
  for (let k = 0; k < 3; k++) ctx.fillRect(x + 22 + k * 5, y + 14, 3, 4);

  // Front face (3D depth at bottom)
  ctx.fillStyle = realm.deskDark;
  ctx.fillRect(x, y + DESK_H - 2, DESK_W, 2);
}

// ── Draw: chair (top-down) ────────────────────────────────────────────────────
function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number, realm: Realm) {
  // Chair back (top bar — furthest from viewer)
  ctx.fillStyle = realm.chairBack;
  ctx.fillRect(x, y, CHAIR_W, 3);
  // Chair seat
  ctx.fillStyle = realm.chairSeat;
  ctx.fillRect(x, y + 3, CHAIR_W, CHAIR_H - 4);
  // Seat highlight
  ctx.fillStyle = realm.deskLight;
  ctx.fillRect(x, y + 3, CHAIR_W, 1);
  // Front legs
  ctx.fillStyle = '#0a0818';
  ctx.fillRect(x + 1, y + CHAIR_H - 1, 2, 2);
  ctx.fillRect(x + CHAIR_W - 3, y + CHAIR_H - 1, 2, 2);
}

// ── Draw: agent sprite ────────────────────────────────────────────────────────
function drawAgent(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  pal: Pal,
  legFrame: number,
  facingRight: boolean,
  status: string,
) {
  const rows = [...SPRITE_TOP, ...LEGS[legFrame]];
  const cmap: Record<string, string> = {
    H:pal.H, S:pal.S, E:pal.E, P:pal.P, M:pal.M,
    W:pal.W, C:pal.C, A:pal.A, L:pal.L, B:pal.B, '1':pal.C,
  };

  ctx.save();
  if (!facingRight) {
    ctx.translate(x + SW, y);
    ctx.scale(-1, 1);
    x = 0;
  }

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '0') continue;
      const color = cmap[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + c * PS, y + r * PS, PS, PS);
    }
  }

  // Status dot
  const dotColor = status === 'busy' ? '#fdd835' : status === 'ready' ? '#4caf50' : '#555';
  ctx.fillStyle = dotColor;
  ctx.fillRect(x + 14 * PS, y, PS * 2, PS * 2);
  ctx.restore();
}

// ── Layout ────────────────────────────────────────────────────────────────────
interface WorkStation {
  agent:    AgentState;
  realm:    Realm;
  deskX:    number;   // desk top-left
  deskY:    number;
  chairX:   number;
  chairY:   number;
  homeX:    number;   // agent position when sitting (center X, spriteY)
  homeY:    number;
  wanderZone: { x: number; y: number; w: number; h: number };
}
interface Section {
  session: Session;
  realm:   Realm;
  sx: number; sw: number;
  stations: WorkStation[];
}

function computeLayout(w: number, h: number, sessions: Session[], agents: AgentState[]): Section[] {
  const bySession = new Map<string, AgentState[]>();
  for (const a of agents) {
    const arr = bySession.get(a.session) ?? [];
    arr.push(a);
    bySession.set(a.session, arr);
  }

  const N  = Math.min(sessions.length, 3);
  const sw = Math.floor(w / N);

  return sessions.slice(0, N).map((session, si) => {
    const realm = getRealm(session.name, si);
    const sx    = si * sw;
    const secW  = si === N - 1 ? w - sx : sw;

    const agts    = bySession.get(session.name) ?? [];
    const inner   = secW - GRID_PAD * 2;
    const maxCols = Math.max(1, Math.floor((inner + CELL_GAP) / (CELL_W + CELL_GAP)));
    const cols    = Math.min(3, Math.min(maxCols, Math.max(1, Math.ceil(Math.sqrt(Math.max(1, agts.length))))));
    const rows    = Math.ceil(agts.length / cols);

    const gridW   = cols * DESK_W + (cols - 1) * CELL_GAP;
    const gridH   = rows * CELL_H;
    const startDX = sx + Math.floor((secW - gridW) / 2);
    const startDY = HEADER_H + GRID_PAD;

    // Wander zone: the area BELOW the desk rows, full section width
    const wanderY = startDY + gridH + 12;
    const wanderH = Math.max(SH + 20, h - wanderY - 10);

    const stations: WorkStation[] = agts.map((agent, ai) => {
      const col  = ai % cols;
      const row  = Math.floor(ai / cols);
      const dX   = startDX + col * (DESK_W + CELL_GAP);
      const dY   = startDY + row * CELL_H;
      const cX   = dX + (DESK_W - CHAIR_W) / 2;
      const cY   = dY + DESK_H + 2;
      // Agent center when sitting: centered on desk, spriteY = dY + SIT_DY
      const hX   = dX + DESK_W / 2 - SW / 2;
      const hY   = dY + SIT_DY;

      return {
        agent, realm,
        deskX: dX, deskY: dY,
        chairX: Math.round(cX), chairY: Math.round(cY),
        homeX: Math.round(hX), homeY: Math.round(hY),
        wanderZone: { x: sx + 8, y: wanderY, w: secW - 16, h: wanderH },
      };
    });

    return { session, realm, sx, sw: secW, stations };
  });
}

// ── Entity (movement state) ───────────────────────────────────────────────────
interface Entity {
  x: number; y: number;
  tx: number; ty: number;
  facingRight: boolean;
  legFrame: number;
  frameTimer: number;
  wanderTimer: number;
  // Zone bounds for wandering (updated from layout)
  zone: { x: number; y: number; w: number; h: number };
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  sessions: Session[];
  agents: AgentState[];
  saiyanTargets: Set<string>;
  onSelectAgent: (agent: AgentState) => void;
}

export function GameCanvas({ sessions, agents, saiyanTargets, onSelectAgent }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const frameRef    = useRef(0);
  const agentsRef   = useRef(agents);
  const sessionsRef = useRef(sessions);
  const saiyanRef   = useRef(saiyanTargets);
  const onSelectRef = useRef(onSelectAgent);
  const entRef      = useRef(new Map<string, Entity>());
  const lastTimeRef = useRef(0);

  agentsRef.current   = agents;
  sessionsRef.current = sessions;
  saiyanRef.current   = saiyanTargets;
  onSelectRef.current = onSelectAgent;

  // ── Sync entity map ────────────────────────────────────────────────────────
  const syncEntities = useCallback((layout: Section[]) => {
    const ents = entRef.current;
    const allAgents = layout.flatMap(s => s.stations);

    // Add new / update zone
    for (const ws of allAgents) {
      const { agent, wanderZone: zone, homeX, homeY } = ws;
      if (!ents.has(agent.target)) {
        // Spawn in wander zone or at home
        const spawnX = zone.x + Math.random() * zone.w;
        const spawnY = zone.y + Math.random() * zone.h;
        ents.set(agent.target, {
          x: spawnX, y: spawnY,
          tx: spawnX, ty: spawnY,
          facingRight: true,
          legFrame: 0, frameTimer: 0,
          wanderTimer: Math.floor(Math.random() * WANDER_MAX),
          zone,
        });
      } else {
        const e = ents.get(agent.target)!;
        e.zone = zone;
        // If busy, retarget to desk
        if (agent.status === 'busy') {
          e.tx = homeX; e.ty = homeY;
        }
      }
    }
    // Remove stale
    const activeTargets = new Set(allAgents.map(ws => ws.agent.target));
    for (const key of ents.keys()) {
      if (!activeTargets.has(key)) ents.delete(key);
    }
  }, []);

  // ── Click hit-test ─────────────────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const layout = computeLayout(canvas.width, canvas.height, sessionsRef.current, agentsRef.current);
    const ents   = entRef.current;
    let best: { agent: AgentState; dist: number } | null = null;

    for (const section of layout) {
      for (const ws of section.stations) {
        const ent = ents.get(ws.agent.target);
        if (!ent) continue;
        const ax = ws.agent.status === 'busy' ? ws.homeX + SW / 2 : ent.x + SW / 2;
        const ay = ws.agent.status === 'busy' ? ws.homeY + SH / 2 : ent.y + SH / 2;
        const dist = Math.hypot(mx - ax, my - ay);
        if (dist < 42 && (!best || dist < best.dist)) best = { agent: ws.agent, dist };
      }
    }
    if (best) onSelectRef.current(best.agent);
  }, []);

  // ── Main game loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    function tick(now: number) {
      frameRef.current = requestAnimationFrame(tick);
      if (now - lastTimeRef.current < INTERVAL) return;
      lastTimeRef.current = now;

      const ctx = canvas!.getContext('2d');
      if (!ctx) return;

      const w = canvas!.width;
      const h = canvas!.height;

      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;

      const layout = computeLayout(w, h, sessionsRef.current, agentsRef.current);
      syncEntities(layout);
      const ents = entRef.current;

      // ── Draw floor tiles ─────────────────────────────────────────────────
      for (const section of layout) {
        const { realm, sx, sw } = section;
        const tilesX = Math.ceil(sw / T);
        const tilesY = Math.ceil(h  / T);
        for (let ty = 0; ty < tilesY; ty++) {
          for (let tx = 0; tx < tilesX; tx++) {
            drawFloorTile(ctx, sx + tx * T, ty * T, realm, tx, ty);
          }
        }
        // Divider
        ctx.fillStyle = realm.wall;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(sx + sw - 2, HEADER_H, 2, h - HEADER_H);
        ctx.globalAlpha = 1;
      }

      // ── Collect renderable items (z-sorted) ──────────────────────────────
      type RItem = { zY: number; pri: number; draw: () => void };
      const items: RItem[] = [];

      for (const section of layout) {
        for (const ws of section.stations) {
          const { agent, realm, deskX, deskY, chairX, chairY, homeX, homeY } = ws;
          const ent     = ents.get(agent.target);
          const isBusy  = agent.status === 'busy';
          const isReady = agent.status === 'ready';
          const pal     = getPalette(agent.name);
          const emoji   = agentEmoji(agent.name);

          // Desk — drawn "behind" characters at same Y because zY = deskY + DESK_H
          // Agent sitting: spriteY = deskY + SIT_DY, zY = deskY + SIT_DY + SH = deskY - 26 + 38 = deskY + 12
          // So desk zY (deskY + 22) > agent sitting zY (deskY + 12): desk draws AFTER → desk covers agent legs ✓
          items.push({
            zY:  deskY + DESK_H,
            pri: 0,
            draw: () => drawDesk(ctx, deskX, deskY, realm, isBusy, now),
          });

          // Chair — shown only when agent is NOT sitting at desk
          if (!isBusy) {
            items.push({
              zY:  chairY + CHAIR_H,
              pri: 1,
              draw: () => drawChair(ctx, chairX, chairY, realm),
            });
          }

          // Agent sprite
          let ax: number, ay: number, alr: boolean, alf: number;
          if (isBusy && ent) {
            // Walk to desk if not there yet
            const dx = homeX - ent.x, dy = homeY - ent.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 2) {
              // Still walking to desk
              ax = Math.round(ent.x); ay = Math.round(ent.y);
              alr = ent.facingRight; alf = ent.legFrame;
            } else {
              // At desk — sit
              ax = homeX; ay = homeY;
              alr = true; alf = 0;
            }
          } else if (ent) {
            ax = Math.round(ent.x); ay = Math.round(ent.y);
            alr = ent.facingRight; alf = ent.legFrame;
          } else {
            continue;
          }

          const agentZY = ay + SH;
          const _ax = ax, _ay = ay, _alr = alr, _alf = alf; // capture for closure

          items.push({
            zY:  agentZY,
            pri: 0,
            draw: () => {
              // Saiyan glow
              if (saiyanRef.current.has(agent.target)) {
                ctx.save();
                ctx.globalAlpha = 0.4 + Math.sin(now / 220) * 0.3;
                ctx.strokeStyle = '#fdd835';
                ctx.lineWidth = 3;
                ctx.strokeRect(_ax - 4, _ay - 4, SW + 8, SH + 8);
                ctx.restore();
              }
              // Busy/ready pulse border
              if (isBusy || isReady) {
                const pulse = 0.3 + Math.sin(now / 320) * 0.2;
                ctx.save();
                ctx.globalAlpha = pulse;
                ctx.strokeStyle = isBusy ? '#fdd835' : '#4caf50';
                ctx.lineWidth = 2;
                ctx.strokeRect(_ax - 2, _ay - 2, SW + 4, SH + 4);
                ctx.restore();
              }
              // Emoji badge
              if (emoji) {
                ctx.save();
                ctx.font = '12px serif';
                ctx.textAlign = 'center';
                ctx.fillText(emoji, _ax + SW / 2, _ay - 3);
                ctx.restore();
              }
              // Floating preview (busy)
              if (isBusy && agent.preview) {
                ctx.save();
                ctx.globalAlpha = 0.65 + Math.sin(now / 700) * 0.2;
                ctx.fillStyle = realm.accent;
                ctx.font = "4px 'Press Start 2P', monospace";
                ctx.textAlign = 'center';
                ctx.fillText(agent.preview.slice(0, 16), _ax + SW / 2, _ay - 14);
                ctx.restore();
              }
              // Typing dots when busy + at desk
              if (isBusy && Math.hypot(ax - homeX, ay - homeY) < 4) {
                const nDots = 1 + Math.floor(now / 300) % 3;
                ctx.save();
                ctx.globalAlpha = 0.85 + Math.sin(now / 200) * 0.15;
                ctx.fillStyle = realm.accent;
                ctx.font = "6px 'Press Start 2P', monospace";
                ctx.textAlign = 'center';
                ctx.fillText('•'.repeat(nDots), _ax + SW / 2, _ay - 24);
                ctx.restore();
              }
              drawAgent(ctx, _ax, _ay, pal, _alf, _alr, agent.status);
            },
          });

          // Name label (always on top, high zY)
          const _nameX = isBusy ? homeX + SW / 2 : ax + SW / 2;
          const _nameY = (isBusy ? homeY : ay) + SH + 11;
          items.push({
            zY: 99999,
            pri: ai => ai,
            draw: () => {
              ctx.save();
              ctx.font = "5px 'Press Start 2P', monospace";
              ctx.textAlign = 'center';
              ctx.fillStyle = realm.accent;
              ctx.fillText(agent.name.replace(/-oracle$/, '').toUpperCase().slice(0, 10), _nameX, _nameY);
              const dotClr = agent.status === 'busy' ? '#fdd835' : agent.status === 'ready' ? '#4caf50' : '#555';
              ctx.fillStyle = dotClr;
              ctx.fillRect(Math.round(_nameX - 2), _nameY + 4, 4, 4);
              ctx.restore();
            },
          } as unknown as RItem);
        }
      }

      // ── Sort by zY (ascending = further back drawn first) ─────────────────
      items.sort((a, b) => a.zY !== b.zY ? a.zY - b.zY : a.pri - b.pri);
      for (const item of items) item.draw();

      // ── Update entity movement ────────────────────────────────────────────
      for (const section of layout) {
        for (const ws of section.stations) {
          const ent = ents.get(ws.agent.target);
          if (!ent) continue;
          const { agent, homeX, homeY, wanderZone: zone } = ws;
          const isBusy = agent.status === 'busy';

          if (isBusy) {
            // Walk toward desk
            ent.tx = homeX; ent.ty = homeY;
          } else {
            // Wander
            ent.wanderTimer--;
            if (ent.wanderTimer <= 0) {
              ent.tx = zone.x + 8 + Math.random() * Math.max(0, zone.w - SW - 16);
              ent.ty = zone.y + 8 + Math.random() * Math.max(0, zone.h - SH - 16);
              ent.wanderTimer = WANDER_MIN + Math.floor(Math.random() * (WANDER_MAX - WANDER_MIN));
            }
          }

          // Move toward target
          const dx   = ent.tx - ent.x;
          const dy   = ent.ty - ent.y;
          const dist = Math.hypot(dx, dy);
          const spd  = isBusy ? WALK_SPD * 1.6 : WALK_SPD;
          const moving = dist > 1.5;

          if (moving) {
            ent.x += (dx / dist) * spd;
            ent.y += (dy / dist) * spd;
            ent.facingRight = dx >= 0;
            if (!isBusy) {
              ent.x = Math.max(zone.x, Math.min(zone.x + zone.w - SW, ent.x));
              ent.y = Math.max(zone.y, Math.min(zone.y + zone.h - SH, ent.y));
            }
          }

          // Walk animation
          if (moving) {
            ent.frameTimer++;
            if (ent.frameTimer >= FRAME_TICKS) {
              ent.frameTimer = 0;
              ent.legFrame = ent.legFrame === 1 ? 2 : 1;
            }
          } else {
            ent.legFrame = 0;
            ent.frameTimer = 0;
          }
        }
      }

      // ── Section headers (drawn last, always on top) ───────────────────────
      for (const section of layout) {
        const { realm, sx, sw, session, stations } = section;
        const busyCount = stations.filter(ws => ws.agent.status === 'busy').length;

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

        // Busy counter
        ctx.font = "5px 'Press Start 2P', monospace";
        ctx.textAlign = 'right';
        ctx.fillStyle = busyCount > 0 ? '#fdd835' : realm.accent;
        if (busyCount > 0) {
          ctx.globalAlpha = 0.7 + Math.sin(now / 400) * 0.3;
        }
        ctx.fillText(`${busyCount}/${stations.length}`, sx + sw - 12, 22);
        ctx.globalAlpha = 1;

        // Right rune
        ctx.font = '18px serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = realm.accent;
        ctx.globalAlpha = 0.35;
        ctx.fillText(realm.rune, sx + sw - 10, 34);
        ctx.globalAlpha = 1;
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [syncEntities]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0"
      style={{ zIndex: 1, imageRendering: 'pixelated', cursor: 'pointer' }}
      onClick={handleClick}
    />
  );
}
