#!/usr/bin/env bash
set -euo pipefail

STACKHAND_DIR="/home/gautam-makwana/Workspace/stackhand"
UI_PID_FILE="$STACKHAND_DIR/.ui.pid"

# Kill any leftover frontend from a previous run
if [ -f "$UI_PID_FILE" ]; then
  kill $(cat "$UI_PID_FILE") 2>/dev/null || true
  rm -f "$UI_PID_FILE"
fi

# Start frontend (TanStack/Vite dev server) in background
cd "$STACKHAND_DIR/client"
npx vite dev --host 0.0.0.0 &
UI_PID=$!
echo $UI_PID > "$UI_PID_FILE"

# Cleanup frontend when this script exits
cleanup() {
  kill $UI_PID 2>/dev/null || true
  rm -f "$UI_PID_FILE"
}
trap cleanup EXIT

# Start backend in foreground
cd "$STACKHAND_DIR"
node dist/src/main.js
