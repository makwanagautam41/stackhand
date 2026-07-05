#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

STACKHAND_DATA="${XDG_DATA_HOME:-$HOME/.local/share}/stackhand"
STACKHAND_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/stackhand"
STACKHAND_SRC="$STACKHAND_DATA/src"
STACKHAND_BIN="${STACKHAND_BIN:-/usr/local/bin}"

echo "Installing Stackhand..."
echo "  Source:   $REPO_DIR"
echo "  Data:     $STACKHAND_DATA"
echo "  Config:   $STACKHAND_CONFIG"
echo "  Binary:   $STACKHAND_BIN/stackhand"
echo ""

# Create directory structure for runtime data
mkdir -p "$STACKHAND_DATA/workspaces-data" "$STACKHAND_DATA/workspaces" "$STACKHAND_CONFIG"

# Create symlink to the dev repo (no file copying)
rm -rf "$STACKHAND_SRC"
ln -s "$REPO_DIR" "$STACKHAND_SRC"
echo "Created symlink: $STACKHAND_SRC -> $REPO_DIR"

# Generate API token
API_TOKEN="${STACKHAND_API_TOKEN:-$(openssl rand -hex 32)}"

# Write .env to the repo with absolute paths for production data
cat > "$REPO_DIR/.env" << EOF
STACKHAND_API_TOKEN=$API_TOKEN
PORT=22443
FRONTEND_PORT=22080
HOST=0.0.0.0
DEFAULT_WORKSPACE_ROOT=$STACKHAND_DATA/workspaces
OLLAMA_BASE_URL=http://localhost:11434
DATABASE_URL="file:$STACKHAND_DATA/workspaces-data/stackhand.db"
EOF

# Save config for reference
cat > "$STACKHAND_CONFIG/env" << EOF
# Stackhand configuration
# The .env file is at: $REPO_DIR/.env
# Set STACKHAND_DIR override:
# export STACKHAND_DIR=$STACKHAND_SRC
EOF

cd "$REPO_DIR"

# Install dependencies
echo "[1/5] Installing backend dependencies..."
npm install --no-audit --no-fund

echo "[2/5] Installing frontend dependencies..."
cd client && npm install --no-audit --no-fund && cd ..

# Generate Prisma client
echo "[3/5] Generating Prisma client..."
npx prisma generate

# Run migrations (creates DB in STACKHAND_DATA/workspaces-data/)
echo "[4/5] Running database migrations..."
npx prisma migrate deploy

# Build
echo "[5/5] Building project (backend + frontend)..."
npm run build

# Install the CLI wrapper
echo "Installing stackhand command to $STACKHAND_BIN/..."
cp "$SCRIPT_DIR/stackhand" "$STACKHAND_BIN/stackhand"
chmod +x "$STACKHAND_BIN/stackhand"

echo ""
echo "=================================================="
echo " Stackhand installed successfully!"
echo "=================================================="
echo ""
echo "  Source:       $REPO_DIR (symlinked)"
echo "  Data:         $STACKHAND_DATA"
echo "  DB:           $STACKHAND_DATA/workspaces-data/stackhand.db"
echo "  Workspaces:   $STACKHAND_DATA/workspaces/"
echo "  Web UI:       http://localhost:22443"
echo "  API Token:    $API_TOKEN"
echo ""
echo "After making changes in $REPO_DIR, just run:"
echo "  stackhand install   (reinstall deps + rebuild)"
echo "  stackhand restart   (restart server)"
echo "  stackhand update    (git pull + rebuild + restart)"
echo ""
echo "Run 'stackhand start' to launch."
echo ""
