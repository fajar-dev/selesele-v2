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
RUN bun build scripts/backup.ts --target=bun --outfile=/app/backup.mjs
RUN bun build scripts/copy-uploads-to-cloud.ts --target=bun --outfile=/app/copy-uploads-to-cloud.mjs

FROM base AS migrator
ENV NODE_ENV=production
COPY --from=build --chown=bun:bun /app/migrate.mjs ./migrate.mjs
COPY --from=build --chown=bun:bun /app/drizzle ./drizzle
USER bun
CMD ["bun", "migrate.mjs"]

# Optional backup worker: official MySQL client tools plus Bun, tar and gzip.
FROM mysql:8.4 AS backup
COPY --from=base /usr/local/bin/bun /usr/local/bin/bun
RUN command -v tar && command -v gzip && command -v mysqldump
WORKDIR /backup-app
COPY --from=build /app/backup.mjs ./backup.mjs
ENV BACKUP_DIR=/backups UPLOAD_DIR=/uploads RESTORE_UID=1000 RESTORE_GID=1000
ENTRYPOINT ["bun", "backup.mjs"]
CMD ["schedule"]


FROM base AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 UPLOAD_DIR=/app/uploads
COPY --from=build --chown=bun:bun /app/.output ./.output
COPY --from=build --chown=bun:bun /app/copy-uploads-to-cloud.mjs ./copy-uploads-to-cloud.mjs
RUN mkdir -p /app/uploads && chown bun:bun /app/uploads
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e 'const r = await fetch("http://127.0.0.1:3000/api/health", { signal: AbortSignal.timeout(4000) }); process.exit(r.ok ? 0 : 1)'
CMD ["bun", ".output/server/index.mjs"]
