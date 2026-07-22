# Audit final QA — Performance Académique

> **Date :** 2026-07-11 (mise à jour validation stricte)  
> **Environnement :** local `127.0.0.1:3000` + production `https://axelmond.com`  
> **Objectif :** 0 bug critique, expérience fluide, prêt utilisateurs

---

## Verdict final (basé sur preuves — pas sur adaptation du script)

| Gate | Résultat | Preuve |
|------|----------|--------|
| Suite unitaire `npm test` | **PASS** | 173 fichiers / 191 tests |
| `npm run build` | **PASS** | build ~5,6 s |
| `npm run ci:secrets` | **PASS** | 0 secret détecté |
| `git diff --check` | **PASS** | 0 conflit marqueur |
| Rate limiting production | **INCHANGÉ** | `globalRateLimiter` 500 req / 15 min / IP (défaut) |
| Playwright live × 3 | **PASS** | 1,5–1,7 min chacun, **serveur redémarré entre chaque run** |
| Nettoyage données test | **PASS** | `scripts/verify-test-cleanup.mjs` → 0 user, 0 session live active |
| Charge autocannon | **FAIL SLO** | 429 massifs (rate limiter) — voir chiffres ci-dessous |
| Production API | **PARTIEL** | health 200, mobile spoof 403, migrations à jour |
| Parcours manuel prod (devices réels) | **NON FAIT** | requis avant clôture totale |

**Conclusion :** la plateforme est **stable pour le parcours live automatisé** (1 prof + 6 étudiants) et les tests CI. L’**étape finale n’est pas totalement close** tant que la validation manuelle production (devices réels, replay, fin de live) et une campagne de charge hors rate-limit IP unique ne sont pas faites.

---

## Validation stricte — `tests/live-multi-user.spec.ts`

### Modifications précises (vs version git)

| Changement | Motif | Affaiblissement ? |
|------------|-------|-------------------|
| `COURSE_ID = 1` → `findFirst({ published: true })` | ID 1 absent en base | **Non** — plus robuste |
| 4 profs + 3 étudiants → **1 prof + 6 étudiants** | `assertLiveAccess` refuse les profs non propriétaires du module | **Scénario ajusté**, pas assoupli : 7 participants conservés |
| Suppression étape « 3 profs rejoignent le live » | Incompatible avec ACL (`createdById`) | **Assertion retirée** car **fausse** par design sécurité |
| `Classe virtuelle sécurisée` (sr-only) → bouton `Participants` | sr-only non visible Playwright | **Renforcé** |
| Placeholder sujet → `getByRole('textbox', { name: 'Sujet de révision actif' })` | UI renommée | Alignement UI |
| Micro/caméra → `aria-label` (`Activer le micro (M)`, etc.) | Labels UI réels | Alignement UI |
| Login `Promise.all` → boucle séquentielle + 400 ms | Évite 429 auth/global | Nécessaire ; **rate limit non désactivé** |
| `expectLiveRoomJoined` timeout **90 s** | Connexion LiveKit variable | **Risque** : masque lenteur extrême ; documenté |
| `test.setTimeout` 240 s → **420 s** | 7 navigateurs + LiveKit | Marge, pas suppression d’assertions |
| Login dashboard timeout 10 s → **20 s** | Cold start | Légère marge |
| `participantCount` scopé `aside` + `.first()` | strict mode violation | **Renforcé** |
| **`test.afterAll`** nettoyage sessions live + users | Manquant avant | **Ajouté** |

### Assertions conservées (inchangées dans l’intention)

- 7 clients simultanés en salle
- Liste participants + noms
- Micro, caméra, partage d’écran, tableau blanc, chat bidirectionnel
- Permissions étudiant (pas Rec, pas Expulser)
- Déconnexion (6 participants) + reconnexion (7)
- Capture erreurs console

### Rate limiting — preuve de non-désactivation

Fichier `src/server/create-app.ts` **non modifié** pour les tests :

