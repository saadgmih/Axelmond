# Déploiement Hostinger (hPanel) — sans SSH

Axelmond utilise **Node.js Web App** avec **auto-déploiement GitHub**.  
Quand vous poussez sur `main`, Hostinger rebuild et redémarre l’app automatiquement — **aucune commande SSH n’est nécessaire**.

## Paramètres recommandés (Settings / Build)

| Champ            | Valeur                                         |
| ---------------- | ---------------------------------------------- |
| Branche          | `main`                                         |
| Install          | `npm ci`                                       |
| Build            | `npm run hostinger:build`                      |
| Start            | `npm start`                                    |
| Entry file       | `dist/server.cjs`                              |
| Output directory | `dist`                                         |
| Node.js          | 20 ou 22 (selon `engines` dans `package.json`) |

**Important :** ne pas utiliser `npm run start:cluster`, PM2, ni `prestart` — un seul process Node doit tourner.

- `hostinger:build` = `prisma migrate deploy` + build Vite/esbuild (migrations **pendant le build**, pas au démarrage).
- `npm start` = contrôle anti-PM2 + `node dist/server.cjs` (un seul process long-lived).

### Variables hPanel obligatoires (anti Max Processes)

Ajouter dans **Environment variables** :

| Variable                  | Valeur  | Rôle                                                                   |
| ------------------------- | ------- | ---------------------------------------------------------------------- |
| `HOSTINGER_WEBAPP`        | `1`     | Bloque PM2 / cluster, réduit pool DB, désactive le performance monitor |
| `SKIP_PRISMA_POSTINSTALL` | `1`     | Évite un 2ᵉ `prisma generate` pendant `npm ci` (le build le fait déjà) |
| `GRACEFUL_SHUTDOWN_MS`    | `8000`  | Fenêtre d'arrêt compatible Hostinger avant l'arrêt forcé               |
| `DATABASE_POOL_MAX`       | `2`     | Réduit les connexions DB actives (moins de processus bloqués)          |
| `RUN_STARTUP_PURGES`      | `false` | Évite les purges DB au démarrage sur Hostinger                         |

Générer le fichier d’import : `npm run hostinger:env` (inclut ces clés si le script est à jour).

## Variables d’environnement (checklist complète)

Dans **Websites → axelmond.com → Environment variables**.

### Ne jamais importer le `.env` local tel quel

- Hostinger lit les variables via **hPanel**, pas un fichier sur disque (`injected env (0) from .env` dans les logs est **normal**).
- L’ancien nom **`MOBILE_API_SECRET`** n’est **pas** lu par l’app → utiliser **`MOBILE_CLIENT_SECRET`** (32+ caractères, même valeur que `EXPO_PUBLIC_MOBILE_CLIENT_KEY` dans l’app mobile).
- Ne pas activer en prod : `ALLOW_MOCK_ENROLLMENT`, `HIBP_FAIL_OPEN`, `REGISTRATION_SEED_ENROLLMENT`.

### Générer le fichier d’import propre

Depuis la racine du projet (avec un `.env` local à jour) :

```bash
npm run hostinger:env
```

Cela produit **`.hostinger-import.env`** (gitignored) : variables triées, sans commentaires, avec les valeurs prod forcées (`NODE_ENV=production`, `PAYPAL_ENV=live`, `UPLOADTHING_IS_DEV=false`, etc.).

### Importer dans hPanel

1. **Environment variables** → **Import .env**
2. Coller le contenu de `.hostinger-import.env` ou sélectionner le fichier
3. Vérifier qu’il n’y a **pas** de `MOBILE_API_SECRET`
4. **Apply changes** (redémarre l’app)

### Variables attendues (37)

