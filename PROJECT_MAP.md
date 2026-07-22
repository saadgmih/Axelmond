# Performance Académique — Project Map

> Date : 2026-05-31
> Platforme : Math • Science • Code • AI
> Architecture : SPA + REST API + LiveKit + UploadThing

> Update 2026-06-01 : Renforcement de la sécurité (Production/Advanced Hardening) :
  - Authentification : Migration des sessions HMAC simples vers JWT de 15 minutes + Refresh Token rotatif stocké en base de données. Protection brute-force avec lockout temporaire (20 échecs max, 1 min lockout) et dummy hash checks pour éviter les fuites d'énumération par chronométrage.
  - Autorisations : Vérification systématique de l'ownership (verifyCourseAccess, verifyChapterAccess, etc.) sur toutes les routes d'édition/création des modules, chapitres, sections, contenus et quiz.
  - Paiements & Inscriptions : Inscriptions validées côté serveur via PayPal (`/api/paypal/create-order`, `/api/paypal/capture-order`) et webhook ; mock dev via `/api/payments/enroll-mock`. Lecture du compte via `GET /api/auth/me` (plus de sync client `/api/users/sync`).
  - LiveKit : Réduction de la durée des tokens à 15 minutes, publication caméra/micro autorisée pour les participants authentifiés du module, et limitation stricte des profs à leurs propres modules.
  - Uploads : Ajout de filtres d'extensions dangereuses, validation stricte des types MIME réels, et suppression automatique des fichiers UploadThing sur suppression d'attachements.
  - HTTP & Erreurs : Ajout des entêtes Helmet et Content-Security-Policy (CSP) stricts. Sécurisation de l'endpoint de santé et masquage des stack traces / détails d'erreurs en production.
  - Tests : Ajout de tests de sécurité automatisés (`tests/security.test.ts`) et script de détection de secrets.
  - Refonte Contact : Conception d'une page de contact professionnelle et moderne (ContactView.tsx), protégée par authentification (requireAuth), validée par Zod et auditée avec logAudit.
  - Refonte Support : Refonte de la page Centre d'aide en centre de support complet (SupportView.tsx) avec FAQ filtrable, barre de recherche, dépôt de tickets avec upload de captures d'écran, routes POST /api/support/tickets et supportScreenshot dans UploadThing.

---

## TECH_STACK

| Couche | Technologie | Version | Statut |
|--------|------------|---------|--------|
| **Framework** | React | 19.0.1 | ✅ Stable |
| **Build** | Vite | 6.2.x | ✅ Stable |
| **Plugin** | @vitejs/plugin-react | 5.0.x | ✅ Stable |
| **Langage** | TypeScript | 5.8.x | ✅ Stable |
| **Styling** | Tailwind CSS | 4.1.x | ✅ Stable |
| **Icons** | lucide-react | 0.546.x | ✅ Stable |
| **Animation** | motion | 12.23.x | ✅ Stable |
| **Runtimes** | tsx | 4.21.x | ✅ Dev |
| | esbuild | 0.25.x | ✅ Build |
| **Backend** | Express | 4.21.x | ✅ Stable |
| | @types/express | 4.17.x | ✅ Types |
| | dotenv | 17.x | ✅ Env |
| **Auth** | Node crypto HMAC signed token | built-in | ✅ Active |
| | jsonwebtoken | 9.0.3 | ⏳ Possible migration |
| | bcryptjs | 3.x | ✅ Password hashing |
| **Email** | Nodemailer SMTP | 8.x | ✅ Verification codes + delivery diagnostics |
| **Database** | PostgreSQL | DATABASE_URL | ✅ Persistent |
| | Prisma + Prisma Client | 6.19.x | ✅ ORM |
| **Live Video** | livekit-client | package-lock | ✅ Active |
| | livekit-server-sdk | package-lock | ✅ Active |
| **File Upload** | UploadThing | 7.7.x | ✅ Active |
| | zod | 4.4.x | ✅ Upload input validation |
| **Dev** | tsx | 4.21.x | ✅ Dev Runner |

### Dépendances écartées (justification)

| Technologie | Raison |
|------------|--------|
| **Next.js** | SSR non nécessaire. SPA suffit pour une plateforme éducative. Complexité inutile. |
| **SQLite** | PostgreSQL demandé pour persistance réelle et migration production. |
| **Redis** | Pas de besoin de cache distribué dans l'état initial. |
| **tRPC** | Overkill pour ce scope. REST API suffisante et plus maintenable. |
| **Passport.js** | JWT direct + bcryptjs = solution plus simple sans couche d'abstraction. |
| **Tailwind v3** | v4 est disponible et plus performante (native CSS, pas de PostCSS). |

---

## SYSTEM_FLOW

### Flux d'authentification
```
Register → POST /api/auth/register → Prisma User(emailVerified=false) + Enrollment + optional ProfessorInviteCode consume → EmailVerificationCode hash → SMTP code
Verify   → POST /api/auth/verify-email → code hash compare + expiry/attempt checks → emailVerified=true → signed token + refresh token → localStorage session
Resend   → POST /api/auth/resend-verification-code → old active codes invalidated → new hashed 6-digit code → SMTP code
Login    → POST /api/auth/login    → Prisma User lookup + bcrypt compare + DB role + emailVerified check → signed token + refresh token → localStorage session
Refresh  → POST /api/auth/refresh  → refresh token DB validé et rotatif → nouveau JWT + nouveau refresh token → requête API rejouée automatiquement
Startup  → GET /api/auth/me        → token validation → Prisma User role/emailVerified before rendering app
Every sensitive request → Authorization: Bearer <token> → Express auth middleware reloads DB user → verified email + RBAC guard
```

### Diagnostic API global (2026-06-01)

Corrections actives :

