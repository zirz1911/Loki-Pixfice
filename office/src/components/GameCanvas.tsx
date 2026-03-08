/**
 * GameCanvas — pixel-agents style open-plan office
 *
 * Sprites: char_0–5.png  (112×96px, 7 cols × 4 rows, frame=16×24)
 *   Col 0–3 walk  Col 4–5 typing  Col 6 idle
 *   Sprite sheet row order: Row 0=DOWN  Row 1=UP  Row 2=LEFT  Row 3=RIGHT
 *   → SPRITE_ROW[gameDir] = spriteRow (identity mapping: our DIR enum == row index)
 *
 * Furniture layout stored in localStorage, drag-and-drop edit mode.
 */
import { useEffect, useRef, useCallback } from "react";
import type { AgentState, Session } from "../lib/types";
import {
  type FurnitureType, type FurnitureItem, type SavedLayout,
  ITEM_W, ITEM_H, loadLayout, saveLayout, generateDefaultSection,
} from "../lib/officeLayout";

// ── Sprite constants — matches AgentAvatar.tsx exactly ───────────────────────
const PS  = 4;           // pixel scale — matches AgentAvatar
const SPW = 8 * PS;      // 32px wide
const SPH = 12 * PS;     // 48px tall (12 sprite rows)

// Direction enum (movement only)
const DIR_DOWN = 0, DIR_UP = 1, DIR_LEFT = 2, DIR_RIGHT = 3;

const WALK_FRAMES = 4;

