import { memo } from "react";
import type { AgentState, Session } from "../lib/types";

// ── Room config per tmux session ─────────────────────────────────────────────
interface RoomStyle {
  label: string;
  dept: string;
  accent: string;
  headerBg: string;
  floor1: string;
  floor2: string;
  wallColor: string;
}

const ROOM_STYLES: Record<string, RoomStyle> = {
  "loki-oracle": {
    label: "ASGARD", dept: "Planning",
    accent: "#5a8cff", headerBg: "#0d1520",
    floor1: "#141c2c", floor2: "#101828",
    wallColor: "#1e2a44",
  },
  // Virtual category rooms — split by agent type (see Loki-Oracle README)
  "loki-oracle:local": {
    label: "JOTUNHEIM", dept: "Local (Qwen)",
    accent: "#4fc3f7", headerBg: "#001828",
    floor1: "#001c30", floor2: "#001424",
    wallColor: "#002840",
  },
  "loki-oracle:cloud": {
    label: "ASGARD", dept: "Cloud Only",
    accent: "#f5c518", headerBg: "#120e00",
    floor1: "#1c1800", floor2: "#161200",
    wallColor: "#2a2200",
  },
  "loki-oracle:gemini": {
    label: "VALHALLA", dept: "Gemini",
    accent: "#00e5ff", headerBg: "#001820",
    floor1: "#001c28", floor2: "#001420",
    wallColor: "#002a38",
  },
  "loki-oracle:terminal": {
    label: "MIDGARD", dept: "Terminals",
    accent: "#69f0ae", headerBg: "#001408",
    floor1: "#001c0c", floor2: "#001408",
    wallColor: "#002a14",
  },
  midgard: {
    label: "MIDGARD", dept: "Development",
    accent: "#4ac85a", headerBg: "#0a180f",
    floor1: "#101c12", floor2: "#0c1610",
    wallColor: "#1a2a1c",
  },
  jotunheim: {
    label: "JOTUNHEIM", dept: "Design",
    accent: "#c060e0", headerBg: "#18101e",
    floor1: "#1c1228", floor2: "#160e20",
    wallColor: "#2a1838",
  },
  niflheim: {
    label: "NIFLHEIM", dept: "QA/QC",
    accent: "#40d0c0", headerBg: "#081820",
    floor1: "#0c1e28", floor2: "#081820",
    wallColor: "#103040",
  },
  muspelheim: {
    label: "MUSPELHEIM", dept: "Security",
    accent: "#ff6040", headerBg: "#1e0a08",
    floor1: "#281210", floor2: "#1e0a08",
    wallColor: "#3a1410",
  },
  vanaheim: {
    label: "VANAHEIM", dept: "Operations",
    accent: "#a0d060", headerBg: "#101a08",
    floor1: "#141e0c", floor2: "#101808",
    wallColor: "#1e2c10",
  },
  alfheim: {
    label: "ALFHEIM", dept: "DevOps",
    accent: "#ffa040", headerBg: "#1a1008",
    floor1: "#201808", floor2: "#181206",
    wallColor: "#2e200a",
  },
};

const FALLBACK_STYLES: RoomStyle[] = [
  { label: "REALM", dept: "General", accent: "#8090c0", headerBg: "#101020", floor1: "#141426", floor2: "#101020", wallColor: "#1c1c34" },
  { label: "REALM", dept: "General", accent: "#a080c0", headerBg: "#14101e", floor1: "#181428", floor2: "#141020", wallColor: "#20182e" },
];