```
server.ts startup → log sécurisé des variables requises configurées/trimmed, sans valeur secrète
server.ts startup → réaligne la séquence PostgreSQL Course.id dans le schéma réel de la base
server.ts → wrapper async Express 4 pour empêcher un crash process sur exception Promise
server.ts → middleware JSON d'erreur API { error, code, route }
server.ts → CORS localhost autorisé pour localhost:3000 et localhost:5173
src/api.ts → les erreurs affichent method + route + HTTP status + réponse backend
src/api.ts → les erreurs réseau affichent l'URL appelée et indiquent serveur arrêté / URL API / CORS
src/App.tsx → l'abonnement étudiant passe par `/api/payments/enroll-mock`, puis recharge la session DB avant d'ouvrir le module/live
server.ts → toute modification d'inscription invalide immédiatement le cache d'autorisation afin que l'étudiant puisse ouvrir le contenu sans attendre son expiration
src/App.tsx → la page module étudiant fonctionne sans ancien module JSON et charge indépendamment chapitres, médias et quiz publiés
src/App.tsx → workflow professeur restauré : création indépendante module/chapitre/partie/sous-partie, upload direct module ou section, et plusieurs quiz publiables/supprimables par module
src/App.tsx + AuthScreen.tsx → suppression de la classification d'études visible côté étudiant; l'organisation se fait par domaines, disciplines, modules, chapitres et contenus
server.ts → neutralise les niveaux hérités (`Course.level`) avec `Module académique` et force les étudiants à l'étiquette `Étudiant`
server.ts → `toCourse()` décode les textes stockés déjà échappés pour éviter `&amp;#x27;` dans l'interface
src/App.tsx + src/index.css → Course price slider corrigé : déplacement local immédiat, sauvegarde backend différée, thumb rose aligné et carte de pilotage enterprise pour les modules/live
server.ts + src/App.tsx → Professor/Researcher course ownership strict : chaque professeur/chercheur voit et pilote uniquement ses propres modules (`createdById`, avec fallback ancien `instructor`)
src/app/hooks/usePlatformCatalogData.ts + src/hooks/useTeacherDashboard.ts → catalogue/taxonomie staff : réhydrate le token avant `/api/courses` et `/api/domains` pour éviter un chargement public vide après refresh
src/App.tsx → Live subject input corrigé : brouillon local par module + réalignement automatique du module live sélectionné pour permettre la saisie sans valeur réinitialisée
src/livekit.ts + server.ts + src/App.tsx → Default live subject globalisé : `Session académique en direct` remplace les sujets techniques spécifiques par défaut
server.ts + src/components/VirtualClassroom.tsx → Live timer basé sur `LiveSession.startTime` (`liveStartedAt`) pour conserver le chrono depuis le début du live après arrivée ou reconnexion
index.html + src/index.css → Viewport responsive mobile-first (`device-width`), largeurs max TV (`--app-content-max`), utilitaires scroll/touch
server.ts → Mot de passe oublié corrigé : `/api/auth/forgot-password` répond avec un message générique sécurisé et journalise les e-mails inconnus sans afficher `Not Found`
```

Cause corrigée : `POST /api/courses` pouvait tuer le serveur avec `Prisma P2002 Unique constraint failed on id` lorsque la séquence PostgreSQL était restée derrière les IDs seedés. Après crash, toutes les actions frontend affichaient `Failed to fetch` car `localhost:3000` ne répondait plus.

### Professor Invitation Codes (2026-05-29)

Configuration serveur :

```
PROFESSOR_INVITE_CODES="PROF-INVITE-001,PROF-INVITE-002"
```

Règles :

```
Student register → normal flow, optional filiere; no academic level is requested
Professor register → requires professorInviteCode
ADMIN register → rejected from public registration, provision manually in DB/admin tooling
Backend only → validates code in server.ts via src/invitations.ts
One code → one professor account
Prisma transaction → atomically marks usedAt before professor account creation
Used code → rejected with 403
Invalid/missing code → rejected with 403
Admin routes → protected by ADMIN role for future generate/list/revoke flows
Admin UI → dashboard ADMIN can generate/list/copy/revoke professor invite codes
```

État actuel : les codes initiaux viennent de `PROFESSOR_INVITE_CODES`, puis `usedAt/usedById/revokedAt` est persisté dans la table PostgreSQL `ProfessorInviteCode`. Un code utilisé reste donc inutilisable après redémarrage serveur.

### RBAC (2026-05-29)

Rôles normalisés dans `src/rbac.ts` :

```
STUDENT
PROFESSOR
RESEARCHER
ADMIN
```

Regroupement UI :

```
STUDENT → espace étudiant
PROFESSOR | RESEARCHER | ADMIN → espace professeur/chercheur
```

Protections actives :

```
Frontend
  src/App.tsx                 → rôle UI dérivé de currentUser.role, pas d'état React modifiable
  src/App.tsx                 → validation `/api/auth/me` au démarrage avant rendu de l'espace connecté
  src/App.tsx                 → vue `Mon Profil Académique` pour ADMIN/PROFESSOR/RESEARCHER
  src/App.tsx                 → dark mode unique, footer institutionnel et pages privacy/terms/cookies/legal/contact/about
  src/components/Sidebar.tsx  → badge de rôle authentifié, sélecteur manuel supprimé
  src/api.ts                  → Authorization: Bearer <token>, renouvellement automatique après 401 et session locale fermée si refresh impossible
  src/components/AuthScreen.tsx → invite code professeur obligatoire, filière étudiant facultative, saisie code e-mail avant session active

