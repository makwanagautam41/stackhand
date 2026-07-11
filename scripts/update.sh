#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}[1/4] Building backend + frontend...${NC}"
npm run build

echo -e "${CYAN}[2/4] Generating Prisma client...${NC}"
npx prisma generate

echo -e "${CYAN}[3/4] Applying database migrations...${NC}"
npx prisma migrate deploy

echo -e "${CYAN}[4/4] Restarting production service...${NC}"
if systemctl is-active --quiet stackhand.service 2>/dev/null; then
  sudo systemctl restart stackhand
  echo -e "${GREEN}Deployed! Production running via systemd.${NC}"
  echo -e "  Logs: sudo journalctl -u stackhand -f"
else
  echo -e "${GREEN}Build complete. Start production manually:${NC}"
  echo -e "  sudo systemctl start stackhand"
  echo -e "  or: npm run start"
fi
