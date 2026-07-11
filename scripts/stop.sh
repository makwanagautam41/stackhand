#!/usr/bin/env bash
set -euo pipefail

STACKHAND_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if systemctl is-active --quiet stackhand.service 2>/dev/null; then
  echo "Stopping stackhand service..."
  sudo systemctl stop stackhand
  echo "Stopped."
else
  # Kill frontend
  if [ -f "$STACKHAND_DIR/.ui.pid" ]; then
    kill "$(cat "$STACKHAND_DIR/.ui.pid")" 2>/dev/null || true
    rm -f "$STACKHAND_DIR/.ui.pid"
  fi
  # Kill backend
  pkill -f "node dist/src/main.js" 2>/dev/null || true
  pkill -f "vite dev" 2>/dev/null || true
  echo "Stopped."
fi
