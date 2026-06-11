# Rapport Phase Mobile V2.1 — Salle LiveKit (A/V)

Date : 11 juin 2026  
Statut : **Implémenté** — validation device requise (dev build Android/iPhone)

---

## Objectif V2.1

Première salle LiveKit mobile fonctionnelle :
- Rejoindre / quitter une salle
- Audio et vidéo activables manuellement
- Liste des participants + tuiles vidéo
- États connexion / déconnexion / erreur
- Permissions caméra / micro avec gestion du refus

**Hors scope respecté** : chat, réactions, main levée, modération, partage d’écran, attendance, enregistrement.

---

## Fichiers créés

| Fichier | Rôle |
|---------|------|
| `src/screens/LiveClassroomScreen.tsx` | UI salle + `LiveKitRoom` + contrôles A/V |
| `src/hooks/useLiveKitRoom.ts` | Fetch token, états connexion, join/leave |
| `src/hooks/useLivePermissions.ts` | Permissions caméra/micro (`expo-camera`) |
| `scripts/validate-v2-1.mjs` | Validation structure + smoke token |
| `docs/MOBILE-V2-1-REPORT.md` | Ce rapport |

---

## Fichiers modifiés

| Fichier | Changement |
|---------|------------|
| `index.ts` | `registerGlobals()` LiveKit |
| `src/navigation/types.ts` | Route `LiveClassroom` |
| `src/navigation/StudentNavigator.tsx` | Écran LiveClassroom |
| `src/navigation/TeacherNavigator.tsx` | Écran LiveClassroom |
| `src/screens/CourseDetailsScreen.tsx` | Bouton « Rejoindre le live » si `isLiveNow` |
| `app.json` | Plugin `expo-camera` |
| `package.json` / `package-lock.json` | `expo-camera`, script `validate:v2-1` |
| `scripts/test-ui-flow.mjs` | Checks V2.1 |

---

## Fonctionnement

1. **Entrée** : détail cours → bouton si `course.isLiveNow`
2. **Permissions** : `useLivePermissions.ensurePermissions()` avant join
3. **Token** : `api.getToken(courseId)` via `useLiveKitRoom`
4. **Room** : `<LiveKitRoom audio={false} video={false}>` — mic/cam activés via toggles
5. **Audio session** : `AudioSession.startAudioSession()` à l’entrée en salle
6. **Participants** : `useParticipants()` + `useTracks(Camera)` + `VideoTrack`
7. **Sortie** : bouton Quitter → `leaveRoom()` + `navigation.goBack()`

**Correctif stabilité** : retour mémorisé de `useLivePermissions` (`useMemo`) pour éviter une boucle de re-join dans `LiveClassroomScreen`.

---

## Tests exécutés (automatisés)

| Commande | Résultat |
|----------|----------|
| `npm run typecheck` | ✅ |
| `npm run test:ui` | ✅ |
| `npm run validate:v2-1` | ✅ (structure + token API locale) |
| `npm run validate:v2-infra` | ✅ 13/13 |

---

## Tests device requis (non automatisés ici)

| Test | Plateforme | Statut |
|------|------------|--------|
| Dev build Android | `npm run build:dev:android` | ⏳ À exécuter |
| Dev build iPhone | `npm run build:dev:ios` | ⏳ À exécuter |
| Join room A/V | Device | ⏳ |
| Permissions refusées → paramètres | Device | ⏳ |
| Quitter → retour détail cours | Device | ⏳ |
| Token LiveKit valide (url + jwt) | Device | ⏳ |

Commandes :

```bash
cd axelmond-mobile
npx eas init
npm run build:dev:android
npx expo start --dev-client
```

---

## Bugs connus / limites

| # | Description | Sévérité |
|---|-------------|----------|
| 1 | **Expo Web** : écran informatif uniquement (LiveKit natif requis) | Attendu |
| 2 | **Pas de reconnexion auto** (prévu V2.3) | Moyen |
| 3 | **Token LiveKit 15 min** : pas de refresh automatique en salle | Moyen |
| 4 | **Étudiant non inscrit** : token API → 403 (message d’erreur générique) | Faible |
| 5 | **Re-join au changement de `courseId`** : comportement attendu si navigation avec autre cours | Faible |
| 6 | **Dev build non produit dans cette session** — validation A/V sur device requise | Bloquant validation device |

---

## Estimation Phase V2.2 — Chat temps réel

| Tâche | Durée |
|-------|-------|
| Data channel `axelmond-live-chat` + UI liste messages | 1.5–2 j |
| `api.sendMessage` + historique `getMessages` au join | 0.5–1 j |
| Dedup messages + scroll inversé | 0.5 j |
| Tests device chat multi-clients | 1 j |
| **Total V2.2** | **~3–4 j** |

---

## Prochaine étape

1. Valider V2.1 sur **dev build Android + iPhone**
2. Si OK → démarrer **V2.2 chat** (après validation explicite)
