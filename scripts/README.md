# Scripts opérationnels

Scripts référencés par `package.json` ou utiles en exploitation. Les one-shots de migration/modularisation sont dans [`archive/`](./archive/).

## CI / CD

GitHub Actions (`.github/workflows/ci.yml`) sur chaque push/PR vers `main` :

| Étape | Commande |
|--------|----------|
| Install | `npm ci` |
| Lint | `npm run lint` |
| Tests | `npm test` |
| Build | `npm run build` |
| Audit | `npm audit --audit-level=high` |
| Secret scan | `npm run ci:secrets` |
| Migrations | `npm run ci:migrations` (PostgreSQL éphémère + drift check) |

Local (hors Postgres) : `npm run ci:secrets` et `node scripts/check-migrations-ci.mjs` (mode offline).  
Pipeline complet local si Postgres disponible : `npm run ci`.

Image Docker : `docker build -t axelmond-research-lab .` puis `docker run --env-file .env -p 3000:3000 axelmond-research-lab`.

## Référencés dans package.json

| Script | Commande npm | Usage |
|--------|--------------|-------|
| `create-admin-user.mjs` | `npm run create:admin` | Créer un compte administrateur |
| `create-professor-user.mjs` | `npm run create:professor` | Créer un compte professeur |
| `generate-vapid-keys.mjs` | `npm run generate:vapid-keys` | Générer les clés Web Push (VAPID) |
| `validate-vapid-keys.mjs` | `npm run validate:vapid-keys` | Vérifier la paire VAPID en `.env` |
| `deploy:migrate` | `npm run deploy:migrate` | Appliquer les migrations Prisma en prod/staging |
| `migrate:status` | `npm run migrate:status` | État Prisma vs base |

## Déploiement et infra

| Script | Usage |
|--------|-------|
| `deploy-hostinger.sh` | Déploiement Hostinger (build, migrate, PM2) |

## Migrations et schéma

**Politique :** uniquement `prisma migrate dev` (local) + `prisma migrate deploy` (CI/prod). Voir [`docs/MIGRATIONS-RUNBOOK.md`](../docs/MIGRATIONS-RUNBOOK.md).

| Script | Usage |
|--------|-------|
| `check-prisma-migrations.mjs` | Comptage `_prisma_migrations` par schéma (Neon) |
| `report-migration-status.mjs` | `migrate status` + alerte checksums `manual-*` |
| `check-migrations-ci.mjs` | Garde-fou CI (`npm run ci:migrations`) |
| `rename-pg-schema.mjs` | Renommer un schéma PostgreSQL (ponctuel) |
| `check-neon-schemas.mjs` | Lister les schémas Neon |

## Diagnostic et smoke tests

| Script | Usage |
|--------|-------|
| `smoke-test.mjs` | Smoke test API local |
| `test-login-local.mjs` | Test login contre instance locale |
| `test-login-db.mjs` | Test login / base de données |
| `test-paypal-order.mjs` | Test création commande PayPal sandbox |
| `audit-user-table.mjs` | Audit table utilisateurs |
| `debug-lines.mjs` | Utilitaire debug (lignes de fichier) |

## Contenu / curriculum (maintenance)

| Script | Usage |
|--------|-------|
| `analyze-curriculum-deps.mjs` | Analyse dépendances curriculum |
| `extract-curriculum-view.mjs` | Extraction one-shot d’une vue curriculum |

## Archive

Voir [`archive/README.md`](./archive/README.md). N’exécutez pas ces scripts en routine — ils ont servi à la modularisation de `server.ts` / `App.tsx` ou à des restaurations ponctuelles.

**Ne pas remettre à la racine :** `delete_modules.cjs` (suppression destructive de courses/enrollments) reste dans `archive/` avec avertissement.
