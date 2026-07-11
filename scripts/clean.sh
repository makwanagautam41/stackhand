#!/usr/bin/env bash
set -euo pipefail

echo "Removing build artifacts..."

# Backend
rm -rf dist

# Frontend
rm -rf client/.output client/.tanstack

# Prisma generated
rm -rf generated

# Runtime data (dev)
rm -f workspaces-data/dev.db

# Logs
rm -f stackhand-api.log stackhand-ui.log

echo "Clean complete."