export function getRoomStyle(sessionName: string, idx = 0): RoomStyle {
  if (ROOM_STYLES[sessionName]) return ROOM_STYLES[sessionName];
  const n = sessionName.toLowerCase();
  // Category virtual rooms (e.g. "loki-oracle:local")
  if (n.endsWith(":local"))    return ROOM_STYLES["loki-oracle:local"];
  if (n.endsWith(":cloud"))    return ROOM_STYLES["loki-oracle:cloud"];
  if (n.endsWith(":gemini"))   return ROOM_STYLES["loki-oracle:gemini"];
  if (n.endsWith(":terminal")) return ROOM_STYLES["loki-oracle:terminal"];
  // Session name fallbacks
  if (n.includes("oracle") || n.includes("odin")) return ROOM_STYLES["loki-oracle"];
  if (n.includes("mid")) return ROOM_STYLES.midgard;
  if (n.includes("jotun")) return ROOM_STYLES.jotunheim;
  if (n.includes("nifl")) return ROOM_STYLES.niflheim;
  if (n.includes("musp")) return ROOM_STYLES.muspelheim;
  if (n.includes("van")) return ROOM_STYLES.vanaheim;
  if (n.includes("alf")) return ROOM_STYLES.alfheim;
  return FALLBACK_STYLES[idx % FALLBACK_STYLES.length];
}

// Role labels based on agent name
function agentRole(name: string): string {
  const k = name.toLowerCase().replace(/-oracle$/, "");
  const roles: Record<string, string> = {
    odin: "CHIEF", thor: "SR.DEV", loki: "EXPLORER",
    heimdall: "RESEARCH", tyr: "STRATGST", ymir: "BUILDER",
    huginn: "SCOUT", muninn: "MEMORY",
  };
  return roles[k] ?? "AGENT";
}

// ── Pixel desk ────────────────────────────────────────────────────────────────
function PixelDesk({ accent, busy, now }: { accent: string; busy: boolean; now: number }) {
  const glow = 0.3 + Math.sin(now / 400) * 0.2;
  return (
    <div style={{ position: "relative", width: 96, height: 40, imageRendering: "pixelated", flexShrink: 0 }}>
      {/* Back rail */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "#503814" }} />
      {/* Desk surface */}
      <div style={{ position: "absolute", top: 5, left: 0, right: 0, bottom: 3, background: "#7a5820", borderLeft: "2px solid #9a7030", borderRight: "2px solid #503814" }} />
      {/* Highlight */}
      <div style={{ position: "absolute", top: 5, left: 0, right: 0, height: 2, background: "#9a7030" }} />
      {/* Front face */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#503814" }} />

      {/* Monitor */}
      <div style={{ position: "absolute", top: 7, left: 10, width: 28, height: 18, background: "#141e2e", border: "2px solid #2a3a50" }}>
        {busy ? (
          <div style={{ width: "100%", height: "100%", background: `${accent}`, opacity: glow }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#0a1420" }} />
        )}
      </div>

      {/* Papers */}
      <div style={{ position: "absolute", top: 7, right: 14, width: 16, height: 13, background: "#e8e0cc", border: "1px solid #d0c8b0" }} />
      <div style={{ position: "absolute", top: 6, right: 11, width: 16, height: 13, background: "#d8d0b8" }} />

      {/* Keyboard */}
      <div style={{ position: "absolute", top: 28, right: 6, width: 26, height: 7, background: "#1a2030", border: "1px solid #252e40" }} />
    </div>
  );
}

// ── Desk slot (desk + agent) ──────────────────────────────────────────────────
interface DeskSlotProps {
  agent: AgentState;
  style: RoomStyle;
  onSelect: (a: AgentState) => void;
  now: number;
  isMobile?: boolean;
}

function DeskSlot({ agent, style, onSelect, now, isMobile = false }: DeskSlotProps) {
  const busy = agent.status === "busy";
  const ready = agent.status === "ready";
  const dotColor = busy ? "#fdd835" : ready ? "#4caf50" : "#445566";

  return (
    <div className="flex flex-col items-center" style={{ width: isMobile ? "100%" : 104, gap: 4 }}>
      {/* Desk */}
      <PixelDesk accent={style.accent} busy={busy} now={now} />

      {/* Agent dot avatar */}
      <div
        className="cursor-pointer"
        style={{ marginTop: -2, display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 48 }}
        onClick={() => onSelect(agent)}
      >
        <div style={{
          width: 24, height: 24,
          background: dotColor,
          boxShadow: busy ? `0 0 8px ${dotColor}` : "none",
          animation: busy ? "pixel-glow 1s ease-in-out infinite" : "none",
        }} />
      </div>

      {/* Name tag */}
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: isMobile ? 10 : 9,
          color: style.accent,
          textAlign: "center",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          padding: "0 4px",
        }}
      >
        {agent.name.replace(/-oracle$/, "").toUpperCase().slice(0, 10)}
      </div>

      {/* Role + status badge */}
      <div
        style={{
          fontSize: isMobile ? 8 : 7,
          fontFamily: "'Press Start 2P', monospace",
          color: dotColor,
          background: "#08080f",
          padding: "2px 6px",
          border: `1px solid ${dotColor}40`,
          whiteSpace: "nowrap",
          marginTop: 1,
        }}
      >
        {busy ? "● WORK" : ready ? "● RDY" : "○ IDLE"}
      </div>

      {/* Role label */}
      <div style={{ fontSize: isMobile ? 7 : 7, color: `${style.accent}70`, fontFamily: "monospace", marginTop: 1 }}>
        {agentRole(agent.name)}
      </div>
    </div>
  );
}

