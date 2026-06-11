# Axelmond Mobile — Plan Phase V2 (LiveKit natif)

Date : 11 juin 2026  
Statut : **V2.0 infrastructure terminée** — UI live non démarrée  
Prérequis : Phase Mobile UI v1 (`5c754d1`)

---

## Vision

Apporter la **salle de cours en direct** sur Android/iPhone avec parité fonctionnelle MVP du web :
- Audio / vidéo via LiveKit natif
- Chat temps réel + historique persisté
- Reconnexion automatique
- Permissions caméra / micro
- Modération enseignant (phase ultérieure)

**Hors scope global V2** : PayPal, notifications push, partage d’écran mobile, enregistrement, tableau blanc.

---

## Architecture cible

```mermaid
flowchart TB
  subgraph mobile [axelmond-mobile]
    Screens[LiveClassroomScreen V2.1+]
    Hook[useLiveKitRoom]
    LiveAPI[live.api.ts]
    Auth[client.ts + useAuth]
    DevBuild[EAS Dev Client]
  end
  subgraph native [@livekit/react-native + WebRTC]
    LK[LiveKitRoom]
    Perm[Permissions iOS/Android]
  end
  subgraph backend [Backend Axelmond]
    Token[POST /api/livekit/token]
    Chat[GET/POST /api/livekit/messages]
    Events[POST /api/livekit/events]
    Mod[POST /api/livekit/moderation]
    Att[attendance/*]
  end
  Screens --> Hook
  Hook --> LiveAPI
  Hook --> LK
  LiveAPI --> backend
  Auth --> backend
  DevBuild --> LK
```

---

## Phases de livraison

### V2.0 — Infrastructure (FAIT)

| Livrable | Statut |
|----------|--------|
| Auth : `getFreshAccessToken()` branché | ✅ |
| Auth : invalidation session UI | ✅ |
| Auth : cold start token expiré | ✅ |
| `services/api/live.api.ts` | ✅ |
| Catalog backend `/api/mobile/routes` (section `live`) | ✅ |
| `eas.json` (development, preview, production) | ✅ |
| Plugins LiveKit + WebRTC dans `app.json` | ✅ |
| Permissions caméra/micro iOS + Android | ✅ |
| Dépendances natives installées | ✅ |
| Ce document | ✅ |

**Pas encore fait** : premier build EAS réussi (`eas init` + `eas build` requis côté équipe).

---

### V2.1 — Join room + audio/vidéo (estimé 5–7 j)

- `LiveClassroomScreen.tsx`
- `useLiveKitRoom.ts` (port mobile du hook web)
- `components/live/` : stage vidéo, barre de contrôles
- Entrée depuis `CourseDetailsScreen` si `isLiveNow`
- Mic/cam off par défaut (étudiant)
- `POST /api/livekit/token` + `room.connect()`

---

### V2.2 — Chat temps réel (estimé 2–3 j)

- Data channel topic `axelmond-live-chat`
- `api.getMessages` au join + `api.sendMessage` à l’envoi
- UI chat (`FlatList` inversée)

---

### V2.3 — Reconnexion (estimé 3–4 j)

- `RoomEvent.Disconnected` → backoff
- Refresh token LiveKit (TTL 15 min) avant expiration
- `AppState` foreground / background
- `api.leaveAttendance` à la sortie propre

---

### V2.4 — Enseignant + modération (estimé 3–4 j)

- Toggle live (`PATCH /api/courses/:id`)
- `api.moderate` (mute, remove, grant speech)
- `api.logEvent` (main levée)

---

### V2.5 — QA device (estimé 4–5 j)

- Matrice iPhone + Android physique
- Tests runtime backend LiveKit
- Documentation utilisateur

**Total restant V2 MVP** : ~17–23 j (après V2.0)

---

## API LiveKit mobile (`live.api.ts`)

| Méthode | Endpoint | Rôle |
|---------|----------|------|
| `getToken(courseId)` | `POST /api/livekit/token` | Join room |
| `getMessages(courseId)` | `GET /api/livekit/messages/:id` | Historique chat |
| `sendMessage(courseId, msg)` | `POST /api/livekit/messages` | Persistance chat |
| `leaveAttendance(courseId)` | `POST /api/livekit/attendance/leave` | Quitter proprement |
| `getAttendance(courseId)` | `GET /api/livekit/attendance/:id` | Rapport présence |
| `logEvent(data)` | `POST /api/livekit/events` | Signaux (main, réaction) |
| `moderate(data)` | `POST /api/livekit/moderation` | Actions enseignant |

Catalog complet exposé via `GET /api/mobile/routes` → `routes.live`.

---

## Environnement natif (EAS)

### Fichiers

- `eas.json` — profils `development`, `development-simulator`, `preview`, `production`
- `app.json` — plugins + permissions

### Commandes (après `eas init`)

```bash
cd axelmond-mobile
npx eas init                    # une fois — lie le projet Expo
npm run build:dev:android       # APK dev client Android
npm run build:dev:ios           # dev client iOS (device)
npm run build:dev:ios-sim       # simulateur iOS
npx expo start --dev-client     # après installation du dev build
```

### Contraintes SDK 56

- **Expo Go insuffisant** pour LiveKit (modules natifs WebRTC)
- **Dev build obligatoire** sur device réel
- New Architecture activée par défaut (RN 0.85)

### Permissions configurées

| Plateforme | Permission |
|------------|------------|
| iOS | `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, `UIBackgroundModes: audio` |
| Android | `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `BLUETOOTH_CONNECT` |

---

## Auth — corrections V2.0

1. **`apiRequest`** appelle `getFreshAccessToken()` avant chaque requête authentifiée
2. **`onSessionInvalidated()`** — listeners notifiés quand refresh échoue
3. **`useAuth`** — cold start tente refresh ; `setUser(null)` si session invalide
4. Code erreur `SESSION_EXPIRED` sur 401 sans token

---

## Tests

```bash
npm run typecheck
npm run test:ui
npm run test:api
npm run validate:v1          # auth + profils (API locale)
npm run validate:v2-infra   # auth source + live catalog + token smoke
```

Backend :

```bash
cd .. && npx tsx --test tests/mobile-api.test.ts
```

---

## Risques restants

| Risque | Mitigation |
|--------|------------|
| Premier build EAS non validé | Lancer `eas init` + build Android en priorité |
| Patch mobile non déployé en prod | Déployer backend avant tests device prod |
| Token LiveKit 15 min | Re-fetch prévu en V2.3 |
| Node 23 vs engines RN | Utiliser Node 20.19+ LTS en CI/EAS |
| `eas projectId` absent | `eas init` requis avant build cloud |

---

## Prochaine étape validée

**V2.1** — implémenter `LiveClassroomScreen` + `useLiveKitRoom` sur dev build Android, sans chat ni reconnexion avancée.
