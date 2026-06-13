# Runbook migrations Prisma — Axelmond Research Labs

> Schéma PostgreSQL : `AxelmondResearchLab` (via `?schema=AxelmondResearchLab` dans `DATABASE_URL`).

## Règle d’or

**Toute évolution de schéma passe par Prisma Migrate.** Interdit en routine :

- scripts SQL ad hoc exécutés en prod sans fichier dans `prisma/migrations/`
- insertion manuelle dans `"AxelmondResearchLab"."_prisma_migrations"`
- `prisma db push` sur production (dev/staging uniquement si explicitement accepté)

Workflow autorisé :

```bash
# Local — créer une migration versionnée
npm run prisma:migrate

# CI / staging / production — appliquer l’historique
npm run deploy:migrate
# ou : npx prisma migrate deploy
```

---

## Déploiement (Hostinger / Docker)

1. Sauvegarde DB (snapshot Neon ou pg_dump).
2. `git pull` + `npm ci` (ou image Docker à jour).
3. **`npm run deploy:migrate`** — seule étape d’application de schéma.
4. `npm run build` puis redémarrage PM2 / conteneur.
5. Vérifier : `npm run migrate:status` et `/api/health`.

Le script `scripts/deploy-hostinger.sh` appelle `prisma migrate deploy` (plus de runner SQL custom).

---

## Diagnostic

```bash
# État Prisma vs base
npm run migrate:status

# Détail des 20 dernières lignes _prisma_migrations + alertes checksum manuel
node scripts/report-migration-status.mjs

# Comptage par schéma (Neon multi-schema)
node scripts/check-prisma-migrations.mjs
```

Checksum **invalide** (ex. `manual-*`, longueur ≠ 64) = migration appliquée hors Prisma → voir « Baselining / réparation ».

---

## Baselining — base déjà à jour sans historique Prisma

**Contexte :** schéma PostgreSQL correspond déjà au code, mais `_prisma_migrations` est vide ou incomplet.

1. Vérifier que le schéma live correspond à `prisma/schema.prisma` :

   ```bash
   npx prisma migrate diff \
     --from-url "$DATABASE_URL" \
     --to-schema-datamodel prisma/schema.prisma \
     --exit-code
   ```

   Exit `0` = pas de drift → on peut baseliner l’historique sans SQL.

2. Marquer chaque migration existante comme appliquée **sans réexécuter le SQL** :

   ```bash
   npx prisma migrate resolve --applied 20260529154000_init
   npx prisma migrate resolve --applied 20260530102000_course_content_uploadthing
   # … répéter pour chaque dossier sous prisma/migrations/ dans l’ordre chronologique
   ```

3. Contrôler : `npm run migrate:status` → « Database schema is up to date ».

---

## Réparation — migration SQL déjà appliquée, ligne `_prisma_migrations` absente ou checksum faux

**Symptôme :** `migrate deploy` tente de recréer des tables existantes, ou erreur « migration was modified ».

1. Confirmer que les objets de la migration existent déjà (tables/colonnes).
2. Si SQL **déjà appliqué**, marquer comme appliqué :

   ```bash
   npx prisma migrate resolve --applied <migration_name>
   ```

3. Si une ligne `_prisma_migrations` a un checksum `manual-*` (legacy) et bloque Prisma :
   - Option A (recommandée) : supprimer la ligne incorrecte **puis** `migrate resolve --applied` (après backup).
   - Option B : laisser Prisma recalculer via resolve après alignement du schéma.

4. Re-tester : `npm run deploy:migrate` sur une copie de staging avant prod.

---

## Drift — schéma live ≠ `schema.prisma`

1. **Ne pas** corriger à la main en prod.
2. Local : `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > patch.sql`
3. Revoir `patch.sql`, créer une migration propre : `npx prisma migrate dev --name fix_drift`.
4. Commit + `migrate deploy` en staging puis prod.

---

## CI

`npm run ci:migrations` sur PostgreSQL éphémère :

- validate du schéma
- `migrate deploy` sur base vide
- `migrate diff` → exit non nul si drift

Les scripts historiques `apply-*-migration.mjs` sont **archivés** ; leur réintroduction est bloquée par `tests/migration-policy.test.ts`.

---

## Historique legacy (ne plus utiliser)

| Script archivé | Problème |
|----------------|----------|
| `scripts/archive/apply-messaging-notifications-migration.mjs` | INSERT manuel dans `_prisma_migrations` (checksum `manual-*`) |
| `scripts/archive/apply-user-auth-migration.mjs` | SQL direct sans suivi Prisma |

Si une prod a encore un checksum `manual-messaging-notifications`, suivre « Réparation » pour `20260607140000_messaging_notifications`.