// 8-col × 12-row pixel sprites — identical to AgentAvatar.tsx
const SPRITES: Record<string, string[]> = {
  odin: [
    '0AAAAA00','0HHHHHH0','0SSSSSS0','0SEPPSS0',
    '0SSSSSS0','0SSMSSS0','0CCCCCC0','CCAACCCC',
    'CCAACCCC','0CCCCCC0','0LL00LL0','0BB00BB0',
  ],
  thor: [
    '0HHHHHH0','0HHHHHH0','0SSSSSS0','0SEPPSS0',
    '0SSSSSS0','0SSMSSS0','0CCCCCC0','CAAACCCC',
    'CCAACCCC','0CCCCCC0','0LL00LL0','0BB00BB0',
  ],
  loki: [
    '0HHHHHH0','HHHHHHH0','H0SSSSS0','0SEPPSS0',
    '0SSSSSS0','0SWMSSS0','0CCCCCC0','CCAACCCC',
    'CCAAC000','0CCCCCC0','0LL00LL0','0BB00BB0',
  ],
  heimdall: [
    '0HAAHH00','0HHHHHH0','0SSSSSS0','0SEEPSS0',
    '0SEEPSS0','0SSMSSS0','0CCCCCC0','CAACCACC',
    'CCAACCCC','0CCCCCC0','0LL00LL0','0BB00BB0',
  ],
  tyr: [
    '0HHHHHH0','0HHHHHH0','0SSSSSS0','0SEPPSS0',
    '0SSSSSS0','0SSMSSS0','0CCCCCC0','CCAACCCC',
    'ACCCCC00','0CCCCCC0','0LL00LL0','0BB00BB0',
  ],
  ymir: [
    'HHHHHHH0','HHHHHHH0','HSSSSSS0','HSEPPSS0',
    'HSSSSSS0','HSSMWSS0','HCCCCCCH','CAAACCCA',
    'CCAACCCA','HCCCCCCH','HLL00LLH','HBB00BBH',
  ],
};
SPRITES.default = [
  '00HHHH00','0HHHHHH0','0SSSSSS0','0SEPPSS0',
  '0SSSSSS0','0SSMSSS0','0CCCCCC0','CCAACCCC',
  'CCCCCCCC','0CCCCCC0','0LL00LL0','0BB00BB0',
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
function drawAgent(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  name: string,
  facingRight: boolean,
) {
  const key = name.toLowerCase().replace(/-oracle$/, '');
  const pk = Object.keys(PALETTES).find(k => k !== 'default' && key.startsWith(k)) ?? 'default';
  const pal = PALETTES[pk];
  const rows = SPRITES[pk] ?? SPRITES.default;
  const cmap: Record<string, string> = {
    H:pal.H, S:pal.S, E:pal.E, P:pal.P, M:pal.M,
    W:pal.W, C:pal.C, A:pal.A, L:pal.L, B:pal.B,
  };
  ctx.save();
  if (!facingRight) { ctx.translate(x + SPW, y); ctx.scale(-1, 1); x = 0; }
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
  ctx.restore();
}

// ── Layout constants ───────────────────────────────────────────────────────────
const T        = 16;
const HEADER_H = 68;   // matches navbar height — canvas draws nothing visible above this
const WALL_T   = 10;
const DESK_W   = 56, DESK_H = 28;
const CHAIR_W  = 22, CHAIR_H = 14;
// SIT_DY: sprite top offset from desk.y when sitting
// Need: desk.y + SIT_DY + SPH ≈ desk.y + DESK_H  →  SIT_DY ≈ DESK_H - SPH = 28 - 48 = -20
const SIT_DY   = -20;

const WALK_SPD = 1.5, WANDER_MIN = 60, WANDER_MAX = 190;
// at 12fps (83ms/tick): WALK_TICKS=2→167ms per frame
const WALK_TICKS = 2;
const INTERVAL = 1000 / 12;

// ── Section themes (accent + label only) ──────────────────────────────────────
const THEMES: Record<string, { accent: string; label: string; rune: string }> = {
  'loki-oracle': { accent:'#5a8cff', label:'ASGARD',     rune:'ᚱ' },
  midgard:       { accent:'#5ac88c', label:'MIDGARD',    rune:'ᚠ' },
  jotunheim:     { accent:'#9a7aff', label:'JOTUNHEIM',  rune:'ᚢ' },
  niflheim:      { accent:'#7ac8e0', label:'NIFLHEIM',   rune:'ᚦ' },
  muspelheim:    { accent:'#ff8060', label:'MUSPELHEIM', rune:'ᚨ' },
  vanaheim:      { accent:'#40c8b0', label:'VANAHEIM',   rune:'ᚷ' },
  alfheim:       { accent:'#e07aff', label:'ALFHEIM',    rune:'ᚾ' },
};
const THEME_FB = [
  { accent:'#5a8cff', label:'REALM', rune:'ᚱ' },
  { accent:'#5ac88c', label:'REALM', rune:'ᚠ' },
];
function getTheme(name: string, i: number) {
  if (THEMES[name]) return THEMES[name];
  const n = name.toLowerCase();
  if (n.includes('oracle')||n.includes('odin'))  return THEMES['loki-oracle'];
  if (n.includes('mid'))                          return THEMES.midgard;
  if (n.includes('jotun')||n.includes('yot'))     return THEMES.jotunheim;
  return THEME_FB[i % THEME_FB.length];
}

// ── Floor tile ─────────────────────────────────────────────────────────────────
function drawFloorTile(ctx: CanvasRenderingContext2D, x: number, y: number, tx: number, ty: number) {
  ctx.fillStyle = (tx + ty) % 2 === 0 ? '#0e1428' : '#0a1020';
  ctx.fillRect(x, y, T, T);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(x, y, T, 1);
  ctx.fillRect(x, y, 1, T);
}

// ── Wall rendering (brick pattern) ────────────────────────────────────────────
function drawWallH(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, accent: string) {
  ctx.fillStyle = '#0e1828'; ctx.fillRect(x, y, w, WALL_T);
  ctx.fillStyle = '#182638';
  const BW = 16;
  for (let bx = x; bx < x + w; bx += BW * 2) {
    ctx.fillRect(bx,      y + 1, BW - 1, WALL_T - 2);
    ctx.fillRect(bx + BW, y + 1, BW - 1, WALL_T - 2);
  }
  ctx.fillStyle = '#1e3044'; ctx.fillRect(x, y + WALL_T - 2, w, 2);
  ctx.fillStyle = accent;   ctx.globalAlpha = 0.45; ctx.fillRect(x, y + WALL_T - 1, w, 1); ctx.globalAlpha = 1;
}
function drawWallV(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, accent: string) {
  ctx.fillStyle = '#0e1828'; ctx.fillRect(x, y, WALL_T, h);
  ctx.fillStyle = '#182638';
  const BH = 8;
  for (let by = y; by < y + h; by += BH * 2) {
    ctx.fillRect(x + 1, by,      WALL_T - 2, BH - 1);
    ctx.fillRect(x + 1, by + BH, WALL_T - 2, BH - 1);
  }
  ctx.fillStyle = '#1e3044'; ctx.fillRect(x + WALL_T - 2, y, 2, h);
  ctx.fillStyle = accent;   ctx.globalAlpha = 0.3; ctx.fillRect(x + WALL_T - 1, y, 1, h); ctx.globalAlpha = 1;
}
function drawWallCorner(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#0e1828'; ctx.fillRect(x, y, WALL_T, WALL_T);
  ctx.fillStyle = '#182638'; ctx.fillRect(x + 1, y + 1, WALL_T - 2, WALL_T - 2);
}

// ── Desk ───────────────────────────────────────────────────────────────────────
function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, accent: string, busy: boolean, now: number) {
  // Back rail
  ctx.fillStyle = '#503814'; ctx.fillRect(x, y, DESK_W, 4);
  // Surface
  ctx.fillStyle = '#7a5820'; ctx.fillRect(x, y + 4, DESK_W, DESK_H - 6);
  ctx.fillStyle = '#9a7030'; ctx.fillRect(x, y + 4, DESK_W, 1); ctx.fillRect(x, y + 4, 1, DESK_H - 6);
  ctx.fillStyle = '#503814'; ctx.fillRect(x + DESK_W - 1, y + 4, 1, DESK_H - 6);

  // Monitor (larger for bigger desk)
  const mX = x + 6, mY = y + 5;
  ctx.fillStyle = '#141e2e'; ctx.fillRect(mX, mY, 18, 14);
  ctx.fillStyle = busy ? accent + '28' : '#0a1420'; ctx.fillRect(mX + 1, mY + 1, 16, 12);
  if (busy) {
    ctx.save(); ctx.globalAlpha = 0.4 + Math.sin(now / 350) * 0.25;
    ctx.fillStyle = accent; ctx.fillRect(mX + 1, mY + 1, 16, 12); ctx.restore();
    ctx.fillStyle = accent;
    const off = Math.floor(now / 170) % 3;
    for (let i = 0; i < 4; i++) ctx.fillRect(mX + 2, mY + 2 + i * 3, [5, 13, 8, 10][(i + off) % 4], 1);
  }
  // Papers
  ctx.fillStyle = '#e8e0cc'; ctx.fillRect(x + 28, y + 5, 12, 10);
  ctx.fillStyle = '#d8d0b8'; ctx.fillRect(x + 30, y + 4, 12, 10);
  // Keyboard
  ctx.fillStyle = '#1a2030'; ctx.fillRect(x + 28, y + 16, 22, 8);
  ctx.fillStyle = '#252e40';
  for (let k = 0; k < 4; k++) ctx.fillRect(x + 30 + k * 5, y + 17, 3, 6);
  // Front face
  ctx.fillStyle = '#503814'; ctx.fillRect(x, y + DESK_H - 2, DESK_W, 2);
}

