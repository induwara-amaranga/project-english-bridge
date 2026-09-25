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
# VITE_API_BASE_URL is deliberately left unset: apiClient.ts treats that as
# "same origin", which is correct once Caddy serves the app and proxies
# /api/* from that same origin.
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /build/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
