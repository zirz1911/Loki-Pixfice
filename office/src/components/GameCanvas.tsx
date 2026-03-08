import { useEffect, useRef, useCallback } from "react";
import { agentEmoji } from "../lib/constants";
import type { AgentState, Session } from "../lib/types";

// ── Sprite constants ──────────────────────────────────────────────────────
const PS = 2;           // pixels per sprite pixel
const SW = 16 * PS;     // sprite width  = 32
const SH = 19 * PS;     // sprite height = 38
const SPD = 1.0;        // movement speed (px/frame at 12fps)
const FRAME_TICKS = 5;  // game frames per walk frame
const WANDER_MIN = 60;
const WANDER_MAX = 180;

// ── Sprite: head + body (rows 0–13) ──────────────────────────────────────
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
  '0CCCCCCCCCCCCC00',
  '0CAAACCCCAAACCC0',
  '0CCCCCCCCCCCCC00',
];

// ── Leg frames: stand / walk-A / walk-B ──────────────────────────────────
const LEGS: string[][] = [
  // 0 — stand
  [
    '00LLLLCCCLLLL000',
    '000LLLL0LLLLL000',
    '000LLLL0LLLLL000',
    '000BBBB0BBBBB000',
    '00BBBBB00BBBBB00',
  ],
  // 1 — walk A: right foot forward
  [
    '00LLLLCCCLLLL000',
    '00LLLLL0LLLLL000',
    '00LLLLL00LLLL000',
    '00BBBBB00BBBB000',
    '0BBBBBB000BBBBB0',
  ],
  // 2 — walk B: left foot forward
  [
    '00LLLLCCCLLLL000',
    '000LLLL0LLLLLL00',
    '0000LLLL0LLLLL00',
    '0000BBBB0BBBBB00',
    '00BBBBB000BBBBBB',
  ],
];

// ── Agent palettes (name → colors) ───────────────────────────────────────
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

// ── Draw one pixel sprite ─────────────────────────────────────────────────
function drawSprite(
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
    W:pal.W, C:pal.C, A:pal.A, L:pal.L, B:pal.B,
  };
  const glowColor = status === 'busy' ? '#fdd835' : '#4caf50';

  ctx.save();

  // Flip for left-facing
  if (!facingRight) {
    ctx.translate(x + SW, y);
    ctx.scale(-1, 1);
    x = 0;
  }

  // Shadow glow under feet
  if (status !== 'idle') {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = glowColor;
    ctx.fillRect(x + 4, y + SH + 2, SW - 8, 4);
    ctx.globalAlpha = 1;
  }

  // Pixel rows
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

  // Status pixel dot (top-right corner)
  ctx.fillStyle = status === 'busy' ? '#fdd835' : status === 'ready' ? '#4caf50' : '#555';
  ctx.fillRect(x + 14 * PS, y, PS * 2, PS * 2);

  ctx.restore();
}

// ── Agent movement entity ─────────────────────────────────────────────────
interface Entity {
  x: number; y: number;
  tx: number; ty: number;
  facingRight: boolean;
  legFrame: number;
  frameTimer: number;
  wanderTimer: number;
  zx: number; zy: number; zw: number; zh: number;
}

function pickTarget(e: Entity) {
  return {
    tx: e.zx + 8 + Math.random() * Math.max(0, e.zw - SW - 16),
    ty: e.zy + 8 + Math.random() * Math.max(0, e.zh - SH - 16),
  };
}

// ── Compute realm zones ───────────────────────────────────────────────────
function computeZones(w: number, h: number, sessionNames: string[]) {
  const floorY = h * 0.52;
  const floorH = h - floorY;
  const cols = 2;
  const rows = Math.max(1, Math.ceil(sessionNames.length / cols));
  const zw = w / cols;
  const zh = floorH / rows;

  return sessionNames.reduce<Record<string, { zx:number; zy:number; zw:number; zh:number }>>((acc, name, i) => {
    acc[name] = {
      zx: (i % cols) * zw,
      zy: floorY + Math.floor(i / cols) * zh,
      zw, zh,
    };
    return acc;
  }, {});
}

// ── Component ────────────────────────────────────────────────────────────
interface Props {
  sessions: Session[];
  agents: AgentState[];
  saiyanTargets: Set<string>;
  onSelectAgent: (agent: AgentState) => void;
}