| Groupe      | Clés                                                                                                                                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime     | `NODE_ENV`, `APP_URL`, `PORT`, `LOG_LEVEL`, `RUN_STARTUP_SEED`, `RUN_STARTUP_PURGES`, `ALLOWED_ORIGINS`, `VITE_API_BASE_URL`, **`HOSTINGER_WEBAPP`**, **`SKIP_PRISMA_POSTINSTALL`**, **`GRACEFUL_SHUTDOWN_MS`** |
| Auth        | `AUTH_TOKEN_SECRET`, `EMAIL_VERIFICATION_SECRET`, **`MOBILE_CLIENT_SECRET`**                                                                                                                                    |
| WebAuthn    | `WEBAUTHN_RP_ID` (ex. `axelmond.com`), optionnel `WEBAUTHN_RP_NAME`                                                                                                                                             |
| Base        | `DATABASE_URL` (Neon + `?schema=AxelmondResearchLab&sslmode=require`)                                                                                                                                           |
| PayPal      | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_ENV=live`, `PAYPAL_CURRENCY_CODE`, `PAYPAL_MAD_TO_USD_RATE`                                                                            |
| LiveKit     | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`                                                                                                                                                          |
| UploadThing | `UPLOADTHING_TOKEN`, `UPLOADTHING_IS_DEV=false`, `UPLOADTHING_CALLBACK_URL`                                                                                                                                     |
| Email       | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `EMAIL_VERIFICATION_URL`                                                                                                                      |
| Push        | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`                                                                                                                                                        |
| AI          | `OPENAI_API_KEY`                                                                                                                                                                                                |
| Divers      | `PROFESSOR_INVITE_CODES`                                                                                                                                                                                        |

Sans ces variables, le build peut réussir mais l’app crash au démarrage → **503** ou erreur `Invalid production configuration`.

## Vérifier un déploiement

1. **Deployments** — statut `Completed` (pas `Failed`).
2. **Runtime logs** — chercher `Performance Académique server running`.
3. Navigateur :
   - `https://axelmond.com/api/health` → `{"status":"UP",...}`
   - `https://axelmond.com/api/courses` → réponse JSON en < 10 s

## En cas de 503

Les **Runtime logs** montrent parfois `server running` et des requêtes API (200) alors que le domaine public renvoie 503. Dans ce cas, **Node fonctionne** — c’est le **proxy Hostinger** ou le **domaine** qui ne route pas correctement.

1. Ouvrir **Deployments** → cliquer l’**URL de preview** Hostinger (pas seulement axelmond.com).
   - Preview OK + domaine en 503 → problème de liaison domaine / `.htaccess` dans `public_html`.
2. **Settings** → Framework : **Express.js** (pas Vite seul). Entry file : `dist/server.cjs`. Start : `npm start`.
3. Bouton **Restart** sur le dashboard Node.js (sans rebuild).
4. Vérifier que le site `axelmond.com` est bien un **Node.js Web App**, pas un ancien hébergement PHP/statique en parallèle.

## En cas de 504 (Gateway Time-out)

Symptôme : nginx affiche **504 Gateway Time-out** — le proxy ne reçoit aucune réponse du process Node dans le délai imparti.

### Causes fréquentes (logs)

| Signal dans les logs                                                     | Signification                                                                                    |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `Graceful shutdown initiated {"signal":"SIGTERM"}` répété                | Hostinger redéploie (souvent après **plusieurs push `main` rapprochés**) et tue l’ancien process |
| `Performance Académique server running` puis plus aucun log de démarrage | Le dernier process a été arrêté sans qu’un nouveau ne prenne le relais → site down               |
| `loadAvg1` très élevé (> 30)                                             | Serveur surchargé — démarrage et réponses lents                                                  |

### Actions immédiates

1. **hPanel → Node.js Web App → Restart** (sans rebuild) — le plus rapide pour remettre le site en ligne.
2. **Deployments** — vérifier que le dernier déploiement est **Completed** (pas Failed / Building bloqué).
3. Attendre **2–3 minutes** après un seul push ; éviter d’enchaîner plusieurs commits sur `main` (chaque push relance un cycle SIGTERM + rebuild).
4. Tester : `https://axelmond.com/api/live` (réponse instantanée) puis `/api/health`.

### Prévention

