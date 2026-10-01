#!/usr/bin/env bash
# Restore a backup made by db-backup.sh into the Postgres container.
# This OVERWRITES the current database contents.
#
#   bash scripts/db-restore.sh backups/nrishaadi-20260929-023000.sql.gz

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FILE="${1:?Usage: bash scripts/db-restore.sh backups/<file>.sql.gz}"
[[ -f "$FILE" ]] || { echo "Not found: $FILE" >&2; exit 1; }

set -a
# shellcheck disable=SC1091
[[ -f .env ]] && source <(grep -E '^(DB_USERNAME|DB_NAME)=' .env)
set +a
DB_USERNAME="${DB_USERNAME:-nrishaadi}"
DB_NAME="${DB_NAME:-nrishaadi}"

read -r -p "Restore $FILE into database '$DB_NAME'? This overwrites current data. Type YES: " ok
[[ "$ok" == "YES" ]] || { echo "Cancelled"; exit 1; }

echo "Stopping API..."
docker compose stop api

echo "Restoring..."
gunzip -c "$FILE" | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -q -U "$DB_USERNAME" -d "$DB_NAME"

echo "Starting API..."
docker compose start api
echo "Done."
