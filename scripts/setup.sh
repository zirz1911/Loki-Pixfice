#!/usr/bin/env bash
# Loki-Pixfice — tmux session setup
# Creates: loki-oracle (7 agent windows, each split 70/30) + loki-pixfice (server)
#
# Pane layout per agent window:
#   ┌─────────────────────┐
#   │  agent CLI  (pane 0)│  70%
#   ├─────────────────────┤
#   │  shell      (pane 1)│  30%
#   └─────────────────────┘

set -e

BUN=/home/paji/.bun/bin/bun
ORACLE_DIR=/home/paji/Loki-Oracle
GEMINI_DIR=/home/paji/Loki-Gemini
OFFICE_DIR=/home/paji/Project/Loki-Pixfice

# ── Agent definitions: name | work_dir | command ─────────────────────────────
# Format: "name:workdir:command"
AGENTS=(
  "odin:$ORACLE_DIR:unset CLAUDECODE && claude --dangerously-skip-permissions"
  "loki:$ORACLE_DIR:unset CLAUDECODE && claude --dangerously-skip-permissions"
  "thor:$ORACLE_DIR:unset CLAUDECODE && claude --dangerously-skip-permissions"
  "huginn:$ORACLE_DIR:unset CLAUDECODE && claude --dangerously-skip-permissions"
  "heimdall:$ORACLE_DIR:unset CLAUDECODE && claude --dangerously-skip-permissions"
  "tyr:$ORACLE_DIR:unset CLAUDECODE && claude --dangerously-skip-permissions"
  "ymir:$ORACLE_DIR:unset CLAUDECODE && claude --dangerously-skip-permissions"
  "loki-gemini:$GEMINI_DIR:gemini --yolo"
)

echo "Setting up Loki-Oracle tmux sessions..."

# ── loki-oracle session ──────────────────────────────────────────────────────
if tmux has-session -t loki-oracle 2>/dev/null; then
  echo "  loki-oracle session already exists — skipping"
else
  FIRST=1
  for entry in "${AGENTS[@]}"; do
    IFS=: read -r name workdir cmd <<< "$entry"

    if [[ $FIRST -eq 1 ]]; then
      # First window: create session
      tmux new-session -d -s loki-oracle -n "$name" -c "$workdir"
      FIRST=0
    else
      tmux new-window -t loki-oracle -n "$name" -c "$workdir"
    fi

    # Split: bottom shell pane (~10 lines)
    tmux split-window -v -l 10 -t "loki-oracle:$name" -c "$workdir"

    # Launch agent in top pane (pane 0)
    tmux send-keys -t "loki-oracle:${name}.0" "$cmd" Enter

    # Bottom pane (pane 1) stays as plain shell — select it
    tmux select-pane -t "loki-oracle:${name}.0"
  done

  # Focus odin
  tmux select-window -t loki-oracle:odin

  NAMES=$(printf '%s ' "${AGENTS[@]}" | tr ':' ' ' | awk '{print $1}' | tr '\n' ' ')
  echo "  loki-oracle: $NAMES"
  echo "  each window: pane 0 = agent CLI, pane 1 = shell"
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
echo "Done! (${#AGENTS[@]} agents)"
echo ""
echo "  Office UI  ->  http://localhost:3456/office"
echo "  Sessions   ->  tmux attach -t loki-oracle"
echo "              ->  tmux attach -t loki-pixfice"
