/**
 * GameCanvas — pixel-agents style office with real sprite assets
 *
 * Uses char_0–5.png from pixel-agents (112×96 px each):
 *   7 columns × 4 rows, each frame = 16×24 px
 *   Col 0–3 : walk animation
 *   Col 4–5 : typing animation
 *   Col 6   : idle / stand
 *   Row 0   : facing DOWN
 *   Row 1   : facing UP
 *   Row 2   : facing LEFT
 *   Row 3   : facing RIGHT
 *
 * Agent assignment: odin=0 thor=1 loki=2 heimdall=3 tyr=4 ymir=5, others=hash%6
 * Busy  → walk to desk → sit & type (type anim, facing DOWN)
 * Idle  → wander open floor below desks (walk anim, 4-direction)
 */
import { useEffect, useRef, useCallback } from "react";
import type { AgentState, Session } from "../lib/types";

// ── Sprite sheet constants ────────────────────────────────────────────────────
const FRAME_W  = 16;    // px per frame in source PNG
const FRAME_H  = 24;
const SCALE    = 2;
const SPW      = FRAME_W * SCALE;   // 32 – rendered sprite width
const SPH      = FRAME_H * SCALE;   // 48 – rendered sprite height

// Sprite sheet row = direction
const DIR_DOWN  = 0;
const DIR_UP    = 1;
const DIR_LEFT  = 2;
const DIR_RIGHT = 3;

// Sprite sheet col ranges
const WALK_COL_START = 0;  // cols 0–3 (4 walk frames)
const TYPE_COL_START = 4;  // cols 4–5 (2 type frames)
const IDLE_COL       = 6;  // col  6   (stand still)

// Agents → sprite index
const AGENT_SPRITE: Record<string, number> = {
  odin: 0, thor: 1, loki: 2, heimdall: 3, tyr: 4, ymir: 5,
};
function spriteIdx(name: string): number {
  const k = name.toLowerCase().replace(/-oracle$/, '');
  if (AGENT_SPRITE[k] !== undefined) return AGENT_SPRITE[k];
  let h = 0;
  for (const c of k) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 6;
}

// ── Pre-load all 6 character images (module-level singleton) ─────────────────
const IMAGES: Map<number, HTMLImageElement> = new Map();
let _imgsLoaded = false;
function preloadImages() {
  if (_imgsLoaded) return;
  _imgsLoaded = true;
  for (let i = 0; i < 6; i++) {
    const img = new Image();
    img.src = `/assets/characters/char_${i}.png`;
    IMAGES.set(i, img);
  }
}

function drawCharSprite(
  ctx: CanvasRenderingContext2D,
  destX: number, destY: number,
  agentName: string,
  dir: number,
  col: number,
) {
  const img = IMAGES.get(spriteIdx(agentName));
  if (!img?.complete || !img.naturalWidth) return;
  ctx.drawImage(
    img,
    col * FRAME_W, dir * FRAME_H, FRAME_W, FRAME_H,
    Math.round(destX), Math.round(destY), SPW, SPH,
  );
}

// ── Tile / layout constants ───────────────────────────────────────────────────
const T         = 16;   // floor tile size
const HEADER_H  = 52;   // section header height
const GRID_PAD  = 40;   // space below header before first desk row
                         // (large enough for sprite head sticking above desk)
const DESK_W    = 40;   // desk sprite width
const DESK_H    = 22;   // desk height (2.5D surface)
const CHAIR_W   = 14;
const CHAIR_H   = 10;
const CELL_H    = 80;   // vertical spacing per desk row (desk + chair + gap)
const CELL_GAP  = 16;   // horizontal gap between workstations
const SIT_DY    = -30;  // sprite Y offset from deskY when sitting (head above desk)

const WALK_SPD   = 1.5;
const WANDER_MIN = 60;
const WANDER_MAX = 190;
const WALK_TICKS = 4;   // game frames per walk animation frame
const TYPE_TICKS = 6;   // game frames per type animation frame
const INTERVAL   = 1000 / 12;

