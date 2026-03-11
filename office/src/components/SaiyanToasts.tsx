import { memo, useCallback, useEffect, useRef, useState } from "react";
import { agentColor } from "../lib/constants";
import type { AgentState } from "../lib/types";

export type SaiyanCard = {
  agent: AgentState;
  roomLabel: string;
  accent: string;
  order: number;
};

interface SaiyanToastsProps {
  saiyanTargets: Set<string>;
  agents: AgentState[];
  agentPositions: Map<string, { accent: string; label: string }>;
  onToastClick?: (card: SaiyanCard) => void;
}

export const SaiyanToasts = memo(function SaiyanToasts({
  saiyanTargets,
  agents,
  agentPositions,
  onToastClick,
}: SaiyanToastsProps) {
  const [saiyanCards, setSaiyanCards] = useState<Map<string, SaiyanCard>>(new Map());
  const saiyanQueue = useRef<string[]>([]);
  const saiyanStaggerTimer = useRef<ReturnType<typeof setTimeout>>();
  const saiyanDismissTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saiyanOrderCounter = useRef(0);
  const prevSaiyanTargets = useRef<Set<string>>(new Set());

  // Process queue: show next card from queue (max 3 visible, 2s stagger)
  const processQueue = useCallback(() => {
    clearTimeout(saiyanStaggerTimer.current);
    const showNext = () => {
      if (saiyanQueue.current.length === 0) return;
      const target = saiyanQueue.current.shift()!;
      const agent = agents.find(a => a.target === target);
      const pos = agentPositions.get(target);
      if (!agent || !pos) { showNext(); return; }

      saiyanOrderCounter.current++;
      const card: SaiyanCard = {
        agent,
        roomLabel: pos.label,
        accent: pos.accent,
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
      if (wasEmpty) processQueue();
    }

    // Remove cards for agents that lost Saiyan
    const removed = [...prev].filter(t => !saiyanTargets.has(t));
    if (removed.length > 0) {
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

  if (saiyanCards.size === 0) return null;

  return (
    <div style={{
      position: "absolute",
      top: 12, right: 12,
      zIndex: 50,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      maxWidth: 220,
      pointerEvents: "none",
    }}>
      {[...saiyanCards.entries()].map(([target, card]) => {
        const color = agentColor(card.agent.name);
        const displayName = card.agent.name.replace(/-oracle$/, "").replace(/-/g, " ");
        return (
          <div
            key={`toast-${target}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 12px",
              borderRadius: 12,
              pointerEvents: "auto",
              cursor: "pointer",
              background: "rgba(8,8,16,0.92)",
              border: `1px solid ${card.accent}40`,
              backdropFilter: "blur(12px)",
              boxShadow: `0 0 20px ${card.accent}15`,
              animation: "fadeSlideIn 0.25s ease-out",
            }}
            onClick={() => {
              onToastClick?.(card);
              setSaiyanCards(prev => { const next = new Map(prev); next.delete(target); return next; });
            }}
          >
            {/* Mini chibi face */}
            <svg width={36} height={36} viewBox="-24 -34 48 68">
              <circle cx={0} cy={-10} r={20} fill={color} stroke="#fff" strokeWidth={2} />
              {/* Eyes */}
              <circle cx={-7} cy={-12} r={4.5} fill="#fff" />
              <circle cx={7} cy={-12} r={4.5} fill="#fff" />
              <circle cx={-6} cy={-12} r={2.5} fill="#222" />
              <circle cx={8} cy={-12} r={2.5} fill="#222" />
              <circle cx={-5} cy={-13.5} r={1} fill="#fff" />
              <circle cx={9} cy={-13.5} r={1} fill="#fff" />
              {/* Mouth */}
              <path d="M -3 -5 Q 0 -2 3 -5" fill="none" stroke="#333" strokeWidth={1.2} strokeLinecap="round" />
              {/* Hair */}
              <ellipse cx={-4} cy={-28} rx={6} ry={4} fill={color} stroke="#fff" strokeWidth={1} />
              <ellipse cx={4} cy={-29} rx={5} ry={3} fill={color} stroke="#fff" strokeWidth={1} />
              {/* Status dot */}
              <circle cx={16} cy={-28} r={4} fill="#fdd835" stroke="#1a1a1a" strokeWidth={1.5} />
            </svg>
            {/* Name + status */}
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{
                fontSize: 11,
                fontWeight: "bold",
                color: card.accent,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "'Press Start 2P', monospace",
              }}>
                {displayName}
              </span>
              <span style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.5)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "monospace",
              }}>
                {card.agent.preview?.slice(0, 30) || card.agent.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
});
