#!/usr/bin/env bash
# Restores a gzipped pg_dump produced by infra/backup-db.sh. Run by hand only
# — never from cron or CI — since it drops and recreates the database before
# replaying the dump.
#
# Usage: infra/restore-db.sh /opt/englisher/backups/englisher-<timestamp>.sql.gz
#    or: infra/restore-db.sh path/to/downloaded-from-bucket.sql.gz
set -euo pipefail
cd "$(dirname "$0")/../server"

FILE="${1:?Usage: $0 <backup-file.sql.gz>}"
[ -f "$FILE" ] || { echo "No such file: $FILE" >&2; exit 1; }

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "This will DROP the englisher database and replace it with $FILE."
read -r -p "Type 'restore' to continue: " confirm
[ "$confirm" = "restore" ] || { echo "Aborted."; exit 1; }

echo "==> Stopping backend (so nothing writes during restore)"
$COMPOSE stop backend

echo "==> Dropping and recreating database"
$COMPOSE exec -T db psql -U englisher -d postgres -c "DROP DATABASE IF EXISTS englisher;"
$COMPOSE exec -T db psql -U englisher -d postgres -c "CREATE DATABASE englisher OWNER englisher;"

echo "==> Restoring from $FILE"
gunzip -c "$FILE" | $COMPOSE exec -T db psql -U englisher -d englisher

echo "==> Restarting backend"
$COMPOSE start backend

echo "==> Done — check: $COMPOSE logs backend"
