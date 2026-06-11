# Rapport Phase Mobile V2.0 — Infrastructure

Date : 11 juin 2026  
Statut : **Terminé** (sans UI LiveKit)

---

## Objectif

Préparer toute l’infrastructure V2 avant audio/vidéo/chat :
- Auth JWT fiable
- Couche API LiveKit
- Catalog backend complet
- Configuration EAS + plugins natifs

---

## Résumé

| Zone | Résultat |
|------|----------|
| Flux auth (refresh proactif + session UI) | ✅ Implémenté |
| `live.api.ts` (7 méthodes) | ✅ |
| Catalog `/api/mobile/routes` section `live` | ✅ Backend |
| EAS + permissions + plugins | ✅ Configurés |
| UI LiveKit | ⏸ Non démarrée (volontaire) |
| Build EAS cloud | ⏸ En attente `eas init` |

---

## Fichiers créés

| Fichier | Description |
|---------|-------------|
| `src/services/api/live.api.ts` | Facade REST LiveKit |
| `eas.json` | Profils EAS development / preview / production |
| `scripts/validate-v2-infra.mjs` | Validation statique + smoke token |
| `docs/MOBILE-V2-PLAN.md` | Plan maître V2 |

---

## Fichiers modifiés

| Fichier | Changement |
|---------|------------|
| `src/services/api/client.ts` | `getFreshAccessToken` dans `apiRequest`, `onSessionInvalidated` |
| `src/hooks/useAuth.tsx` | Cold start refresh, listener invalidation |
| `src/services/api/index.ts` | Export `liveApi`, `onSessionInvalidated` |
| `src/types/index.ts` | Types LiveKit (events, moderation, attendance) |
| `app.json` | Plugins LiveKit/WebRTC, permissions, `expo-dev-client` |
| `package.json` | Dépendances natives + scripts EAS/validate |
| `package-lock.json` | Lock deps LiveKit |
| `scripts/test-ui-flow.mjs` | Checks V2.0 infra |
| `../src/mobile-api-routes.ts` | Catalog `live` + routes student/teacher étendues |
| `../tests/mobile-api.test.ts` | Assertions catalog live |

---

## Tests exécutés

| Commande | Résultat |
|----------|----------|
| `npm run typecheck` | ✅ OK |
| `npm run test:ui` | ✅ OK (18 checks incl. live.api + EAS) |
| `npm run test:api` | ✅ OK (`/api/mobile/routes` incl. section `live` en prod) |
| `npm run validate:v2-infra` | ✅ 13/13 (API locale) |
| `npx tsx --test tests/mobile-api.test.ts` | ✅ OK |

---

## Risques restants

1. **Build EAS non prouvé** — config prête, `eas init` + premier build requis
2. **Production** — patch mobile backend à déployer pour device sans `.env.local`
3. **Expo Go** — incompatible LiveKit ; communiquer dev client uniquement
4. **Node 23** — warnings engines ; recommander Node 20 LTS pour builds
5. **Pas de tests unitaires auth** — couverture scripts smoke uniquement

---

## Estimation mise à jour (post-V2.0)

| Phase | Durée estimée | Statut |
|-------|---------------|--------|
| V2.0 Infrastructure | 3–5 j | ✅ Fait (~1 session) |
| V2.1 Join + A/V | 5–7 j | À faire |
| V2.2 Chat | 2–3 j | À faire |
| V2.3 Reconnexion | 3–4 j | À faire |
| V2.4 Enseignant | 3–4 j | À faire |
| V2.5 QA device | 4–5 j | À faire |
| **Total restant** | **~17–23 j** | |

---

## Prochaine action recommandée

1. `cd axelmond-mobile && npx eas init`
2. `npm run build:dev:android`
3. Installer l’APK sur device → `npx expo start --dev-client`
4. Valider login + `api.getToken(courseId)` en console debug
5. Démarrer **V2.1** (`LiveClassroomScreen`)