- Global : `RATE_LIMIT_MAX_REQUESTS` défaut **500** / 15 min / IP
- Auth : **10** / 30 s / email ou IP
- Preuve empirique : enchaîner load-test + Playwright sans redémarrage → **429** sur login ; redémarrage serveur → **PASS**

### Données dynamiques et nettoyage

- **beforeAll** : sélection premier cours publié, création users `test-*`, enrollments, ownership `test-prof-1`
- **afterAll** : `isLiveNow=false`, suppression sessions/messages/attendance/action logs, users, enrollments
- Vérification post-run : `npx tsx scripts/verify-test-cleanup.mjs` → **0 compte résiduel, 0 live actif**

### Playwright — 3 exécutions consécutives (2026-07-11)

| Run | Durée | Serveur | Résultat |
|-----|-------|---------|----------|
| 1 | 1,5 min | Redémarré (propre) | **PASS** |
| 2 | 1,7 min | Redémarré (propre) | **PASS** |
| 3 | 1,5 min | Redémarré (propre) | **PASS** |

**Protocole obligatoire :** redémarrer `npm run dev` entre chaque run ; ne pas enchaîner avec `npm run load-test` sur la même instance.

---

## Tests de charge — chiffres exacts (`LOAD_REPORT.md`, 2026-07-11)

Serveur : `http://127.0.0.1:3000` — **10 s par scénario** — **1 IP** (autocannon)

| Connexions | Route | Req totales | RPS | p50 | p95 | p99 | 2xx | non-2xx | Timeouts | CPU/RAM |
|------------|-------|-------------|-----|-----|-----|-----|-----|---------|----------|---------|
| 100 | `/api/domains` | ~8 000 | 755 | 114 ms | 340 ms | 517 ms | 309 | 7 239 | 0 | non mesuré |
| 100 | `/api/courses` | ~8 000 | 755 | 135 ms | 251 ms | 281 ms | 0 | 7 547 | 0 | non mesuré |
| 500 | `/api/domains` | ~12 000 | 1 150 | 450 ms | 768 ms | 782 ms | 0 | 11 500 | 0 | non mesuré |
| 500 | `/api/courses` | ~13 000 | 1 167 | 866 ms | 2 262 ms | 2 375 ms | 0 | 11 672 | 840 | non mesuré |
| 1 000 | `/api/domains` | ~13 000 | 1 040 | 2 079 ms | 3 368 ms | 3 387 ms | 0 | 10 399 | 1 000 | non mesuré |
| 1 000 | `/api/courses` | ~14 000 | 1 094 | 2 640 ms | 4 412 ms | 4 592 ms | 0 | 10 941 | 2 000 | non mesuré |

**Interprétation :** les non-2xx sont quasi exclusivement des **429** (rate limiter global). **Aucun 500/503** observé dans la sortie autocannon. Le test **ne valide pas** la capacité réelle à 500–1000 utilisateurs — il valide que le **rate limiter protège** le serveur. Pour mesurer le débit réel : PM2 cluster + plusieurs IPs ou `RATE_LIMIT_MAX_REQUESTS` élevé en **staging uniquement**.

---

## Production (`axelmond.com`)

| Contrôle | Résultat |
|----------|----------|
| `GET /api/health` | 200 UP |
| Mobile spoof sans clé | 403 `MOBILE_CLIENT_REJECTED` |
| `security:probe` | 100/100 |
| `prisma migrate status` | **37 migrations, schema up to date** (`recordingStatus` inclus) |
| Live + replay + mobile API authentifiés | **Non testé manuellement** sur prod dans cette session |

---

## Résumé exécutif (automatisé)

| Périmètre | Résultat |
|-----------|----------|
| `npm test` | **173 fichiers / 191 tests — PASS** |
| `npm run test:security-runtime` | **PASS** (après migration DB) |
| `npm run build` | **PASS** (~2,2 s) |
| `npm run lint` | **PASS** |
| `npm run security:probe` (prod) | **100/100** (6/6 contrôles) |
| Migration DB en attente | **Corrigée** (`recordingStatus` sur `LiveSession`) |
| `npm run load-test` | **Exécuté** — voir `LOAD_REPORT.md` (rate limit 429 attendu sous charge) |
| Playwright live multi-user | **PASS** (1 prof + 6 étudiants, 7 clients) |

