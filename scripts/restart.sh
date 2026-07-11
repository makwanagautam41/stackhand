#!/usr/bin/env bash
set -euo pipefail

if systemctl is-active --quiet stackhand.service 2>/dev/null; then
  sudo systemctl restart stackhand
  echo "Restarted."
else
  echo "Service not running via systemd. Start manually:"
  echo "  sudo systemctl start stackhand"
  echo "  or: npm run start"
fi
