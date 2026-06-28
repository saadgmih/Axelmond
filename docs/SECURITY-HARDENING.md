# Sécurité Performance Académique — durcissement anti-intrusion

## Score cible

| Périmètre | Cible | Commande |
|-----------|-------|----------|
| Code source | **95+/100** | `npm test -- tests/security-score-guards.test.ts` |
| Dépendances (high) | **0** | `npm run ci:audit` |
| Preflight prod | **PASS** | `npm run security:preflight` |
| Site production | **90+/100** | `npm run security:probe` |

Générer un secret mobile : `npm run security:mobile-secret`

## Mesures serveur actives

| Couche | Protection |
|--------|------------|
| **Authentification** | JWT 15 min, refresh 7 jours, rotation à chaque refresh, bcrypt cost **12** |
| **Refresh tokens** | Stockés **hashés SHA-256** en base (jamais en clair) + détection de réutilisation |
| **Brute force** | Lockout compte + rate limit login/register (20/min par email) |
| **Refresh abuse** | Rate limit 30/15 min par refresh token / IP sur `/api/auth/refresh` |
| **RBAC** | Refus par défaut sur routes `requireRbac` (whitelist explicite) |
| **Ownership** | Vérification `createdById` sur modules, chapitres, contenus, live |
| **Headers** | Helmet, CSP, HSTS, COOP, CORP, Permissions-Policy, Referrer-Policy |
| **CORS** | Allowlist `APP_URL` + `ALLOWED_ORIGINS` uniquement |
| **Mobile API** | `X-Axelmond-Client` + `X-Axelmond-Client-Key` (secret 32+ chars, prod) |
| **Anti-spoof mobile** | Rejet 403 + log si en-tête mobile sans clé valide |
| **Rate limits** | Global, auth, email, upload, LiveKit, chat IA, PayPal, admin |
| **Validation** | Zod + sanitization URL (avatars, pièces jointes, notifications) |
| **Mots de passe** | 12+ chars, HIBP fail-closed en production |
| **Uploads** | MIME, extensions dangereuses, suppression immédiate si rejet |
| **LiveKit** | Token 15 min, enrollment/ownership, modération staff only |
| **Paiements** | PayPal webhook signé, promo désactivés en prod par défaut |
| **Mock enrollment** | `ALLOW_MOCK_ENROLLMENT=true` requis, **jamais** en production |
| **Invitations prof** | Réservation atomique `reserveProfessorInviteCode` (anti race) |
| **Secrets prod** | `assertProductionConfiguration()` au boot |

## Variables d'environnement obligatoires (production)

```env
NODE_ENV=production
AUTH_TOKEN_SECRET=<64+ caractères aléatoires>
EMAIL_VERIFICATION_SECRET=<64+ caractères, distinct>
MOBILE_CLIENT_SECRET=<64+ caractères, distinct>
DATABASE_URL=postgresql://...?sslmode=require&schema=AxelmondResearchLab
APP_URL=https://votre-domaine.com
ALLOWED_ORIGINS=https://votre-domaine.com
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
UPLOADTHING_TOKEN=...
UPLOADTHING_IS_DEV=false
PAYPAL_ENV=live
```

**Interdits en production :** `ALLOW_MOCK_ENROLLMENT`, `HIBP_FAIL_OPEN`, `REGISTRATION_SEED_ENROLLMENT`, `UPLOADTHING_IS_DEV=true`.

## Mobile (Expo)

```env
# Serveur
MOBILE_CLIENT_SECRET=<même valeur que ci-dessus>

# App Expo
EXPO_PUBLIC_MOBILE_CLIENT_KEY=<même valeur>
```

## Déploiement Hostinger / PM2

```bash
git pull origin main
npm install
npm run deploy:migrate
npm run build
pm2 reload performance-academique
```

Migrations : voir [`docs/MIGRATIONS-RUNBOOK.md`](MIGRATIONS-RUNBOOK.md).

Vérifier HTTPS actif, firewall (ports 80/443 seulement), PostgreSQL non exposé publiquement.

## Recommandations complémentaires (ops)

1. **WAF / Cloudflare** devant le domaine (DDoS, bot fight)
2. **Fail2ban** sur SSH et logs nginx
3. **Sauvegardes DB** chiffrées quotidiennes
4. **Rotation secrets** trimestrielle (`AUTH_TOKEN_SECRET`, LiveKit, DB)
5. **Monitoring** : alertes sur `logSecurity` WARN/CRITICAL
6. **Scan CI** : `npm run ci:secrets` avant chaque release

## Protection du code client (production)

| Mesure | Effet |
|--------|--------|
| Build Vite | Minification, pas de source maps, suppression `console`/`debugger` |
| Noms de fichiers | Assets hashés (`assets/[hash].js`) |
| Serveur | Blocage `/src/`, `*.ts`, `*.map`, `package.json`, etc. |

**Limite technique :** le navigateur doit télécharger JS/CSS pour afficher le site. L'objectif est de rendre le code illisible et d'éviter l'exposition des sources TypeScript.

## Tokens client

L'access token JWT reste en **mémoire JavaScript** (15 min). Le refresh token est en cookie **HttpOnly** (`refresh_token`, path `/api/auth`) avec protection **CSRF** (`csrf_token` + header `X-CSRF-Token`).