export function GameCanvas({ sessions, agents, saiyanTargets, onSelectAgent }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const entitiesRef  = useRef(new Map<string, Entity>());
  const agentsRef    = useRef(agents);
  const frameRef     = useRef(0);
  const lastTimeRef  = useRef(0);

  agentsRef.current = agents;

  // ── Sync entity map when agents change ──
  const syncEntities = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width: w, height: h } = canvas;
    const sessionNames = [...new Set(agentsRef.current.map(a => a.session))];
    const zones = computeZones(w, h, sessionNames);
    const ents = entitiesRef.current;

    // Add new
    for (const agent of agentsRef.current) {
      if (!ents.has(agent.target)) {
        const z = zones[agent.session] ?? { zx: 0, zy: h * 0.52, zw: w, zh: h * 0.48 };
        const x = z.zx + 8 + Math.random() * Math.max(0, z.zw - SW - 16);
        const y = z.zy + 8 + Math.random() * Math.max(0, z.zh - SH - 16);
        ents.set(agent.target, {
          x, y, tx: x, ty: y,
          facingRight: true,
          legFrame: 0, frameTimer: 0,
          wanderTimer: Math.floor(Math.random() * WANDER_MAX),
          zx: z.zx, zy: z.zy, zw: z.zw, zh: z.zh,
        });
      } else {
        // Update zone bounds
        const z = zones[agent.session];
        if (z) {
          const e = ents.get(agent.target)!;
          e.zx = z.zx; e.zy = z.zy; e.zw = z.zw; e.zh = z.zh;
        }
      }
    }

    // Remove stale
    for (const key of ents.keys()) {
      if (!agentsRef.current.find(a => a.target === key)) ents.delete(key);
    }
  }, []);

  // ── Click → find nearest agent ──
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let best: { agent: AgentState; dist: number } | null = null;
    for (const agent of agentsRef.current) {
      const ent = entitiesRef.current.get(agent.target);
      if (!ent) continue;
      const dist = Math.hypot(mx - (ent.x + SW / 2), my - (ent.y + SH / 2));
      if (dist < 30 && (!best || dist < best.dist)) best = { agent, dist };
    }
    if (best) onSelectAgent(best.agent);
  }, [onSelectAgent]);

  // ── Game loop ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      syncEntities();
    };
    resize();
    window.addEventListener('resize', resize);

    const INTERVAL = 1000 / 12;

    function tick(now: number) {
      frameRef.current = requestAnimationFrame(tick);
      if (now - lastTimeRef.current < INTERVAL) return;
      lastTimeRef.current = now;

      const ctx = canvas!.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx.imageSmoothingEnabled = false;

      const ents = entitiesRef.current;
      const w = canvas!.width;
      const h = canvas!.height;
      const sessionNames = [...new Set(agentsRef.current.map(a => a.session))];
      const zones = computeZones(w, h, sessionNames);

      // ── Draw zone borders + labels ──
      ctx.save();
      for (const [name, z] of Object.entries(zones)) {
        ctx.strokeStyle = '#c9a02025';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(z.zx + 4, z.zy + 4, z.zw - 8, z.zh - 8);
        ctx.setLineDash([]);
        ctx.fillStyle = '#c9a02050';
        ctx.font = "5px 'Press Start 2P', monospace";
        ctx.textAlign = 'left';
        ctx.fillText(name.toUpperCase(), z.zx + 12, z.zy + 14);
      }
      ctx.restore();

      // ── Update + draw each agent ──
      // Sort by y so agents further up render behind agents lower down
      const sortedAgents = [...agentsRef.current].sort((a, b) => {
        const ea = ents.get(a.target);
        const eb = ents.get(b.target);
        return (ea?.y ?? 0) - (eb?.y ?? 0);
      });

      for (const agent of sortedAgents) {
        const ent = ents.get(agent.target);
        if (!ent) continue;

        // ── Wander ──
        ent.wanderTimer--;
        if (ent.wanderTimer <= 0) {
          const { tx, ty } = pickTarget(ent);
          ent.tx = tx; ent.ty = ty;
          ent.wanderTimer = WANDER_MIN + Math.floor(Math.random() * (WANDER_MAX - WANDER_MIN));
        }

        // ── Move ──
        const dx = ent.tx - ent.x;
        const dy = ent.ty - ent.y;
        const dist = Math.hypot(dx, dy);
        const isMoving = dist > 1.5;
        const spd = agent.status === 'busy' ? SPD * 1.8 : agent.status === 'idle' ? 0 : SPD;

        if (isMoving && spd > 0) {
          ent.x += (dx / dist) * spd;
          ent.y += (dy / dist) * spd;
          ent.facingRight = dx > 0;
          ent.x = Math.max(ent.zx, Math.min(ent.zx + ent.zw - SW, ent.x));
          ent.y = Math.max(ent.zy, Math.min(ent.zy + ent.zh - SH, ent.y));
        }

        // ── Animate legs ──
        if (isMoving && spd > 0) {
          ent.frameTimer++;
          if (ent.frameTimer >= FRAME_TICKS) {
            ent.frameTimer = 0;
            ent.legFrame = ent.legFrame === 1 ? 2 : 1;
          }
        } else {
          ent.legFrame = 0;
          ent.frameTimer = 0;
        }

        const pal = getPalette(agent.name);
        const emoji = agentEmoji(agent.name);

        // ── Busy aura (animated box) ──
        if (agent.status === 'busy') {
          const pulse = Math.sin(now / 300) * 0.3 + 0.3;
          ctx.save();
          ctx.globalAlpha = pulse;
          ctx.strokeStyle = '#fdd835';
          ctx.lineWidth = 2;
          ctx.strokeRect(ent.x - 3, ent.y - 3, SW + 6, SH + 6);
          ctx.restore();
        }

        // ── Saiyan border ──
        if (saiyanTargets.has(agent.target)) {
          ctx.save();
          ctx.globalAlpha = 0.6;
          ctx.strokeStyle = '#fdd835';
          ctx.lineWidth = 3;
          ctx.strokeRect(ent.x - 5, ent.y - 5, SW + 10, SH + 10);
          ctx.restore();
        }

        // ── Emoji badge ──
        if (emoji) {
          ctx.save();
          ctx.font = '13px serif';
          ctx.textAlign = 'center';
          ctx.fillText(emoji, ent.x + SW / 2, ent.y - 4);
          ctx.restore();
        }

        // ── Sprite ──
        drawSprite(ctx, ent.x, ent.y, pal, ent.legFrame, ent.facingRight, agent.status);

        // ── Name label ──
        ctx.save();
        ctx.font = "5px 'Press Start 2P', monospace";
        ctx.textAlign = 'center';
        ctx.fillStyle = pal.A;
        ctx.fillText(agent.name.replace(/-oracle$/, '').slice(0, 10), ent.x + SW / 2, ent.y + SH + 13);
        ctx.restore();
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [syncEntities]);

  // Sync when agents/sessions props change
  useEffect(() => { syncEntities(); }, [agents, sessions, syncEntities]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0"
      style={{ zIndex: 1, imageRendering: 'pixelated', cursor: 'pointer' }}
      onClick={handleClick}
    />
  );
}
