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

## Variables d’environnement

Dans **Websites → axelmond.com → Environment variables**, reprenez toutes les clés du `.env` production :

- `NODE_ENV=production`
- `DATABASE_URL` (avec `?schema=AxelmondResearchLab`)
- `APP_URL=https://axelmond.com`
- `AUTH_TOKEN_SECRET`, `EMAIL_VERIFICATION_SECRET`, `MOBILE_API_SECRET`
- PayPal, LiveKit, UploadThing, SMTP, VAPID, OpenAI, etc.

Sans ces variables, le build peut réussir mais l’app crash au démarrage → **503**.

## Vérifier un déploiement

1. **Deployments** — statut `Completed` (pas `Failed`).
2. **Runtime logs** — chercher `Axelmond Research Labs server running`.
3. Navigateur : `https://axelmond.com/api/health` → `{"status":"UP",...}`.

## En cas de 503

Les **Runtime logs** montrent parfois `server running` et des requêtes API (200) alors que le domaine public renvoie 503. Dans ce cas, **Node fonctionne** — c’est le **proxy Hostinger** ou le **domaine** qui ne route pas correctement.

1. Ouvrir **Deployments** → cliquer l’**URL de preview** Hostinger (pas seulement axelmond.com).
   - Preview OK + domaine en 503 → problème de liaison domaine / `.htaccess` dans `public_html`.
2. **Settings** → Framework : **Express.js** (pas Vite seul). Entry file : `dist/server.cjs`. Start : `npm start`.
3. Bouton **Restart** sur le dashboard Node.js (sans rebuild).
4. Vérifier que le site `axelmond.com` est bien un **Node.js Web App**, pas un ancien hébergement PHP/statique en parallèle.

Dans les logs, `injected env (0) from .env` est **normal** : Hostinger injecte les variables via hPanel, pas via un fichier `.env`.

## PM2 / SSH

Le script `scripts/deploy-hostinger.sh` et PM2 sont pour un serveur VPS avec accès SSH.  
Sur l’offre **Node.js Web App** Hostinger, **ne pas** lancer PM2 en parallèle — Hostinger gère déjà le process Node.
