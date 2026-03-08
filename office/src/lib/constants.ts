export const SVG_WIDTH = 1280;
export const SVG_HEIGHT = 900;

// Norse realm → room mapping (keyed by tmux session name)
export const ROOM_COLORS: Record<string, { accent: string; floor: string; wall: string; label: string }> = {
  "loki-oracle": { accent: "#c9a227", floor: "#1e1a08", wall: "#141002", label: "Asgard" },
  "midgard":     { accent: "#4caf50", floor: "#0e1a0e", wall: "#081408", label: "Midgard" },
  "jotunheim":   { accent: "#42a5f5", floor: "#0e1428", wall: "#080e1e", label: "Jotunheim" },
  "niflheim":    { accent: "#90caf9", floor: "#0a1020", wall: "#060a14", label: "Niflheim" },
  "muspelheim":  { accent: "#ef5350", floor: "#28100e", wall: "#200808", label: "Muspelheim" },
  "vanaheim":    { accent: "#26c6da", floor: "#0e1e20", wall: "#081618", label: "Vanaheim" },
  "alfheim":     { accent: "#ce93d8", floor: "#1a0e28", wall: "#120820", label: "Alfheim" },
};

const FALLBACK_ROOMS = [
  { accent: "#ab47bc", floor: "#1e1428", wall: "#160e1e", label: "Realm" },
  { accent: "#ec407a", floor: "#281420", wall: "#200e18", label: "Realm" },
];

export function roomStyle(sessionName: string) {
  if (ROOM_COLORS[sessionName]) return ROOM_COLORS[sessionName];
  let h = 0;
  for (let i = 0; i < sessionName.length; i++) h = ((h << 5) - h + sessionName.charCodeAt(i)) | 0;
  return FALLBACK_ROOMS[Math.abs(h) % FALLBACK_ROOMS.length];
}

// Norse agent identity — name → { color, emoji }
export const NORSE_AGENTS: Record<string, { color: string; emoji: string }> = {
  "odin":     { color: "#f5c518", emoji: "👁️" },
  "thor":     { color: "#4fc3f7", emoji: "⚡" },
  "loki":     { color: "#a855f7", emoji: "🔮" },
  "heimdall": { color: "#14b8a6", emoji: "🌈" },
  "tyr":      { color: "#ef4444", emoji: "⚔️" },
  "ymir":     { color: "#94a3b8", emoji: "🏔️" },
  "huginn":   { color: "#3b82f6", emoji: "🦅" },
  "muninn":   { color: "#6366f1", emoji: "🪶" },
};

// Fallback palette for non-Norse agents
export const AGENT_COLORS = [
  "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffa07a",
  "#dda0dd", "#98d8c8", "#f7dc6f", "#bb8fce", "#85c1e9",
  "#f0b27a", "#82e0aa",
];

export function agentColor(name: string): string {
  const key = name.toLowerCase().replace(/-oracle$/, "");
  if (NORSE_AGENTS[key]) return NORSE_AGENTS[key].color;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return AGENT_COLORS[Math.abs(h) % AGENT_COLORS.length];
}

export function agentEmoji(name: string): string {
  const key = name.toLowerCase().replace(/-oracle$/, "");
  return NORSE_AGENTS[key]?.emoji ?? "";
}

// Desk grid within each room
export const DESK = {
  cols: 4,
  cellW: 200,
  cellH: 160,
  offsetX: 30,
  offsetY: 60,
} as const;

// Room layout grid
export const ROOM_GRID = {
  cols: 3,
  roomW: 400,
  roomH: 400,
  gapX: 20,
  gapY: 20,
  startX: 20,
  startY: 70,
} as const;

export const AVATAR = {
  radius: 20,
  strokeWidth: 3,
  nameLabelMaxChars: 12,
} as const;
