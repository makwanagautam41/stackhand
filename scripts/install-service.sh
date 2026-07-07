#!/usr/bin/env bash
set -euo pipefail

STACKHAND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="stackhand"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root: sudo bash scripts/install-service.sh"
  exit 1
fi

# Use the Node.js from nvm (same one used for npm install)
NODE_PATH="$(command -v node)"
SYS_USER="$(logname 2>/dev/null || echo "$SUDO_USER")"

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
Environment=PATH=$(dirname ${NODE_PATH}):/usr/local/bin:/usr/bin:/bin
ExecStart=${NODE_PATH} dist/src/main.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SYSTEMD

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"

echo "Service installed!"
echo ""
echo "Commands:"
echo "  sudo systemctl start stackhand    # Start"
echo "  sudo systemctl stop stackhand     # Stop"
echo "  sudo systemctl restart stackhand  # Restart"
echo "  sudo journalctl -u stackhand -f   # View logs"
