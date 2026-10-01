#!/usr/bin/env bash
# Seed the server database. Everything runs inside Docker, so this just wraps seed-via-docker.sh.
#
#   bash scripts/seed-prod-all.sh 40

set -euo pipefail
exec bash "$(dirname "$0")/seed-via-docker.sh" "${1:-40}"
