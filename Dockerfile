# syntax=docker/dockerfile:1.7
#
# Production image: Vite SPA (apps/web) + Hono API (apps/server), Bun + Turborepo.
# The runner intentionally contains only the compiled server, compiled web assets,
# and production node_modules. Database/admin scripts are not shipped in the image.
#
# Coolify health check: GET /healthz
#
# Build (pass the public browser origin API base; same hostname as HTTPS entrypoint):
#   docker build \
#     --build-arg VITE_SERVER_URL=https://court.example.com \
#     -t cdm-clubhouse .
#
# Run (Coolify supplies env vars):
#   docker run --rm -p 3000:3000 \
#     -e PORT=3000 \
#     -e NODE_ENV=production \
#     -e DATABASE_URL=postgresql://… \
#     -e BETTER_AUTH_SECRET=… \
#     -e BETTER_AUTH_URL=https://court.example.com \
#     -e CORS_ORIGIN=https://court.example.com \
#     -e GOOGLE_CLIENT_ID=… -e GOOGLE_CLIENT_SECRET=… \
#     cdm-clubhouse
#
ARG BUN_VERSION=1.3.2

############################
# 1. Base
############################
FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

############################
# 2. Builder
############################
FROM base AS builder

COPY . .

RUN bun install --frozen-lockfile

# Browser must call API on same public origin baked at build time
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=${VITE_SERVER_URL}
RUN if [ -z "${VITE_SERVER_URL}" ]; then echo "BUILD ERROR: pass --build-arg VITE_SERVER_URL=https://your.domain" && exit 1; fi

RUN bunx turbo build --filter=server --filter=web

############################
# 3. Runner (compiled server + web assets only)
############################
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S bunapp && adduser -S bunapp -G bunapp

COPY --from=builder --chown=bunapp:bunapp /app/node_modules /app/node_modules
COPY --from=builder --chown=bunapp:bunapp /app/apps/server/node_modules /app/apps/server/node_modules
COPY --from=builder --chown=bunapp:bunapp /app/apps/server/dist /app/apps/server/dist
COPY --from=builder --chown=bunapp:bunapp /app/apps/web/dist /app/apps/web/dist

USER bunapp
EXPOSE 3000

# Hono listens on HOSTNAME + PORT (see apps/server/src/index.ts). Static files: apps/web/dist.
CMD ["bun", "/app/apps/server/dist/index.mjs"]
