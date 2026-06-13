# Scripts archivés (legacy)

One-shots utilisés pendant la modularisation du serveur (`server.ts` → `src/routes/`) et de l’app (`App.tsx` → `src/app/`). **Ne pas exécuter en production** sauf reprise volontaire d’une migration interrompue.

## Modularisation serveur

- `rebuild-modular-server.mjs` — régénère les modules depuis `server-backup.ts` (snapshot pré-modularisation)
- `regenerate-routes-from-backup.mjs`, `extract-startup-db.mjs`, `build-route-deps.mjs`
- `split-server-routes.mjs`, `split-route-modules.mjs`, `split-courses-routes.mjs`
- `slim-server.mjs`, `apply-api-prefix.mjs`, `fix-route-deps.mjs`, `patch-route-modules.mjs`

## Modularisation App / tests

- `split-app.mjs`, `patch-app-tests.mjs`, `fix-app-tests.mjs`
- `patch-tests-api-sources.mjs`, `fix-test-imports.mjs`, `fix-tests.mjs`, `fix-ui-test.mjs`

## Restaurations App (chemins absolus obsolètes)

- `restore-step1.mjs`, `restore-step2.mjs`, `restore-phase2-wiring.mjs`
- `patch-fixes.mjs`, `patch-fixes2.mjs`, `fix-extract.mjs`

## Migrations SQL manuelles (interdit en prod)

- `apply-messaging-notifications-migration.mjs` — INSERT `manual-*` dans `_prisma_migrations` ; remplacé par `npm run deploy:migrate`
- `apply-user-auth-migration.mjs` — SQL direct sans Prisma Migrate

Voir [`docs/MIGRATIONS-RUNBOOK.md`](../../docs/MIGRATIONS-RUNBOOK.md) pour baselining / réparation checksum legacy.

## Autres

- `patch-prisma-multischema.mjs` — patch Prisma multi-schéma (historique)
- `server-backup.ts` — copie de `server.ts` avant extraction des routes
- `tmp-payments-extract.txt` — extrait temporaire routes paiements

## ⚠️ Destructif

`delete_modules.cjs` supprime **tous** les courses, enrollments, live sessions, quizzes et contenu associé. Conservé uniquement comme référence d’urgence — **jamais** à la racine du dépôt.

```bash
# Exemple (à vos risques) :
node scripts/archive/delete_modules.cjs
```
