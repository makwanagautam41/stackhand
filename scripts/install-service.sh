#!/usr/bin/env bash
set -euo pipefail

STACKHAND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="stackhand"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root: sudo bash scripts/install-service.sh"
  exit 1
fi

SYS_USER="$(logname 2>/dev/null || echo "$SUDO_USER")"
SYS_USER_HOME="$(eval echo "~${SYS_USER}")"

# Prefer nvm node (same version used for npm install), fall back to system node
NVM_ALIAS="$(cat "${SYS_USER_HOME}/.nvm/alias/default" 2>/dev/null || echo '')"
if [ -n "$NVM_ALIAS" ]; then
  # Resolve alias to full version (e.g. "24" → "v24.18.0")
  NVM_VERSION_DIR="$(ls -d "${SYS_USER_HOME}/.nvm/versions/node/v${NVM_ALIAS}."* 2>/dev/null | sort -V | tail -1)"
  if [ -n "$NVM_VERSION_DIR" ]; then
    NVM_NODE="${NVM_VERSION_DIR}/bin/node"
  fi
fi
if [ -n "${NVM_NODE:-}" ] && [ -x "$NVM_NODE" ]; then
  NODE_PATH="$NVM_NODE"
else
  NODE_PATH="$(command -v node || true)"
fi

if [ -z "$NODE_PATH" ] || [ ! -x "$NODE_PATH" ]; then
  echo "Error: Node.js not found"
  exit 1
fi

cat > "$SERVICE_FILE" <<SYSTEMD
[Unit]
Description=Stackhand - Docker/YAML Stack Manager
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=${SYS_USER}
WorkingDirectory=${STACKHAND_DIR}
Environment=NODE_ENV=production
EnvironmentFile=${STACKHAND_DIR}/.env
Environment=PATH=$(dirname "${NODE_PATH}"):/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/bash ${STACKHAND_DIR}/scripts/start-production.sh

[Install]
WantedBy=multi-user.target
SYSTEMD

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"

echo "Service installed!"
echo ""
echo "Commands:"
echo "  sudo systemctl start stackhand     # Start"
echo "  sudo systemctl stop stackhand      # Stop"
echo "  sudo systemctl restart stackhand   # Restart"
echo "  sudo journalctl -u stackhand -f    # View logs"
echo ""
echo "Configuration is loaded from: ${STACKHAND_DIR}/.env"
