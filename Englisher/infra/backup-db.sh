#!/usr/bin/env bash
# On-demand backup: captures a fresh Heroku PGBackups snapshot and downloads
# a copy to infra/backups/ (gitignored). Nightly backups already run inside
# Heroku (scheduled by heroku-setup.sh); use this before a risky change, and
# now and then to keep a copy outside Heroku in case the account itself is
# lost.
#
# Usage: bash infra/backup-db.sh <app-name>
set -euo pipefail
cd "$(dirname "$0")"

APP="${1:?Usage: $0 <app-name>}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="backups/englisher-$STAMP.dump"

mkdir -p backups

echo "==> Capturing backup on Heroku"
heroku pg:backups:capture -a "$APP"

echo "==> Downloading to infra/$FILE"
heroku pg:backups:download -a "$APP" -o "$FILE"

echo "==> Done: infra/$FILE (pg_restore custom format)"
