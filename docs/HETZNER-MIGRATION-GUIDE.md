# Guide de migration : Hostinger ➔ Hetzner Cloud (CPX32)

> **Serveur cible :** Hetzner Cloud `CPX32` (Falkenstein, Allemagne)  
> **IP publique :** `167.233.62.125` (IPv6: `2a01:4f8:c016:1b8a::/64`)  
> **Ressources :** 4 vCPU AMD, 8 Go RAM, 160 Go NVMe  
> **Système :** Ubuntu 24.04 / 22.04 LTS

---

## 1. Ce qui change par rapport à Hostinger

| Fonctionnalité | Hostinger Web App (Ancien) | Hetzner Cloud CPX32 (Nouveau) |
| :--- | :--- | :--- |
| **Architecture** | Mutualisé mono-process (`HOSTINGER_WEBAPP=1`) | **VPS Dédié avec PM2 Cluster (4 workers)** |
| **Ressources** | ~512 Mo RAM limitée, CPU partagé bridé | **4 vCPUs dédiés, 8 Go RAM, 160 Go NVMe rapide** |
| **Cache & Rate Limit** | Cache mémoire local par process | **Redis local partagé (`redis://127.0.0.1:6379`)** |
| **Pool PostgreSQL** | Limité à 2 connexions (`DATABASE_POOL_MAX=2`) | **Augmenté à 20-30 connexions** |
| **Reverse Proxy** | Propriétaire Hostinger, headers opaques | **Nginx natif avec HTTP/2, WebSocket et Gzip** |
| **Certificats SSL** | Gérés via hPanel | **Let's Encrypt automatique via Certbot** |

---

## 2. Étape 1 : Connexion SSH au serveur Hetzner

Depuis votre terminal local (PowerShell, Git Bash ou WSL) :

```bash
ssh root@167.233.62.125
```
*(Si vous avez configuré une clé SSH lors de la création sur Hetzner, elle sera utilisée directement ; sinon, utilisez le mot de passe root envoyé par email par Hetzner).*

---

## 3. Étape 2 : Initialisation automatique du serveur

Une fois connecté en SSH sur le VPS Hetzner, exécutez le script d'installation automatisé :

```bash
# Télécharger et exécuter le script d'initialisation
curl -fsSL https://raw.githubusercontent.com/saadgmih/Axelmond/main/scripts/setup-hetzner.sh -o setup-hetzner.sh
chmod +x setup-hetzner.sh
./setup-hetzner.sh
```

Ce script configure automatiquement :
- Les mises à jour de sécurité Ubuntu.
- Le pare-feu UFW (ports 22, 80, 443 autorisés, le reste bloqué).
- Fail2ban contre les attaques par force brute SSH.
- Node.js 22 LTS & NPM.
- **Redis Server** configuré et démarré comme service système.
- **PM2** avec rotation automatique des logs.
- **Nginx** configuré en reverse proxy vers `http://127.0.0.1:3000` avec support WebSockets.

---

## 4. Étape 3 : Cloner le dépôt et configurer l'environnement

```bash
cd /var/www/axelmond
git clone https://github.com/saadgmih/Axelmond.git .

# Installer les dépendances de production
npm ci
```

### Configuration du fichier `.env` de production

Vous avez deux façons très simples de configurer le fichier d'environnement :

#### Méthode A — Automatique depuis votre PC local (Recommandée) :
Depuis votre terminal local dans le projet :
```bash
# 1. Génère .hetzner.env propre avec toutes vos clés réelles existantes
npm run hetzner:env

# 2. L'envoie directement sur votre serveur Hetzner au bon endroit
scp .hetzner.env root@167.233.62.125:/var/www/axelmond/.env
```
*Le script supprime automatiquement toutes les contraintes Hostinger et injecte les optimisations Hetzner (`REDIS_URL`, `PM2_INSTANCES=max`, `DATABASE_POOL_MAX=20`).*

