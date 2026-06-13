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

echo "==> prisma migrate deploy"
npx prisma migrate deploy

echo "==> build"
npm run build

echo "==> pm2 reload"
npm run reload:cluster

echo "==> health check"
curl -fsS "https://axelmond.com/api/health" || curl -fsS "http://127.0.0.1:3000/api/health"

echo "==> SEO check (sitemap XML, not HTML)"
curl -fsS "https://axelmond.com/sitemap.xml" | head -n 1 | grep -q '<?xml' && echo "sitemap.xml OK" || echo "WARN: sitemap.xml ne renvoie pas du XML — vérifier le proxy Hostinger"

echo "Deploy terminé."
