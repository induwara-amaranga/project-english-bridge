#!/usr/bin/env bash
# One-time Heroku bootstrap for the Englisher API. Run by hand, once, after
# `heroku login`. Deploys after this are .github/workflows/deploy.yml.
#
# Usage: bash infra/heroku-setup.sh <app-name> <api-domain>
#   e.g. bash infra/heroku-setup.sh englisher-api api.englisher.lk
set -euo pipefail
cd "$(dirname "$0")"

APP="${1:?Usage: $0 <app-name> <api-domain>}"
API_DOMAIN="${2:?Usage: $0 <app-name> <api-domain>}"

[ -f heroku.env ] || { echo "Copy heroku.env.example to heroku.env and fill it in first." >&2; exit 1; }
command -v heroku >/dev/null || { echo "Install the Heroku CLI and run 'heroku login' first." >&2; exit 1; }

echo "==> Creating $APP on the container stack"
heroku create "$APP" --stack container

echo "==> Adding Heroku Postgres Essential-0 (formerly 'Mini', \$5/mo)"
heroku addons:create heroku-postgresql:essential-0 -a "$APP" --wait

echo "==> Nightly backups at 02:00 Sri Lanka time"
heroku pg:backups:schedule DATABASE_URL --at '02:00 Asia/Colombo' -a "$APP"

echo "==> Config vars from heroku.env"
vars=()
while IFS= read -r line || [ -n "$line" ]; do
  line="${line%$'\r'}"
  case "$line" in ''|'#'*) continue ;; esac
  vars+=("$line")
done < heroku.env
heroku config:set -a "$APP" "${vars[@]}" >/dev/null

# Heroku doesn't cap the container's memory the way Docker does, so the JVM
# would size its heap from the host and blow past the dyno's 512 MB (R14).
# These are the values Heroku's own Java buildpack uses for a 512 MB dyno.
echo "==> Runtime settings"
heroku config:set -a "$APP" \
  SPRING_PROFILES_ACTIVE=prod \
  ENGLISHER_TRUSTED_PROXY_HOPS=1 \
  "JAVA_TOOL_OPTIONS=-Xmx300m -Xss512k -XX:CICompilerCount=2" >/dev/null

echo "==> Custom domain $API_DOMAIN"
heroku domains:add "$API_DOMAIN" -a "$APP"

cat <<EOF

==> Done. Remaining steps (see the hosting plan for detail):

1. Cloudflare DNS: add  CNAME  ${API_DOMAIN%%.*}  ->  <DNS target printed above>
   with the proxy OFF (grey cloud), so Heroku can issue the TLS certificate.

2. Create a long-lived deploy token and store it as the HEROKU_API_KEY
   GitHub Actions secret:
     heroku authorizations:create -d "GitHub Actions deploy"
   Also set the GitHub Actions variables:
     HEROKU_APP_NAME=$APP
     API_BASE_URL=https://$API_DOMAIN

3. Push to main. After the first release creates the web dyno:
     heroku ps:type web=basic -a $APP
     heroku certs:auto:enable -a $APP
EOF