// ── Realm configs ─────────────────────────────────────────────────────────────
interface Realm {
  label: string; rune: string; accent: string;
  headerBg: string; wall: string;
  floor1: string; floor2: string; floorEdge: string;
  deskDark: string; deskMid: string; deskLight: string;
  monGlow: string; chairSeat: string; chairBack: string;
}
const R: Record<string, Realm> = {
  'loki-oracle': { label:'ASGARD',    rune:'ᚱ', accent:'#f5c518', headerBg:'#0c0820', wall:'#c9a020', floor1:'#1e1640', floor2:'#2a1e50', floorEdge:'#c9a01520', deskDark:'#3d1e08', deskMid:'#6b3a14', deskLight:'#9a5820', monGlow:'#f5c518', chairSeat:'#3a1860', chairBack:'#201040' },
  midgard:       { label:'MIDGARD',   rune:'ᚠ', accent:'#6acc4c', headerBg:'#081408', wall:'#4a8c34', floor1:'#142210', floor2:'#1e2c14', floorEdge:'#4a8c3418', deskDark:'#2a1808', deskMid:'#4a3018', deskLight:'#7a5030', monGlow:'#6acc4c', chairSeat:'#1a4028', chairBack:'#102818' },
  jotunheim:     { label:'JOTUNHEIM', rune:'ᚢ', accent:'#80b0e0', headerBg:'#060a1a', wall:'#405878', floor1:'#0e1630', floor2:'#141e3c', floorEdge:'#40587818', deskDark:'#0a1020', deskMid:'#162038', deskLight:'#243060', monGlow:'#80b0e0', chairSeat:'#102040', chairBack:'#081428' },
  niflheim:      { label:'NIFLHEIM',  rune:'ᚦ', accent:'#a0c0d8', headerBg:'#08101a', wall:'#283848', floor1:'#101828', floor2:'#182030', floorEdge:'#28384818', deskDark:'#0c1420', deskMid:'#182030', deskLight:'#243040', monGlow:'#a0c0d8', chairSeat:'#182838', chairBack:'#101820' },
  muspelheim:    { label:'MUSPELHEIM',rune:'ᚨ', accent:'#ff7040', headerBg:'#180800', wall:'#802010', floor1:'#2a0c08', floor2:'#380e08', floorEdge:'#80201018', deskDark:'#2a0808', deskMid:'#501010', deskLight:'#802010', monGlow:'#ff7040', chairSeat:'#3a0c08', chairBack:'#200808' },
  vanaheim:      { label:'VANAHEIM',  rune:'ᚷ', accent:'#40c8b0', headerBg:'#041410', wall:'#106050', floor1:'#0a2018', floor2:'#102820', floorEdge:'#10605018', deskDark:'#081810', deskMid:'#143020', deskLight:'#205040', monGlow:'#40c8b0', chairSeat:'#0c2828', chairBack:'#081818' },
  alfheim:       { label:'ALFHEIM',   rune:'ᚾ', accent:'#c060e0', headerBg:'#100818', wall:'#503868', floor1:'#1e0e30', floor2:'#280e40', floorEdge:'#50386818', deskDark:'#1a0828', deskMid:'#2c1040', deskLight:'#481860', monGlow:'#c060e0', chairSeat:'#2a0848', chairBack:'#180830' },
};
const RFB = [R['loki-oracle'], R.midgard, R.jotunheim, R.niflheim, R.muspelheim];
function getRealm(name: string, i: number): Realm {
  if (R[name]) return R[name];
  const n = name.toLowerCase();
  if (n.includes('oracle')||n.includes('asgard')||n.includes('odin')) return R['loki-oracle'];
  if (n.includes('mid')||n.includes('office'))                         return R.midgard;
  if (n.includes('jotun')||n.includes('yot')||n.includes('frost'))    return R.jotunheim;
  return RFB[i % RFB.length];
}

// ── Floor tile drawing ────────────────────────────────────────────────────────
function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, r: Realm, tx: number, ty: number) {
  ctx.fillStyle = (tx + ty) % 2 === 0 ? r.floor1 : r.floor2;
  ctx.fillRect(x, y, T, T);
  ctx.fillStyle = r.floorEdge;
  ctx.fillRect(x, y, T, 1);
  ctx.fillRect(x, y, 1, T);
}