// ── Chair ──────────────────────────────────────────────────────────────────────
function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#1a2a3c'; ctx.fillRect(x, y, CHAIR_W, 4);          // back
  ctx.fillStyle = '#2a3c54'; ctx.fillRect(x, y + 4, CHAIR_W, CHAIR_H - 5); // seat
  ctx.fillStyle = '#3a5070'; ctx.fillRect(x, y + 4, CHAIR_W, 1);      // seat highlight
  ctx.fillStyle = '#0a1020';
  ctx.fillRect(x + 2, y + CHAIR_H - 1, 3, 2);                          // left leg
  ctx.fillRect(x + CHAIR_W - 5, y + CHAIR_H - 1, 3, 2);               // right leg
}

// ── Plant ──────────────────────────────────────────────────────────────────────
function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#2a7818'; ctx.fillRect(x + 4, y, 6, 4);
  ctx.fillRect(x + 1, y + 3, 4, 4); ctx.fillRect(x + 9, y + 3, 4, 4);
  ctx.fillStyle = '#3a9820'; ctx.fillRect(x + 5, y + 1, 4, 3);
  ctx.fillRect(x + 2, y + 4, 3, 3); ctx.fillRect(x + 9, y + 4, 3, 3);
  ctx.fillStyle = '#4a7830'; ctx.fillRect(x + 6, y + 7, 2, 4);
  ctx.fillStyle = '#b85c30'; ctx.fillRect(x + 3, y + 11, 8, 7);
  ctx.fillStyle = '#d07040'; ctx.fillRect(x + 3, y + 11, 8, 2); ctx.fillRect(x + 3, y + 11, 2, 7);
  ctx.fillStyle = '#2a1808'; ctx.fillRect(x + 4, y + 11, 6, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x + 3, y + 17, 8, 1);
}

// ── Lamp ───────────────────────────────────────────────────────────────────────
function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'rgba(255,240,160,0.10)'; ctx.fillRect(x - 5, y, 20, 12);
  ctx.fillStyle = '#e8d070'; ctx.fillRect(x, y, 10, 5);
  ctx.fillStyle = '#f8e880'; ctx.fillRect(x + 1, y + 1, 8, 2);
  ctx.fillStyle = '#c0a840'; ctx.fillRect(x, y + 4, 10, 1);
  ctx.fillStyle = '#3a5070'; ctx.fillRect(x + 4, y + 5, 2, 18);
  ctx.fillStyle = '#2a3c54'; ctx.fillRect(x + 1, y + 23, 8, 3);
  ctx.fillStyle = '#1a2a3c'; ctx.fillRect(x, y + 25, 10, 2);
}

