#!/usr/bin/env bash
# Run on the production server by .github/workflows/deploy.yml over SSH.
# Pulls the images CI just pushed and restarts the stack — never builds
# anything locally, so the server only ever needs Docker, not Maven/npm.
set -euo pipefail
cd "$(dirname "$0")/../server"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

$COMPOSE pull
$COMPOSE up -d --remove-orphans

# Fail the GitHub Actions run (instead of leaving a broken container running
# unnoticed) if the backend doesn't report ready within a minute.
for i in $(seq 1 30); do
  if $COMPOSE exec -T backend wget -qO- http://localhost:8080/actuator/health/readiness >/dev/null 2>&1; then
    echo "backend is ready"
    docker image prune -af --filter "until=72h" >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 2
done

echo "backend did not become ready within 60s — check: $COMPOSE logs backend" >&2
exit 1
