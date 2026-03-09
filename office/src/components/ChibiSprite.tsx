/**
 * ChibiSprite — renders one frame from char_N.png sprite sheet
 *
 * Sheet layout: 112×96px, 7 cols × 4 rows, 16×24 px per frame
 *   Col 0-3: walk  Col 4-5: typing  Col 6: idle
 *   Row 0: DOWN (front)  Row 1: UP (back)  Row 2: LEFT  Row 3: RIGHT
 *
 * Displayed at 2× scale → 32×48 px per frame
 */
import { useEffect, useState } from "react";

const FW = 16, FH = 24, SCALE = 2;
export const SPRITE_W = FW * SCALE;  // 32
export const SPRITE_H = FH * SCALE;  // 48

const CHAR_MAP: Record<string, number> = {
  odin: 0, thor: 1, loki: 2, heimdall: 3, tyr: 4, ymir: 5,
};

export function agentCharIdx(name: string): number {
  const key = name.toLowerCase().replace(/-oracle$/, "").replace(/[^a-z]/g, "");
  const match = Object.keys(CHAR_MAP).find((k) => key.startsWith(k));
  return match !== undefined ? CHAR_MAP[match] : 0;
}

interface ChibiSpriteProps {
  name: string;
  status: string;   // "busy" | "ready" | "idle"
  row?: number;     // sprite row: 0=DOWN(front), 1=UP, 2=LEFT, 3=RIGHT
}

export function ChibiSprite({ name, status, row = 0 }: ChibiSpriteProps) {
  const idx = agentCharIdx(name);
  const base = import.meta.env.BASE_URL;
  const src = `${base}assets/characters/char_${idx}.png`;

  // Typing animation: toggle col 4 ↔ 5 at 400ms for busy agents
  const [typingFrame, setTypingFrame] = useState(0);
  useEffect(() => {
    if (status !== "busy") return;
    const t = setInterval(() => setTypingFrame((f) => 1 - f), 400);
    return () => clearInterval(t);
  }, [status]);

  const col =
    status === "busy"  ? 4 + typingFrame :
    status === "ready" ? 0 :
    6; // idle

  const sheetW = 7 * FW * SCALE; // 224
  const sheetH = 4 * FH * SCALE; // 192

  return (
    <div style={{
      width: SPRITE_W, height: SPRITE_H,
      overflow: "hidden",
      imageRendering: "pixelated",
      flexShrink: 0,
    }}>
      <img
        src={src}
        style={{
          width: sheetW,
          height: sheetH,
          marginLeft: -(col * SPRITE_W),
          marginTop: -(row * SPRITE_H),
          imageRendering: "pixelated",
          display: "block",
        }}
        alt=""
        draggable={false}
      />
    </div>
  );
}