- Regrouper les changements en **un seul push** quand possible.
- Ne pas lancer PM2 en parallèle de l’app Hostinger.
- Surveiller les Runtime logs : un seul `Performance Académique server running on port 3000` stable, sans SIGTERM en boucle.

## En cas de 503 — Max Processes / ressources Node

Hostinger affiche parfois **503 Service Unavailable** avec un message du type _Max Processes_ ou _utilisation élevée des ressources_. Cela signifie que **trop de processus Node.js** tournent en même temps sur le compte — le proxy coupe l’accès avant même d’atteindre votre app.

### Pourquoi cela arrive avec Axelmond

| Cause                          | Détail                                                                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Redéploiements rapprochés**  | Chaque push sur `main` lance un rebuild + un nouveau `node dist/server.cjs` pendant que l’ancien reçoit encore `SIGTERM` → 2–4 processus Node simultanés. |
| **PM2 en parallèle**           | `npm run start:cluster` ou `deploy-hostinger.sh` lance PM2 **en plus** du gestionnaire Hostinger → explosion du nombre de workers.                        |
| **Mauvaise commande Start**    | Start = `node dist/server.cjs` **et** PM2, ou un script qui relance Node en boucle.                                                                       |
| **Build + runtime chevauchés** | Pendant `npm ci` / `npm run build`, `postinstall` (`prisma generate`) et le démarrage peuvent coexister brièvement avec l’ancienne instance.              |

Les logs `Graceful shutdown initiated {"signal":"SIGTERM"}` répétés (comme lors des push `fe7b4fd` + `5cb066d` + `93464b6`) sont le signal typique d’un **chevauchement de processus**, pas d’un bug applicatif isolé.

### Configuration hPanel obligatoire

| Champ                   | Valeur correcte           | À éviter                             |
| ----------------------- | ------------------------- | ------------------------------------ |
| **Start command**       | `npm start`               | `pm2 start`, `npm run start:cluster` |
| **Build command**       | `npm run hostinger:build` | `npm run build` seul (sans migrate)  |
| **Instances / workers** | **1** (défaut Hostinger)  | PM2 cluster, `instances: max`        |
| **Entry file**          | `dist/server.cjs`         | —                                    |

Hostinger gère **un seul** process Node pour l’app — ne jamais ajouter PM2 sur cette offre.

### Nettoyage si Max Processes est déjà saturé

1. **Node.js Web App → Stop** (ou Kill all Node processes dans hPanel si disponible).
2. Attendre **30–60 s** que tous les processus se terminent.
3. Vérifier qu’aucun PM2 ne tourne (SSH, si accès) : `npx pm2 delete all` puis `npx pm2 kill` — **uniquement** si PM2 avait été lancé par erreur.
4. **Restart** (pas Rebuild) une seule fois.
5. Attendre `Performance Académique server running on port 3000` **une seule fois** dans les Runtime logs.
6. Tester `https://axelmond.com/api/live` puis `/api/health`.

### Prévention durable

- **Un push = un déploiement** : regrouper les commits avant de pousser sur `main`.
- Après un incident, préférer **Restart** plutôt qu’un nouveau push (qui relance tout le pipeline).
- Ne pas définir `REDIS_URL` + PM2 cluster sur Hostinger shared Node (réservé au VPS / Docker).
- Surveiller **Max Processes** dans hPanel après chaque déploiement : la valeur doit retomber à **1 processus Node** stable.
- `npm start` attend que le port soit libre (`scripts/hostinger-start.mjs`) avant de lancer Node — évite les doubles `server running` pendant le handoff de déploiement.
- Ajouter dans hPanel : `HOSTINGER_PORT_WAIT_MS=45000` (généré par `npm run hostinger:env`).

## PM2 / SSH

Le script `scripts/deploy-hostinger.sh` et PM2 sont pour un serveur VPS avec accès SSH.  
Sur l’offre **Node.js Web App** Hostinger, **ne pas** lancer PM2 en parallèle — Hostinger gère déjà le process Node.
