#!/usr/bin/env bash
# Dump the NRI Shaadi Postgres container to backend/backups/ (gzip, keeps last N days).
#
#   bash scripts/db-backup.sh            # keep 14 days
#   KEEP_DAYS=30 bash scripts/db-backup.sh
#
# Daily cron (as ubuntu):  crontab -e
#   30 2 * * * cd /home/ubuntu/NRI-Shaadi/backend && bash scripts/db-backup.sh >> backups/backup.log 2>&1
#
# Optional off-server copy: set BACKUP_S3_URI=s3://your-bucket/nrishaadi-db (needs aws cli + IAM role).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p backups

set -a
# shellcheck disable=SC1091
[[ -f .env ]] && source <(grep -E '^(DB_USERNAME|DB_NAME|BACKUP_S3_URI)=' .env)
set +a
DB_USERNAME="${DB_USERNAME:-nrishaadi}"
DB_NAME="${DB_NAME:-nrishaadi}"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
FILE="backups/${DB_NAME}-${STAMP}.sql.gz"

echo "[$(date -u +%FT%TZ)] Dumping ${DB_NAME} -> ${FILE}"
docker compose exec -T postgres pg_dump -U "$DB_USERNAME" -d "$DB_NAME" --no-owner --clean --if-exists | gzip > "$FILE"

if [[ ! -s "$FILE" ]]; then
  echo "Backup file is empty — aborting" >&2
  rm -f "$FILE"
  exit 1
fi

if [[ -n "${BACKUP_S3_URI:-}" ]] && command -v aws > /dev/null; then
  aws s3 cp "$FILE" "${BACKUP_S3_URI%/}/$(basename "$FILE")" --only-show-errors
  echo "Uploaded to ${BACKUP_S3_URI}"
fi

find backups -name "${DB_NAME}-*.sql.gz" -mtime +"$KEEP_DAYS" -delete
echo "Done ($(du -h "$FILE" | cut -f1))"
