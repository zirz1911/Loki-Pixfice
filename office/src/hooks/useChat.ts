import { useState, useEffect, useCallback, useRef } from "react";
import type { AgentState } from "../lib/types";

export interface ChatMsg {
  id: string;
  role: "lokkij" | "assistant" | "tool";
  agentTarget: string;
  agentName: string;
  text: string;
  ts: number;
  pending?: boolean;
}

interface ConvTurn {
  role: "user" | "assistant" | "tool";
  text: string;
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function agentNameFromTarget(target: string): string {
  // target is like "loki-oracle:0" — name comes from agents list lookup
  return target;
}

export function useChat(agents: AgentState[], send: (msg: object) => void) {
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [parsedMsgs, setParsedMsgs] = useState<ChatMsg[]>([]);
  const [pendingMsgs, setPendingMsgs] = useState<ChatMsg[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-select first agent if none selected
  useEffect(() => {
    if (!selectedTarget && agents.length > 0) {
      setSelectedTarget(agents[0].target);
    }
  }, [agents, selectedTarget]);

  // Resolve agent name from target
  function resolveAgentName(target: string): string {
    const agent = agents.find((a) => a.target === target);
    return agent?.name ?? target;
  }

  // Poll /api/conversation for the selected target
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (!selectedTarget) return;

    async function fetchConversation() {
      try {
        const res = await fetch(
          `/api/conversation?target=${encodeURIComponent(selectedTarget)}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as { turns: ConvTurn[] };
        const agentName = resolveAgentName(selectedTarget);
        const msgs: ChatMsg[] = data.turns.map((turn, i) => ({
          id: `conv-${selectedTarget}-${i}-${turn.text.slice(0, 8)}`,
          role: turn.role === "user" ? "lokkij" : turn.role,
          agentTarget: selectedTarget,
          agentName,
          text: turn.text,
          ts: Date.now() - (data.turns.length - i) * 1000,
        }));
        setParsedMsgs(msgs);
      } catch {
        // Silently ignore fetch errors
      }
    }

    fetchConversation();
    pollRef.current = setInterval(fetchConversation, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTarget]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || !selectedTarget) return;

      // 1. Send via WebSocket
      send({ type: "send", target: selectedTarget, text });

      // 2. Add pending message immediately
      const agentName = resolveAgentName(selectedTarget);
      const pending: ChatMsg = {
        id: uid(),
        role: "lokkij",
        agentTarget: selectedTarget,
        agentName,
        text: text.trim(),
        ts: Date.now(),
        pending: true,
      };
      setPendingMsgs((prev) => [...prev, pending]);

      // 3. Remove pending after 8s (tmux should catch up by then)
      setTimeout(() => {
        setPendingMsgs((prev) => prev.filter((m) => m.id !== pending.id));
      }, 8000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedTarget, send]
  );

  // Merge: parsed turns + pending ones that haven't been echoed yet
  const parsedTexts = new Set(
    parsedMsgs.filter((m) => m.role === "lokkij").map((m) => m.text)
  );
  const activePending = pendingMsgs.filter(
    (m) => !parsedTexts.has(m.text)
  );

  const messages: ChatMsg[] = [...parsedMsgs, ...activePending].sort(
    (a, b) => a.ts - b.ts
  );

  return { messages, sendMessage, selectedTarget, setSelectedTarget };
}
