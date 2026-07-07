#!/usr/bin/env bash
set -euo pipefail

STACKHAND_DIR="/home/gautam-makwana/Workspace/stackhand"
SERVICE_NAME="stackhand"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
NODE_PATH="/home/gautam-makwana/.nvm/versions/node/v24.18.0/bin/node"
DB_URL="file:/home/gautam-makwana/.local/share/stackhand/workspaces-data/stackhand.db"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root: sudo bash scripts/fix-service.sh"
  exit 1
fi

SYS_USER="gautam-makwana"

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
Environment=DATABASE_URL=${DB_URL}
Environment=PATH=/home/gautam-makwana/.nvm/versions/node/v24.18.0/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/bash ${STACKHAND_DIR}/scripts/start-production.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SYSTEMD

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"

echo "Service fixed! Database URL set to: ${DB_URL}"
echo "Run: sudo systemctl restart stackhand"
