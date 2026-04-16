// Paji-Exo palette — terminal green on near-black (Matrix/CRT aesthetic)
export const C = {
  bg:       "#0d0d0d",
  panel:    "#111111",
  card:     "#151515",
  border:   "#1e1e1e",
  border2:  "#252525",
  green:    "oklch(0.85 0.20 142)",
  greenDim: "oklch(0.55 0.15 142)",
  text:     "#cccccc",
  textMid:  "#666666",
  textDim:  "#333333",
  ready:    "#22d3ee",
  font:     "'Silkscreen', 'SF Mono', monospace",
  fontMono: "'SF Mono', 'Fira Code', monospace",
} as const;

export function statusColor(status: string): string {
  if (status === "busy") return C.green;
  if (status === "ready") return C.ready;
  return C.textMid;
}
