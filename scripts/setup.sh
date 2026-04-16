#!/usr/bin/env bash
# Loki-Pixfice — tmux session setup
# Creates: loki-kvasir (agent windows, each split 70/30) + loki-pixfice (server)
#
# Pane layout per agent window:
#   ┌─────────────────────┐
#   │  agent CLI  (pane 0)│  70%
#   ├─────────────────────┤
#   │  shell      (pane 1)│  30%
#   └─────────────────────┘

set -e

BUN=/home/paji/.bun/bin/bun
KVASIR_DIR=/home/paji/Loki-Kvasir
FREYR_DIR=/home/paji/Freyr-Kvasir
GEMINI_DIR=/home/paji/Loki-Gemini
OFFICE_DIR=/home/paji/Project/Loki-Pixfice

# ── Agent definitions: name | work_dir | command ─────────────────────────────
# Format: "name:workdir:command"
AGENTS=(
  "odin:$KVASIR_DIR:unset CLAUDECODE && claude --dangerously-skip-permissions"
  "loki:$KVASIR_DIR:unset CLAUDECODE && claude --dangerously-skip-permissions"
  "thor:$KVASIR_DIR:unset CLAUDECODE && claude --dangerously-skip-permissions"
  "huginn:$KVASIR_DIR:unset CLAUDECODE && claude --dangerously-skip-permissions"
  "heimdall:$KVASIR_DIR:unset CLAUDECODE && claude --dangerously-skip-permissions"
  "tyr:$KVASIR_DIR:unset CLAUDECODE && claude --dangerously-skip-permissions"
  "ymir:$KVASIR_DIR:unset CLAUDECODE && claude --dangerously-skip-permissions"
  "loki-gemini:$GEMINI_DIR:gemini --yolo"
  "freyr:$FREYR_DIR:unset CLAUDECODE && claude --dangerously-skip-permissions"
)

echo "Setting up Loki-Kvasir tmux sessions..."

# ── loki-kvasir session ──────────────────────────────────────────────────────
if tmux has-session -t loki-kvasir 2>/dev/null; then
  echo "  loki-kvasir session already exists — skipping"
else
  FIRST=1
  for entry in "${AGENTS[@]}"; do
    IFS=: read -r name workdir cmd <<< "$entry"

    if [[ $FIRST -eq 1 ]]; then
      # First window: create session
      tmux new-session -d -s loki-kvasir -n "$name" -c "$workdir"
      FIRST=0
    else
      tmux new-window -t loki-kvasir -n "$name" -c "$workdir"
    fi

    # Split: bottom shell pane (~10 lines)
    tmux split-window -v -l 10 -t "loki-kvasir:$name" -c "$workdir"

    # Launch agent in top pane (pane 0)
    tmux send-keys -t "loki-kvasir:${name}.0" "$cmd" Enter

    # Bottom pane (pane 1) stays as plain shell — select it
    tmux select-pane -t "loki-kvasir:${name}.0"
  done

  # Focus odin
  tmux select-window -t loki-kvasir:odin

  NAMES=$(printf '%s ' "${AGENTS[@]}" | tr ':' ' ' | awk '{print $1}' | tr '\n' ' ')
  echo "  loki-kvasir: $NAMES"
  echo "  each window: pane 0 = agent CLI, pane 1 = shell"
fi

# ── loki-pixfice session (server) ────────────────────────────────────────────
if tmux has-session -t loki-pixfice 2>/dev/null; then
  echo "  loki-pixfice session already exists — skipping"
else
  tmux new-session -d -s loki-pixfice -n server -c "$OFFICE_DIR"
  tmux send-keys -t loki-pixfice:server "MAW_HOST=local $BUN src/server.ts" Enter
  echo "  loki-pixfice: server -> http://localhost:3456"
fi

echo ""
echo "Done! (${#AGENTS[@]} agents)"
echo ""
echo "  Office UI  ->  http://localhost:3456"
echo "  Sessions   ->  tmux attach -t loki-kvasir"
echo "              ->  tmux attach -t loki-pixfice"
