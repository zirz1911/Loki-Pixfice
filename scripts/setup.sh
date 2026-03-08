#!/usr/bin/env bash
# Loki-Office — tmux session setup
# Creates: loki-oracle (6 agent windows) + loki-office (server)

set -e

BUN=/home/paji/.bun/bin/bun
ORACLE_DIR=/home/paji/Loki-Oracle
OFFICE_DIR=/home/paji/Project/Loki-Office

echo "🔮 Setting up Loki-Oracle tmux sessions..."

# ── loki-oracle session ──────────────────────────────────────────────────────
if tmux has-session -t loki-oracle 2>/dev/null; then
  echo "  ↺ loki-oracle session already exists — skipping"
else
  # Create session with first window: odin
  tmux new-session -d -s loki-oracle -n odin -c "$ORACLE_DIR"
  tmux send-keys -t loki-oracle:odin "echo '👁️  Odin — Oracle Orchestrator'" Enter

  # Add agent windows
  for agent in thor loki heimdall tyr ymir; do
    tmux new-window -t loki-oracle -n "$agent" -c "$ORACLE_DIR"
  done

  # Send greeting to each
  tmux send-keys -t loki-oracle:thor     "echo '⚡ Thor — Code Brain'"     Enter
  tmux send-keys -t loki-oracle:loki     "echo '🔮 Loki — Quick Explorer'" Enter
  tmux send-keys -t loki-oracle:heimdall "echo '🌈 Heimdall — Researcher'" Enter
  tmux send-keys -t loki-oracle:tyr      "echo '⚔️  Tyr — Strategic Coder'" Enter
  tmux send-keys -t loki-oracle:ymir     "echo '🏔️  Ymir — Master Builder'"  Enter

  # Focus odin
  tmux select-window -t loki-oracle:odin
  echo "  ✓ loki-oracle: odin thor loki heimdall tyr ymir"
fi

# ── loki-office session (server) ─────────────────────────────────────────────
if tmux has-session -t loki-office 2>/dev/null; then
  echo "  ↺ loki-office session already exists — skipping"
else
  tmux new-session -d -s loki-office -n server -c "$OFFICE_DIR"
  tmux send-keys -t loki-office:server "MAW_HOST=local $BUN src/server.ts" Enter
  echo "  ✓ loki-office: server → http://localhost:3456/office"
fi

echo ""
echo "✅ Done!"
echo ""
echo "  Office UI  →  http://localhost:3456/office"
echo "  Sessions   →  tmux attach -t loki-oracle"
echo "              →  tmux attach -t loki-office"
