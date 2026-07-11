#!/usr/bin/env bash
set -euo pipefail

STACKHAND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UI_PID_FILE="$STACKHAND_DIR/.ui.pid"
BACKEND_LOG="$STACKHAND_DIR/stackhand-api.log"
UI_LOG="$STACKHAND_DIR/stackhand-ui.log"

# Kill any leftover frontend from a previous run
if [ -f "$UI_PID_FILE" ]; then
  kill "$(cat "$UI_PID_FILE")" 2>/dev/null || true
  rm -f "$UI_PID_FILE"
fi

# Start frontend (Vite dev server) in background
cd "$STACKHAND_DIR/client"
npx vite dev --host 0.0.0.0 >> "$UI_LOG" 2>&1 &
UI_PID=$!
echo $UI_PID > "$UI_PID_FILE"
cd "$STACKHAND_DIR"

# Cleanup frontend on exit
cleanup() {
  kill $UI_PID 2>/dev/null || true
  rm -f "$UI_PID_FILE"
}
trap cleanup EXIT

# Start backend in foreground
node dist/src/main.js
