#!/usr/bin/env bash
set -euo pipefail

STACKHAND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="stackhand"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root: sudo bash scripts/fix-service.sh"
  exit 1
fi

SYS_USER="$(logname 2>/dev/null || echo "$SUDO_USER")"
SYS_USER="${SYS_USER:-gautam-makwana}"
SYS_USER_HOME="$(eval echo "~${SYS_USER}")"

# Prefer nvm node, fall back to system node
NVM_ALIAS="$(cat "${SYS_USER_HOME}/.nvm/alias/default" 2>/dev/null || echo '')"
if [ -n "$NVM_ALIAS" ]; then
  NVM_VERSION_DIR="$(ls -d "${SYS_USER_HOME}/.nvm/versions/node/v${NVM_ALIAS}."* 2>/dev/null | sort -V | tail -1)"
  if [ -n "$NVM_VERSION_DIR" ]; then
    NVM_NODE="${NVM_VERSION_DIR}/bin/node"
  fi
fi
if [ -n "${NVM_NODE:-}" ] && [ -x "$NVM_NODE" ]; then
  NODE_PATH="$NVM_NODE"
else
  NODE_PATH="$(command -v node || echo '/usr/bin/node')"
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
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SYSTEMD

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"

echo "Service fixed!"
echo "Run: sudo systemctl restart stackhand"
