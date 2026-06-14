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

1. Ouvrir **Runtime logs** (pas seulement les build logs).
2. Erreur fréquente : `Invalid production configuration` → variable manquante dans hPanel.
3. Erreur Prisma → vérifier `DATABASE_URL` et que `prestart` / migrate s’est bien exécuté.
4. **Settings → Redeploy** après correction des variables.

## PM2 / SSH

Le script `scripts/deploy-hostinger.sh` et PM2 sont pour un serveur VPS avec accès SSH.  
Sur l’offre **Node.js Web App** Hostinger, **ne pas** lancer PM2 en parallèle — Hostinger gère déjà le process Node.
