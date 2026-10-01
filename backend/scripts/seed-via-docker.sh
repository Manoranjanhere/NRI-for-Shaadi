#!/usr/bin/env bash
# Seed NRI test profiles into the server's Postgres container via the API container.
#
# On EC2:
#   cd ~/NRI-Shaadi/backend
#   docker compose up -d --build
#   bash scripts/seed-via-docker.sh 40
#
# Args: [profile_count]

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COUNT="${1:-40}"

if [[ ! -f .env ]]; then
  echo "Missing backend/.env — create it first (see deploy/README.md):"
  echo "  cp .env.production.example .env && nano .env"
  exit 1
fi

if ! docker compose ps --status running 2>/dev/null | grep -q nrishaadi-api; then
  echo "Starting containers..."
  docker compose up -d --build
fi

echo "=== NRI Shaadi: $COUNT test profiles ==="
docker compose exec -T api node scripts/seed-test-users.js --prod --confirm-prod "$COUNT"

echo ""
echo "Done."