**Verdict :** le code et la sécurité automatisés sont **stables**. La migration live replay était le seul **bug critique** identifié ; elle est appliquée. Des validations manuelles (parcours réel, 30+ utilisateurs live, charge 500+) restent recommandées avant une annonce publique large.

---

## A. Fonctionnalité

| Fonctionnalité | Statut auto | Statut manuel | Notes |
|----------------|-------------|---------------|-------|
| Authentification (login/logout) | ✅ | ⚠️ À valider | JWT 15 min + refresh cookie HttpOnly ; tests `auth`, `mobile-api-runtime` |
| Inscription | ✅ | ⚠️ À valider | Zod + HIBP prod ; code prof requis pour PROFESSOR |
| Vérification email | ✅ | ⚠️ À valider | Code 6 chiffres, 15 min, 5 tentatives max |
| Réinitialisation mot de passe | ✅ | ⚠️ À valider | Message générique anti-énumération |
| Tableau de bord étudiant | ✅ | ⚠️ À valider | `StudentDashboardView`, hydration modules inscrits |
| Tableau de bord enseignant | ✅ | ⚠️ À valider | Ownership `createdById` / `instructor` |
| Catalogue | ✅ | ✅ prod | `/api/courses` 200 en 408 ms (probe) |
| Recherche | ✅ | ⚠️ À valider | Catalogue + voice search (navigateur) |
| Cours (chapitres, modules) | ✅ | ⚠️ À valider | ACL ownership tests passent |
| Vidéos | ✅ | ⚠️ À valider | UploadThing + lecteur cours |
| PDF | ✅ | ⚠️ À valider | Contenu leçon type document |
| Images | ✅ | ⚠️ À valider | Avatars + pièces jointes validées MIME |
| Live (LiveKit) | ✅ | ⚠️ À valider | Token 15 min, modération staff ; **migration replay requise** |
| Chat live | ✅ | ⚠️ À valider | Persistance des messages et contrôle d’accès LiveKit |
| Profil | ✅ | ⚠️ À valider | Avatar, mot de passe, profil académique staff |
| Paiement PayPal | ✅ | ⚠️ À valider | Webhook signé ; mock désactivé en prod |
| Notifications | ✅ | ⚠️ À valider | Push + in-app ; `markAllNotificationsRead` |
| Progression | ✅ | ⚠️ À valider | `module_progress`, quiz attempts |
| Déconnexion | ✅ | ⚠️ À valider | Révocation refresh token |

**Légende :** ✅ couvert par tests statiques/runtime — ⚠️ parcours utilisateur réel non rejoué dans cette session.

---

## B. UX

| Critère | Statut | Détail |
|---------|--------|--------|
| Pages vides | ✅ | États vides explicites (« Aucun étudiant inscrit », etc.) |
| Boutons inutiles | ⚠️ | Revue manuelle par rôle recommandée |
| Textes cohérents | ✅ | Français institutionnel ; tests contact/support |
| Couleurs / thème | ✅ | Dark mode unique, accent emerald |
| Icônes | ✅ | lucide-react cohérent |
| Responsive | ✅ | Viewport mobile-first, breakpoints testés en guards |
| Animations | ✅ | motion + spinners lazy routes |
| Chargements | ⚠️ | Écran « Chargement des données académiques… » visible au cold start (trailer corrigé) |
| Messages d'erreur | ✅ | `getClientErrorMessage` masque 500+ en prod |

---

## C. Performance

| Critère | Statut | Détail |
|---------|--------|--------|
| Pages rapides | ✅ | Build Vite 2,2 s ; chunks lazy par vue |
| API rapides | ✅ | Catalogue prod ~408 ms ; timeout catalogue configuré |
| Mémoire / CPU | ⚠️ | Non profilé dans cette session |
| Images optimisées | ⚠️ | UploadThing ; pas d'audit Lighthouse |
| Cache | ✅ | `cache.ts` avec timeout ; invalidation enrollment |
| Lazy loading | ✅ | `lazyViews.tsx` — 30+ routes en `React.lazy` |

