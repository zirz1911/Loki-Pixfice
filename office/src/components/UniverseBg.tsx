import { useEffect, useRef } from "react";

const T = 8; // tile size in px

function seedRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0xffffffff;
  };
}

function drawAsgard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cols = Math.ceil(w / T) + 1;
  const rows = Math.ceil(h / T) + 1;
  const rand = seedRand(0xa57a4d0);

  const horizonY = Math.floor(rows * 0.52); // sky / palace floor divide

  // ── Cosmic sky ─────────────────────────────────────────────────────────────
  for (let r = 0; r < horizonY; r++) {
    const t = r / horizonY; // 0=top, 1=horizon
    // Gradient: very dark purple → deep navy/indigo
    const rr = Math.floor(6  + t * 14);
    const gg = Math.floor(3  + t * 8);
    const bb = Math.floor(16 + t * 40);
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
      ctx.fillRect(c * T, r * T, T, T);
    }
  }

  // ── Stars ──────────────────────────────────────────────────────────────────
  const STAR_COLORS = ['#ffffff', '#e0e8ff', '#ffe0c0', '#c0d0ff'];
  for (let i = 0; i < 300; i++) {
    const sc = Math.floor(rand() * cols);
    const sr = Math.floor(rand() * (horizonY - 2));
    const size = rand() < 0.15 ? 2 : 1;
    ctx.fillStyle = STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)];
    ctx.fillRect(sc * T + 3, sr * T + 3, size, size);
  }

  // ── Moon (top right) ───────────────────────────────────────────────────────
  const moonX = Math.floor(cols * 0.82) * T;
  const moonY = Math.floor(rows * 0.08) * T;
  const moonR = T * 3;
  // Full circle
  ctx.fillStyle = '#e8f0ff';
  for (let dy = -moonR; dy <= moonR; dy += 1) {
    for (let dx = -moonR; dx <= moonR; dx += 1) {
      if (dx * dx + dy * dy <= moonR * moonR) {
        ctx.fillRect(moonX + dx, moonY + dy, 1, 1);
      }
    }
  }
  // Crater details
  ctx.fillStyle = '#c8d4f0';
  ctx.fillRect(moonX - 6, moonY - 4, 4, 4);
  ctx.fillRect(moonX + 4, moonY + 2, 3, 3);
  ctx.fillRect(moonX - 2, moonY + 6, 5, 3);

  // ── Aurora borealis ────────────────────────────────────────────────────────
  const AURORA = ['#40ff90', '#4090ff', '#c040ff', '#40e8ff', '#80ff40'];
  for (let band = 0; band < 5; band++) {
    const startC = Math.floor(rand() * cols);
    const startR = Math.floor(rand() * (horizonY * 0.6));
    const length = Math.floor(rand() * 30 + 20);
    const color = AURORA[band % AURORA.length];
    ctx.fillStyle = color;
    for (let i = 0; i < length; i++) {
      const c = (startC + i) % cols;
      const r = startR + Math.floor(Math.sin(i * 0.3) * 3);
      if (r >= 0 && r < horizonY) {
        // Aurora is semi-transparent — draw as thin pixel strips
        ctx.globalAlpha = 0.25 + Math.sin(i * 0.4) * 0.15;
        ctx.fillRect(c * T, r * T, T, 2);
      }
    }
  }
  ctx.globalAlpha = 1;

  // ── Bifrost — rainbow bridge (diagonal, lower-left to upper-right) ─────────
  const BIFROST = ['#ff4040', '#ff9020', '#f5c518', '#40c840', '#4090ff', '#8040e0', '#c040c0'];
  const bfStartX = Math.floor(cols * 0.05) * T;
  const bfStartY = (horizonY + 2) * T;
  const bfEndX   = Math.floor(cols * 0.55) * T;
  const bfEndY   = Math.floor(horizonY * 0.35) * T;
  const bfDX = bfEndX - bfStartX;
  const bfDY = bfEndY - bfStartY;
  const bfLen = Math.sqrt(bfDX * bfDX + bfDY * bfDY);
  const bfUX = bfDX / bfLen; // unit vector
  const bfUY = bfDY / bfLen;
  // Perpendicular
  const bfPX = -bfUY;
  const bfPY =  bfUX;

  for (let band = 0; band < BIFROST.length; band++) {
    ctx.fillStyle = BIFROST[band];
    const offset = (band - 3) * 3; // -9 to +9 pixels from center
    for (let t2 = 0; t2 < bfLen; t2 += 1) {
      const px = bfStartX + bfUX * t2 + bfPX * offset;
      const py = bfStartY + bfUY * t2 + bfPY * offset;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
    }
  }
  ctx.globalAlpha = 1;

  // ── Clouds near horizon ────────────────────────────────────────────────────
  const cloudY = (horizonY - 3) * T;
  for (let i = 0; i < 8; i++) {
    const cx = Math.floor(rand() * cols) * T;
    const cw = Math.floor(rand() * 8 + 4) * T;
    ctx.fillStyle = '#d0d8f0';
    ctx.fillRect(cx, cloudY, cw, T);
    ctx.fillRect(cx + T, cloudY - T, cw - T * 2, T);
    // Cloud shadow
    ctx.fillStyle = '#a0a8c0';
    ctx.fillRect(cx, cloudY + T - 2, cw, 2);
  }

  // ── Asgard palace floor (bottom half) ──────────────────────────────────────
  const STONE  = ['#2e2848', '#383050', '#322c4a'];
  const STONE_LT = '#504870';
  for (let r = horizonY; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = STONE[Math.floor(rand() * STONE.length)];
      ctx.fillRect(c * T, r * T, T, T);
    }
  }
  // Gold mortar lines (grid)
  ctx.fillStyle = '#c9a020';
  ctx.globalAlpha = 0.4;
  const tileSize = T * 4; // each "floor tile" = 4 pixel tiles wide
  for (let x = 0; x < w; x += tileSize) {
    ctx.fillRect(x, horizonY * T, 1, h - horizonY * T);
  }
  for (let y = horizonY * T; y < h; y += tileSize) {
    ctx.fillRect(0, y, w, 1);
  }
  ctx.globalAlpha = 1;

  // Subtle floor highlights
  ctx.fillStyle = STONE_LT;
  for (let i = 0; i < 60; i++) {
    const fc = Math.floor(rand() * cols);
    const fr = horizonY + Math.floor(rand() * (rows - horizonY));
    ctx.fillRect(fc * T, fr * T, 2, 2);
  }

  // ── Golden pillars (left and right) ───────────────────────────────────────
  const pillarYStart = horizonY * T;
  const pillarH = h - pillarYStart;
  const pillarW = T * 3;

  const pillarXs = [
    T * 2,
    Math.floor(cols * 0.25) * T,
    Math.floor(cols * 0.5)  * T,
    Math.floor(cols * 0.75) * T,
    (cols - 5) * T,
  ];

  for (const px of pillarXs) {
    // Main pillar body
    ctx.fillStyle = '#c9a020';
    ctx.fillRect(px, pillarYStart, pillarW, pillarH);
    // Highlight edge
    ctx.fillStyle = '#f5c518';
    ctx.fillRect(px, pillarYStart, 2, pillarH);
    // Shadow edge
    ctx.fillStyle = '#806810';
    ctx.fillRect(px + pillarW - 2, pillarYStart, 2, pillarH);
    // Capital top
    ctx.fillStyle = '#f5c518';
    ctx.fillRect(px - T, pillarYStart, pillarW + T * 2, T);
    ctx.fillRect(px - T / 2, pillarYStart - T, pillarW + T, T);
    // Rune carving
    ctx.fillStyle = '#806810';
    for (let ry = pillarYStart + T * 2; ry < h - T * 2; ry += T * 5) {
      ctx.fillRect(px + 2, ry, pillarW - 4, 1);
      ctx.fillRect(px + 2, ry + 2, pillarW - 4, 1);
    }
  }

  // ── Horizon glow (gold rim light) ─────────────────────────────────────────
  ctx.fillStyle = '#f5c518';
  ctx.globalAlpha = 0.12;
  ctx.fillRect(0, (horizonY - 1) * T, w, T * 2);
  ctx.globalAlpha = 0.06;
  ctx.fillRect(0, (horizonY - 3) * T, w, T * 3);
  ctx.globalAlpha = 1;

  // ── Rune symbols on floor ──────────────────────────────────────────────────
  const RUNES = [
    // [dx, dy] pixel offsets for each rune stroke (2x2 blocks)
    [[0,0],[0,1],[0,2],[1,1]],        // ᚱ-like
    [[0,0],[1,0],[0,1],[0,2],[1,2]],  // ᚠ-like
    [[0,0],[0,1],[1,0],[1,2],[0,2]],  // ᚢ-like
  ];
  ctx.fillStyle = '#c9a020';
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 20; i++) {
    const rx = Math.floor(rand() * (cols - 4) + 2) * T;
    const ry = (horizonY + Math.floor(rand() * (rows - horizonY - 2))) * T;
    const rune = RUNES[Math.floor(rand() * RUNES.length)];
    for (const [dx, dy] of rune) {
      ctx.fillRect(rx + dx * 3, ry + dy * 3, 2, 2);
    }
  }
  ctx.globalAlpha = 1;
}

export function UniverseBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      drawAsgard(ctx, canvas.width, canvas.height);
    };

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
