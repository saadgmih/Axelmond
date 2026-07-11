# Analyse — `403 POST /api/auth/refresh` (tests live production)

Date : 2026-07-11  
Environnement : https://axelmond.com  
Contexte : 3 runs Playwright `manual-prod-live.spec.ts` — **2× `403 /api/auth/refresh` par run** (prof + étudiant)

## Cause exacte

Le **403** n’est **pas** un rejet de refresh token. C’est le middleware CSRF (`src/auth-csrf.ts`) qui répond :

```json
{ "error": "Jeton CSRF invalide ou manquant", "code": "CSRF_TOKEN_INVALID" }
```

`/api/auth/refresh` est une route **POST** non exemptée du CSRF. Elle exige :

1. Cookie `refresh_token` (HttpOnly, path `/api/auth`)
2. Header `X-CSRF-Token` **identique** au cookie `csrf_token` (path `/`)

### Séquence observée (diagnostic Playwright)

| Phase | Appel refresh | Résultat |
|-------|---------------|----------|
| **pre-login** (boot `useAppSession`) | `getFreshSessionToken()` → `performSessionRefresh()` sans cookie CSRF ni mémoire | **403** CSRF_TOKEN_INVALID |
| **post-reload** (après connexion UI) | Cookies présents, CSRF lu depuis `document.cookie` | **200** OK |

Reproduction API (script `scripts/diagnose-refresh-403.mjs`) :

- Sans header `X-CSRF-Token` → **403** `CSRF_TOKEN_INVALID`
- Avec CSRF valide + cookies → **200**
- Sans cookies → **403** (CSRF bloque avant la route refresh)

## Headless Playwright uniquement ?

**Non.** Le 403 pre-login se produit dans **headless et headed** Chromium. Ce n’est pas spécifique au mode headless.

Ce qui est spécifique aux tests automatisés :

- **2 contextes** (prof + étudiant) → **2× 403 pre-login** par run (un par `page.goto` initial)
- Les métriques Playwright comptent ces requêtes ; un navigateur réel ouvert une fois n’en génère qu’**une** au chargement initial

## Boucle de refresh ?

**Non.** `refreshSessionToken()` déduplique via `refreshPromise` (un seul refresh concurrent).  
Parcours typique par contexte :

1. Boot → 1× refresh (403 avant correctif client, ou skip après correctif)
2. Login UI → token en mémoire (JWT 15 min)
3. Reloads étudiant → 1× refresh **200** si cookies valides

Aucune rafale de dizaines de refresh observée (sauf saturation rate-limit lors d’enchaînements de runs trop rapprochés — autre sujet).

## Déconnexion / impact utilisateur ?

| Scénario | Impact |
|----------|--------|
| Visiteur **non connecté** (boot) | 403 sans conséquence UI ; pas de session à restaurer |
| Utilisateur **connecté** + reload | Refresh **200** → session restaurée (confirmé diagnostic) |
| Tests live 3/3 PASS | Aucune déconnexion silencieuse pendant le parcours |

Avant correctif : un 403 pre-login déclenchait `notifySessionExpired()` inutilement (bruit interne, pas de bug live).

## Logs production

Sans accès direct aux logs serveur dans cette session, le comportement attendu côté API :

- **403** `CSRF_TOKEN_INVALID` sur `POST /api/auth/refresh` depuis IP de test Playwright
- **Pas** de `Invalid refresh token attempt` (401) ni `Refresh token reuse` pour ces événements
- Volume : ~2 par run live × 3 runs ≈ 6 entrées CSRF sur la fenêtre de test (négligeable vs trafic réel)

Recommandation ops : filtrer / ne pas alerter sur `CSRF_TOKEN_INVALID` + path `/api/auth/refresh` sans refresh cookie valide.

## Fuite de données (traces / rapports / captures)

Vérification :

- `docs/PROD-LIVE-TEST-REPORT.md` — aucun email, JWT, cookie, mot de passe
- `docs/PROD-LIVE-REAL-MANUAL.md` — aucun identifiant
- `test-results/` — gitignoré, non commité ; captures avec masquage champs email Playwright
- Helpers `redactSecrets()` pour logs/métriques
- `npm run ci:secrets` — OK sur le dépôt

## Correctif appliqué (sans affaiblir la sécurité)

**Fichier :** `src/api.ts` — `performSessionRefresh()`

Ne pas appeler `/api/auth/refresh` si absence de CSRF (cookie/mémoire) **et** pas de legacy mobile refresh body.  
→ Évite le 403 CSRF au boot anonyme ; **ne modifie pas** le middleware serveur ni les ACL live.

## Test manuel réel restant

Voir `docs/PROD-LIVE-REAL-MANUAL.md` (PC + mobile, vrai A/V, partage écran, Wi-Fi, replay).
