import { useState, useRef, useEffect } from "react";
import type { AgentState, PaneStatus } from "../lib/types";

export interface ActivityMsg {
  id: string;
  agentName: string;
  agentTarget: string;
  session: string;
  text: string;
  status: PaneStatus;
  ts: number;
}

const MAX_MSGS = 80;

export function useMessages(agents: AgentState[]) {
  const [msgs, setMsgs] = useState<ActivityMsg[]>([]);
  const prevRef = useRef<Record<string, { preview: string; status: PaneStatus }>>({});

  useEffect(() => {
    if (agents.length === 0) return;
    const newMsgs: ActivityMsg[] = [];

    for (const ag of agents) {
      const prev = prevRef.current[ag.target];

      if (!prev) {
        // First sight — just track, no message
        prevRef.current[ag.target] = { preview: ag.preview, status: ag.status };
        continue;
      }

      // Preview changed while busy → new activity
      if (ag.status === "busy" && ag.preview && ag.preview !== prev.preview) {
        const text = ag.preview.trim().replace(/\s+/g, " ").slice(0, 120);
        if (text.length > 3) {
          newMsgs.push({
            id: `${ag.target}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            agentName: ag.name,
            agentTarget: ag.target,
            session: ag.session,
            text,
            status: "busy",
            ts: Date.now(),
          });
        }
      }

      // Transition busy → ready = task done
      if (ag.status === "ready" && prev.status === "busy") {
        newMsgs.push({
          id: `${ag.target}-done-${Date.now()}`,
          agentName: ag.name,
          agentTarget: ag.target,
          session: ag.session,
          text: "✓ Task completed",
          status: "ready",
          ts: Date.now(),
        });
      }

      // Transition idle → busy = started working
      if (ag.status === "busy" && prev.status !== "busy") {
        newMsgs.push({
          id: `${ag.target}-start-${Date.now()}`,
          agentName: ag.name,
          agentTarget: ag.target,
          session: ag.session,
          text: "▶ Started working...",
          status: "busy",
          ts: Date.now(),
        });
      }

      prevRef.current[ag.target] = { preview: ag.preview, status: ag.status };
    }

    if (newMsgs.length > 0) {
      setMsgs((prev) => [...prev, ...newMsgs].slice(-MAX_MSGS));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents]);

  return { msgs };
}