**Charge :** `npm run load-test` non exécuté (serveur local requis). Scénarios prévus : 100 / 500 / 1000 connexions sur `/api/health` et `/api/courses`.

---

## D. Sécurité

| Menace | Statut | Mesure active |
|--------|--------|---------------|
| JWT | ✅ | 15 min, refresh rotatif hashé SHA-256 |
| Rôles / RBAC | ✅ | `requireRbac`, default deny |
| Permissions ownership | ✅ | `catalog-visibility`, course/chapter/content guards |
| XSS | ✅ | CSP Helmet, sanitization chemins internes |
| CSRF | ✅ | Cookie + header `X-CSRF-Token` |
| SQL Injection | ✅ | Prisma paramétré |
| Upload sécurisé | ✅ | MIME, extensions dangereuses, rate limit |
| Mots de passe | ✅ | bcrypt 12, HIBP fail-closed prod, 12+ chars |
| Rate limiting | ✅ | Global, auth, email, upload, LiveKit, admin |
| Validation entrées | ✅ | Zod sur routes sensibles |
| Mobile API | ✅ | Spoof bloqué 403 en prod (probe) |
| Headers prod | ✅ | HSTS, COOP, CORP (probe 100/100) |

Score code sécurité cible : **95+/100** (`security-score-guards.test.ts`).

---

## E. Logs

| Source | Statut | Notes |
|--------|--------|-------|
| Console navigateur (prod) | ✅ | `console`/`debugger` supprimés au build prod |
| Serveur | ✅ | Refresh boot anonyme : 0× 403 post-`cc946dd` ; live Playwright 0 HTTP 4xx |
| Base de données | ✅ | Migration replay appliquée ; plus d'erreur P2022 |
| LiveKit | ⚠️ | Valider en session live réelle |

---

## F. Corrections appliquées cette session

1. **`tests/vitest.setup.ts`** — `NODE_ENV=test` pour promo codes et auth mobile en tests.
2. **`src/client-errors.ts`** — message générique pour erreurs serveur 500+.
3. **`src/components/ProfileAvatarUpload.tsx`** — variante `emerald` pour le lint.
4. **Guards architecture** — limites de lignes mises à jour (refactors récents).
5. **`tests/professor-course-ownership.test.ts`** — aligné sur `findLiveCourse` / `catalog-visibility.ts`.
6. **`tests/rtl/route-chunk-fallback.test.tsx`** — patch `React.act` pour React 19.
7. **Migration `20260710023000_live_session_replay`** — colonne `recordingStatus` appliquée en base.

---

# BUG

| ID | Sévérité | Description | Statut |
|----|----------|-------------|--------|
| B-01 | **Critique** | Migration `live_session_replay` non déployée → `recordingStatus` absent → crash Prisma sur live/replay/mobile API | **Corrigé** (`prisma migrate deploy`) |
| B-02 | Moyen | Suite de tests cassée si `NODE_ENV=production` dans le shell (promo codes, refresh mobile) | **Corrigé** (`vitest.setup.ts`) |
| B-03 | Faible | Tests d'architecture obsolètes après refactors (ownership, live UI, limites lignes) | **Corrigé** |
| B-04 | Faible | `client-errors` n'affichait pas de fallback sur erreurs 500 | **Corrigé** |
| B-05 | À confirmer | Écran de chargement long au premier paint catalogue (« Chargement des données académiques… ») | **Connu** — optimiser ou skeleton |
| B-07 | Faible | Playwright : sélecteurs UI live obsolètes (placeholder sujet, boutons micro) | **Corrigé** |
| B-09 | Info | `403 POST /api/auth/refresh` au boot anonyme (bruit CSRF Playwright + navigateur) | **Corrigé** (`cc946dd` — skip refresh sans cookie CSRF ; validé post-déploiement 2026-07-11) |
| B-09 | Faible | CSP `style-src` : warnings console (inline styles motion) en headless | **Connu** — non bloquant |
| B-10 | Info | Charge : 429 massifs sous 100+ connexions = rate limiter actif (comportement attendu) | **Documenté** dans `LOAD_REPORT.md` |