// ── Empty desk ────────────────────────────────────────────────────────────────
function EmptyDesk({ style, isMobile = false }: { style: RoomStyle; isMobile?: boolean }) {
  return (
    <div className="flex flex-col items-center" style={{ width: isMobile ? "100%" : 104, gap: 3, opacity: 0.35 }}>
      <PixelDesk accent={style.accent} busy={false} now={0} />
      <div style={{ width: 32, height: 48 }} /> {/* empty avatar space */}
      <div style={{ fontSize: 7, color: `${style.accent}50`, fontFamily: "'Press Start 2P', monospace" }}>
        VACANT
      </div>
    </div>
  );
}

// ── Break room section ─────────────────────────────────────────────────────────
function BreakRoom({ agents, style, onSelect }: { agents: AgentState[]; style: RoomStyle; onSelect: (a: AgentState) => void }) {
  if (agents.length === 0) return null;
  return (
    <div
      style={{
        background: `${style.accent}08`,
        border: `1px dashed ${style.accent}30`,
        padding: "6px 8px",
        margin: "6px 8px 0",
      }}
    >
      <div style={{ fontSize: 10, color: `${style.accent}60`, fontFamily: "'Press Start 2P', monospace", marginBottom: 6 }}>
        ☕ BREAK ROOM
      </div>
      <div className="flex flex-wrap gap-2">
        {agents.map((ag) => {
          const dc = ag.status === "busy" ? "#fdd835" : ag.status === "ready" ? "#4caf50" : "#445566";
          return (
            <div key={ag.target} className="flex flex-col items-center cursor-pointer" onClick={() => onSelect(ag)}>
              <div style={{ width: 20, height: 20, background: dc, boxShadow: ag.status === "busy" ? `0 0 6px ${dc}` : "none" }} />
              <div style={{ fontSize: 9, color: `${style.accent}80`, fontFamily: "'Press Start 2P', monospace", marginTop: 2 }}>
                {ag.name.replace(/-oracle$/, "").slice(0, 8).toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main room component ───────────────────────────────────────────────────────
interface DepartmentRoomProps {
  session: Session;
  agents: AgentState[];
  sessionIdx: number;
  onSelectAgent: (a: AgentState) => void;
  isMobile?: boolean;
}

export const DepartmentRoom = memo(function DepartmentRoom({
  session,
  agents,
  sessionIdx,
  onSelectAgent,
  isMobile = false,
}: DepartmentRoomProps) {
  const style = getRoomStyle(session.name, sessionIdx);
  const now = Date.now();

  const busyAgents  = agents.filter((a) => a.status === "busy");
  const readyAgents = agents.filter((a) => a.status === "ready");
  const idleAgents  = agents.filter((a) => a.status === "idle");
  const activeAgents = [...busyAgents, ...readyAgents];
  const hasBusy = busyAgents.length > 0;

  // On mobile: 2 columns, desktop: 3 columns
  const DESK_COLS = isMobile ? 2 : 3;
  const maxDesks = Math.max(activeAgents.length, DESK_COLS);
  const totalSlots = Math.ceil(maxDesks / DESK_COLS) * DESK_COLS;
  const slots = Array.from({ length: Math.min(totalSlots, isMobile ? 6 : 9) }, (_, i) => activeAgents[i] ?? null);

  return (
    <div
      style={{
        background: style.headerBg,
        border: `2px solid ${hasBusy ? style.accent : style.accent + "60"}`,
        boxShadow: hasBusy ? `0 0 12px ${style.accent}30, inset 0 0 20px ${style.accent}08` : `inset 0 0 8px ${style.accent}05`,
        imageRendering: "pixelated",
        overflow: "hidden",
        transition: "box-shadow 0.5s ease",
      }}
    >
      {/* ── Room header ──────────────────────────────────────────────────── */}
      <div
        style={{
          background: style.wallColor,
          borderBottom: `2px solid ${style.accent}`,
          padding: "5px 10px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        {/* Status gem */}
        <div
          style={{
            width: 8, height: 8, background: style.accent, flexShrink: 0,
            boxShadow: hasBusy ? `0 0 6px ${style.accent}` : "none",
            animation: hasBusy ? "pixel-glow 1s ease-in-out infinite" : "none",
          }}
        />

        {/* Room name */}
        <span style={{ fontSize: isMobile ? 13 : 14, color: style.accent, letterSpacing: 2 }}>{style.label}</span>

        {/* Dept badge */}
        <span
          style={{
            fontSize: isMobile ? 9 : 10,
            color: style.headerBg,
            background: style.accent,
            padding: "2px 7px",
            marginLeft: 2,
          }}
        >
          {style.dept.toUpperCase()}
        </span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Busy/total counter */}
        <span
          style={{
            fontSize: isMobile ? 10 : 11,
            color: hasBusy ? "#fdd835" : style.accent,
            animation: hasBusy ? "agent-pulse 1s ease-in-out infinite" : "none",
          }}
        >
          {busyAgents.length}/{agents.length}
        </span>

        {/* Agent count badge */}
        <span
          style={{
            fontSize: isMobile ? 9 : 10,
            color: style.headerBg,
            background: style.accent,
            padding: "2px 6px",
            minWidth: 20,
            textAlign: "center",
          }}
        >
          {agents.length}
        </span>
      </div>

      {/* ── Room floor + desks ────────────────────────────────────────────── */}
      <div
        style={{
          backgroundImage: `
            linear-gradient(${style.accent}06 1px, transparent 1px),
            linear-gradient(90deg, ${style.accent}06 1px, transparent 1px),
            repeating-conic-gradient(${style.floor1} 0% 25%, ${style.floor2} 0% 50%)
          `,
          backgroundSize: "16px 16px, 16px 16px, 16px 16px",
          padding: "12px 10px 8px",
          minHeight: agents.length === 0 ? 80 : undefined,
        }}
      >
        {agents.length === 0 ? (
          <div style={{ textAlign: "center", color: `${style.accent}40`, fontFamily: "'Press Start 2P', monospace", fontSize: 9, paddingTop: 20 }}>
            ᚾ EMPTY ᚾ
          </div>
        ) : (
          <>
            {/* Active agents at desks */}
            {activeAgents.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? `repeat(2, 1fr)`
                    : `repeat(${Math.min(DESK_COLS, slots.length)}, 104px)`,
                  gap: isMobile ? "10px 8px" : "8px 12px",
                  justifyContent: isMobile ? "stretch" : "start",
                }}
              >
                {slots.map((ag, i) =>
                  ag ? (
                    <DeskSlot key={ag.target} agent={ag} style={style} onSelect={onSelectAgent} now={now} isMobile={isMobile} />
                  ) : (
                    <EmptyDesk key={`empty-${i}`} style={style} isMobile={isMobile} />
                  )
                )}
              </div>
            )}

            {/* Idle agents in break room */}
            <BreakRoom agents={idleAgents} style={style} onSelect={onSelectAgent} />
          </>
        )}
      </div>
    </div>
  );
});
