#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${RED}WARNING: This will delete ALL data in the database.${NC}"
echo ""
echo "Which database do you want to reset?"
echo "  1) Development (workspaces-data/dev.db)"
echo "  2) Production  (workspaces-data/stackhand.db)"
echo "  3) All"
read -r -p "Choice [1]: " choice
choice="${choice:-1}"

case "$choice" in
  1|"")
    echo "Resetting development database..."
    rm -f workspaces-data/dev.db
    DATABASE_URL="file:./workspaces-data/dev.db" npx prisma db push --accept-data-loss
    DATABASE_URL="file:./workspaces-data/dev.db" npx tsx prisma/seed.ts
    echo -e "${YELLOW}Development database reset.${NC}"
    ;;
  2)
    echo "Resetting production database..."
    rm -f workspaces-data/stackhand.db
    npx prisma db push --accept-data-loss
    npx tsx prisma/seed.ts
    echo -e "${YELLOW}Production database reset.${NC}"
    ;;
  3)
    echo "Resetting ALL databases..."
    rm -f workspaces-data/dev.db workspaces-data/stackhand.db
    DATABASE_URL="file:./workspaces-data/dev.db" npx prisma db push --accept-data-loss
    npx prisma db push --accept-data-loss
    npx tsx prisma/seed.ts
    echo -e "${YELLOW}All databases reset.${NC}"
    ;;
  *)
    echo "Invalid choice."
    exit 1
    ;;
esac
