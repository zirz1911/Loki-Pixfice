#!/usr/bin/env bash
# Loki-Pixfice — tmux session setup
# Creates: loki-oracle (6 agent windows) + loki-pixfice (server)

set -e

BUN=/home/paji/.bun/bin/bun
ORACLE_DIR=/home/paji/Loki-Oracle
OFFICE_DIR=/home/paji/Project/Loki-Pixfice

echo "Setting up Loki-Oracle tmux sessions..."

# ── loki-oracle session ──────────────────────────────────────────────────────
if tmux has-session -t loki-oracle 2>/dev/null; then
  echo "  loki-oracle session already exists — skipping"
else
  # Create session with first window: odin
  tmux new-session -d -s loki-oracle -n odin -c "$ORACLE_DIR"

  # Add remaining agent windows
  for agent in thor loki heimdall tyr ymir; do
    tmux new-window -t loki-oracle -n "$agent" -c "$ORACLE_DIR"
  done

  # Launch claude --dangerously-skip-permissions in each window
  # Unset CLAUDECODE to allow nested sessions
  for agent in odin thor loki heimdall tyr ymir; do
    tmux send-keys -t "loki-oracle:$agent" "unset CLAUDECODE && claude --dangerously-skip-permissions" Enter
  done

  # Focus odin
  tmux select-window -t loki-oracle:odin
  echo "  loki-oracle: odin thor loki heimdall tyr ymir"
fi

# ── loki-pixfice session (server) ────────────────────────────────────────────
if tmux has-session -t loki-pixfice 2>/dev/null; then
  echo "  loki-pixfice session already exists — skipping"
else
  tmux new-session -d -s loki-pixfice -n server -c "$OFFICE_DIR"
  tmux send-keys -t loki-pixfice:server "MAW_HOST=local $BUN src/server.ts" Enter
  echo "  loki-pixfice: server -> http://localhost:3456/office"
fi

echo ""
echo "Done!"
echo ""
echo "  Office UI  ->  http://localhost:3456/office"
echo "  Sessions   ->  tmux attach -t loki-oracle"
echo "              ->  tmux attach -t loki-pixfice"
