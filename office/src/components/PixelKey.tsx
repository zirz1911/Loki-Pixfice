/** Shared pixel-art key button — used in TerminalModal & HoverPreviewCard */
export function PixelKey({ label, seq, dotColor, sendKey, title, accent, small }: {
  label: string;
  seq: string;
  dotColor: string;
  sendKey: (seq: string) => void;
  title?: string;
  accent?: boolean;
  small?: boolean;
}) {
  const base = accent ? "#1a0e20" : "#0e1220";
  const borderBase = accent ? `${dotColor}60` : `${dotColor}40`;
  const colorBase = accent ? `${dotColor}cc` : `${dotColor}99`;
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); sendKey(seq); }}
      title={title ?? label}
      style={{
        padding: small ? "3px 8px" : "5px 12px",
        background: base,
        border: `1px solid ${borderBase}`,
        color: colorBase,
        fontSize: small ? 8 : 9,
        fontFamily: "'Silkscreen', 'SF Mono', monospace",
        cursor: "pointer",
        boxShadow: "2px 2px 0 #000",
        userSelect: "none",
        transition: "all 0.08s",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = "#1a2240";
        el.style.color = dotColor;
        el.style.borderColor = dotColor;
        el.style.boxShadow = `0 0 6px ${dotColor}60, 2px 2px 0 #000`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = base;
        el.style.color = colorBase;
        el.style.borderColor = borderBase;
        el.style.boxShadow = "2px 2px 0 #000";
      }}
    >
      {label}
    </button>
  );
}

export const NAV_KEYS = [
  { label: "ESC", seq: "\x1b" },
  { label: "TAB ⇥", seq: "\t" },
  { label: "↑", seq: "\x1b[A" },
  { label: "↓", seq: "\x1b[B" },
  { label: "←", seq: "\x1b[D" },
  { label: "→", seq: "\x1b[C" },
  { label: "HOME", seq: "\x1b[H" },
  { label: "END", seq: "\x1b[F" },
  { label: "PGUP", seq: "\x1b[5~" },
  { label: "PGDN", seq: "\x1b[6~" },
];

export const CTRL_KEYS = [
  { label: "^C", seq: "\x03", title: "Ctrl+C — interrupt" },
  { label: "^D", seq: "\x04", title: "Ctrl+D — EOF/exit" },
  { label: "^Z", seq: "\x1a", title: "Ctrl+Z — suspend" },
  { label: "ENTER ↵", seq: "\r" },
];
