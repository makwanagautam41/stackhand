#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'

ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
ENV_EXAMPLE="$(cd "$(dirname "$0")/.." && pwd)/.env.example"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Stackhand — Environment Setup${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

if [ -f "$ENV_FILE" ]; then
  echo -e "${YELLOW}.env already exists at:${NC}"
  echo "  $ENV_FILE"
  echo ""
  read -r -p "Overwrite? (y/N): " overwrite
  if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Keeping existing .env${NC}"
    exit 0
  fi
fi

# Copy template
cp "$ENV_EXAMPLE" "$ENV_FILE"
echo -e "${GREEN}Created .env from .env.example${NC}"
echo ""

# --- API Token ---
current_token=$(grep -oP '^STACKHAND_API_TOKEN=\K.*' "$ENV_FILE" || true)
default_token=$(openssl rand -hex 32 2>/dev/null || echo "")
read -r -p "API token [${default_token:-keep current}]: " api_token
api_token="${api_token:-$default_token}"
if [ -n "$api_token" ]; then
  sed -i "s/^STACKHAND_API_TOKEN=.*/STACKHAND_API_TOKEN=$api_token/" "$ENV_FILE"
fi

# --- Ports ---
read -r -p "Backend port [22443]: " port
port="${port:-22443}"
sed -i "s/^PORT=.*/PORT=$port/" "$ENV_FILE"

read -r -p "Frontend port [22080]: " fport
fport="${fport:-22080}"
sed -i "s/^FRONTEND_PORT=.*/FRONTEND_PORT=$fport/" "$ENV_FILE"

# --- Mode ---
echo ""
echo "Select default NODE_ENV:"
echo "  1) production"
echo "  2) development"
read -r -p "Choice [1]: " mode_choice
if [ "$mode_choice" = "2" ]; then
  sed -i "s/^NODE_ENV=.*/NODE_ENV=development/" "$ENV_FILE"
  echo -e "${GREEN}Mode set to: development${NC}"
else
  sed -i "s/^NODE_ENV=.*/NODE_ENV=production/" "$ENV_FILE"
  echo -e "${GREEN}Mode set to: production${NC}"
fi

# --- Data directory ---
data_dir="${HOME}/.local/share/stackhand"
read -r -p "Data directory [${data_dir}]: " input_data_dir
data_dir="${input_data_dir:-$data_dir}"
sed -i "s|^DEFAULT_WORKSPACE_ROOT=.*|DEFAULT_WORKSPACE_ROOT=${data_dir}/workspaces|" "$ENV_FILE"
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"file:${data_dir}/workspaces-data/stackhand.db\"|" "$ENV_FILE"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}  .env configured successfully!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  npm run setup     # Install deps + setup database"
echo "  npm run dev       # Start development mode"
echo "  sudo bash scripts/install-service.sh  # Install systemd service"
echo ""