// ── Desk drawing ──────────────────────────────────────────────────────────────
function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, r: Realm, busy: boolean, now: number) {
  // Back rail (furthest from viewer)
  ctx.fillStyle = r.deskDark;
  ctx.fillRect(x, y, DESK_W, 3);
  // Surface
  ctx.fillStyle = r.deskMid;
  ctx.fillRect(x, y + 3, DESK_W, DESK_H - 5);
  ctx.fillStyle = r.deskLight;
  ctx.fillRect(x, y + 3, DESK_W, 1);
  ctx.fillRect(x, y + 3, 1, DESK_H - 5);
  ctx.fillStyle = r.deskDark;
  ctx.fillRect(x + DESK_W - 1, y + 3, 1, DESK_H - 5);
  // Monitor (top-down view)
  const mX = x + 4, mY = y + 4;
  ctx.fillStyle = '#141020';
  ctx.fillRect(mX, mY, 14, 12);
  ctx.fillStyle = busy ? r.monGlow.replace(/(..)$/, '28') : '#08060c';
  ctx.fillRect(mX + 1, mY + 1, 12, 10);
  if (busy) {
    const g = 0.4 + Math.sin(now / 350) * 0.25;
    ctx.save(); ctx.globalAlpha = g;
    ctx.fillStyle = r.monGlow;
    ctx.fillRect(mX + 1, mY + 1, 12, 10);
    ctx.restore();
    ctx.fillStyle = r.accent;
    const off = Math.floor(now / 170) % 3;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(mX + 2, mY + 2 + i * 3, [4, 9, 6][(i + off) % 3], 1);
    }
  }
  // Papers & keyboard
  ctx.fillStyle = '#f0e8d4';
  ctx.fillRect(x + 20, y + 4, 10, 8);
  ctx.fillStyle = '#e0d8c0';
  ctx.fillRect(x + 22, y + 3, 10, 8);
  ctx.fillStyle = '#1a1428';
  ctx.fillRect(x + 20, y + 13, 17, 6);
  ctx.fillStyle = '#26203a';
  for (let k = 0; k < 3; k++) ctx.fillRect(x + 22 + k * 5, y + 14, 3, 4);
  // Front face
  ctx.fillStyle = r.deskDark;
  ctx.fillRect(x, y + DESK_H - 2, DESK_W, 2);
}

// ── Chair drawing ─────────────────────────────────────────────────────────────
function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number, r: Realm) {
  ctx.fillStyle = r.chairBack;
  ctx.fillRect(x, y, CHAIR_W, 3);
  ctx.fillStyle = r.chairSeat;
  ctx.fillRect(x, y + 3, CHAIR_W, CHAIR_H - 4);
  ctx.fillStyle = r.deskLight;
  ctx.fillRect(x, y + 3, CHAIR_W, 1);
  ctx.fillStyle = '#0a0818';
  ctx.fillRect(x + 1, y + CHAIR_H - 1, 2, 2);
  ctx.fillRect(x + CHAIR_W - 3, y + CHAIR_H - 1, 2, 2);
}

// ── Layout ────────────────────────────────────────────────────────────────────
interface WorkStation {
  agent: AgentState;
  realm: Realm;
  deskX: number; deskY: number;
  chairX: number; chairY: number;
  homeX: number; homeY: number;  // sprite top-left when sitting
  wanderZone: { x: number; y: number; w: number; h: number };
}
interface Section {
  session: Session; realm: Realm;
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
    const agts  = bySession.get(session.name) ?? [];
    const inner = secW - 32;
    const maxC  = Math.max(1, Math.floor((inner + CELL_GAP) / (DESK_W + CELL_GAP)));
    const cols  = Math.min(3, Math.min(maxC, Math.max(1, Math.ceil(Math.sqrt(Math.max(1, agts.length))))));
    const rows  = Math.ceil(agts.length / cols);

    const gridW   = cols * DESK_W + (cols - 1) * CELL_GAP;
    const startDX = sx + Math.floor((secW - gridW) / 2);
    const startDY = HEADER_H + GRID_PAD;
    const wanderY = startDY + rows * CELL_H + 12;

    const stations: WorkStation[] = agts.map((agent, ai) => {
      const col = ai % cols;
      const row = Math.floor(ai / cols);
      const dX  = startDX + col * (DESK_W + CELL_GAP);
      const dY  = startDY + row * CELL_H;
      const cX  = dX + Math.floor((DESK_W - CHAIR_W) / 2);
      const cY  = dY + DESK_H + 2;
      const hX  = dX + Math.floor((DESK_W - SPW) / 2);
      const hY  = dY + SIT_DY;
      const zone = {
        x: sx + 8,
        y: wanderY,
        w: secW - 16,
        h: Math.max(SPH + 20, h - wanderY - 12),
      };
      return { agent, realm, deskX: dX, deskY: dY, chairX: cX, chairY: cY, homeX: hX, homeY: hY, wanderZone: zone };
    });

