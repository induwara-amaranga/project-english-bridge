#!/usr/bin/env bash
# Restores the production database. Run by hand only. It replaces every
# table's contents, so the app is put in maintenance mode while it runs.
#
# Usage: bash infra/restore-db.sh <app-name> <backup>
#   <backup> is either a Heroku backup id from `heroku pg:backups -a <app>`
#   (e.g. b012), or a local .dump file from infra/backup-db.sh (needs
#   pg_restore installed locally).
set -euo pipefail

APP="${1:?Usage: $0 <app-name> <backup-id|file.dump>}"
BACKUP="${2:?Usage: $0 <app-name> <backup-id|file.dump>}"

echo "This will REPLACE the $APP database with $BACKUP."
read -r -p "Type 'restore' to continue: " confirm
[ "$confirm" = "restore" ] || { echo "Aborted."; exit 1; }

echo "==> Maintenance mode on"
heroku maintenance:on -a "$APP"
trap 'echo "==> Maintenance mode off"; heroku maintenance:off -a "$APP"' EXIT

if [ -f "$BACKUP" ]; then
  echo "==> Restoring local file $BACKUP"
  pg_restore --verbose --clean --if-exists --no-acl --no-owner \
    -d "$(heroku config:get DATABASE_URL -a "$APP")" "$BACKUP"
else
  echo "==> Restoring Heroku backup $BACKUP"
  heroku pg:backups:restore "$BACKUP" DATABASE_URL -a "$APP" --confirm "$APP"
fi

echo "==> Restarting dynos"
heroku ps:restart -a "$APP"