Backend
  server.ts                   → signed token, requireAuth DB lookup, emailVerified check, requireRbac, logging [rbac]/[email]
  server.ts                   → consume professor invite code in Prisma transaction before creating PROFESSOR/RESEARCHER/ADMIN
  server.ts                   → create hashed EmailVerificationCode, verify 6-digit code, expire after 15 min, max 5 attempts
  server.ts                   → ADMIN-only professor invite list/create/revoke routes backed by DB
  src/email.ts                → SMTP/Nodemailer sender, no e-mail secret in frontend
  src/uploadthing.ts          → UploadThing middleware validates auth + verified DB role before accepting file uploads
  GET  /api/auth/me                                      → authenticated user reloaded from DB
  GET  /api/me/profile                                  → PROFESSOR | RESEARCHER | ADMIN own AcademicProfile
  PUT  /api/me/profile                                  → PROFESSOR | RESEARCHER | ADMIN update own AcademicProfile, role ignored
  POST /api/me/avatar                                   → any authenticated role update own avatarUrl
  DELETE /api/me/avatar                                 → any authenticated role remove own avatarUrl
  POST /api/me/password                                 → PROFESSOR | RESEARCHER | ADMIN change own password
  GET  /api/admin/academic-profiles                     → ADMIN list academic profiles
  POST /api/auth/verify-email                            → verifies code hash and activates account
  POST /api/auth/resend-verification-code                → sends a fresh verification code
  POST /api/auth/refresh                                 → rotates persisted refresh token and returns a fresh 15-minute access token
  POST /api/auth/logout                                  → revokes persisted refresh token
  POST /api/livekit/token                                → authenticated LiveKit token, no secret exposure
  GET  /api/livekit/messages/:courseId                  → authenticated persisted chat history
  POST /api/livekit/messages                            → authenticated persisted chat message
  POST /api/courses/:courseId/modules/:moduleId/quiz-attempts → STUDENT only, stores QuizAttempt + QuizAnswer
  GET  /api/courses/:courseId/quizzes                   → authenticated quiz list; STUDENT receives published quizzes without answers before submission
  POST /api/courses/:courseId/quizzes                   → PROFESSOR | RESEARCHER | ADMIN create multiple quizzes at module or optional section level
  PATCH|DELETE /api/quizzes/:quizId                     → PROFESSOR | RESEARCHER | ADMIN publish/update/delete owned quiz
  POST /api/quizzes/:quizId/attempts                    → STUDENT only, stores flexible quiz attempt + answers
  GET  /api/courses/:courseId/grades                    → authenticated grades; ADMIN all, teacher own/legacy courses, student own row
  POST /api/courses                                      → PROFESSOR | RESEARCHER | ADMIN only
  POST /api/courses/:courseId/chapters                   → PROFESSOR | RESEARCHER | ADMIN only
  POST /api/courses/:courseId/sections                   → PROFESSOR | RESEARCHER | ADMIN only
  PATCH /api/content-sections/:id                        → PROFESSOR | RESEARCHER | ADMIN only
  DELETE /api/content-sections/:id                       → PROFESSOR | RESEARCHER | ADMIN only
  POST /api/content-sections/:sectionId/contents         → PROFESSOR | RESEARCHER | ADMIN only
  PATCH /api/lesson-contents/:id                         → PROFESSOR | RESEARCHER | ADMIN only
  DELETE /api/lesson-contents/:id                        → PROFESSOR | RESEARCHER | ADMIN only
  POST /api/courses/:courseId/modules/:moduleId/complete → STUDENT only
  POST /api/courses/:courseId/modules                   → PROFESSOR | RESEARCHER | ADMIN only
  PATCH /api/courses/:courseId                          → PROFESSOR | RESEARCHER | ADMIN only
```

Limite actuelle : les URLs SPA `/teacher`, `/professor`, `/admin`, `/student`, `/catalog`, `/course`, `/profile`, `/dashboard` sont corrigées côté client via `getRedirectPathForRole()` car l'application n'utilise pas de cookie HTTP-only permettant au serveur de connaître la session lors d'une navigation document. Les routes API sensibles sont protégées côté serveur.

### LiveKit Cloud (2026-05-29)

Configuration serveur requise :

```
LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
```

Flux live réel :

```
Utilisateur ouvre le live (étudiant ou professeur) → POST /api/livekit/token [auth]
→ server.ts génère un AccessToken LiveKit avec roomJoin/canPublish/canSubscribe/canPublishData
→ src/App.tsx conserve la room dans activeLiveCourse/liveRoom au niveau App
→ navigation interne SPA garde la connexion active jusqu'au clic explicite "Quitter le live"
→ professeur et étudiant utilisent la même interface LiveKit
→ caméra/micro/partage d'écran via room.localParticipant
→ micro : vérification permission navigateur avant LiveKit, puis un seul `setMicrophoneEnabled()`; en cas de blocage navigateur, l'UI indique d'autoriser le micro via l'icône cadenas
→ grille vidéo multi-flux : toutes les caméras/partages d'écran actifs s'affichent en cartes principales, avec intervenant actif surligné; micro/caméra fermés utilisent un état rouge explicite
→ plein écran local séparé du partage d'écran
→ participants affichés dans `src/components/VirtualClassroom.tsx` avec rôle, statut micro/caméra, qualité de connexion, main levée et intervenant actif
→ chat temps réel via publishData(topic: "axelmond-live-chat")
→ chat history persisted via LiveMessage table
→ événements live via publishData(topic: "axelmond-live-action") + journal `LiveActionLog`
→ présence persistée dans `LiveAttendance` au join/leave + rapport de présence
→ modération professeur via `RoomServiceClient` LiveKit : mute track, retrait parole, expulsion
```

Sécurité : `LIVEKIT_API_SECRET` reste exclusivement côté serveur. Le frontend reçoit seulement `{ url, token, roomName, participantName }`. Les endpoints de modération restent réservés à `PROFESSOR|RESEARCHER|ADMIN` et vérifient l'ownership du module avant toute action LiveKit.

### Contenus pédagogiques + UploadThing (2026-05-30)

Configuration serveur requise :

```
UPLOADTHING_TOKEN
UPLOADTHING_CALLBACK_URL
```

Flux upload réel :

```
Professor/Researcher/Admin choisit un fichier → src/uploadthing-client.ts
→ POST /api/uploadthing avec Authorization: Bearer <token>
→ src/uploadthing.ts vérifie le token, recharge le rôle DB et valide canManageContent()
→ le middleware valide le fichier et lui attribue un `customId` lié à l'utilisateur, au module, à la destination et aux métadonnées
→ UploadThing stocke video/pdf/image
→ en local, `isDev` est forcé si `UPLOADTHING_CALLBACK_URL` pointe vers localhost pour éviter un callback Cloud inaccessible
→ URLs fichiers compatibles UploadThing v7 : `ufsUrl` prioritaire, fallback `url/appUrl`
→ le client confirme ensuite explicitement le média via `POST /api/courses/:courseId/lesson-assets/confirm`
→ la confirmation authentifiée et `onUploadComplete` utilisent le même service idempotent pour créer une seule fois LessonContent + Attachment dans PostgreSQL
→ GET /api/courses/:id/content renvoie l'arbre ContentSection publié aux étudiants
→ GET /api/courses/:courseId/module-contents renvoie les LessonContent directement attachés au module (`sectionId = null`)
→ lecteur vidéo étudiant intégré uniquement : ouverture directe retirée, téléchargement natif/Picture-in-Picture/lecture distante/menu contextuel désactivés
```

Sécurité : `UPLOADTHING_TOKEN` reste exclusivement côté serveur. Le frontend transmet uniquement le token d'authentification de l'utilisateur connecté dans l'en-tête `Authorization`. Pour `lessonAsset`, le serveur vérifie d'abord que le module appartient au professeur/chercheur connecté, puis vérifie la section lorsqu'elle est fournie.

Limite connue : ces protections empêchent les chemins de téléchargement ordinaires dans l'interface, mais un média lisible par un navigateur ne peut pas être rendu totalement non téléchargeable sans streaming signé et DRM.

### Hiérarchie académique Domaines → Disciplines → Modules (2026-05-31)

Organisation persistée dans PostgreSQL :

```
FacultyDomain
  → Discipline
    → Course
      → Chapter
        → ContentSection récursif
          → LessonContent
            → Attachment
