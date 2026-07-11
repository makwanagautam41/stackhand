#!/usr/bin/env bash
set -euo pipefail
# Legacy deploy script — delegates to the new update.sh
exec "$(dirname "$0")/update.sh"
