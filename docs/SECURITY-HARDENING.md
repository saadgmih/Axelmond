# Sécurité Axelmond Research Labs — durcissement anti-intrusion

## Mesures serveur actives

| Couche | Protection |
|--------|------------|
| **Authentification** | JWT 15 min, refresh 7 jours, rotation à chaque refresh, bcrypt cost 10 |
| **Refresh tokens** | Stockés **hashés SHA-256** en base (jamais en clair) |
| **Brute force** | Lockout compte + rate limit login/register (20/min par email) |
| **Refresh abuse** | Rate limit 30/15 min par IP sur `/api/auth/refresh` |
| **RBAC** | Refus par défaut sur routes `requireRbac` (whitelist explicite) |
| **Ownership** | Vérification `createdById` sur modules, chapitres, contenus, live |
| **Headers** | Helmet, CSP, HSTS (prod), Permissions-Policy, Referrer-Policy |
| **CORS** | Allowlist `APP_URL` + `ALLOWED_ORIGINS` uniquement |
| **Rate limits** | Global, auth, email, upload, LiveKit, chat IA |
| **Validation** | Zod + sanitization HTML sur entrées sensibles |
| **Uploads** | MIME, extensions dangereuses, suppression immédiate si rejet |
| **LiveKit** | Token 15 min, enrollment/ownership, modération staff only |
| **Secrets prod** | `AUTH_TOKEN_SECRET` obligatoire, pas de secret dev en prod |

## Variables d'environnement obligatoires (production)

```env
NODE_ENV=production
AUTH_TOKEN_SECRET=<64+ caractères aléatoires>
DATABASE_URL=postgresql://...?sslmode=require
APP_URL=https://votre-domaine.com
ALLOWED_ORIGINS=https://votre-domaine.com
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
UPLOADTHING_TOKEN=...
UPLOADTHING_IS_DEV=false
```

## Déploiement Hostinger / PM2

```bash
git pull origin main
npm install
npm run build
pm2 reload axelmond-research-labs
```

Vérifier HTTPS actif, firewall (ports 80/443 seulement), PostgreSQL non exposé publiquement.

## Recommandations complémentaires (ops)

1. **WAF / Cloudflare** devant le domaine (DDoS, bot fight)
2. **Fail2ban** sur SSH et logs nginx
3. **Sauvegardes DB** chiffrées quotidiennes
4. **Rotation secrets** trimestrielle (`AUTH_TOKEN_SECRET`, LiveKit, DB)
5. **Monitoring** : alertes sur `logSecurity` WARN/CRITICAL
6. **Scan CI** : `node scan-secrets.js` avant chaque release

## Protection du code client (production)

| Mesure | Effet |
|--------|--------|
| Build Vite | Minification, pas de source maps, suppression `console`/`debugger` |
| Noms de fichiers | Assets hashés (`assets/[hash].js`) |
| Serveur | Blocage `/src/`, `*.ts`, `*.map`, `package.json`, etc. |
| Navigateur | Console neutralisée, raccourcis DevTools limités |

**Limite technique :** le navigateur doit télécharger JS/CSS pour afficher le site. Un utilisateur avancé peut toujours inspecter le réseau ou désactiver ces protections. L'objectif est de rendre le code illisible et d'éviter l'exposition des sources TypeScript.

## Limitation connue (tokens client)

L'access token JWT reste en **mémoire JavaScript** (15 min). Le refresh token est en cookie **HttpOnly** (`refresh_token`, path `/api/auth`) avec protection **CSRF** (`csrf_token` + header `X-CSRF-Token`).

Migration depuis l'ancien modèle localStorage : les clés legacy sont purgées au login/logout ; reconnexion requise si seule l'ancienne session localStorage subsiste.
