import { memo, useMemo, useState, useCallback, useRef, useEffect } from "react";
import { HoverPreviewCard } from "./HoverPreviewCard";
import { Joystick } from "./Joystick";
import { roomStyle, NORSE_AGENTS, agentColor } from "../lib/constants";
import type { AgentState, Session, PaneStatus, AgentEvent } from "../lib/types";

// ── Pixel sprite data (matches AgentAvatar.tsx) ───────────────────────────────
const PS = 5; // pixel size in SVG units

interface Pal { H:string; S:string; E:string; P:string; M:string; W:string; C:string; A:string; L:string; B:string }
const PALS: Record<string, Pal> = {
  default:  { H:'#6b3a2a',S:'#fde2c8',E:'#ffffff',P:'#2c1b0e',M:'#5a2020',W:'#c8a070',C:'#4a7a2c',A:'#6aaa4c',L:'#4060a0',B:'#2a3070' },
  odin:     { H:'#c8a830',S:'#d4956b',E:'#ffffff',P:'#1a1008',M:'#603020',W:'#e0c080',C:'#1e1040',A:'#f5c518',L:'#2c1848',B:'#180830' },
  thor:     { H:'#d4b050',S:'#fde2c8',E:'#ffffff',P:'#1a1040',M:'#503020',W:'#fae8c8',C:'#2050a8',A:'#4fc3f7',L:'#183080',B:'#102060' },
  loki:     { H:'#1a0a30',S:'#c88060',E:'#ffffff',P:'#3a1060',M:'#501840',W:'#d0a0b0',C:'#5a2080',A:'#c060e0',L:'#3a1060',B:'#200840' },
  heimdall: { H:'#d4c080',S:'#fde2c8',E:'#ffffff',P:'#103830',M:'#305040',W:'#e8f0e8',C:'#1a6858',A:'#40d0b0',L:'#0e3838',B:'#082828' },
  tyr:      { H:'#802020',S:'#fde2c8',E:'#ffffff',P:'#401010',M:'#601010',W:'#f0d0d0',C:'#802020',A:'#ff6060',L:'#601010',B:'#400808' },
  ymir:     { H:'#a0c0d8',S:'#c0d8f0',E:'#90b8d0',P:'#304858',M:'#4a6878',W:'#d0e8f8',C:'#4878a0',A:'#90d0f8',L:'#305070',B:'#203040' },
};
const SPRS: Record<string, string[]> = {
  odin:     ['0AAAAA00','0HHHHHH0','0SSSSSS0','0SEPPSS0','0SSSSSS0','0SSMSSS0','0CCCCCC0','CCAACCCC','CCAACCCC','0CCCCCC0','0LL00LL0','0BB00BB0'],
  thor:     ['0HHHHHH0','0HHHHHH0','0SSSSSS0','0SEPPSS0','0SSSSSS0','0SSMSSS0','0CCCCCC0','CAAACCCC','CCAACCCC','0CCCCCC0','0LL00LL0','0BB00BB0'],
  loki:     ['0HHHHHH0','HHHHHHH0','H0SSSSS0','0SEPPSS0','0SSSSSS0','0SWMSSS0','0CCCCCC0','CCAACCCC','CCAAC000','0CCCCCC0','0LL00LL0','0BB00BB0'],
  heimdall: ['0HAAHH00','0HHHHHH0','0SSSSSS0','0SEEPSS0','0SEEPSS0','0SSMSSS0','0CCCCCC0','CAACCACC','CCAACCCC','0CCCCCC0','0LL00LL0','0BB00BB0'],
  tyr:      ['0HHHHHH0','0HHHHHH0','0SSSSSS0','0SEPPSS0','0SSSSSS0','0SSMSSS0','0CCCCCC0','CCAACCCC','ACCCCC00','0CCCCCC0','0LL00LL0','0BB00BB0'],
  ymir:     ['HHHHHHH0','HHHHHHH0','HSSSSSS0','HSEPPSS0','HSSSSSS0','HSSMWSS0','HCCCCCCH','CAAACCCA','CCAACCCA','HCCCCCCH','HLL00LLH','HBB00BBH'],
  default:  ['00HHHH00','0HHHHHH0','0SSSSSS0','0SEPPSS0','0SSSSSS0','0SSMSSS0','0CCCCCC0','CCAACCCC','CCCCCCCC','0CCCCCC0','0LL00LL0','0BB00BB0'],
};

