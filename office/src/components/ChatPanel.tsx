import { memo, useEffect, useRef, useState, KeyboardEvent } from "react";
import { agentColor } from "../lib/constants";
import type { AgentState } from "../lib/types";
import { useChat, type ChatMsg } from "../hooks/useChat";

interface ChatPanelProps {
  agents: AgentState[];
  connected: boolean;
  send: (msg: object) => void;
  onSelectAgent: (a: AgentState) => void;
  isMobile?: boolean;
  msgs?: unknown; // kept for compat, ignored
}

const STATUS_DOT: Record<string, string> = {
  busy: "#fdd835",
  ready: "#4caf50",
  idle: "#445566",
};

function shortName(name: string): string {
  return name.replace(/-oracle$/, "").replace(/-/g, " ").toUpperCase();
}

// ── Agent selector pills ───────────────────────────────────────────────────────
function AgentPills({
  agents,
  selectedTarget,
  onSelect,
  onOpenTerminal,
}: {
  agents: AgentState[];
  selectedTarget: string;
  onSelect: (target: string) => void;
  onOpenTerminal: (a: AgentState) => void;
}) {
  return (
    <div
      style={{
        borderBottom: "1px solid #1a2030",
        padding: "6px 8px",
        background: "#0a0b14",
        display: "flex",
        gap: 4,
        overflowX: "auto",
        flexShrink: 0,
        scrollbarWidth: "none",
      }}
    >
      {agents.map((agent) => {
        const selected = agent.target === selectedTarget;
        const color = agentColor(agent.name);
        const dot = STATUS_DOT[agent.status] ?? "#445566";
        return (
          <button
            key={agent.target}
            onClick={() => onSelect(agent.target)}
            onDoubleClick={() => onOpenTerminal(agent)}
            title={`${agent.name} — double-click to open terminal`}
            style={{
              flexShrink: 0,
              padding: "4px 8px",
              background: selected ? `${color}18` : "#111828",
              border: `1px solid ${selected ? color + "80" : "#2a3a50"}`,
              color: selected ? color : "#445566",
              fontSize: 8,
              fontFamily: "'Press Start 2P', monospace",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "all 0.1s",
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                background: dot,
                display: "inline-block",
                flexShrink: 0,
                animation: agent.status === "busy" ? "agent-pulse 0.8s infinite" : "none",
              }}
            />
            {shortName(agent.name).slice(0, 8)}
          </button>
        );
      })}
    </div>
  );
}

// ── Tool line (compact, no bubble) ────────────────────────────────────────────
function ToolLine({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: "2px 10px",
        fontSize: 9,
        fontFamily: "monospace",
        color: "#445566",
        lineHeight: 1.5,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {text}
    </div>
  );
}

// ── Assistant bubble (left-aligned) ───────────────────────────────────────────
function AssistantBubble({ msg }: { msg: ChatMsg }) {
  const color = agentColor(msg.agentName);
  return (
    <div style={{ padding: "6px 10px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
      <span
        style={{
          fontSize: 8,
          fontFamily: "'Press Start 2P', monospace",
          color,
          opacity: 0.8,
        }}
      >
        {shortName(msg.agentName).slice(0, 10)}
      </span>
      <div
        style={{
          maxWidth: "85%",
          background: "#0e1020",
          border: `1px solid ${color}40`,
          padding: "6px 9px",
          fontSize: 11,
          fontFamily: "monospace",
          color: "#c0cce0",
          lineHeight: 1.6,
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}
      >
        {msg.text}
      </div>
    </div>
  );
}

// ── Lokkij bubble (right-aligned) ─────────────────────────────────────────────
function LokkijBubble({ msg }: { msg: ChatMsg }) {
  return (
    <div style={{ padding: "6px 10px", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, opacity: msg.pending ? 0.5 : 1 }}>
      <div
        style={{
          maxWidth: "85%",
          background: "#0a1828",
          border: "1px solid #22d3ee60",
          padding: "6px 9px",
          fontSize: 11,
          fontFamily: "monospace",
          color: "#e0f0ff",
          lineHeight: 1.6,
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}
      >
        {msg.text}
      </div>
      <span
        style={{
          fontSize: 8,
          fontFamily: "'Press Start 2P', monospace",
          color: "#22d3ee",
          opacity: 0.7,
        }}
      >
        {msg.pending ? "sending..." : "LOKKIJ"}
      </span>
    </div>
  );
}

// ── Message renderer ───────────────────────────────────────────────────────────
function MessageItem({ msg }: { msg: ChatMsg }) {
  if (msg.role === "tool") return <ToolLine text={msg.text} />;
  if (msg.role === "lokkij") return <LokkijBubble msg={msg} />;
  return <AssistantBubble msg={msg} />;
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export const ChatPanel = memo(function ChatPanel({
  agents,
  connected,
  send,
  onSelectAgent,
  isMobile = false,
}: ChatPanelProps) {
  const { messages, sendMessage, selectedTarget, setSelectedTarget } = useChat(agents, send);
  const [inputText, setInputText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    sendMessage(text);
    setInputText("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleAgentSelect(target: string) {
    setSelectedTarget(target);
  }

  function handleOpenTerminal(agent: AgentState) {
    onSelectAgent(agent);
  }

  const selectedAgent = agents.find((a) => a.target === selectedTarget);

  return (
    <div
      style={{
        width: isMobile ? "100%" : 320,
        flexShrink: 0,
        background: "#07080f",
        borderLeft: isMobile ? "none" : "2px solid #1a2030",
        borderTop: isMobile ? "2px solid #1e2840" : "none",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "2px solid #1a2030",
          padding: "8px 10px",
          background: "#0a0b14",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            background: connected ? "#4caf50" : "#ff6b6b",
            animation: connected ? "pixel-glow 2s infinite" : "agent-pulse 0.8s infinite",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 11, color: "#5a8cff", letterSpacing: 2 }}>CHAT</span>
        <span style={{ marginLeft: "auto", fontSize: 8, color: "#333a50" }}>
          {messages.length} msgs
        </span>
      </div>

      {/* Agent selector pills */}
      {agents.length > 0 && (
        <AgentPills
          agents={agents}
          selectedTarget={selectedTarget}
          onSelect={handleAgentSelect}
          onOpenTerminal={handleOpenTerminal}
        />
      )}

      {/* Messages list */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {messages.length === 0 ? (
          <div
            style={{
              padding: "24px 12px",
              textAlign: "center",
              color: "#2a3040",
              fontSize: 8,
            }}
          >
            waiting for activity...
          </div>
        ) : (
          messages.map((m) => <MessageItem key={m.id} msg={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        style={{
          borderTop: "2px solid #1e2840",
          padding: "6px 8px",
          background: "#0a0b16",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 8,
            fontFamily: "'Press Start 2P', monospace",
            color: "#22d3ee",
            flexShrink: 0,
          }}
        >
          {selectedAgent ? shortName(selectedAgent.name).slice(0, 6) : "???"} &gt;
        </span>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="type message..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#c0cce0",
            fontSize: 10,
            fontFamily: "monospace",
            minWidth: 0,
          }}
        />
        <button
          onClick={handleSend}
          style={{
            padding: "4px 8px",
            background: "#5a8cff",
            border: "none",
            color: "#07080f",
            fontSize: 8,
            fontFamily: "'Press Start 2P', monospace",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          SEND
        </button>
      </div>
    </div>
  );
});