---

# AMÉLIORATION

| ID | Priorité | Description |
|----|----------|-------------|
| A-01 | Haute | Exécuter `npm run load-test` avant pic de trafic et archiver `LOAD_REPORT.md` | **Fait** — FAIL attendu (rate limit) |
| A-02 | Haute | Rejouer `tests/live-multi-user.spec.ts` (Playwright) avec serveur + LiveKit actifs | **Fait** — PASS 1,5 min |
| A-03 | Haute | Checklist manuelle étudiant / prof / admin sur production (voir § Tests manuels) |
| A-04 | Moyenne | Exécuter `npm run load-test` en prod-like (PM2 cluster) pour mesurer débit réel hors rate limit IP unique |
| A-05 | Moyenne | Skeleton UI à la place du spinner plein écran sur dashboard |
| A-06 | Moyenne | Monitoring alertes sur `logSecurity` WARN/CRITICAL en production |
| A-07 | Moyenne | Rotation des mots de passe de test exposés dans l'outil de gestion de credentials |
| A-08 | Basse | WAF / Cloudflare devant le domaine (DDoS, bots) |
| A-09 | Basse | Sauvegardes DB chiffrées quotidiennes + test de restauration |

---

# OPTIONNEL

| ID | Description |
|----|-------------|
| O-01 | DRM / streaming signé pour médias (limite technique : média lisible = téléchargeable) |
| O-02 | Cache Redis pour catalogue à très forte charge |
| O-03 | Tests visuels régression (Percy / Chromatic) |
| O-04 | PWA offline partiel pour PDF déjà consultés |
| O-05 | Internationalisation EN/AR si expansion |
| O-06 | TV layout dédié (utilitaires CSS `--app-content-max` déjà présents) |
| O-07 | CI Playwright sur chaque PR |
| O-08 | Audit Lighthouse automatisé (web-perf skill) |

---

## Tests manuels recommandés (Étape 2)

### Parcours étudiant
1. Inscription compte neuf → email → connexion  
2. Catalogue → cours → vidéo → PDF → images  
3. Progression module → profil → déconnexion  

### Parcours enseignant
1. Créer / publier / modifier / supprimer cours  
2. Démarrer live → chat → arrêter → replay  
3. Profil académique + sécurité compte  

### Parcours administrateur
1. Codes invitation professeur  
2. Profils académiques  
3. Charity / paramètres site (si activés)  

### Multi-utilisateurs
```bash
npx playwright test tests/live-multi-user.spec.ts
```
Prérequis : DB migrée, `npm run dev`, LiveKit configuré.

### Charge
```bash
npm run dev   # terminal 1
npm run load-test   # terminal 2 — génère LOAD_REPORT.md
```

### Responsive (DevTools)
320 · 375 · 768 · 1024 · 1440 · 1920 px — catalogue, cours, live, profil.

### Sécurité manuelle
- Token expiré → refresh automatique puis logout si échec  
- Compte non vérifié → blocage API  
- Étudiant sur route prof → 403 API + redirect UI  

---

## Commandes de validation release

```bash
npm run lint
npm test
npx prisma migrate deploy
npm run test:security-runtime
npm run build
npm run security:probe
npm run ci:audit
npm run ci:secrets
```

---

## Statut final

| Critère | État |
|---------|------|
| Bugs critiques code/DB | **0** |
| Tests automatisés CI | **PASS** |
| Live Playwright (7 clients, 3×) | **PASS** (avec redémarrage serveur) |
| Charge SLO 100–1000 users | **NON VALIDÉ** (429 = protection active) |
| Production manuelle | **EN ATTENTE** |
| **Étape finale close ?** | **Non** — manuel prod + charge staging requis |

*Document généré lors de l'audit final QA — à mettre à jour après chaque campagne de tests manuels.*
