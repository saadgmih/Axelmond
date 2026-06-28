# Performance Académique — production image (API + Vite static bundle)
# Build:  docker build -t performance-academique .
# Run:    docker run --env-file .env -p 3000:3000 performance-academique

FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci

COPY . .

RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 app \
  && useradd --system --uid 1001 --gid app --home-dir /app app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh && chown -R app:app /app

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/api/health" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
