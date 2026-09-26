#!/usr/bin/env bash
# Nightly Postgres backup: dump -> gzip -> local retention -> off-site via
# rclone. Runs on the production server via cron (see infra/server-setup.sh)
# — independent of deploy.yml, so it keeps running even between deploys.
set -euo pipefail
cd "$(dirname "$0")"

APP_DIR="$(cd .. && pwd)"
BACKUP_DIR="$APP_DIR/backups"
RETENTION_DAYS=14
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/englisher-$STAMP.sql.gz"

# backup.env holds RCLONE_REMOTE, e.g. "b2:englisher-backups" — gitignored,
# see backup.env.example. Missing file (or unset var) just skips the
# off-site sync; the local dump and pruning below still happen.
if [ -f backup.env ]; then
  # shellcheck disable=SC1091
  source backup.env
fi

mkdir -p "$BACKUP_DIR"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
cd "$APP_DIR/server"

echo "==> Dumping database to $FILE"
$COMPOSE exec -T db pg_dump -U englisher -d englisher | gzip > "$FILE"

echo "==> Pruning local backups older than ${RETENTION_DAYS}d"
find "$BACKUP_DIR" -name 'englisher-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

if [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "==> Syncing $BACKUP_DIR to $RCLONE_REMOTE"
  # sync, not copy: a local file the prune step above just deleted is removed
  # from the remote too, so the two stay at the same 14-day window instead of
  # the remote growing forever.
  rclone sync "$BACKUP_DIR" "$RCLONE_REMOTE" --fast-list
else
  echo "==> RCLONE_REMOTE not set in infra/backup.env — skipping off-site sync" >&2
fi

echo "==> Done: $FILE"
