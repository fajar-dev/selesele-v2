# syntax=docker/dockerfile:1
ARG BUN_VERSION=1.4.4
FROM oven/bun:${BUN_VERSION}-slim AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

FROM dependencies AS build
COPY . .
RUN bun run build
RUN bun build scripts/migrate-database.ts --target=bun --outfile=/app/migrate.mjs

FROM base AS migrator
ENV NODE_ENV=production
COPY --from=build --chown=bun:bun /app/migrate.mjs ./migrate.mjs
COPY --from=build --chown=bun:bun /app/drizzle ./drizzle
USER bun
CMD ["bun", "migrate.mjs"]

FROM base AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 UPLOAD_DIR=/app/uploads
COPY --from=build --chown=bun:bun /app/.output ./.output
RUN mkdir -p /app/uploads && chown bun:bun /app/uploads
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e 'const r = await fetch("http://127.0.0.1:3000/api/health", { signal: AbortSignal.timeout(4000) }); process.exit(r.ok ? 0 : 1)'
CMD ["bun", ".output/server/index.mjs"]