    return { session, realm, sx, sw: secW, stations };
  });
}

// ── Entity state ──────────────────────────────────────────────────────────────
interface Entity {
  x: number; y: number;
  tx: number; ty: number;
  dir: number;        // DIR_DOWN/UP/LEFT/RIGHT
  walkFrame: number;  // 0–3
  typeFrame: number;  // 0–1
  frameTimer: number;
  wanderTimer: number;
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
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const frameRef     = useRef(0);
  const agentsRef    = useRef(agents);
  const sessionsRef  = useRef(sessions);
  const saiyanRef    = useRef(saiyanTargets);
  const onSelectRef  = useRef(onSelectAgent);
  const entRef       = useRef(new Map<string, Entity>());
  const lastTimeRef  = useRef(0);

  agentsRef.current   = agents;
  sessionsRef.current = sessions;
  saiyanRef.current   = saiyanTargets;
  onSelectRef.current = onSelectAgent;

  // ── Sync entities ────────────────────────────────────────────────────────────
  const syncEntities = useCallback((layout: Section[]) => {
    const ents = entRef.current;
    const all  = layout.flatMap(s => s.stations);

    for (const ws of all) {
      const { agent, wanderZone: zone, homeX, homeY } = ws;
      if (!ents.has(agent.target)) {
        const sx = zone.x + Math.random() * zone.w;
        const sy = zone.y + Math.random() * Math.max(0, zone.h - SPH);
        ents.set(agent.target, {
          x: sx, y: sy, tx: sx, ty: sy,
          dir: DIR_DOWN, walkFrame: 0, typeFrame: 0, frameTimer: 0,
          wanderTimer: Math.floor(Math.random() * WANDER_MAX),
          zone,
        });
      } else {
        const e = ents.get(agent.target)!;
        e.zone = zone;
        if (agent.status === 'busy') { e.tx = homeX; e.ty = homeY; }
      }
    }
    const active = new Set(all.map(ws => ws.agent.target));
    for (const k of ents.keys()) if (!active.has(k)) ents.delete(k);
  }, []);

