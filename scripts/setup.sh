#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Stackhand — Full Setup${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Check .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}.env file not found. Run first: bash scripts/env-setup.sh${NC}"
  exit 1
fi

echo -e "${CYAN}[1/7] Installing backend dependencies...${NC}"
npm install

echo -e "${CYAN}[2/7] Installing frontend dependencies...${NC}"
cd client && npm install && cd ..

echo -e "${CYAN}[3/7] Generating Prisma client...${NC}"
npx prisma generate

echo -e "${CYAN}[4/7] Applying database migrations...${NC}"
npx prisma migrate deploy

echo -e "${CYAN}[5/7] Seeding default workspace...${NC}"
npx tsx prisma/seed.ts

echo -e "${CYAN}[6/7] Building backend + frontend...${NC}"
npm run build

echo -e "${CYAN}[7/7] Setup complete!${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Stackhand is ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Commands for production:"
echo "  sudo bash scripts/install-service.sh     Install system service (auto-start on boot)"
echo "  sudo systemctl start stackhand           Start backend + frontend"
echo "  sudo systemctl stop stackhand            Stop everything"
echo "  sudo journalctl -u stackhand -f          View logs"
echo ""
echo "Commands for development:"
echo "  npm run dev                              Start dev mode (hot-reload)"
echo ""
