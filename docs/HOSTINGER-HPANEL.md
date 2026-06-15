# Déploiement Hostinger (hPanel) — sans SSH

Axelmond utilise **Node.js Web App** avec **auto-déploiement GitHub**.  
Quand vous poussez sur `main`, Hostinger rebuild et redémarre l’app automatiquement — **aucune commande SSH n’est nécessaire**.

## Paramètres recommandés (Settings / Build)

| Champ | Valeur |
|--------|--------|
| Branche | `main` |
| Install | `npm ci` ou `npm install` |
| Build | `npm run build` |
| Start | `npm start` |
| Entry file | `dist/server.cjs` |
| Output directory | `dist` |
| Node.js | 20 ou 22 (selon `engines` dans `package.json`) |

`npm start` exécute automatiquement `prestart` → `prisma migrate deploy`, puis `node dist/server.cjs`.

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

| Groupe | Clés |
|--------|------|
| Runtime | `NODE_ENV`, `APP_URL`, `PORT`, `LOG_LEVEL`, `RUN_STARTUP_SEED`, `ALLOWED_ORIGINS`, `VITE_API_BASE_URL` |
| Auth | `AUTH_TOKEN_SECRET`, `EMAIL_VERIFICATION_SECRET`, **`MOBILE_CLIENT_SECRET`**, `AUTH_MAX_ATTEMPTS`, `AUTH_LOCKOUT_WINDOW_MS` |
| WebAuthn | `WEBAUTHN_RP_ID` (ex. `axelmond.com`), optionnel `WEBAUTHN_RP_NAME` |
| Base | `DATABASE_URL` (Neon + `?schema=AxelmondResearchLab&sslmode=require`) |
| PayPal | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_ENV=live`, `PAYPAL_CURRENCY_CODE`, `PAYPAL_MAD_TO_USD_RATE` |
| LiveKit | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |
| UploadThing | `UPLOADTHING_TOKEN`, `UPLOADTHING_IS_DEV=false`, `UPLOADTHING_CALLBACK_URL` |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `EMAIL_VERIFICATION_URL` |
| Push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| AI | `OPENAI_API_KEY` |
| Divers | `PROFESSOR_INVITE_CODES` |

Sans ces variables, le build peut réussir mais l’app crash au démarrage → **503** ou erreur `Invalid production configuration`.

## Vérifier un déploiement

1. **Deployments** — statut `Completed` (pas `Failed`).
2. **Runtime logs** — chercher `Axelmond Research Labs server running`.
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

## PM2 / SSH

Le script `scripts/deploy-hostinger.sh` et PM2 sont pour un serveur VPS avec accès SSH.  
Sur l’offre **Node.js Web App** Hostinger, **ne pas** lancer PM2 en parallèle — Hostinger gère déjà le process Node.
