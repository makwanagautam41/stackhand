#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root: sudo bash scripts/uninstall.sh"
  exit 1
fi

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Stackhand — Uninstall${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "${RED}This will:${NC}"
echo "  - Stop and remove the systemd service"
echo "  - Delete persistent data (~/.local/share/stackhand)"
echo "  - NOT delete the project folder (do that manually)"
echo ""

read -r -p "Are you sure? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

# Stop & disable systemd service
if systemctl is-active --quiet stackhand.service 2>/dev/null; then
  echo "Stopping service..."
  systemctl stop stackhand.service
fi

if systemctl is-enabled --quiet stackhand.service 2>/dev/null; then
  echo "Disabling service..."
  systemctl disable stackhand.service
fi

# Remove service file
if [ -f /etc/systemd/system/stackhand.service ]; then
  echo "Removing service file..."
  rm -f /etc/systemd/system/stackhand.service
  systemctl daemon-reload
fi

# Kill any remaining stackhand processes
SYS_USER="${SUDO_USER:-$(logname 2>/dev/null || echo '')}"
if [ -n "$SYS_USER" ]; then
  SYS_USER_HOME="$(eval echo "~${SYS_USER}")"
  # Remove PID files and kill processes
  rm -f "${SYS_USER_HOME}/Workspace/stackhand/.ui.pid" 2>/dev/null || true
fi
pkill -f "node.*dist/src/main.js" 2>/dev/null || true
pkill -f "vite dev" 2>/dev/null || true

# Remove persistent data
STACKHAND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
data_dir="${SYS_USER_HOME:-$HOME}/.local/share/stackhand"
if [ -d "$data_dir" ]; then
  echo "Removing persistent data: $data_dir"
  rm -rf "$data_dir"
fi

# Remove project-level dev database
rm -f "${STACKHAND_DIR}/workspaces-data/dev.db" "${STACKHAND_DIR}/workspaces-data/stackhand.db" 2>/dev/null || true

echo ""
echo -e "${GREEN}Uninstall complete.${NC}"
echo ""
echo "To also remove the project folder:"
echo "  rm -rf ${STACKHAND_DIR}"
echo ""
