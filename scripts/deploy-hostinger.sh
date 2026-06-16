#!/usr/bin/env bash
set -euo pipefail

# Déploiement production Hostinger VPS (SSH) — PAS pour Node.js Web App hPanel.
# Sur Node.js Web App : auto-deploy GitHub + npm run hostinger:build + npm start.
# Ne jamais lancer PM2 en parallèle du gestionnaire Hostinger hPanel.

echo "==> git pull"
git pull origin main

echo "==> npm ci"
npm ci

echo "==> prisma migrate deploy"
npx prisma migrate deploy

echo "==> security preflight (.env production)"
if [ -f .env ]; then
  npx tsx scripts/security-preflight.ts || {
    echo "ERROR: security preflight failed — fix .env before deploying"
    exit 1
  }
else
  echo "WARN: no .env file — skip local preflight (hPanel env must still be valid)"
fi

echo "==> npm run build"
npm run build

echo "==> pm2 start or reload"
if npx pm2 describe axelmond-research-labs >/dev/null 2>&1; then
  npx pm2 reload ecosystem.config.cjs --update-env
else
  npx pm2 start ecosystem.config.cjs
fi
npx pm2 save

PORT="${PORT:-3000}"
          echo "==> health check (local, port ${PORT})"
          ready=0
          for _ in $(seq 1 30); do
            if curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
              ready=1
              break
            fi
            sleep 1
          done
          if [ "$ready" -ne 1 ]; then
            echo "ERROR: Node ne répond pas sur 127.0.0.1:${PORT} — voir npx pm2 logs axelmond-research-labs"
            npx pm2 status || true
            exit 1
          fi
          curl -fsS "http://127.0.0.1:${PORT}/api/health"
          echo ""
          echo "==> catalog probe (local)"
          curl -fsS -m 20 "http://127.0.0.1:${PORT}/api/courses" | head -c 200
          echo ""
          curl -fsS "https://axelmond.com/api/health" || echo "WARN: proxy public encore en 503 — redémarrer l'app Node dans hPanel Hostinger si besoin"

echo "==> SEO check (sitemap XML, not HTML)"
curl -fsS "https://axelmond.com/sitemap.xml" | head -n 1 | grep -q '<?xml' && echo "sitemap.xml OK" || echo "WARN: sitemap.xml ne renvoie pas du XML — vérifier le proxy Hostinger"

echo "Deploy terminé."