```

Domaines actifs :

```
Mathématiques
Physique
Chimie
Sciences de la Vie
Médecine et Pharmacie
Informatique et Intelligence Artificielle
Architecture et Génie Civil
Économie et Management
Génie Électrique et Électronique
Accompagnement et Réussite
```

Règles :

```
Chaque Discipline appartient à un FacultyDomain
Chaque Course possède disciplineId obligatoire
GET /api/domains retourne les domaines, disciplines et compteurs de modules publiés
GET /api/courses accepte domainId ou disciplineId en query string
Les étudiants naviguent Domaine → Discipline → Modules publiés
Les professeurs choisissent la discipline lors de la création d'un module
Les modules historiques sont migrés :
  Algorithmique → Programmation
  SQL → Bases de Données
  Linux/Systèmes → Cybersécurité
  IA & Machine Learning → Machine Learning
```

### Vérification e-mail + SMTP Hostinger (2026-05-31)

Configuration serveur requise pour un envoi réel :

```
EMAIL_FROM
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
EMAIL_VERIFICATION_SECRET
EMAIL_VERIFICATION_URL
```

Flux :

```
Register étudiant/professeur → User.emailVerified=false
→ génération code 6 chiffres
→ stockage PostgreSQL uniquement de EmailVerificationCode.codeHash
→ envoi SMTP via Nodemailer/Hostinger avec template HTML responsive Performance Académique, bouton de vérification seulement si l'URL est publique
→ AuthScreen affiche "Vérifiez votre e-mail"
→ POST /api/auth/verify-email avec email + code
→ si code valide/non expiré (<15 min) et attempts <5 : emailVerified=true + token
→ sinon message clair : Code incorrect / Code expiré / Nombre maximal de tentatives atteint
```

SMTP :

```
server.ts startup → verifySmtpConnection() + readSmtpBanner()
POST /api/test-email → [auth: ADMIN] envoie un e-mail de diagnostic à une adresse choisie et renvoie le diagnostic de livraison
GET /api/admin/email-delivery-summary → [auth: ADMIN] retourne SMTP configuré, dernier envoi, volume du jour, dernière erreur
src/App.tsx dashboard ADMIN → formulaire "Diagnostic SMTP Hostinger" + indicateurs visuels EmailDeliveryLog
EmailDeliveryLog → persiste messageId, envelope, réponse SMTP, destinataires acceptés/rejetés et statut fournisseur
```

Sécurité : aucun code ni secret SMTP n'est exposé côté frontend. Les routes protégées refusent tout utilisateur `emailVerified=false`, même avec un token signé. Les logs SMTP masquent le mot de passe et affichent seulement host/port/secure/user/from, bannière SMTP, domaine destinataire, `messageId`, envelope.from/envelope.to, destinataires acceptés/rejetés et réponse Nodemailer/SMTP. L'enveloppe SMTP force `from=SMTP_USER` pour aligner SPF/DMARC sur `axelmond.com`.

### Flux étudiant (navigation principale)
```
1. Register/Login → Vérification e-mail obligatoire → Dashboard (stats, modules en cours)
2. Dashboard → Choisir Filière → Liste des modules disponibles
3. Sélection Module → Voir prix → Paiement → Accès 30 jours
4. Module ouvert → Arbre : Chapitres > Parties > Sous-parties > Ressources
5. Ressource : vidéo | pdf | module | quiz | exercice | tp | td | examen | image
6. Quiz → Soumettre → score calculé côté serveur → QuizAttempt + QuizAnswer persistés → moyenne disponible dans l'espace professeur
7. Live → Rejoindre room LiveKit → Caméra/Micro/Partage écran/Plein écran + Chat data channel
8. Navigation interne → mini-player live actif, sans déconnexion automatique
9. Si un ancien état local annonce une inscription inexistante en base, le 403 LiveKit resynchronise `/api/auth/me` et propose l'abonnement au module
```

### Flux professeur (création de contenu)
```
1. Register avec code professeur → Vérification e-mail obligatoire → Tableau de bord (stats, dernier contenu)
2. Gestion des Contenus → Étape 1 Modules : créer, modifier, supprimer, publier/dépublier, avec libellés visibles sur chaque champ
3. Étape 2 facultative → sélectionner un module puis créer manuellement un chapitre, une partie ou une sous-partie; chaque niveau peut être le dernier niveau créé
4. Partie/sous-partie → sélection en cascade Module → Chapitre → Partie, sans obligation de compléter toute l'arborescence
5. Étape 3 Médias → sélection en cascade facultative; vidéo/PDF/image peut cibler directement le module, un chapitre, une partie ou une sous-partie
6. Checklist "Parcours professeur guidé" → crée un chemin manuel visible de bout en bout
7. Live → Lancer signal puis Entrer dans la salle → Room LiveKit + Caméra/Micro/Partage écran/Plein écran + Chat temps réel
8. Suivi & Notes de la Promotion → GET /api/courses/:courseId/grades → étudiants réellement inscrits + moyenne des quiz du module
```

### Flux de progression
```
Étudiant complète une ressource → POST /api/progress/complete
→ Serveur marque completed = true dans Progress
→ Calcul du % global du module (ressources completed / total)
→ Renvoyé au front pour mise à jour UI
```

### Flux abonnement module
```
Étudiant clique "S'abonner" → PaymentModal → POST /api/enrollments
→ Création d'une Enrollment (userId, moduleId, startDate, endDate = +30 jours)
→ Ajout d'une Invoice
→ Affichage du module dans "Mes modules"
```

---

## ARCHITECTURE

### Structure des dossiers projet

```
performance-academique/
├── server.ts                   # Express API + Vite middleware + DB seeding
├── prisma/
│   ├── schema.prisma           # PostgreSQL Prisma schema
│   └── migrations/             # Migration SQL initiale
│
├── src/                        # React app + shared server helpers
│   ├── main.tsx
│   ├── App.tsx
│   ├── api.ts                  # Fetch wrapper with Authorization header
│   ├── academic-profile.ts     # Academic profile sanitation helpers
│   ├── academic-taxonomy.ts    # Domaines/discipline académiques partagés backend/tests
│   ├── auth-token.ts           # Shared signed token helpers for Express and UploadThing
│   ├── db.ts                   # Prisma client singleton for Express server
│   ├── email.ts                # Nodemailer SMTP verification sender
│   ├── email-verification.ts   # 6-digit code generation/hash/expiry/attempt helpers
│   ├── grades.ts               # Course grade aggregation from QuizAttempt rows
│   ├── invitations.ts          # Professor invite normalization/generation helpers
│   ├── livekit.ts              # LiveKit config/room helpers
│   ├── rbac.ts                 # Shared RBAC role normalization and guards
│   ├── types.ts
│   ├── uploadthing.ts          # UploadThing Express file router + DB persistence callback
│   ├── uploadthing-client.ts   # Typed UploadThing client uploader
│   ├── components/
│   │   ├── AuthScreen.tsx
│   │   ├── SuccessCoachPanel.tsx
│   │   ├── PaymentModal.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── VirtualClassroom.tsx
│   └── index.css
│
├── tests/
│   ├── invitations.test.ts
│   ├── academic-taxonomy.test.ts
│   ├── email-delivery-summary.test.ts
│   ├── email-verification.test.ts
│   ├── grades.test.ts
│   ├── livekit.test.ts
│   ├── livekit-ui.test.ts
│   ├── prisma-schema.test.ts
│   └── rbac.test.ts
│
├── PROJECT_MAP.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
└── .env                         # local only, ignored by git
```

### Prisma Schema (actuel)

```prisma
enum UserRole {
  STUDENT
  PROFESSOR
  RESEARCHER
  ADMIN
}

