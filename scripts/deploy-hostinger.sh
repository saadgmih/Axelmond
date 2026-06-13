#!/usr/bin/env bash
set -euo pipefail

# Déploiement production Hostinger — Axelmond Research Labs
# Usage (SSH Hostinger) :
#   cd ~/domains/axelmond.com/public_html   # adapter si besoin
#   bash scripts/deploy-hostinger.sh

echo "==> git pull"
git pull origin main

echo "==> npm install"
npm install

echo "==> prisma generate"
npx prisma generate

echo "==> messaging/notifications migration (Neon)"
node scripts/apply-messaging-notifications-migration.mjs

echo "==> build"
npm run build

echo "==> pm2 reload"
npm run reload:cluster

echo "==> health check"
curl -fsS "https://axelmond.com/api/health" || curl -fsS "http://127.0.0.1:3000/api/health"

echo "Deploy terminé."