function buildSvgPixels(rows: string[], pal: Pal) {
  const cmap: Record<string, string> = { H:pal.H,S:pal.S,E:pal.E,P:pal.P,M:pal.M,W:pal.W,C:pal.C,A:pal.A,L:pal.L,B:pal.B };
  const pixels: { x: number; y: number; color: string }[] = [];
  rows.forEach((row, ry) => {
    for (let cx = 0; cx < row.length; cx++) {
      const ch = row[cx];
      if (ch === '0') continue;
      const color = cmap[ch];
      if (color) pixels.push({ x: cx * PS, y: ry * PS, color });
    }
  });
  return pixels;
}

// ── SVG Pixel Sprite — renders inside <svg> context ──────────────────────────
function SvgAgentCircle({
  name, status, saiyan, scale, onClick, onMouseEnter, onMouseLeave,
}: {
  name: string; status: PaneStatus; accent: string; saiyan?: boolean; scale: number;
  onClick?: () => void; onMouseEnter?: () => void; onMouseLeave?: () => void;
}) {
  const key = name.toLowerCase().replace(/-oracle$/, "");
  const pk = Object.keys(PALS).find(k => k !== "default" && key.startsWith(k)) ?? "default";
  const pal = PALS[pk];
  const rows = SPRS[pk] ?? SPRS.default;
  const pixels = buildSvgPixels(rows, pal);
  const dotColor = status === "busy" ? "#fdd835" : status === "ready" ? "#4caf50" : "#445566";
  const W = 8 * PS;   // 40 SVG units
  const H = rows.length * PS; // 60 SVG units
  const ox = -W / 2;
  const oy = -H / 2;

  return (
    <g
      transform={`scale(${scale})`}
      style={{ cursor: "pointer" }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Saiyan power ring */}
      {saiyan && (
        <ellipse rx={W / 2 + 16} ry={6} fill="none" stroke="#fdd835" strokeWidth={1.5} opacity={0.5}
          style={{ animation: "saiyan-ring 1.5s ease-out infinite" }} />
      )}
      {/* Status glow */}
      {status !== "idle" && (
        <rect x={ox - 5} y={oy - 3} width={W + 10} height={H + 6}
          fill={dotColor} opacity={0.10} />
      )}
      {/* Pixel sprite */}
      <g transform={`translate(${ox}, ${oy})`} style={{ shapeRendering: "crispEdges" }}>
        {pixels.map(({ x, y, color }, i) => (
          <rect key={i} x={x} y={y} width={PS} height={PS} fill={color} />
        ))}
      </g>
      {/* Status dot (top-right) */}
      <rect
        x={W / 2 - PS + 2} y={oy - PS * 2}
        width={PS * 2} height={PS * 2}
        fill={dotColor}
        style={status === "busy" ? { animation: "agent-pulse 0.5s ease-in-out infinite" } : {}}
      />
    </g>
  );
}

interface MissionControlProps {
  sessions: Session[];
  agents: AgentState[];
  saiyanTargets: Set<string>;
  connected: boolean;
  send: (msg: object) => void;
  onSelectAgent: (agent: AgentState) => void;
  eventLog?: AgentEvent[];
  addEvent?: (target: string, type: AgentEvent["type"], detail: string) => void;
}