enum LessonContentType {
  VIDEO
  PDF
  IMAGE
  TEXT
}

enum AttachmentType {
  VIDEO
  PDF
  IMAGE
  FILE
}

model User {
  id                 String                @id @default(cuid())
  email              String                @unique
  passwordHash       String
  fullName           String
  role               UserRole
  emailVerified      Boolean               @default(false)
  levelOrTitle       String?
  filiere            String?
  avatarUrl          String?
  invoices           Json                  @default("[]")
  enrollments        Enrollment[]
  emailVerificationCodes EmailVerificationCode[]
  liveMessages       LiveMessage[]
  createdCourses     Course[]              @relation("CreatedCourses")
  createdChapters    Chapter[]             @relation("CreatedChapters")
  createdSections    ContentSection[]      @relation("CreatedSections")
  createdContents    LessonContent[]       @relation("CreatedContents")
  createdAttachments Attachment[]          @relation("CreatedAttachments")
  emailDeliveryLogs  EmailDeliveryLog[]
  academicProfile    AcademicProfile?
}

model AcademicProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  title           String?
  department      String?
  lab             String?
  speciality      String?
  teachingDomains Json     @default("[]")
  researchDomains Json     @default("[]")
  bio             String?
  avatarUrl       String?
  links           Json     @default("{}")
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model EmailVerificationCode {
  id        String    @id @default(cuid())
  userId    String
  codeHash  String
  expiresAt DateTime
  usedAt    DateTime?
  attempts  Int       @default(0)
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
}

model EmailDeliveryLog {
  id              String   @id @default(cuid())
  userId          String?
  purpose         String
  recipientDomain String
  smtp            Json
  messageId       String?
  accepted        Json
  rejected        Json
  envelope        Json?
  response        String?
  providerStatus  String
  createdAt       DateTime @default(now())
}

model ProfessorInviteCode {
  code        String    @id
  createdAt   DateTime  @default(now())
  usedAt      DateTime?
  revokedAt   DateTime?
  usedById    String?
  createdById String?
}

model FacultyDomain {
  id          Int          @id
  name        String       @unique
  slug        String       @unique
  iconName    String
  color       String
  description String
  order       Int          @default(0)
  disciplines Discipline[]
}

model Discipline {
  id       Int           @id
  domainId Int
  name     String
  slug     String        @unique
  order    Int           @default(0)
  domain   FacultyDomain @relation(fields: [domainId], references: [id])
  courses  Course[]
}