// ── Bookshelf ──────────────────────────────────────────────────────────────────
function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#503814'; ctx.fillRect(x, y, 32, 22);
  ctx.fillStyle = '#7a5820'; ctx.fillRect(x + 1, y + 1, 30, 1); ctx.fillRect(x + 1, y + 1, 1, 20);
  ctx.fillStyle = '#3a2810'; ctx.fillRect(x + 31, y + 1, 1, 20);

  const B1 = ['#c03030','#3050c0','#30a040','#c0a030','#a030a0','#308080','#c06030'];
  let bx = x + 2;
  for (const c of B1) {
    const bw = 3 + (bx % 2);
    ctx.fillStyle = c; ctx.fillRect(bx, y + 3, bw, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(bx, y + 3, 1, 7);
    bx += bw + 1; if (bx > x + 30) break;
  }
  ctx.fillStyle = '#9a7030'; ctx.fillRect(x + 1, y + 10, 30, 1);

  bx = x + 2;
  const B2 = ['#506090','#906030','#308850','#9040c0','#c04850','#408890'];
  for (const c of B2) {
    const bw = 4 + (bx % 2);
    ctx.fillStyle = c; ctx.fillRect(bx, y + 12, bw, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(bx, y + 12, 1, 8);
    bx += bw + 1; if (bx > x + 30) break;
  }
  ctx.fillStyle = '#9a7030'; ctx.fillRect(x + 1, y + 21, 30, 1);
}

// ── Draw furniture by type ─────────────────────────────────────────────────────
function drawFurniture(
  ctx: CanvasRenderingContext2D,
  item: FurnitureItem, accent: string,
  agentForDesk: AgentState | undefined,
  now: number,
) {
  const { x, y, type } = item;
  if (type === 'desk')      drawDesk(ctx, x, y, accent, agentForDesk?.status === 'busy', now);
  else if (type === 'plant')     drawPlant(ctx, x, y);
  else if (type === 'lamp')      drawLamp(ctx, x, y);
  else if (type === 'bookshelf') drawBookshelf(ctx, x, y);
}

// ── Section geometry ───────────────────────────────────────────────────────────
interface Section {
  session: Session;
  sx: number; sw: number;
  accent: string; label: string; rune: string;
  innerX: number; innerY: number; innerW: number; innerH: number;
  wanderZone: { x: number; y: number; w: number; h: number };
}
function computeSections(w: number, h: number, sessions: Session[]): Section[] {
  const N = Math.min(sessions.length, 3);
  const sw = N > 0 ? Math.floor(w / N) : w;
  return sessions.slice(0, N).map((session, si) => {
    const sx    = si * sw;
    const secW  = si === N - 1 ? w - sx : sw;
    const theme = getTheme(session.name, si);
    const innerX = sx + WALL_T, innerY = HEADER_H + WALL_T;
    const innerW = secW - WALL_T * 2, innerH = h - HEADER_H - WALL_T;
    return {
      session, sx, sw: secW,
      accent: theme.accent, label: theme.label, rune: theme.rune,
      innerX, innerY, innerW, innerH,
      // Open plan: agents wander full section height (no lower-half restriction)
      wanderZone: {
        x: innerX + 4, y: innerY + 4,
        w: Math.max(SPW + 10, innerW - 8),
        h: Math.max(SPH + 10, innerH - 8),
      },
    };
  });
}

// ── Entity state ───────────────────────────────────────────────────────────────
interface Entity {
  x: number; y: number; tx: number; ty: number;
  dir: number; facingRight: boolean; walkFrame: number;
  frameTimer: number; wanderTimer: number;
  zone: { x: number; y: number; w: number; h: number };
  homeX: number; homeY: number;
}

// ── Component ──────────────────────────────────────────────────────────────────
interface Props {
  sessions: Session[];
  agents: AgentState[];
  saiyanTargets: Set<string>;
  onSelectAgent: (a: AgentState) => void;
  editMode: boolean;
  placingType: FurnitureType | null;
  onPlacingDone: () => void;
}

export function GameCanvas({ sessions, agents, saiyanTargets, onSelectAgent, editMode, placingType, onPlacingDone }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const frameRef    = useRef(0);
  const lastTimeRef = useRef(0);
  const entRef      = useRef(new Map<string, Entity>());

  // Always-fresh refs
  const agentsRef    = useRef(agents);
  const sessionsRef  = useRef(sessions);
  const saiyanRef    = useRef(saiyanTargets);
  const onSelectRef  = useRef(onSelectAgent);
  const editModeRef  = useRef(editMode);
  const placingRef   = useRef(placingType);
  const placingDoneRef = useRef(onPlacingDone);
  agentsRef.current    = agents;
  sessionsRef.current  = sessions;
  saiyanRef.current    = saiyanTargets;
  onSelectRef.current  = onSelectAgent;
  editModeRef.current  = editMode;
  placingRef.current   = placingType;
  placingDoneRef.current = onPlacingDone;

  // Layout (in ref — mutated directly to avoid re-renders during drag)
  const layoutRef = useRef<SavedLayout>(loadLayout());
  // Track which sessions have had defaults generated
  const defaultsGenRef = useRef(new Set<string>());
  // Drag state
  const dragRef = useRef<{ itemId: string; sessionName: string; ox: number; oy: number } | null>(null);
  // Cursor position for placing ghost
  const ghostRef = useRef<{ x: number; y: number } | null>(null);

  // ── Ensure every agent has a desk in the layout ───────────────────────────
  const ensureDesks = useCallback((sections: Section[]) => {
    let changed = false;
    const layout = layoutRef.current;
    for (const ag of agentsRef.current) {
      const sec = sections.find(s => s.session.name === ag.session);
      if (!sec) continue;
      const sName = ag.session;

      // Generate full default if section is brand-new
      if (!layout[sName] && !defaultsGenRef.current.has(sName)) {
        defaultsGenRef.current.add(sName);
        const targets = agentsRef.current.filter(a => a.session === sName).map(a => a.target);
        layout[sName] = generateDefaultSection(sName, targets, sec.sx, sec.sw, HEADER_H, WALL_T);
        changed = true;
        continue;
      }

      if (!layout[sName]) layout[sName] = { items: [] };
      const hasDesk = layout[sName].items.some(it => it.type === 'desk' && it.agentTarget === ag.target);
      if (!hasDesk) {
        const n = layout[sName].items.filter(it => it.type === 'desk').length;
        const cols = 3, GAP = 24;
        layout[sName].items.push({
          id: `desk-${ag.target}`,
          type: 'desk',
          x: sec.innerX + 10 + (n % cols) * (ITEM_W.desk + GAP),
          y: HEADER_H + WALL_T + 70 + Math.floor(n / cols) * 110,
          agentTarget: ag.target,
        });
        changed = true;
      }
    }
    if (changed) saveLayout(layout);
  }, []);

  // ── Sync entities with current layout ────────────────────────────────────
  const syncEntities = useCallback((sections: Section[]) => {
    const ents = entRef.current;
    const layout = layoutRef.current;
    for (const ag of agentsRef.current) {
      const sec = sections.find(s => s.session.name === ag.session);
      if (!sec) continue;
      const desk = layout[ag.session]?.items.find(it => it.type === 'desk' && it.agentTarget === ag.target);
      const homeX = desk ? desk.x + Math.floor((ITEM_W.desk - SPW) / 2) : sec.wanderZone.x;
      const homeY = desk ? desk.y + SIT_DY : sec.wanderZone.y;

      if (!ents.has(ag.target)) {
        const sx = sec.wanderZone.x + Math.random() * Math.max(0, sec.wanderZone.w - SPW);
        const sy = sec.wanderZone.y + Math.random() * Math.max(0, sec.wanderZone.h - SPH);
        ents.set(ag.target, {
          x: sx, y: sy, tx: sx, ty: sy,
          dir: DIR_DOWN, facingRight: true, walkFrame: 0, frameTimer: 0,
          wanderTimer: Math.floor(Math.random() * WANDER_MAX),
          zone: sec.wanderZone, homeX, homeY,
        });
      } else {
        const e = ents.get(ag.target)!;
        e.zone = sec.wanderZone; e.homeX = homeX; e.homeY = homeY;
        if (ag.status === 'busy') { e.tx = homeX; e.ty = homeY; }
      }
    }
    const active = new Set(agentsRef.current.map(a => a.target));
    for (const k of ents.keys()) if (!active.has(k)) ents.delete(k);
  }, []);

  // ── Hit test furniture item ───────────────────────────────────────────────
  const hitFurniture = useCallback((mx: number, my: number): { item: FurnitureItem; sessionName: string } | null => {
    for (const [sName, sec] of Object.entries(layoutRef.current)) {
      for (let i = sec.items.length - 1; i >= 0; i--) {
        const item = sec.items[i];
        if (mx >= item.x && mx <= item.x + ITEM_W[item.type] && my >= item.y && my <= item.y + ITEM_H[item.type]) {
          return { item, sessionName: sName };
        }
      }
    }
    return null;
  }, []);

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    ghostRef.current = { x: mx, y: my };

    if (!dragRef.current) return;
    const { itemId, sessionName, ox, oy } = dragRef.current;
    const sec = layoutRef.current[sessionName]; if (!sec) return;
    const item = sec.items.find(it => it.id === itemId); if (!item) return;
    item.x = Math.round((mx - ox) / T) * T;
    item.y = Math.round((my - oy) / T) * T;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editModeRef.current || placingRef.current !== null) return;
    if (e.button !== 0) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = hitFurniture(mx, my);
    if (hit) dragRef.current = { itemId: hit.item.id, sessionName: hit.sessionName, ox: mx - hit.item.x, oy: my - hit.item.y };
  }, [hitFurniture]);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) { saveLayout(layoutRef.current); dragRef.current = null; }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!editModeRef.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    for (const sec of Object.values(layoutRef.current)) {
      const idx = sec.items.findIndex(it => mx >= it.x && mx <= it.x + ITEM_W[it.type] && my >= it.y && my <= it.y + ITEM_H[it.type]);
      if (idx !== -1) { sec.items.splice(idx, 1); saveLayout(layoutRef.current); return; }
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    // Placing mode: add new item
    if (editModeRef.current && placingRef.current !== null) {
      if (dragRef.current) return; // was a drag, not a click
      const pType = placingRef.current;
      const sections = computeSections(canvas.width, canvas.height, sessionsRef.current);
      const sec = sections.find(s => mx >= s.sx && mx < s.sx + s.sw);
      if (sec) {
        const sName = sec.session.name;
        if (!layoutRef.current[sName]) layoutRef.current[sName] = { items: [] };
        layoutRef.current[sName].items.push({
          id: `${pType}-${Date.now()}`,
          type: pType,
          x: Math.round((mx - ITEM_W[pType] / 2) / T) * T,
          y: Math.round((my - ITEM_H[pType] / 2) / T) * T,
        });
        saveLayout(layoutRef.current);
      }
      return;
    }

    // Normal mode: select agent
    if (editModeRef.current) return;
    const sections = computeSections(canvas.width, canvas.height, sessionsRef.current);
    const ents = entRef.current;
    let best: { ag: AgentState; dist: number } | null = null;
    for (const { stations, wanderZone } of sections.map(s => ({ stations: agentsRef.current.filter(a => a.session === s.session.name), wanderZone: s.wanderZone }))) {
      for (const ag of stations) {
        const ent = ents.get(ag.target);
        const layout = layoutRef.current;
        const desk = layout[ag.session]?.items.find(it => it.type === 'desk' && it.agentTarget === ag.target);
        const homeX = desk ? desk.x + Math.floor((ITEM_W.desk - SPW) / 2) : wanderZone.x;
        const homeY = desk ? desk.y + SIT_DY : wanderZone.y;
        const ax = ag.status === 'busy' ? homeX + SPW / 2 : (ent?.x ?? homeX) + SPW / 2;
        const ay = ag.status === 'busy' ? homeY + SPH / 2 : (ent?.y ?? homeY) + SPH / 2;
        const d = Math.hypot(mx - ax, my - ay);
        if (d < 44 && (!best || d < best.dist)) best = { ag, dist: d };
      }
    }
    if (best) onSelectRef.current(best.ag);
  }, []);

  // ── Main loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    function tick(now: number) {
      frameRef.current = requestAnimationFrame(tick);
      if (now - lastTimeRef.current < INTERVAL) return;
      lastTimeRef.current = now;

      const ctx = canvas!.getContext('2d'); if (!ctx) return;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx.imageSmoothingEnabled = false;

      const w = canvas!.width, h = canvas!.height;
      const sections = computeSections(w, h, sessionsRef.current);
      ensureDesks(sections);
      syncEntities(sections);
      const ents = entRef.current;
      const layout = layoutRef.current;

      // ── Header bar (behind navbar) ────────────────────────────────────────
      ctx.fillStyle = '#0a0b16'; ctx.fillRect(0, 0, w, HEADER_H);
      // Per-section accent strip at bottom of header
      for (const { sx, sw, accent } of sections) {
        ctx.fillStyle = accent; ctx.globalAlpha = 0.5;
        ctx.fillRect(sx, HEADER_H - 2, sw, 2); ctx.globalAlpha = 1;
      }

      // ── Open-plan floor (one continuous room) ────────────────────────────
      const floorX = WALL_T, floorY = HEADER_H + WALL_T;
      const floorW = w - WALL_T * 2, floorH = h - HEADER_H - WALL_T;
      const tilesX = Math.ceil(floorW / T), tilesY = Math.ceil(floorH / T);
      for (let ty = 0; ty < tilesY; ty++)
        for (let tx = 0; tx < tilesX; tx++)
          drawFloorTile(ctx, floorX + tx * T, floorY + ty * T, tx, ty);

      // ── Outer walls only (no section dividers — open plan) ────────────────
      const wallAccent = '#5a8cff';
      drawWallH(ctx, WALL_T, HEADER_H, w - WALL_T * 2, wallAccent);
      drawWallV(ctx, 0, HEADER_H, h - HEADER_H, wallAccent);
      drawWallV(ctx, w - WALL_T, HEADER_H, h - HEADER_H, wallAccent);
      drawWallCorner(ctx, 0, HEADER_H);
      drawWallCorner(ctx, w - WALL_T, HEADER_H);

      // ── Subtle dept dividers (thin dashed lines, not walls) ───────────────
      for (let si = 1; si < sections.length; si++) {
        const divX = sections[si].sx;
        ctx.fillStyle = sections[si].accent; ctx.globalAlpha = 0.12;
        for (let dy = floorY + 4; dy < h - 4; dy += 12) ctx.fillRect(divX, dy, 1, 8);
        ctx.globalAlpha = 1;
      }

      // ── Collect renderable items ────────────────────────────────────────
      type RItem = { zY: number; pri: number; draw: () => void };
      const items: RItem[] = [];

      // Furniture items
      for (const section of sections) {
        const sName = section.session.name;
        const sectionItems = layout[sName]?.items ?? [];
        for (const item of sectionItems) {
          const agForDesk = item.type === 'desk'
            ? agentsRef.current.find(a => a.target === item.agentTarget)
            : undefined;

          if (item.type === 'desk') {
            const busy = agForDesk?.status === 'busy';
            // Chair (only visible when agent not sitting)
            if (!busy) {
              const cX = item.x + Math.floor((ITEM_W.desk - CHAIR_W) / 2);
              const cY = item.y + DESK_H + 2;
              items.push({ zY: cY + CHAIR_H + 1, pri: 0, draw: () => drawChair(ctx, cX, cY) });
            }
            // Desk surface (draws after agent → covers lower legs)
            const _item = item;
            items.push({
              zY: item.y + DESK_H + 1, pri: 0,
              draw: () => drawFurniture(ctx, _item, section.accent, agForDesk, now),
            });
          } else {
            const _item = item;
            items.push({
              zY: item.y + ITEM_H[item.type], pri: 0,
              draw: () => drawFurniture(ctx, _item, section.accent, undefined, now),
            });
          }
        }
      }

      // Agent sprites + labels
      for (const section of sections) {
        for (const ag of agentsRef.current.filter(a => a.session === section.session.name)) {
          const ent = ents.get(ag.target); if (!ent) continue;
          const busy = ag.status === 'busy', ready = ag.status === 'ready';
          const desk = layout[ag.session]?.items.find(it => it.type === 'desk' && it.agentTarget === ag.target);
          const homeX = desk ? desk.x + Math.floor((ITEM_W.desk - SPW) / 2) : ent.zone.x;
          const homeY = desk ? desk.y + SIT_DY : ent.zone.y;

          let ax: number, ay: number, facingRight: boolean;
          if (busy) {
            const arrived = Math.hypot(homeX - ent.x, homeY - ent.y) < 3;
            ax = arrived ? homeX : Math.round(ent.x);
            ay = arrived ? homeY : Math.round(ent.y);
            facingRight = arrived ? true : ent.facingRight;
          } else {
            ax = Math.round(ent.x); ay = Math.round(ent.y);
            facingRight = ent.facingRight;
          }

          const _ax = ax, _ay = ay, _facingRight = facingRight;
          items.push({
            zY: ay + SPH, pri: 1,
            draw: () => {
              if (saiyanRef.current.has(ag.target)) {
                ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(now / 220) * 0.25;
                ctx.strokeStyle = '#fdd835'; ctx.lineWidth = 3;
                ctx.strokeRect(_ax - 4, _ay - 4, SPW + 8, SPH + 8);
                ctx.restore();
              }
              if (busy || ready) {
                ctx.save(); ctx.globalAlpha = 0.3 + Math.sin(now / 320) * 0.2;
                ctx.strokeStyle = busy ? '#fdd835' : '#5ac88c'; ctx.lineWidth = 2;
                ctx.strokeRect(_ax - 2, _ay - 2, SPW + 4, SPH + 4);
                ctx.restore();
              }
              if (busy && Math.hypot(ax - homeX, ay - homeY) < 4) {
                const dots = '•'.repeat(1 + Math.floor(now / 280) % 3);
                ctx.save(); ctx.globalAlpha = 0.9;
                ctx.fillStyle = section.accent; ctx.font = "6px 'Press Start 2P', monospace";
                ctx.textAlign = 'center'; ctx.fillText(dots, _ax + SPW / 2, _ay - 4);
                ctx.restore();
              }
              // Status dot (top-right of sprite, matches AgentAvatar)
              const dotColor = ag.status === 'busy' ? '#fdd835' : ag.status === 'ready' ? '#5ac88c' : '#445566';
              ctx.fillStyle = dotColor;
              ctx.fillRect(_ax + SPW, _ay, PS * 2, PS * 2);
              drawAgent(ctx, _ax, _ay, ag.name, _facingRight);
            },
          });

          // Name label (always on top)
          const lx = (busy ? homeX : ax) + SPW / 2;
          const ly = (busy ? homeY : ay) + SPH + 10;
          items.push({
            zY: 1e6, pri: 0,
            draw: () => {
              ctx.save();
              ctx.font = "5px 'Press Start 2P', monospace"; ctx.textAlign = 'center';
              ctx.fillStyle = section.accent;
              ctx.fillText(ag.name.replace(/-oracle$/, '').toUpperCase().slice(0, 10), lx, ly);
              ctx.fillStyle = busy ? '#fdd835' : ready ? '#5ac88c' : '#445566';
              ctx.fillRect(Math.round(lx - 2), ly + 4, 4, 4);
              ctx.restore();
            },
          });
        }
      }

      // ── Z-sort + draw ──────────────────────────────────────────────────────
      items.sort((a, b) => a.zY !== b.zY ? a.zY - b.zY : a.pri - b.pri);
      for (const item of items) item.draw();

      // ── Dept zone labels (inside room, below top wall) ───────────────────
      for (const { sx, sw, accent, label, rune, session } of sections) {
        const sItems = layout[session.name]?.items ?? [];
        const busyCount = sItems.filter(it => it.type === 'desk')
          .filter(it => agentsRef.current.find(a => a.target === it.agentTarget)?.status === 'busy').length;
        const totalDesks = sItems.filter(it => it.type === 'desk').length;

        const labelY = HEADER_H + WALL_T + 20;
        const midX = sx + sw / 2;

        // Rune glyph
        ctx.font = '16px serif'; ctx.textAlign = 'left';
        ctx.fillStyle = accent; ctx.globalAlpha = 0.22;
        ctx.fillText(rune, sx + WALL_T + 8, labelY + 2); ctx.globalAlpha = 1;

        // Dept name
        ctx.font = "7px 'Press Start 2P', monospace"; ctx.textAlign = 'center';
        ctx.fillStyle = accent; ctx.globalAlpha = 0.85;
        ctx.fillText(label, midX, labelY); ctx.globalAlpha = 1;

        // Session name + count
        ctx.font = "5px 'Press Start 2P', monospace";
        ctx.fillStyle = accent; ctx.globalAlpha = 0.45;
        ctx.fillText(session.name.toUpperCase(), midX, labelY + 12); ctx.globalAlpha = 1;

        if (totalDesks > 0) {
          ctx.fillStyle = busyCount > 0 ? '#fdd835' : accent;
          if (busyCount > 0) ctx.globalAlpha = 0.7 + Math.sin(now / 400) * 0.3;
          ctx.textAlign = 'right';
          ctx.fillText(`${busyCount}/${totalDesks}`, sx + sw - WALL_T - 8, labelY);
          ctx.globalAlpha = 1;
        }
      }

      // ── Edit mode overlays ─────────────────────────────────────────────────
      if (editModeRef.current) {
        // Highlight all furniture
        for (const sec of Object.values(layout)) {
          for (const item of sec.items) {
            const isDrag = dragRef.current?.itemId === item.id;
            ctx.strokeStyle = isDrag ? '#fdd835' : '#5a8cff';
            ctx.lineWidth = isDrag ? 2 : 1;
            ctx.globalAlpha = isDrag ? 0.95 : 0.55;
            ctx.strokeRect(item.x - 1, item.y - 1, ITEM_W[item.type] + 2, ITEM_H[item.type] + 2);
            ctx.globalAlpha = 1;
          }
        }

        // Ghost item when placing
        const pType = placingRef.current;
        if (pType && ghostRef.current) {
          const { x: gx, y: gy } = ghostRef.current;
          const oX = Math.round((gx - ITEM_W[pType] / 2) / T) * T;
          const oY = Math.round((gy - ITEM_H[pType] / 2) / T) * T;
          ctx.save(); ctx.globalAlpha = 0.55;
          const ghostItem: FurnitureItem = { id: 'ghost', type: pType, x: oX, y: oY };
          drawFurniture(ctx, ghostItem, '#5a8cff', undefined, now);
          ctx.restore();
          ctx.strokeStyle = '#5a8cff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.9;
          ctx.strokeRect(oX, oY, ITEM_W[pType], ITEM_H[pType]);
          ctx.globalAlpha = 1;
        }
      }

      // ── Movement update ────────────────────────────────────────────────────
      for (const section of sections) {
        for (const ag of agentsRef.current.filter(a => a.session === section.session.name)) {
          const ent = ents.get(ag.target); if (!ent) continue;
          const busy = ag.status === 'busy';

          if (busy) {
            ent.tx = ent.homeX; ent.ty = ent.homeY;
          } else {
            ent.wanderTimer--;
            if (ent.wanderTimer <= 0) {
              ent.tx = ent.zone.x + 8 + Math.random() * Math.max(0, ent.zone.w - SPW - 16);
              ent.ty = ent.zone.y + 8 + Math.random() * Math.max(0, ent.zone.h - SPH - 8);
              ent.wanderTimer = WANDER_MIN + Math.floor(Math.random() * (WANDER_MAX - WANDER_MIN));
            }
          }

          const dx = ent.tx - ent.x, dy = ent.ty - ent.y;
          const dist = Math.hypot(dx, dy);
          const spd = busy ? WALK_SPD * 1.8 : WALK_SPD;
          const moving = dist > 1.5;

          if (moving) {
            ent.x += (dx / dist) * spd; ent.y += (dy / dist) * spd;
            if (!busy) {
              ent.x = Math.max(ent.zone.x, Math.min(ent.zone.x + ent.zone.w - SPW, ent.x));
              ent.y = Math.max(ent.zone.y, Math.min(ent.zone.y + ent.zone.h - SPH, ent.y));
            }
            ent.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIR_RIGHT : DIR_LEFT) : (dy > 0 ? DIR_DOWN : DIR_UP);
            if (Math.abs(dx) > 0.5) ent.facingRight = dx > 0;
            ent.frameTimer++;
            if (ent.frameTimer >= WALK_TICKS) { ent.frameTimer = 0; ent.walkFrame = (ent.walkFrame + 1) % WALK_FRAMES; }
          } else {
            ent.walkFrame = 0; ent.frameTimer = 0;
          }

        }
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener('resize', resize); };
  }, [ensureDesks, syncEntities]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0"
      style={{
        zIndex: 1,
        imageRendering: 'pixelated',
        cursor: editMode ? (placingType ? 'crosshair' : 'grab') : 'pointer',
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    />
  );
}
