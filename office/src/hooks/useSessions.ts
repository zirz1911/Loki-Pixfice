import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { Session, AgentState, PaneStatus, AgentEvent } from "../lib/types";
import { stripAnsi } from "../lib/ansi";
import { activeOracles, type FeedEvent, type FeedEventType } from "../lib/feed";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [captureData, setCaptureData] = useState<Record<string, { preview: string; status: PaneStatus }>>({});
  const pollTimer = useRef<ReturnType<typeof setTimeout>>();
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const hashHistory = useRef<Record<string, { prev: number; curr: number; unchangedCount: number; lastStatus: PaneStatus }>>({});
  const [eventLog, setEventLog] = useState<AgentEvent[]>([]);
  const MAX_EVENTS = 200;

  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const MAX_FEED = 100;

  const addEvent = useCallback((target: string, type: AgentEvent["type"], detail: string) => {
    setEventLog(prev => {
      const next = [...prev, { time: Date.now(), target, type, detail }];
      return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next;
    });
  }, []);

  const agentsRef = useRef<AgentState[]>([]);

  const handleMessage = useCallback((data: any) => {
    if (data.type === "sessions") {
      setSessions(data.sessions);
    } else if (data.type === "feed") {
      const feedEvent = data.event as FeedEvent;
      setFeedEvents(prev => {
        const next = [...prev, feedEvent];
        return next.length > MAX_FEED ? next.slice(-MAX_FEED) : next;
      });
    } else if (data.type === "feed-history") {
      setFeedEvents((data.events as FeedEvent[]).slice(-MAX_FEED));
    } else if (data.type === "previews") {
      const previews: Record<string, string> = data.data;
      setCaptureData((prev) => {
        let next = prev;
        for (const [target, raw] of Object.entries(previews)) {
          const text = stripAnsi(raw);
          const lines = text.split("\n").filter((l: string) => l.trim());
          const preview = (lines[lines.length - 1] || "").slice(0, 120);
          const existing = next[target];
          if (!existing || existing.preview !== preview) {
            if (next === prev) next = { ...prev };
            next[target] = { preview, status: existing?.status || "idle" };
          }
        }
        return next;
      });
    }
  }, []);

  useEffect(() => {
    async function poll() {
      const targets: string[] = [];
      sessionsRef.current.forEach((s) =>
        s.windows.forEach((w) => targets.push(`${s.name}:${w.index}`))
      );
      for (let i = 0; i < targets.length; i += 4) {
        const batch = targets.slice(i, i + 4);
        await Promise.allSettled(
          batch.map(async (target) => {
            try {
              const res = await fetch(`/api/capture?target=${encodeURIComponent(target)}`);
              const data = await res.json();
              const raw = data.content || "";
              const text = stripAnsi(raw);

              const allLines = text.split("\n");
              const cutoff = Math.max(1, Math.floor(allLines.length * 0.85));
              const topPart = allLines.slice(0, cutoff).join("\n");
              const contentHash = hash(topPart);

              const entry = hashHistory.current[target] || { prev: 0, curr: 0, unchangedCount: 0, lastStatus: "idle" as PaneStatus };
              entry.prev = entry.curr;
              entry.curr = contentHash;

              if (entry.prev !== 0 && entry.prev !== entry.curr) {
                entry.unchangedCount = 0;
              } else {
                entry.unchangedCount++;
              }

              const lines = text.split("\n").filter((l: string) => l.trim());
              const bottom5 = lines.slice(-5).join("\n");
              const bottom15 = lines.slice(-15).join("\n");
              const bottom2 = lines.slice(-2).join("\n");
              const isGemini = /\/model\s+(Auto|Gemini|Flash|Pro)/i.test(bottom5);
              const hasPrompt = isGemini
                ? /\/model\s+(Auto|Gemini|Flash|Pro)/i.test(bottom2)
                : bottom2.includes("\u276f");
              const hasBusySign = /[∴✢⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏◐◑◒◓⣾⣽⣻⢿⡿⣟⣯⣷]/.test(bottom15)
                || /● \w+\(/.test(bottom15)
                || /\b(Read|Edit|Write|Bash|Grep|Glob|Agent)\b/.test(bottom15)
                || /Spelunking|thinking|Running/.test(bottom15)
                || (isGemini && entry.unchangedCount === 0 && !/\/model\s+(Auto|Gemini|Flash|Pro)/i.test(bottom2));

              let status: PaneStatus;
              if (hasBusySign) {
                status = "busy";
              } else if (hasPrompt) {
                status = "ready";
              } else if (entry.prev === 0) {
                status = "idle";
              } else if (entry.unchangedCount <= 2) {
                status = "busy";
              } else if (entry.unchangedCount <= 6) {
                status = "ready";
              } else {
                status = "idle";
              }

              const preview = (lines[lines.length - 1] || "").slice(0, 120);
              const prevStatus = entry.lastStatus;
              entry.lastStatus = status;
              hashHistory.current[target] = entry;

              if (prevStatus !== status) {
                addEvent(target, "status", `${prevStatus} → ${status}`);
              }

              setCaptureData((p) => {
                const existing = p[target];
                if (existing && existing.preview === preview && existing.status === status) return p;
                return { ...p, [target]: { preview, status } };
              });
            } catch {}
          })
        );
      }
      pollTimer.current = setTimeout(poll, 2000);
    }
    poll();
    return () => clearTimeout(pollTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const agents: AgentState[] = useMemo(() => {
    const list = sessions.flatMap((s) =>
      s.windows.map((w) => {
        const key = `${s.name}:${w.index}`;
        const cd = captureData[key];
        return {
          target: key,
          name: w.name,
          session: s.name,
          windowIndex: w.index,
          active: w.active,
          preview: cd?.preview || "",
          status: cd?.status || "idle",
        };
      })
    );
    agentsRef.current = list;
    return list;
  }, [sessions, captureData]);

  const feedActive = useMemo(() => activeOracles(feedEvents, 5 * 60_000), [feedEvents]);

  const agentFeedLog = useMemo((): Map<string, FeedEvent[]> => {
    const map = new Map<string, FeedEvent[]>();
    for (let i = feedEvents.length - 1; i >= 0; i--) {
      const e = feedEvents[i];
      const arr = map.get(e.oracle) || [];
      if (arr.length < 5) { arr.push(e); map.set(e.oracle, arr); }
    }
    return map;
  }, [feedEvents]);

  return { sessions, agents, eventLog, addEvent, handleMessage, feedEvents, feedActive, agentFeedLog };
}
