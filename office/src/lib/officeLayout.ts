// ── Furniture types ────────────────────────────────────────────────────────────
export type FurnitureType = 'desk' | 'plant' | 'lamp' | 'bookshelf';

export const ITEM_W: Record<FurnitureType, number> = {
  desk: 56, plant: 14, lamp: 10, bookshelf: 32,
};
export const ITEM_H: Record<FurnitureType, number> = {
  desk: 46, plant: 18, lamp: 28, bookshelf: 22,   // desk: DESK_H(28)+CHAIR_H(14)+gap(4)
};

export interface FurnitureItem {
  id: string;
  type: FurnitureType;
  x: number;
  y: number;
  agentTarget?: string;   // desk: which agent uses this desk
}

export interface SectionSave { items: FurnitureItem[] }
export type SavedLayout = Record<string, SectionSave>;  // keyed by session name

// ── Persistence ───────────────────────────────────────────────────────────────
const KEY = 'loki-pixfice-layout-v3';  // bumped: desk size 56×28, SCALE=3

export function loadLayout(): SavedLayout {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? {}; } catch { return {}; }
}
export function saveLayout(l: SavedLayout): void {
  try { localStorage.setItem(KEY, JSON.stringify(l)); } catch {}
}

// ── Default layout for a new session ─────────────────────────────────────────
export function generateDefaultSection(
  sessionName: string,
  agentTargets: string[],
  sx: number, sw: number,
  headerH: number, wallT: number,
): SectionSave {
  const n = agentTargets.length;
  const cols = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(Math.max(1, n)))));
  const GAP = 24;
  const gridW = cols * ITEM_W.desk + (cols - 1) * GAP;
  const startX = sx + Math.floor((sw - gridW) / 2);
  const startY = headerH + wallT + 70;

  const items: FurnitureItem[] = agentTargets.map((target, i) => ({
    id: `desk-${target}`,
    type: 'desk' as const,
    x: startX + (i % cols) * (ITEM_W.desk + GAP),
    y: startY + Math.floor(i / cols) * 110,
    agentTarget: target,
  }));

  // Corner plants
  const innerX = sx + wallT + 6;
  items.push({ id: `plant-${sessionName}-L`, type: 'plant', x: innerX, y: headerH + wallT + 6 });
  items.push({ id: `plant-${sessionName}-R`, type: 'plant', x: sx + sw - wallT - ITEM_W.plant - 6, y: headerH + wallT + 6 });

  return { items };
}
