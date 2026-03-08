import { useEffect, useRef } from "react";

const TILE = 8;

function seedRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0xffffffff;
  };
}

function drawWorld(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cols = Math.ceil(w / TILE) + 1;
  const rows = Math.ceil(h / TILE) + 1;
  const rand = seedRand(0xdeadbeef);

  // ── Base grass ───────────────────────────────────────────────────────────
  const GRASS = ['#5a8a3c', '#4a7a2c', '#6a9a4c', '#5a8a3c', '#5a8a3c'];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = GRASS[Math.floor(rand() * GRASS.length)];
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }

  // ── Horizontal dirt path (top ~18%) ──────────────────────────────────────
  const pathY = Math.floor(rows * 0.18);
  for (let c = 0; c < cols; c++) {
    for (let r = pathY; r < pathY + 3; r++) {
      ctx.fillStyle = rand() < 0.35 ? '#b89858' : '#c8a96e';
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
    // Edge shadows
    ctx.fillStyle = '#a08040';
    ctx.fillRect(c * TILE, pathY * TILE, TILE, 2);
    ctx.fillRect(c * TILE, (pathY + 3) * TILE - 2, TILE, 2);
  }

  // ── Stone path (vertical, left ~12%) ─────────────────────────────────────
  const stoneX = Math.floor(cols * 0.12);
  for (let r = 0; r < rows; r++) {
    for (let c = stoneX; c < stoneX + 2; c++) {
      ctx.fillStyle = rand() < 0.3 ? '#7a6a5a' : '#8a7a6a';
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }

  // ── Flowers ───────────────────────────────────────────────────────────────
  const FLOWER_COLORS = ['#f5c518', '#e84040', '#ff80b0', '#80b0ff', '#ff9040'];
  for (let i = 0; i < 120; i++) {
    const fc = Math.floor(rand() * cols);
    const fr = Math.floor(rand() * rows);
    if (fr >= pathY - 1 && fr <= pathY + 3) continue;
    if (fc >= stoneX - 1 && fc <= stoneX + 2) continue;
    const color = FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)];
    // Stem
    ctx.fillStyle = '#3a6a20';
    ctx.fillRect(fc * TILE + 3, fr * TILE + 4, 2, 4);
    // Petals
    ctx.fillStyle = color;
    ctx.fillRect(fc * TILE + 1, fr * TILE + 1, 6, 4);
    ctx.fillRect(fc * TILE + 2, fr * TILE, 4, 6);
    // Center
    ctx.fillStyle = '#f0d040';
    ctx.fillRect(fc * TILE + 3, fr * TILE + 2, 2, 2);
  }

  // ── Trees ────────────────────────────────────────────────────────────────
  for (let i = 0; i < 28; i++) {
    const tx = Math.floor(rand() * (cols - 4) + 2) * TILE;
    const ty = Math.floor(rand() * (rows - 6) + 3) * TILE;
    if (ty / TILE >= pathY - 3 && ty / TILE <= pathY + 6) continue;
    drawTree(ctx, tx, ty);
  }

  // ── Water puddles ─────────────────────────────────────────────────────────
  for (let i = 0; i < 6; i++) {
    const wx = Math.floor(rand() * (cols - 6) + 3) * TILE;
    const wy = Math.floor(rand() * (rows - 6) + 3) * TILE;
    if (wy / TILE >= pathY - 2 && wy / TILE <= pathY + 5) continue;
    drawWater(ctx, wx, wy);
  }

  // ── Rocks ─────────────────────────────────────────────────────────────────
  for (let i = 0; i < 15; i++) {
    const rx = Math.floor(rand() * (cols - 2)) * TILE;
    const ry = Math.floor(rand() * (rows - 2)) * TILE;
    ctx.fillStyle = '#9a8a7a';
    ctx.fillRect(rx, ry, TILE * 2, TILE);
    ctx.fillRect(rx + 2, ry - TILE, TILE * 2 - 4, TILE);
    ctx.fillStyle = '#7a6a5a';
    ctx.fillRect(rx, ry + TILE - 2, TILE * 2, 2);
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Trunk
  ctx.fillStyle = '#6b4320';
  ctx.fillRect(x + TILE / 2 - 2, y + TILE, 4, TILE * 2);
  // Shadow trunk
  ctx.fillStyle = '#4a2f18';
  ctx.fillRect(x + TILE / 2, y + TILE, 2, TILE * 2);
  // Leaves (bottom layer)
  ctx.fillStyle = '#2a6010';
  ctx.fillRect(x - TILE, y - TILE, TILE * 3, TILE * 2);
  // Leaves (mid)
  ctx.fillStyle = '#3a7020';
  ctx.fillRect(x - TILE / 2, y - TILE * 2, TILE * 2, TILE * 2);
  // Leaves (top)
  ctx.fillStyle = '#4a8030';
  ctx.fillRect(x, y - TILE * 3, TILE, TILE * 2);
  // Highlight
  ctx.fillStyle = '#5a9840';
  ctx.fillRect(x + 2, y - TILE * 3 + 2, 4, 4);
}

function drawWater(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const shape = [
    [1,0],[2,0],[3,0],
    [0,1],[1,1],[2,1],[3,1],[4,1],
    [0,2],[1,2],[2,2],[3,2],[4,2],
    [1,3],[2,3],[3,3],
  ];
  for (const [dx, dy] of shape) {
    ctx.fillStyle = '#3880b8';
    ctx.fillRect(x + dx * TILE, y + dy * TILE, TILE, TILE);
    // Highlight top-left of each tile
    ctx.fillStyle = '#60a8e0';
    ctx.fillRect(x + dx * TILE, y + dy * TILE, 3, 3);
  }
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
      drawWorld(ctx, canvas.width, canvas.height);
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
