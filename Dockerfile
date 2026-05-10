# syntax=docker/dockerfile:1.7
#
# Production image: Vite SPA (apps/web) + Hono API (apps/server), Bun + Turborepo.
# Full workspace is kept so you can `docker exec` into the running container.
#
# Drizzle migrations (only DATABASE_URL required):
#   DATABASE_URL="$DATABASE_URL" bun run --cwd packages/db scripts/run-migrations.ts
#
# Local-style DB scripts still use `bun run --cwd packages/db db:migrate:dotenv` etc.
# Seeds that import `createDb()` need the same server env vars as runtime (see Coolify env).
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
# 3. Runner (full workspace + deps for db scripts / exec)
############################
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S bunapp && adduser -S bunapp -G bunapp

COPY --from=builder --chown=bunapp:bunapp /app /app

USER bunapp
EXPOSE 3000

# Hono listens on HOSTNAME + PORT (see apps/server/src/index.ts). Static files: apps/web/dist.
CMD ["bun", "run", "--cwd", "apps/server", "dist/index.mjs"]