model Course {
  id           Int              @id @default(autoincrement())
  title        String
  level        String
  credits      Int
  duration     String
  category     String
  price        Float
  iconName     String
  color        String
  instructor   String
  description  String
  progress     Int              @default(0)
  isLiveNow    Boolean          @default(false)
  liveSubject  String?
  modules      Json
  published    Boolean          @default(true)
  disciplineId Int
  createdById  String?
  enrollments  Enrollment[]
  liveSessions LiveSession[]
  discipline   Discipline       @relation(fields: [disciplineId], references: [id])
  createdBy    User?            @relation("CreatedCourses", fields: [createdById], references: [id])
  chapters     Chapter[]
  sections     ContentSection[]
  contents     LessonContent[]
  attachments  Attachment[]
}

model Chapter {
  id          String           @id @default(cuid())
  courseId    Int
  title       String
  description String?
  order       Int              @default(0)
  published   Boolean          @default(false)
  createdById String?
  course      Course           @relation(fields: [courseId], references: [id])
  createdBy   User?            @relation("CreatedChapters", fields: [createdById], references: [id])
  sections    ContentSection[]
}

model ContentSection {
  id          String           @id @default(cuid())
  courseId    Int
  chapterId   String?
  parentId    String?
  title       String
  description String?
  order       Int              @default(0)
  published   Boolean          @default(false)
  createdById String?
  course      Course           @relation(fields: [courseId], references: [id])
  chapter     Chapter?         @relation(fields: [chapterId], references: [id])
  parent      ContentSection?  @relation("SectionChildren", fields: [parentId], references: [id])
  children    ContentSection[] @relation("SectionChildren")
  contents    LessonContent[]
  createdBy   User?            @relation("CreatedSections", fields: [createdById], references: [id])
}

model LessonContent {
  id          String            @id @default(cuid())
  courseId    Int
  sectionId   String?
  type        LessonContentType
  title       String
  body        String?
  published   Boolean           @default(false)
  createdById String?
  course      Course            @relation(fields: [courseId], references: [id])
  section     ContentSection?   @relation(fields: [sectionId], references: [id])
  createdBy   User?             @relation("CreatedContents", fields: [createdById], references: [id])
  attachments Attachment[]
}

model Attachment {
  id          String        @id @default(cuid())
  courseId    Int
  contentId   String
  type        AttachmentType
  fileName    String
  fileKey     String
  url         String
  mimeType    String?
  size        Int
  createdById String?
  course      Course        @relation(fields: [courseId], references: [id])
  content     LessonContent @relation(fields: [contentId], references: [id])
  createdBy   User?         @relation("CreatedAttachments", fields: [createdById], references: [id])
}

model Enrollment {
  id        String   @id @default(cuid())
  userId    String
  courseId  Int
  startDate DateTime @default(now())
  endDate   DateTime?
  active    Boolean  @default(true)

  @@unique([userId, courseId])
}

model Quiz {
  id        String  @id @default(cuid())
  courseId  Int
  moduleId  Int?
  sectionId String?
  title     String
  published Boolean @default(false)
}

model QuizQuestion {
  id          String @id @default(cuid())
  quizId      String
  question    String
  options     Json
  answer      String
  explanation String
  order       Int    @default(0)
}

model QuizAttempt {
  id           String   @id @default(cuid())
  quizId       String
  courseId     Int
  moduleId     Int?
  userId       String
  score        Int
  total        Int
  scoreOutOf20 Float
  createdAt    DateTime @default(now())
}

model QuizAnswer {
  id             String  @id @default(cuid())
  attemptId      String
  questionId     String?
  selectedAnswer String
  isCorrect      Boolean
}

model LiveSession {
  id          String        @id @default(cuid())
  roomName    String        @unique
  title       String?
  courseId    Int
  professorId String?
  isActive    Boolean       @default(true)
  startTime   DateTime      @default(now())
  endTime     DateTime?
  messages    LiveMessage[]
  attendances LiveAttendance[]
  actionLogs  LiveActionLog[]
}

model LiveMessage {
  id        String   @id @default(cuid())
  clientId  String?  @unique
  roomName  String
  text      String
  createdAt DateTime @default(now())
  sessionId String?
  userId    String?
}

model LiveAttendance {
  id                 String   @id @default(cuid())
  sessionId          String
  roomName           String
  userId             String?
  role               UserRole
  joinedAt           DateTime @default(now())
  leftAt             DateTime?
  durationSeconds    Int      @default(0)
  participationScore Int      @default(0)
  handRaised         Boolean  @default(false)
}

model LiveActionLog {
  id             String   @id @default(cuid())
  sessionId      String?
  roomName       String
  actorId        String?
  actorRole      UserRole?
  action         String
  targetIdentity String?
  details        Json     @default("{}")
}
```

### API Route Map (REST)

```
Auth
  POST   /api/auth/register          → { email, password, fullName, role, filiere?, professorInviteCode? } → { verificationRequired, email, message }
  POST   /api/auth/verify-email      → { email, code } → { user fields, token }
  POST   /api/auth/resend-verification-code → { email } → { message }
  POST   /api/test-email             → [auth: ADMIN] { to } → sends SMTP diagnostic email
  POST   /api/auth/login             → { email, password, role } → { user fields, token } or verificationRequired
  GET    /api/auth/me                → [auth + emailVerified] → user fields

Academic Profile
  GET    /api/me/profile             → [auth: PROFESSOR|RESEARCHER|ADMIN] own AcademicProfile + courses/lives/content summary
  PUT    /api/me/profile             → [auth: PROFESSOR|RESEARCHER|ADMIN] update own profile fields; role/userId ignored
  POST   /api/me/avatar              → [auth] update own avatarUrl on User; academic users also sync AcademicProfile.avatarUrl
  DELETE /api/me/avatar              → [auth] remove own avatarUrl
  POST   /api/me/password            → [auth: PROFESSOR|RESEARCHER|ADMIN] change own password after current password check

Admin
  GET    /api/admin/professor-invites       → [auth: ADMIN] list invite codes and used/revoked state
  POST   /api/admin/professor-invites       → [auth: ADMIN] create invite code, optional { code }
  DELETE /api/admin/professor-invites/:code → [auth: ADMIN] revoke invite code
  GET    /api/admin/email-delivery-logs     → [auth: ADMIN] last 20 EmailDeliveryLog rows with messageId/accepted/rejected/response/providerStatus
  GET    /api/admin/academic-profiles       → [auth: ADMIN] list academic users and AcademicProfile snapshots