  // ── Click ─────────────────────────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const layout = computeLayout(canvas.width, canvas.height, sessionsRef.current, agentsRef.current);
    const ents   = entRef.current;
    let best: { agent: AgentState; dist: number } | null = null;
    for (const { stations } of layout) {
      for (const ws of stations) {
        const ent = ents.get(ws.agent.target);
        const ax  = ws.agent.status === 'busy' ? ws.homeX + SPW / 2 : (ent?.x ?? ws.homeX) + SPW / 2;
        const ay  = ws.agent.status === 'busy' ? ws.homeY + SPH / 2 : (ent?.y ?? ws.homeY) + SPH / 2;
        const d   = Math.hypot(mx - ax, my - ay);
        if (d < 44 && (!best || d < best.dist)) best = { agent: ws.agent, dist: d };
      }
    }
    if (best) onSelectRef.current(best.agent);
  }, []);

  // ── Main loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    preloadImages();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    function tick(now: number) {
      frameRef.current = requestAnimationFrame(tick);
      if (now - lastTimeRef.current < INTERVAL) return;
      lastTimeRef.current = now;

      const ctx = canvas!.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx.imageSmoothingEnabled = false;

      const w = canvas!.width, h = canvas!.height;
      const layout = computeLayout(w, h, sessionsRef.current, agentsRef.current);
      syncEntities(layout);
      const ents = entRef.current;

      // ── Floor tiles ─────────────────────────────────────────────────────
      for (const { realm, sx, sw } of layout) {
        for (let ty = 0; ty < Math.ceil(h / T); ty++)
          for (let tx = 0; tx < Math.ceil(sw / T); tx++)
            drawTile(ctx, sx + tx * T, ty * T, realm, tx, ty);
        // Divider
        ctx.fillStyle = realm.wall;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(sx + sw - 2, HEADER_H, 2, h - HEADER_H);
        ctx.globalAlpha = 1;
      }

      // ── Collect renderable items ─────────────────────────────────────────
      type RItem = { zY: number; pri: number; draw: () => void };
      const items: RItem[] = [];

      for (const { stations } of layout) {
        for (const ws of stations) {
          const { agent, realm, deskX, deskY, chairX, chairY, homeX, homeY } = ws;
          const ent    = ents.get(agent.target);
          const busy   = agent.status === 'busy';
          const ready  = agent.status === 'ready';

          // Desk — zY slightly above agent's feet so desk surface covers legs when sitting
          items.push({
            zY: deskY + DESK_H + 1, pri: 0,
            draw: () => drawDesk(ctx, deskX, deskY, realm, busy, now),
          });

          // Chair — only when agent not sitting
          if (!busy) {
            items.push({
              zY: chairY + CHAIR_H + 1, pri: 0,
              draw: () => drawChair(ctx, chairX, chairY, realm),
            });
          }

          // Agent sprite
          let ax: number, ay: number, dir: number, col: number;
          if (busy && ent) {
            const dx = homeX - ent.x, dy = homeY - ent.y;
            const arrived = Math.hypot(dx, dy) < 3;
            if (arrived) {
              ax = homeX; ay = homeY;
              dir = DIR_DOWN;
              col = TYPE_COL_START + ent.typeFrame;
            } else {
              ax = Math.round(ent.x); ay = Math.round(ent.y);
              dir = ent.dir;
              col = WALK_COL_START + ent.walkFrame;
            }
          } else if (ent) {
            ax = Math.round(ent.x); ay = Math.round(ent.y);
            const moving = Math.hypot(ent.tx - ent.x, ent.ty - ent.y) > 1.5;
            dir = ent.dir;
            col = moving ? WALK_COL_START + ent.walkFrame : IDLE_COL;
          } else {
            continue;
          }

          const _ax = ax, _ay = ay, _dir = dir, _col = col;
          const agZY = ay + SPH;

          items.push({
            zY: agZY, pri: 1,
            draw: () => {
              // Saiyan ring
              if (saiyanRef.current.has(agent.target)) {
                ctx.save();
                ctx.globalAlpha = 0.4 + Math.sin(now / 220) * 0.3;
                ctx.strokeStyle = '#fdd835';
                ctx.lineWidth = 3;
                ctx.strokeRect(_ax - 4, _ay - 4, SPW + 8, SPH + 8);
                ctx.restore();
              }
              // Status border
              if (busy || ready) {
                const p = 0.3 + Math.sin(now / 320) * 0.2;
                ctx.save(); ctx.globalAlpha = p;
                ctx.strokeStyle = busy ? '#fdd835' : '#4caf50';
                ctx.lineWidth = 2;
                ctx.strokeRect(_ax - 2, _ay - 2, SPW + 4, SPH + 4);
                ctx.restore();
              }
              // Typing dots
              if (busy && Math.hypot(ax - homeX, ay - homeY) < 4) {
                const dots = '•'.repeat(1 + Math.floor(now / 280) % 3);
                ctx.save();
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = realm.accent;
                ctx.font = "6px 'Press Start 2P', monospace";
                ctx.textAlign = 'center';
                ctx.fillText(dots, _ax + SPW / 2, _ay - 4);
                ctx.restore();
              }
              // Sprite
              drawCharSprite(ctx, _ax, _ay, agent.name, _dir, _col);
            },
          });

          // Name label — always on top
          const lx = (busy ? homeX : ax) + SPW / 2;
          const ly = (busy ? homeY : ay) + SPH + 10;
          items.push({
            zY: 1e6, pri: 0,
            draw: () => {
              ctx.save();
              ctx.font = "5px 'Press Start 2P', monospace";
              ctx.textAlign = 'center';
              ctx.fillStyle = realm.accent;
              ctx.fillText(agent.name.replace(/-oracle$/, '').toUpperCase().slice(0, 10), lx, ly);
              ctx.fillStyle = busy ? '#fdd835' : ready ? '#4caf50' : '#555';
              ctx.fillRect(Math.round(lx - 2), ly + 4, 4, 4);
              ctx.restore();
            },
          });
        }
      }

      // ── Z-sort + draw ─────────────────────────────────────────────────────
      items.sort((a, b) => a.zY !== b.zY ? a.zY - b.zY : a.pri - b.pri);
      for (const item of items) item.draw();

      // ── Update movement ────────────────────────────────────────────────────
      for (const { stations } of layout) {
        for (const ws of stations) {
          const ent = ents.get(ws.agent.target);
          if (!ent) continue;
          const { agent, homeX, homeY, wanderZone: zone } = ws;
          const busy = agent.status === 'busy';

          if (busy) {
            ent.tx = homeX; ent.ty = homeY;
          } else {
            ent.wanderTimer--;
            if (ent.wanderTimer <= 0) {
              ent.tx = zone.x + 8 + Math.random() * Math.max(0, zone.w - SPW - 16);
              ent.ty = zone.y + 8 + Math.random() * Math.max(0, zone.h - SPH - 8);
              ent.wanderTimer = WANDER_MIN + Math.floor(Math.random() * (WANDER_MAX - WANDER_MIN));
            }
          }

          const dx    = ent.tx - ent.x;
          const dy    = ent.ty - ent.y;
          const dist  = Math.hypot(dx, dy);
          const spd   = busy ? WALK_SPD * 1.8 : WALK_SPD;
          const moving = dist > 1.5;

          if (moving) {
            ent.x += (dx / dist) * spd;
            ent.y += (dy / dist) * spd;
            // Clamp wander within zone
            if (!busy) {
              ent.x = Math.max(zone.x, Math.min(zone.x + zone.w - SPW, ent.x));
              ent.y = Math.max(zone.y, Math.min(zone.y + zone.h - SPH, ent.y));
            }
            // Direction from dominant axis
            if (Math.abs(dx) > Math.abs(dy)) {
              ent.dir = dx > 0 ? DIR_RIGHT : DIR_LEFT;
            } else {
              ent.dir = dy > 0 ? DIR_DOWN : DIR_UP;
            }
            // Walk animation
            ent.frameTimer++;
            if (ent.frameTimer >= WALK_TICKS) {
              ent.frameTimer = 0;
              ent.walkFrame  = (ent.walkFrame + 1) % 4;
            }
          } else {
            ent.walkFrame  = 0;
            ent.frameTimer = 0;
          }

          // Type animation (for at-desk busy)
          if (busy) {
            ent.frameTimer++;
            if (ent.frameTimer >= TYPE_TICKS) {
              ent.frameTimer = 0;
              ent.typeFrame  = (ent.typeFrame + 1) % 2;
            }
          }
        }
      }

      // ── Section headers ────────────────────────────────────────────────────
      for (const { realm, sx, sw, session, stations } of layout) {
        const busy = stations.filter(s => s.agent.status === 'busy').length;

        ctx.fillStyle = realm.headerBg;
        ctx.fillRect(sx, 0, sw, HEADER_H);
        ctx.fillStyle = realm.accent; ctx.globalAlpha = 0.8;
        ctx.fillRect(sx, HEADER_H - 3, sw, 3); ctx.globalAlpha = 1;

        ctx.font = '18px serif'; ctx.textAlign = 'left';
        ctx.fillStyle = realm.accent; ctx.globalAlpha = 0.35;
        ctx.fillText(realm.rune, sx + 10, 34); ctx.globalAlpha = 1;

        ctx.font = "8px 'Press Start 2P', monospace"; ctx.textAlign = 'center';
        ctx.fillStyle = realm.accent;
        ctx.fillText(realm.label, sx + sw / 2, 22);

        ctx.font = "5px 'Press Start 2P', monospace";
        ctx.fillStyle = realm.accent; ctx.globalAlpha = 0.55;
        ctx.fillText(session.name.toUpperCase(), sx + sw / 2, 38); ctx.globalAlpha = 1;

        ctx.font = "5px 'Press Start 2P', monospace"; ctx.textAlign = 'right';
        ctx.fillStyle = busy > 0 ? '#fdd835' : realm.accent;
        if (busy > 0) { ctx.globalAlpha = 0.7 + Math.sin(now / 400) * 0.3; }
        ctx.fillText(`${busy}/${stations.length}`, sx + sw - 12, 22); ctx.globalAlpha = 1;

        ctx.font = '18px serif'; ctx.textAlign = 'right';
        ctx.fillStyle = realm.accent; ctx.globalAlpha = 0.35;
        ctx.fillText(realm.rune, sx + sw - 10, 34); ctx.globalAlpha = 1;
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener('resize', resize); };
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