export const MissionControl = memo(function MissionControl({
  sessions,
  agents,
  saiyanTargets,
  connected,
  send,
  onSelectAgent,
  eventLog,
  addEvent,
}: MissionControlProps) {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{ agent: AgentState; room: { label: string; accent: string }; pos: { x: number; y: number } } | null>(null);
  const [pinnedPreview, setPinnedPreview] = useState<{ agent: AgentState; room: { label: string; accent: string }; pos: { x: number; y: number }; svgX: number; svgY: number } | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Auto-popup cards for Saiyan agents — max 3 visible, 2s stagger, FIFO
  type SaiyanCard = { agent: AgentState; room: { label: string; accent: string }; svgX: number; svgY: number; order: number };
  const [saiyanCards, setSaiyanCards] = useState<Map<string, SaiyanCard>>(new Map());
  const saiyanQueue = useRef<string[]>([]); // pending targets waiting to appear
  const saiyanStaggerTimer = useRef<ReturnType<typeof setTimeout>>();
  const saiyanDismissTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saiyanOrderCounter = useRef(0);
  const prevSaiyanTargets = useRef<Set<string>>(new Set());

  const [zoom, setZoom] = useState(1.1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const hasPanned = useRef(false); // true if mouse moved enough to count as a drag
  const touchRef = useRef<{ x: number; y: number; panX: number; panY: number; dist: number | null }>({ x: 0, y: 0, panX: 0, panY: 0, dist: null });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Convert SVG coordinates to screen-relative position
  const svgToScreen = useCallback((svgX: number, svgY: number): { x: number; y: number } => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = svgX;
    pt.y = svgY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const screenPt = pt.matrixTransform(ctm);
    const containerRect = container.getBoundingClientRect();
    return {
      x: screenPt.x - containerRect.left,
      y: screenPt.y - containerRect.top,
    };
  }, []);

  // side: "right" (default/hover), "left", or "auto" (prefer right, fallback left)
  const calcCardPos = useCallback((svgX: number, svgY: number, side: "left" | "right" | "auto" = "auto") => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return { x: 0, y: 0 };
    const screen = svgToScreen(svgX, svgY);
    const cardW = 420;
    const cardH = 500;
    const rightX = screen.x + 60;
    const leftX = screen.x - cardW - 40;
    let x: number;
    if (side === "right") {
      x = rightX + cardW > containerRect.width ? leftX : rightX;
    } else if (side === "left") {
      x = leftX < 0 ? rightX : leftX;
    } else {
      x = rightX + cardW > containerRect.width ? leftX : rightX;
    }
    const y = Math.max(10, Math.min(screen.y - 290, containerRect.height - cardH - 20));
    return { x, y };
  }, [svgToScreen]);

  // Show preview card on hover — anchored to agent's SVG position
  const showPreview = useCallback((agent: AgentState, room: { label: string; accent: string }, svgX: number, svgY: number) => {
    clearTimeout(hoverTimeout.current);
    const pos = calcCardPos(svgX, svgY);
    setHoverPreview({ agent, room, pos });
  }, [calcCardPos]);

  const hidePreview = useCallback(() => {
    hoverTimeout.current = setTimeout(() => setHoverPreview(null), 300);
  }, []);

  const keepPreview = useCallback(() => {
    clearTimeout(hoverTimeout.current);
  }, []);

  const busyCount = agents.filter((a) => a.status === "busy").length;
  const readyCount = agents.filter((a) => a.status === "ready").length;
  const idleCount = agents.filter((a) => a.status === "idle").length;

  // Mouse wheel zoom (zoom toward cursor position)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      setZoom((z) => Math.max(0.3, Math.min(4, z * factor)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Mouse drag to pan — left-click on background, any button works
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      e.preventDefault();
      setIsDragging(true);
      hasPanned.current = false;
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasPanned.current = true;
    }
    setPan({ x: panStart.current.panX + dx / zoom, y: panStart.current.panY + dy / zoom });
  }, [isDragging, zoom]);

  const onMouseUp = useCallback(() => setIsDragging(false), []);

  // Touch pan (1 finger) + pinch zoom (2 fingers)
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      hasPanned.current = false;
      touchRef.current = {
        x: e.touches[0].clientX, y: e.touches[0].clientY,
        panX: pan.x, panY: pan.y, dist: null,
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      touchRef.current = { ...touchRef.current, dist: Math.hypot(dx, dy) };
    }
  }, [pan]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchRef.current.x;
      const dy = e.touches[0].clientY - touchRef.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasPanned.current = true;
      setPan({ x: touchRef.current.panX + dx / zoom, y: touchRef.current.panY + dy / zoom });
    } else if (e.touches.length === 2 && touchRef.current.dist !== null) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      const factor = dist / touchRef.current.dist;
      touchRef.current.dist = dist;
      setZoom((z) => Math.max(0.3, Math.min(4, z * factor)));
    }
  }, [zoom]);

  const resetView = useCallback(() => { setZoom(1.1); setPan({ x: 0, y: 0 }); }, []);

  const onJoystickPan = useCallback((dx: number, dy: number) => {
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  // Group agents by session
  const sessionAgents = useMemo(() => {
    const map = new Map<string, AgentState[]>();
    for (const a of agents) {
      const arr = map.get(a.session) || [];
      arr.push(a);
      map.set(a.session, arr);
    }
    return map;
  }, [agents]);

  // Layout: arrange sessions in a hex-ish grid
  // Each session is a cluster of agents
  const layout = useMemo(() => {
    const sessionList = sessions.map((s) => ({
      session: s,
      agents: sessionAgents.get(s.name) || [],
      style: roomStyle(s.name),
    }));

    // Calculate positions in a radial layout — fill the viewport
    const cx = 600, cy = 500;
    const radius = Math.min(320, 160 + sessionList.length * 22);

    return sessionList.map((s, i) => {
      const angle = (i / sessionList.length) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      return { ...s, x, y };
    });
  }, [sessions, sessionAgents]);

  // Click agent → pin preview card (skip if we dragged)
  const onAgentClick = useCallback(
    (agent: AgentState, svgX: number, svgY: number, room: { label: string; accent: string }) => {
      if (hasPanned.current) return; // was a drag, not a click
      const pos = calcCardPos(svgX, svgY);
      setPinnedPreview({ agent, room, pos, svgX, svgY });
      setHoverPreview(null);
      send({ type: "subscribe", target: agent.target });
    },
    [calcCardPos, send]
  );

  // Fullscreen → close pin first, then open modal (so focus transfers cleanly)
  const onPinnedFullscreen = useCallback(() => {
    if (pinnedPreview) {
      const agent = pinnedPreview.agent;
      setPinnedPreview(null);
      setTimeout(() => onSelectAgent(agent), 150);
    }
  }, [pinnedPreview, onSelectAgent]);

  const onPinnedClose = useCallback(() => {
    setPinnedPreview(null);
  }, []);

  const pinnedRef = useRef<HTMLDivElement>(null);

  // Click outside pinned card to close
  useEffect(() => {
    if (!pinnedPreview) return;
    const handler = (e: MouseEvent) => {
      if (pinnedRef.current && !pinnedRef.current.contains(e.target as Node)) {
        setPinnedPreview(null);
      }
    };
    // Delay to avoid the same click that pinned it from closing it
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
  }, [pinnedPreview]);

  // Build lookup: agent target -> { svgX, svgY, room style }
  const agentPositions = useMemo(() => {
    const map = new Map<string, { svgX: number; svgY: number; style: ReturnType<typeof roomStyle> }>();
    for (const s of layout) {
      const count = s.agents.length;
      s.agents.forEach((agent, ai) => {
        const angle = (ai / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
        const r = count === 1 ? 0 : Math.min(Math.max(70, 35 + count * 18) - 35, 35 + count * 6);
        map.set(agent.target, {
          svgX: s.x + Math.cos(angle) * r,
          svgY: s.y + Math.sin(angle) * r,
          style: s.style,
        });
      });
    }
    return map;
  }, [layout]);

  // Process queue: show next card from queue (max 3 visible, 2s stagger)
  const processQueue = useCallback(() => {
    clearTimeout(saiyanStaggerTimer.current);
    const showNext = () => {
      if (saiyanQueue.current.length === 0) return;
      const target = saiyanQueue.current.shift()!;
      const agent = agents.find(a => a.target === target);
      const pos = agentPositions.get(target);
      if (!agent || !pos) { showNext(); return; } // skip invalid, try next

      saiyanOrderCounter.current++;
      const card: SaiyanCard = {
        agent,
        room: { label: pos.style.label, accent: pos.style.accent },
        svgX: pos.svgX,
        svgY: pos.svgY,
        order: saiyanOrderCounter.current,
      };

      setSaiyanCards(prev => {
        const next = new Map(prev);
        // If already at 3, remove the oldest (lowest order)
        if (next.size >= 3) {
          let oldestKey = "";
          let oldestOrder = Infinity;
          for (const [k, v] of next) {
            if (v.order < oldestOrder) { oldestOrder = v.order; oldestKey = k; }
          }
          if (oldestKey) {
            next.delete(oldestKey);
            clearTimeout(saiyanDismissTimers.current[oldestKey]);
          }
        }
        next.set(target, card);
        return next;
      });

      // Auto-dismiss after 10s
      clearTimeout(saiyanDismissTimers.current[target]);
      saiyanDismissTimers.current[target] = setTimeout(() => {
        setSaiyanCards(prev => {
          const next = new Map(prev);
          next.delete(target);
          return next;
        });
      }, 10000);

      // Schedule next card with 2s stagger
      if (saiyanQueue.current.length > 0) {
        saiyanStaggerTimer.current = setTimeout(showNext, 2000);
      }
    };
    showNext();
  }, [agents, agentPositions]);

  // Watch saiyanTargets — queue new ones, remove departed
  useEffect(() => {
    const prev = prevSaiyanTargets.current;
    const newTargets = [...saiyanTargets].filter(t => !prev.has(t));

    if (newTargets.length > 0) {
      const wasEmpty = saiyanQueue.current.length === 0;
      saiyanQueue.current.push(...newTargets);
      // Start processing if queue was empty (otherwise already running)
      if (wasEmpty) processQueue();
    }

    // Remove cards for agents that lost Saiyan
    const removed = [...prev].filter(t => !saiyanTargets.has(t));
    if (removed.length > 0) {
      // Also remove from queue
      saiyanQueue.current = saiyanQueue.current.filter(t => !removed.includes(t));
      setSaiyanCards(prev => {
        const next = new Map(prev);
        for (const t of removed) {
          next.delete(t);
          clearTimeout(saiyanDismissTimers.current[t]);
        }
        return next;
      });
    }

    prevSaiyanTargets.current = new Set(saiyanTargets);
  }, [saiyanTargets, processQueue]);

  // Compute viewBox based on zoom and pan
  const vbW = 1200 / zoom;
  const vbH = 1000 / zoom;
  const vbX = (1200 - vbW) / 2 - pan.x;
  const vbY = (1000 - vbH) / 2 - pan.y;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ background: "transparent", height: "100%", cursor: isDragging ? "grabbing" : "grab", userSelect: "none" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={() => { setIsDragging(false); }}

    >
      {/* SVG Mission Control */}
      <svg
        ref={svgRef}
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="mc-bg-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a1a3e" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#020208" stopOpacity={0} />
          </radialGradient>
          <filter id="mc-glow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
          </filter>
        </defs>

        {/* Background glow */}
        <circle cx={600} cy={500} r={500} fill="url(#mc-bg-glow)" />

        {/* Grid lines */}
        {Array.from({ length: 13 }, (_, i) => (
          <line key={`vl-${i}`} x1={i * 100} y1={0} x2={i * 100} y2={1000}
            stroke="#ffffff" strokeWidth={0.3} opacity={0.03} />
        ))}
        {Array.from({ length: 11 }, (_, i) => (
          <line key={`hl-${i}`} x1={0} y1={i * 100} x2={1200} y2={i * 100}
            stroke="#ffffff" strokeWidth={0.3} opacity={0.03} />
        ))}

        {/* Orbital rings */}
        <circle cx={600} cy={500} r={150} fill="none" stroke="#26c6da" strokeWidth={0.5} opacity={0.08}
          strokeDasharray="4 8" />
        <circle cx={600} cy={500} r={300} fill="none" stroke="#7e57c2" strokeWidth={0.5} opacity={0.06}
          strokeDasharray="6 12" />
        <circle cx={600} cy={500} r={450} fill="none" stroke="#ffa726" strokeWidth={0.5} opacity={0.04}
          strokeDasharray="8 16" />

        {/* Center hub */}
        <circle cx={600} cy={500} r={45} fill="none" stroke="#26c6da" strokeWidth={1} opacity={0.15} />
        <circle cx={600} cy={500} r={7} fill="#26c6da" opacity={0.4} />
        <text x={600} y={468} textAnchor="middle" fill="#26c6da" fontSize={12} opacity={0.5}
          fontFamily="'SF Mono', monospace" letterSpacing={5}>MISSION CONTROL</text>

        {/* Connection lines from hub to sessions */}
        {layout.map((s) => (
          <line key={`line-${s.session.name}`}
            x1={600} y1={500} x2={s.x} y2={s.y}
            stroke={s.style.accent} strokeWidth={0.5} opacity={0.08}
            strokeDasharray="2 6"
          />
        ))}

        {/* Session clusters */}
        {layout.map((s) => {
          const agentCount = s.agents.length;
          const clusterRadius = Math.max(70, 35 + agentCount * 18);
          const hasBusy = s.agents.some((a) => a.status === "busy");

          return (
            <g key={s.session.name}>
              {/* Session zone */}
              <circle cx={s.x} cy={s.y} r={clusterRadius}
                fill={`${s.style.floor}cc`}
                stroke={s.style.accent}
                strokeWidth={hasBusy ? 1.5 : 0.5}
                opacity={hasBusy ? 0.8 : 0.4}
                style={hasBusy ? { animation: "room-pulse 2s ease-in-out infinite" } : {}}
              />

              {/* Session label */}
              <text
                x={s.x} y={s.y - clusterRadius - 12}
                textAnchor="middle"
                fill={s.style.accent}
                fontSize={13}
                fontWeight="bold"
                fontFamily="'SF Mono', monospace"
                letterSpacing={3}
                opacity={0.8}
              >
                {s.style.label.toUpperCase()}
              </text>

              {/* Agent count badge */}
              <text
                x={s.x} y={s.y + clusterRadius + 18}
                textAnchor="middle"
                fill={s.style.accent}
                fontSize={10}
                fontFamily="'SF Mono', monospace"
                opacity={0.6}
              >
                {agentCount} agent{agentCount !== 1 ? "s" : ""}
              </text>

              {/* Agents within cluster */}
              {s.agents.map((agent, ai) => {
                const agentAngle = (ai / Math.max(1, agentCount)) * Math.PI * 2 - Math.PI / 2;
                const agentRadius = agentCount === 1 ? 0 : Math.min(clusterRadius - 35, 35 + agentCount * 6);
                const ax = s.x + Math.cos(agentAngle) * agentRadius;
                const ay = s.y + Math.sin(agentAngle) * agentRadius;
                const isHovered = hoveredAgent === agent.target;
                const scale = isHovered ? 1.4 : 0.65;

                return (
                  <g key={agent.target} transform={`translate(${ax}, ${ay})`}
                    style={{ zIndex: isHovered ? 999 : 0 }}
                  >
                    {/* Hover backdrop glow */}
                    {isHovered && (
                      <circle cx={0} cy={-5} r={55} fill={s.style.accent} opacity={0.08} />
                    )}
                    <SvgAgentCircle
                      name={agent.name}
                      status={agent.status}
                      accent={s.style.accent}
                      saiyan={saiyanTargets.has(agent.target)}
                      scale={scale}
                      onClick={() => onAgentClick(agent, ax, ay, { label: s.style.label, accent: s.style.accent })}
                      onMouseEnter={() => {
                        setHoveredAgent(agent.target);
                        showPreview(agent, { label: s.style.label, accent: s.style.accent }, ax, ay);
                      }}
                      onMouseLeave={() => {
                        setHoveredAgent(null);
                        hidePreview();
                      }}
                    />
                    {/* Agent name (below) */}
                    <text
                      y={28}
                      textAnchor="middle"
                      fill={isHovered ? s.style.accent : "#ffffff"}
                      fontSize={isHovered ? 11 : 9}
                      fontFamily="'SF Mono', monospace"
                      opacity={isHovered ? 1 : 0.7}
                      style={{ transition: "all 0.2s", cursor: "pointer" }}
                      onClick={() => onAgentClick(agent, ax, ay, { label: s.style.label, accent: s.style.accent })}
                    >
                      {agent.name.replace(/-oracle$/, "").replace(/-/g, " ")}
                    </text>

                    {/* Hover tooltip — hidden when preview card is showing */}
                    {isHovered && !hoverPreview && (
                      <g>
                        <rect x={-100} y={-65} width={200} height={34} rx={8}
                          fill="rgba(8,8,16,0.95)" stroke={s.style.accent} strokeWidth={0.8} opacity={0.95} />
                        {agent.preview && (
                          <text x={0} y={-48} textAnchor="middle" fill="#e0e0e0" fontSize={9}
                            fontFamily="'SF Mono', monospace">
                            {agent.preview.slice(0, 35)}
                          </text>
                        )}
                        <text x={0} y={-38} textAnchor="middle" fill={s.style.accent} fontSize={8}
                          fontFamily="'SF Mono', monospace" opacity={0.7}>
                          {agent.status} · {agent.target}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Controls — bottom right */}
      <div style={{
        position: "absolute", bottom: 16, right: 20,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        fontFamily: "'Press Start 2P', monospace",
      }}>
        <Joystick onPan={onJoystickPan} />
        <div style={{ width: 24, height: 2, background: "#1e2840", margin: "2px 0" }} />
        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.05))}
          style={{ width: 32, height: 32, background: "#0a0b16", border: "2px solid #2a3a50", color: "#5a8cff", fontSize: 16, cursor: "pointer", fontWeight: "bold" }}
        >+</button>
        <button
          onClick={resetView}
          style={{ width: 32, height: 24, background: "#0a0b16", border: "2px solid #2a3a50", color: "#445566", fontSize: 7, cursor: "pointer", fontFamily: "'Press Start 2P', monospace" }}
        >{Math.round(zoom * 100)}%</button>
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.05))}
          style={{ width: 32, height: 32, background: "#0a0b16", border: "2px solid #2a3a50", color: "#5a8cff", fontSize: 16, cursor: "pointer", fontWeight: "bold" }}
        >−</button>
      </div>

      {/* Saiyan auto-popup cards — prefer right, left only at edge */}
      {[...saiyanCards.entries()].map(([target, card]) => {
        const pos = calcCardPos(card.svgX, card.svgY);
        // Don't show if hover preview is for the same agent
        if (hoverPreview?.agent.target === target) return null;
        return (
          <div
            key={`saiyan-${target}`}
            className="absolute z-20 pointer-events-auto"
            style={{
              left: pos.x,
              top: pos.y,
              maxWidth: 420,
              animation: "fadeSlideIn 0.2s ease-out",
            }}
            onClick={() => {
              // Dismiss on click
              setSaiyanCards(prev => {
                const next = new Map(prev);
                next.delete(target);
                return next;
              });
            }}
          >
            {/* Saiyan order badge */}
            <div
              className="absolute -top-3 -left-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10 border-2"
              style={{
                background: card.room.accent,
                borderColor: "#0a0a0f",
                color: "#0a0a0f",
                boxShadow: `0 0 12px ${card.room.accent}`,
              }}
            >
              {card.order}
            </div>
            <HoverPreviewCard
              agent={card.agent}
              roomLabel={card.room.label}
              accent={card.room.accent}
            />
          </div>
        );
      })}

      {/* Hover Preview Card — manual hover (hidden when pinned) */}
      {hoverPreview && !pinnedPreview && (
        <div
          className="absolute z-30 pointer-events-auto"
          style={{
            left: hoverPreview.pos.x,
            top: hoverPreview.pos.y,
            maxWidth: 420,
            animation: "fadeSlideIn 0.15s ease-out",
          }}
          onMouseEnter={keepPreview}
          onMouseLeave={hidePreview}
        >
          <HoverPreviewCard
            agent={hoverPreview.agent}
            roomLabel={hoverPreview.room.label}
            accent={hoverPreview.room.accent}
          />
        </div>
      )}

      {/* Pinned Preview Card — centered on screen */}
      {pinnedPreview && (
        <div
          ref={pinnedRef}
          className="absolute z-40 pointer-events-auto"
          style={{
            left: "50%",
            top: 20,
            transform: "translateX(-50%)",
            maxWidth: 420,
            animation: "fadeSlideIn 0.15s ease-out",
          }}
        >
          <HoverPreviewCard
            agent={pinnedPreview.agent}
            roomLabel={pinnedPreview.room.label}
            accent={pinnedPreview.room.accent}
            pinned
            send={send}
            onFullscreen={onPinnedFullscreen}
            onClose={onPinnedClose}
            eventLog={eventLog}
            addEvent={addEvent}
          />
        </div>
      )}

      {/* Bottom stats */}
      <div style={{
        position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 16,
        background: "#0a0b16",
        border: "2px solid #1e2840",
        boxShadow: "4px 4px 0 #000",
        padding: "8px 20px",
        fontFamily: "'Press Start 2P', monospace",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, background: "#fdd835", animation: "agent-pulse 1s infinite" }} />
          <span style={{ fontSize: 14, color: "#fdd835", fontWeight: "bold" }}>{busyCount}</span>
          <span style={{ fontSize: 8, color: "#445566" }}>BUSY</span>
        </div>
        <div style={{ width: 2, height: 24, background: "#1e2840" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, background: "#4caf50" }} />
          <span style={{ fontSize: 14, color: "#4caf50", fontWeight: "bold" }}>{readyCount}</span>
          <span style={{ fontSize: 8, color: "#445566" }}>READY</span>
        </div>
        <div style={{ width: 2, height: 24, background: "#1e2840" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, background: "#445566" }} />
          <span style={{ fontSize: 14, color: "#445566", fontWeight: "bold" }}>{idleCount}</span>
          <span style={{ fontSize: 8, color: "#2a3a50" }}>IDLE</span>
        </div>
        <div style={{ width: 2, height: 24, background: "#1e2840" }} />
        <div style={{ width: 80, height: 8, background: "#1a2030" }}>
          <div style={{
            height: "100%",
            width: `${Math.min(100, (busyCount / Math.max(1, agents.length)) * 100)}%`,
            background: busyCount > 5 ? "#ff6040" : busyCount > 2 ? "#fdd835" : "#4caf50",
            transition: "width 0.7s ease",
          }} />
        </div>
      </div>
    </div>
  );
});