Courses
  GET    /api/domains                         → list FacultyDomain rows with Discipline children; public/student see published counters, professor/researcher see owned counters, admin sees all
  GET    /api/courses                         → list persisted Course rows exposed as modules in UI; optional ?domainId= or ?disciplineId=; students/public see published only, professor/researcher see only owned modules (`createdById`, fallback legacy `instructor`), admin sees all
  GET    /api/courses/:id                     → one persisted Course; unpublished visible only to PROFESSOR|RESEARCHER|ADMIN
  POST   /api/courses                         → [auth: PROFESSOR|RESEARCHER|ADMIN] create Course with required disciplineId
  PUT    /api/courses/:courseId               → [auth: PROFESSOR|RESEARCHER|ADMIN] update Course identity/metadata
  PATCH  /api/courses/:courseId               → [auth: PROFESSOR|RESEARCHER|ADMIN] publish/unpublish + live metadata
  DELETE /api/courses/:courseId               → [auth: PROFESSOR|RESEARCHER|ADMIN] delete Course and dependent content
  GET    /api/courses/:courseId/chapters      → [auth] list Chapter rows for a course
  GET    /api/courses/:id/content             → [auth] content tree; students receive published content only
  GET    /api/courses/:courseId/module-contents → [auth] LessonContent with sectionId=null; students receive published content only
  POST   /api/courses/:courseId/lesson-assets/confirm → [auth: PROFESSOR|RESEARCHER|ADMIN] confirme et persiste un média UploadThing de façon idempotente
  GET    /api/courses/:courseId/grades        → [auth] enrolled students + completed quiz count + averageScoreOutOf20
  POST   /api/courses/:courseId/chapters      → [auth: PROFESSOR|RESEARCHER|ADMIN] create Chapter + root ContentSection
  PUT    /api/chapters/:id                    → [auth: PROFESSOR|RESEARCHER|ADMIN] update Chapter and root section title/publish state
  PATCH  /api/chapters/:id                    → [auth: PROFESSOR|RESEARCHER|ADMIN] publish/unpublish Chapter
  DELETE /api/chapters/:id                    → [auth: PROFESSOR|RESEARCHER|ADMIN] delete Chapter tree
  POST   /api/courses/:courseId/sections      → [auth: PROFESSOR|RESEARCHER|ADMIN] create nested ContentSection
  PUT    /api/content-sections/:id            → [auth: PROFESSOR|RESEARCHER|ADMIN] update section
  PATCH  /api/content-sections/:id            → [auth: PROFESSOR|RESEARCHER|ADMIN] update section
  DELETE /api/content-sections/:id            → [auth: PROFESSOR|RESEARCHER|ADMIN] delete section tree
  POST   /api/content-sections/:sectionId/contents → [auth: PROFESSOR|RESEARCHER|ADMIN] create text LessonContent
  PUT    /api/lesson-contents/:id             → [auth: PROFESSOR|RESEARCHER|ADMIN] update LessonContent
  PATCH  /api/lesson-contents/:id             → [auth: PROFESSOR|RESEARCHER|ADMIN] update LessonContent
  DELETE /api/lesson-contents/:id             → [auth: PROFESSOR|RESEARCHER|ADMIN] delete LessonContent
  GET    /api/quizzes/:moduleId               → persisted QuizQuestion payload, seed fallback
  POST   /api/courses/:courseId/modules/:moduleId/quiz-attempts → [auth: STUDENT] server-side scoring + persisted attempt/answers
  GET    /api/courses/:courseId/quizzes       → [auth] all owned quizzes for staff; published quizzes without answers for enrolled students
  POST   /api/courses/:courseId/quizzes       → [auth: PROFESSOR|RESEARCHER|ADMIN] create multiple quizzes directly in module or optional ContentSection
  PATCH  /api/quizzes/:quizId                 → [auth: PROFESSOR|RESEARCHER|ADMIN] rename or publish/unpublish owned quiz
  DELETE /api/quizzes/:quizId                 → [auth: PROFESSOR|RESEARCHER|ADMIN] delete owned quiz
  POST   /api/quizzes/:quizId/attempts        → [auth: STUDENT] submit a published flexible quiz
  POST   /api/courses/:courseId/modules/:moduleId/complete → [auth: STUDENT] marks module complete
  POST   /api/courses/:courseId/modules       → [auth: PROFESSOR|RESEARCHER|ADMIN] add module
  PATCH  /api/courses/:courseId               → [auth: PROFESSOR|RESEARCHER|ADMIN] update price/live metadata

Contact
  POST   /api/contact                          → [auth] { name, email, subject, category, message } → { success, message }

Support
  POST   /api/support/tickets                  → [auth] { subject, category, description, screenshotUrl? } → { success, message, ticket }
  GET    /api/support/tickets                  → [auth] list own tickets or all if admin
  GET    /api/support/tickets/:id              → [auth] ticket details + messages
  POST   /api/support/tickets/:id/messages     → [auth] add message to ticket

Live
  POST   /api/livekit/token          → [auth] { courseId } → { url, token, roomName, participantName }
  GET    /api/livekit/messages/:courseId → [auth] persisted LiveMessage history
  POST   /api/livekit/messages       → [auth] persisted LiveMessage write
  POST   /api/livekit/events         → [auth] journalise main levée, réaction, ressource, tableau blanc, enregistrement demandé
  POST   /api/livekit/attendance/leave → [auth] clôture la présence active et calcule la durée
  GET    /api/livekit/attendance/:courseId → [auth] rapport de présence; étudiants voient leur ligne, staff voit le module
  POST   /api/livekit/moderation     → [auth: PROFESSOR|RESEARCHER|ADMIN] mute track, expulsion, parole via LiveKit RoomServiceClient
  LiveKit room axelmond-course-:id    → caméra, micro, screen share, data channel chat + actions

