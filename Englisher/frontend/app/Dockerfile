# Multi-stage: build the Vite/React app with Node, then serve the static
# output with Caddy, which also terminates TLS and reverse-proxies /api/* to
# the backend (see Caddyfile). One image, one container, one published port
# pair — nothing else in this stack needs to be reachable from the internet.
FROM node:20-alpine AS build
WORKDIR /build

# Dependencies first, so a source-only change does not re-download the world.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Google/Facebook client IDs are public identifiers, not secrets (the actual
# secret, ENGLISHER_FACEBOOK_APP_SECRET, stays server-side) — but Vite still
# inlines them at build time, so they have to be supplied here rather than
# read from the container's environment at runtime. Leaving them unset just
# means those two sign-in buttons report "not configured", same as the
# backend does when its own OAuth env vars are unset.
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_FACEBOOK_APP_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_FACEBOOK_APP_ID=$VITE_FACEBOOK_APP_ID
# AdSense publisher/slot ids — same story, and all unset until the site is
# approved (components/AdSlot.tsx renders nothing without them).
ARG VITE_ADSENSE_CLIENT_ID
ARG VITE_AD_SLOT_ROADMAP
ARG VITE_AD_SLOT_LESSON_DONE
ENV VITE_ADSENSE_CLIENT_ID=$VITE_ADSENSE_CLIENT_ID
ENV VITE_AD_SLOT_ROADMAP=$VITE_AD_SLOT_ROADMAP
ENV VITE_AD_SLOT_LESSON_DONE=$VITE_AD_SLOT_LESSON_DONE
# VITE_API_BASE_URL is deliberately left unset: apiClient.ts treats that as
# "same origin", which is correct once Caddy serves the app and proxies
# /api/* from that same origin.
RUN npm run build

# Caddy's core has no rate limiting; the Caddyfile's `rate_limit` directive
# (guarding /api/auth/*) needs this module built in.
FROM caddy:2-builder-alpine AS caddy-build
RUN xcaddy build --with github.com/mholt/caddy-ratelimit

FROM caddy:2-alpine
COPY --from=caddy-build /usr/bin/caddy /usr/bin/caddy
COPY --from=build /build/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
