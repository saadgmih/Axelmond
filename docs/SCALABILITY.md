# Scalabilité — Cache, rate limiting et protocole de test de charge

> Mis à jour : 2026-08-23 — suite au rapport LOAD_REPORT.md du 2026-07-11 (FAIL à 500/1000 utilisateurs).

## Résumé des correctifs

| Problème constaté (rapport 2026-07-11)              | Cause racine                                                                                                                                                       | Correctif                                                                                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~100 % d'erreurs à partir de 500 users              | Le test charge depuis **une seule IP** → le rate limiter global (500 req/15min/IP) renvoie des 429 après ~1 seconde                                                | Mode protocole `LOAD_TEST_MODE=1` (hors production) + preflight automatique dans `tests/load-report.ts`                                                                                      |
| Comptage d'erreurs > 100 %                          | Formule buggy : `(result.errors \|\| 0) + (result["2xx"] ? 0 : result.requests.total)` comptait toutes les requêtes en erreur dès que le compteur 2xx était absent | `errors = result.errors + result.non2xx` + répartition 2xx/3xx/4xx/5xx dans le rapport                                                                                                       |
| Cache LRU mémoire par worker                        | En cluster PM2, chaque worker a son propre cache (incohérence, efficacité ÷ N)                                                                                     | `src/cache.ts` bascule automatiquement sur Redis quand `REDIS_URL` est défini (déjà en place), documenté ici                                                                                 |
| Rate limits par worker                              | express-rate-limit utilise un store mémoire par défaut → les limites sont multipliées par le nombre de workers                                                     | `src/rate-limit-redis.ts` : store Redis partagé (script Lua INCR+PEXPIRE atomique), injecté dans les 20 limiteurs de `create-app.ts`, **fail-open** si Redis tombe (`passOnStoreError`)      |
| `/api/courses` renvoie tout le catalogue            | Payload complet à chaque demande                                                                                                                                   | Pagination opt-in : `?page=1&pageSize=50` (max 100) → `{ items, page, pageSize, total, totalPages }`. Sans paramètres, réponse identique à avant (rétrocompatible)                           |
| Pas de cache HTTP navigateur/CDN sur l'API publique | Middleware global `no-store` sur `/api`                                                                                                                            | `src/server/http-cache.ts` : ETag fort + `If-None-Match` → **304** sans corps + `Cache-Control: public, max-age=30, stale-while-revalidate=60` sur les GET catalogue **anonymes** uniquement |

## Activer Redis (recommandé dès le cluster PM2)

```bash
# .env (production Hostinger via build-hostinger-env — la clé passe automatiquement)
REDIS_URL="redis://localhost:6379"
# Optionnels :
# REDIS_KEY_PREFIX="axelmond:cache:"      # préfixe du cache applicatif
# REDIS_RATE_LIMIT_PREFIX="axelmond:rl:"  # préfixe des compteurs de rate limit
```

Effets :

1. **Cache catalogue partagé** — tous les workers servent la même entrée Redis (TTL 60 s par défaut).
2. **Rate limits globaux** — les 20 limiteurs (global, auth, PayPal, LiveKit, admin, messaging…) comptent dans Redis : une limite de 500 req/15min/IP devient réellement 500, pas 500 × workers.
3. **Résilience** — si Redis tombe en cours de route : le cache retombe en mémoire (au pire par worker), les limiteurs **laissent passer** les requêtes (`passOnStoreError: true`) — on préfère un emballement temporaire à un blocage total des utilisateurs.

## Protocole de test de charge (corrigé)

```bash
# 1. Démarrer le serveur en mode protocole (désactive le rate limit global,
#    refusé si NODE_ENV=production, retiré du .env de prod par build-hostinger-env)
LOAD_TEST_MODE=1 npm run dev

# 2. Lancer le rapport (le preflight vérifie /api/health → diagnostics.loadTestMode)
npm run load-test
```

Le preflight échoue avec un message explicite si le serveur n'est pas en `LOAD_TEST_MODE=1` (contournement volontaire : `LOAD_TEST_SKIP_PREFLIGHT=1`). Le rapport distingue désormais les 429 (rate limiting) des vraies erreurs 5xx et affiche la répartition des codes HTTP par scénario.

## Impact attendu

- **Anonymes + cache** : p99 attendu < 100 ms (hit cache + ETag 304 sans corps) ; le CDN/navigateur peut servir 30 s sans rappeler l'origine.
- **Cluster PM2 + Redis** : cohérence des compteurs, un seul calcul de catalogue chaud pour tous les workers.
- **Vraies limites** : les SLO de rate limiting redeviennent crédibles (1 limite globale, pas N).

## Ce qui reste à faire (hors périmètre de ce correctif)

- CDNs : servir `/assets/*` avec `immutable, max-age=31536000` (les noms de fichiers sont déjà hashés par Vite) — configuration Hostinger hCDN.
- Pool Postgres : ajuster `connection_limit` si le nombre de workers augmente.
- Envisager `stale-while-revalidate` sur `/api/domains` pour les visiteurs authentifiés (aujourd'hui réservé aux réponses anonymes).