Uploads
  POST   /api/uploadthing             → [auth: PROFESSOR|RESEARCHER|ADMIN] UploadThing file route lessonAsset; optional sectionId permits direct module upload after ownership verification
  UploadThing route avatarImage       → [auth] image upload, persists User.avatarUrl and AcademicProfile.avatarUrl when relevant
  UploadThing route supportScreenshot → [auth] screenshot upload for support tickets

Success Coach
  Client-only, deterministic study plan based on module progress and quiz scores
```

### Component Tree (React)

```
<App>
  ├── <AuthScreen />                  (unauthenticated)
  ├── <Sidebar />                     (authenticated navigation)
  ├── <Topbar />                      (authenticated top bar)
  ├── Student views in App.tsx        (dashboard, catalog, course, live, profile)
  ├── Teacher views in App.tsx        (dashboard, academic-profile, content workflow 1→4, live-control, stats)
  ├── Institutional views in App.tsx  (about, research, publications, privacy, terms, cookies, legal)
  ├── <ContactView />                 (complete interactive contact form, FAQ, coordinates, GDPR banner)
  ├── <SupportView />                 (complete searchable support center, FAQ, ticket form with upload, status)
  ├── <SuccessCoachPanel />           (plan de réussite et simulateur d’examens)
  └── <PaymentModal />                (student enrollment/payment overlay)
```

---

## ORPHANS & PENDING

### Dépendances deprecated écartées

| Dépendance | Raison | Alternative |
|-----------|--------|------------|
| `@tailwindcss/vite` < 4 | Certaines versions intermédiaires buggées | v4.3.0 directe |
| `motion` < 12 (ancien `framer-motion`) | `framer-motion` renommé en `motion` v11+ | `motion` 12.40.0 |
| `react-router-dom` v7 si utilisé | Incompatible avec React 19 sans adapter | Utiliser `@tanstack/react-router` ou react-router v7 |

### Points d'attention

| Sujet | Statut | Note |
|-------|--------|------|
| Express 4 middleware signature | ✅ OK | Backend actuel sur Express 4.21.x. |
| Prisma migrations PostgreSQL | ✅ Ajouté | `prisma/schema.prisma` + migration initiale PostgreSQL. |
| Vite 6 + React 19 | ✅ OK | Plugin react v5 compatible |
| JWT refresh tokens | ✅ Active | Refresh token persistant 7 jours, rotation après usage, retry API automatique après expiration du JWT 15 minutes. |
| HTTP-only auth cookie for SPA document routes | ⏳ POST-MVP | Permettra une redirection serveur stricte sur `/teacher`, `/admin`, `/student`; API déjà protégée par token signé. |
| Persistent professor invitation codes | ✅ DB | État persisté dans PostgreSQL `ProfessorInviteCode`. |
| Admin UI for professor invitation codes | ✅ Active | Dashboard ADMIN avec génération, consultation, copie et révocation des codes. |
| File storage strategy | ✅ Active | UploadThing stocke video/pdf/image; PostgreSQL conserve LessonContent + Attachment + fileKey/url. |
| Podcast/audio resources | ⏳ FUTURE | Type "audio" à ajouter au schéma Resource si besoin |
| WebRTC pour live vidéo | ✅ Active | LiveKit Cloud via `POST /api/livekit/token`, caméra/micro/screen share, chat/actions data channel, `LiveMessage`, `LiveAttendance`, `LiveActionLog`. |
| Tests unitaires | ✅ Active | RBAC, LiveKit, LiveKit UI, vérification e-mail, invitations et schéma Prisma. |

---

## MILESTONES & ROADMAP

| Jalon | Objectifs vérifiables | Durée estimée |
|-------|----------------------|---------------|
| **M1 — Foundation** | ✅ Projet Vite + Express initialisé | Semaine 1-2 |
| | ✅ Prisma schema migré (PostgreSQL) | |
| | ✅ Auth (register/login/JWT) + vérification e-mail fonctionnels | |
| | ✅ Layouts Student + Professor avec routage | |
| | ✅ Logger async opérationnel | |
| **M2 — Core Content** | ✅ Modules, chapitres, sections, contenus et pièces jointes persistés via Prisma | Semaine 3-4 |
| | ✅ Upload fichiers UploadThing | |
| | ✅ Visionneuse ressources (video, pdf, texte) | |
| | ✅ ModuleViewer étudiant avec arbre de navigation | |
| **M3 — Interactivity** | ✅ Quiz system (builder + player + scoring) | Semaine 5-6 |
| | ✅ Progress tracking (marquage, %, reprise) | |
| | ✅ Enrollment + paiement sécurisé | |
| | ✅ Factures et historique étudiant | |
| **M4 — Live & Real-time** | ✅ LiveKit live sessions | Semaine 7-8 |
| | ✅ Chat textuel temps réel + persistence `LiveMessage` | |
| | ✅ Classe virtuelle premium `VirtualClassroom` : participants, modération, tableau blanc, ressources, LaTeX/code, sondages, présence | |
| | ⏳ Enregistrement + publication replay | |
| | ✅ Dashboard analytics (KPIs, graphiques) | |
| **M5 — Polish** | ✅ Coach de réussite et simulateur d’examens | Semaine 9-10 |
| | ✅ Responsive design (mobile/tablette) | |
| | ✅ Tests (Vitest + Supertest) | |
| | ✅ Performance + bundle optimization | |

---

## Safe Logging Strategy

Implémentation actuelle dans `server.ts` :

```typescript
// Niveaux : ERROR | WARN | INFO | DEBUG
// Format : [TIMESTAMP] [LEVEL] [CONTEXT] message
// Stockage : stdout

function logDb(level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) {
  console.log(`[${new Date().toISOString()}] [${level}] [db] ${message}${data ? " " + JSON.stringify(data) : ""}`);
}
```

Utilisation : `logSecurity`, `logLiveKit`, `logInvitation`, `logEmail`, `logDb` dans `server.ts`.
