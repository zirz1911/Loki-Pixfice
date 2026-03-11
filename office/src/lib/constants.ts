export const SVG_WIDTH = 1280;
export const SVG_HEIGHT = 900;

// Norse realm rooms — keyed by tmux session name — Stardew warm palette
export const ROOM_COLORS: Record<string, { accent: string; floor: string; wall: string; dark: string; label: string }> = {
  "loki-oracle": { accent: '#f5c518', floor: '#c89820', wall: '#8b6b20', dark: '#6b4b10', label: 'Asgard' },
  "midgard":     { accent: '#6abf50', floor: '#8ab870', wall: '#5a8040', dark: '#3a6020', label: 'Midgard' },
  "jotunheim":   { accent: '#80b0e0', floor: '#607898', wall: '#405878', dark: '#203858', label: 'Jotunheim' },
  "niflheim":    { accent: '#a0c0d8', floor: '#405068', wall: '#283848', dark: '#182030', label: 'Niflheim' },
  "muspelheim":  { accent: '#ff7040', floor: '#c04020', wall: '#802010', dark: '#600808', label: 'Muspelheim' },
  "vanaheim":    { accent: '#40c8b0', floor: '#208068', wall: '#106050', dark: '#083838', label: 'Vanaheim' },
  "alfheim":     { accent: '#c060e0', floor: '#805898', wall: '#503868', dark: '#302048', label: 'Alfheim' },
};

const FALLBACK_ROOMS = [
  { accent: '#ab47bc', floor: '#604878', wall: '#402858', dark: '#201038', label: 'Realm' },
  { accent: '#ec407a', floor: '#783050', wall: '#502038', dark: '#301020', label: 'Realm' },
];

export function roomStyle(sessionName: string) {
  if (ROOM_COLORS[sessionName]) return ROOM_COLORS[sessionName];
  let h = 0;
  for (let i = 0; i < sessionName.length; i++) h = ((h << 5) - h + sessionName.charCodeAt(i)) | 0;
  const base = FALLBACK_ROOMS[Math.abs(h) % FALLBACK_ROOMS.length];
  return base;
}

// Norse agent identity
export const NORSE_AGENTS: Record<string, { color: string; emoji: string }> = {
  "odin":     { color: '#f5c518', emoji: '👁️' },
  "thor":     { color: '#4fc3f7', emoji: '⚡' },
  "loki":     { color: '#a855f7', emoji: '🔮' },
  "heimdall": { color: '#14b8a6', emoji: '🌈' },
  "tyr":      { color: '#ef4444', emoji: '⚔️' },
  "ymir":     { color: '#94a3b8', emoji: '🏔️' },
  "huginn":   { color: '#3b82f6', emoji: '🦅' },
  "muninn":   { color: '#6366f1', emoji: '🪶' },
};

export const AGENT_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffa07a',
  '#dda0dd', '#98d8c8', '#f7dc6f', '#bb8fce', '#85c1e9',
];

export function agentColor(name: string): string {
  const key = name.toLowerCase().replace(/-oracle$/, '');
  if (NORSE_AGENTS[key]) return NORSE_AGENTS[key].color;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return AGENT_COLORS[Math.abs(h) % AGENT_COLORS.length];
}

export function agentEmoji(name: string): string {
  const key = name.toLowerCase().replace(/-oracle$/, '');
  return NORSE_AGENTS[key]?.emoji ?? '';
}

export const PREVIEW_CARD = { width: 540, maxHeight: 760 } as const;

export const DESK = { cols: 4, cellW: 200, cellH: 160, offsetX: 30, offsetY: 60 } as const;
export const ROOM_GRID = { cols: 3, roomW: 400, roomH: 400, gapX: 20, gapY: 20, startX: 20, startY: 70 } as const;
export const AVATAR = { radius: 20, strokeWidth: 3, nameLabelMaxChars: 12 } as const;
