import { memo, useEffect } from "react";

interface ShortcutOverlayProps {
  onClose: () => void;
}

const SHORTCUTS = [
  ["Navigation", [
    ["?", "Show shortcuts"],
    ["Scroll", "Zoom in/out"],
    ["Shift+Drag", "Pan view"],
  ]],
  ["Pinned Card", [
    ["Click agent", "Pin card + input"],
    ["Enter", "Send command"],
    ["Ctrl+Enter", "Fullscreen"],
    ["Esc", "Close card"],
    ["Click outside", "Close card"],
  ]],
  ["Fullscreen Terminal", [
    ["Enter", "Send command"],
    ["Esc", "Close"],
    ["Alt+←/→", "Prev/next agent"],
    ["Alt+1-9", "Jump to agent"],
    ["Ctrl+C", "Clear input"],
  ]],
] as const;

export const ShortcutOverlay = memo(function ShortcutOverlay({ onClose }: ShortcutOverlayProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.80)",
        fontFamily: "'Press Start 2P', monospace",
        imageRendering: "pixelated",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#07080f",
          border: "2px solid #5a8cff",
          boxShadow: "0 0 20px #5a8cff30, 6px 6px 0 #000",
          padding: "24px 28px",
          maxWidth: 480,
          width: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          borderBottom: "2px solid #1e2840",
          paddingBottom: 14, marginBottom: 18,
        }}>
          <div style={{ width: 8, height: 8, background: "#5a8cff", animation: "pixel-glow 2s infinite" }} />
          <span style={{ fontSize: 10, color: "#5a8cff", letterSpacing: 3 }}>KEYBOARD SHORTCUTS</span>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {SHORTCUTS.map(([section, keys]) => (
            <div key={section as string}>
              <div style={{
                fontSize: 8, color: "#22d3ee", letterSpacing: 2,
                marginBottom: 10, paddingBottom: 4,
                borderBottom: "1px solid #22d3ee20",
              }}>
                {(section as string).toUpperCase()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {(keys as readonly (readonly [string, string])[]).map(([key, desc]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      minWidth: 100, textAlign: "right",
                      background: "#1a2030",
                      border: "1px solid #2a3a50",
                      padding: "3px 8px",
                      fontSize: 9,
                      color: "#e0e8ff",
                      fontFamily: "monospace",
                      flexShrink: 0,
                    }}>
                      {key}
                    </div>
                    <span style={{ fontSize: 8, color: "#5a6a80" }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 22, borderTop: "1px solid #1e2840", paddingTop: 14, display: "flex", justifyContent: "center" }}>
          <button
            onClick={onClose}
            style={{
              background: "#0e1828",
              border: "2px solid #2a3a50",
              color: "#5a8cff",
              fontSize: 9,
              fontFamily: "'Press Start 2P', monospace",
              padding: "8px 20px",
              cursor: "pointer",
              letterSpacing: 1,
            }}
          >
            ESC · CLOSE
          </button>
        </div>
      </div>
    </div>
  );
});