#### Méthode B — Manuelle sur le serveur Hetzner :
Créez le fichier `/var/www/axelmond/.env` :
```bash
nano /var/www/axelmond/.env
```
Copiez vos variables en adaptant les clés spécifiques à Hetzner :

```dotenv
# ─── Runtime Production ────────────────────────────────────────────────────────
NODE_ENV="production"
PORT=3000
APP_URL="https://axelmond.com"
ALLOWED_ORIGINS="https://www.axelmond.com,https://axelmond.com"
TRUST_PROXY="1"

# ─── Hetzner & PM2 Cluster Performance ─────────────────────────────────────────
# Redis local installé par le script : active automatiquement le mode cluster dans ecosystem.config.cjs
REDIS_URL="redis://127.0.0.1:6379"
PM2_INSTANCES="max"

# IMPORTANT : Ne PAS mettre HOSTINGER_WEBAPP="1" sur Hetzner !
# On augmente le pool de connexions DB (la machine a 8 Go de RAM)
DATABASE_POOL_MAX="20"
RUN_STARTUP_SEED="false"

# ─── Secrets Applicatifs (Conserver vos valeurs existantes) ─────────────────────
AUTH_TOKEN_SECRET="<VOTRE_SECRET_AUTH>"
EMAIL_VERIFICATION_SECRET="<VOTRE_SECRET_EMAIL>"
MOBILE_CLIENT_SECRET="<VOTRE_SECRET_MOBILE>"

# ─── Base de Données ──────────────────────────────────────────────────────────
DATABASE_URL="<VOTRE_POSTGRESQL_CONNECTION_STRING>?schema=AxelmondResearchLab&sslmode=require"

# ─── Services Tiers ────────────────────────────────────────────────────────────
LIVEKIT_URL="wss://..."
LIVEKIT_API_KEY="..."
LIVEKIT_API_SECRET="..."

UPLOADTHING_TOKEN="..."
UPLOADTHING_IS_DEV="false"

PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."
PAYPAL_ENV="live"
PAYPAL_WEBHOOK_ID="..."
```

---

## 5. Étape 4 : Déploiement et Lancement PM2

Dans `/var/www/axelmond` :

```bash
# 1. Appliquer les migrations de base de données
npx prisma migrate deploy

# 2. Compiler l'application (Vite + esbuild pour le backend)
npm run build

# 3. Lancer l'application avec PM2 en mode cluster
pm2 start ecosystem.config.cjs

# 4. Enregistrer PM2 pour qu'il redémarre automatiquement au reboot du serveur
pm2 save
pm2 startup systemd
# (Exécutez la commande sudo env PATH=... affichée par PM2 si demandée)
```

Vérifiez le statut des 4 workers :
```bash
pm2 status
```
Vous devez voir `performance-academique` en mode `cluster` avec 4 instances en statut `online`.

---

## 6. Étape 5 : Certificat SSL HTTPS (Let's Encrypt) & DNS

### 1. Pointer votre domaine vers Hetzner
Dans votre registrar de domaine (Hostinger DNS, Cloudflare ou Namecheap) :
- Modifiez l'enregistrement **A** pour `axelmond.com` : `167.233.62.125`
- Modifiez l'enregistrement **A** pour `www.axelmond.com` : `167.233.62.125`
- (Optionnel) Enregistrement **AAAA** : `2a01:4f8:c016:1b8a::`

### 2. Générer le certificat SSL Let's Encrypt
Dès que les DNS pointent vers le serveur :

```bash
certbot --nginx -d axelmond.com -d www.axelmond.com
```
Certbot va configurer automatiquement les certificats SSL et activer la redirection automatique HTTP ➔ HTTPS.

---

## 7. Commandes utiles de maintenance au quotidien

- **Voir les logs applicatifs :** `pm2 logs performance-academique`
- **Recharger sans interruption de service (Zero-downtime) :** `pm2 reload ecosystem.config.cjs --update-env`
- **Statistiques CPU/RAM en temps réel :** `pm2 monit` ou `htop`
- **Statut Redis :** `redis-cli info stats`
- **Logs Nginx :** `tail -f /var/log/nginx/error.log`
