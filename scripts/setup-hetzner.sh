#!/usr/bin/env bash
# ==============================================================================
# Setup Script — Hetzner Cloud Ubuntu VPS (CPX32 - 4 vCPU / 8 GB RAM)
# Performance Académique (Axelmond)
# ==============================================================================
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

echo "=========================================================="
echo "🚀 Initialisation du serveur Hetzner (Performance Académique)"
echo "=========================================================="

# 1. Mise à jour du système
echo "📦 1/7 Mise à jour des paquets système..."
apt-get update -y
apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
apt-get install -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" curl wget git ufw fail2ban certbot python3-certbot-nginx build-essential

# 2. Sécurisation du pare-feu UFW
echo "🛡️ 2/7 Configuration du pare-feu UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

# Activer et démarrer Fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# 3. Installation de Node.js 22 LTS
echo "🟢 3/7 Installation de Node.js 22 LTS..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
fi
echo "Node version: $(node -v)"
echo "NPM version:  $(npm -v)"

# 4. Installation et activation de Redis
echo "⚡ 4/7 Installation de Redis Server..."
apt install -y redis-server
systemctl enable redis-server
systemctl restart redis-server
redis-cli ping || (echo "Erreur démarrage Redis" && exit 1)
echo "✅ Redis opérationnel (PONG)"

# 5. Installation globale de PM2
echo "⚙️ 5/7 Installation de PM2..."
npm install -g pm2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# 6. Installation et configuration de Nginx
echo "🌐 6/7 Installation et configuration de Nginx..."
apt install -y nginx
systemctl enable nginx

# Configuration du reverse proxy Nginx pour Axelmond
cat << 'EOF' > /etc/nginx/sites-available/axelmond
server {
    listen 80;
    listen [::]:80;
    server_name perfacademy.ma www.perfacademy.ma axelmond.com www.axelmond.com 167.233.62.125 _;

    client_max_body_size 64M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Headers de transmission d'IP et d'hôte
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts pour SSE et requêtes longues
        proxy_read_timeout 300s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
    }

    # Cache statique agressif pour les assets Vite hashés
    location /assets/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf /etc/nginx/sites-available/axelmond /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 7. Création du dossier applicatif
echo "📁 7/7 Préparation du dossier de l'application..."
mkdir -p /var/www/axelmond
mkdir -p /var/www/axelmond/logs
chown -R $USER:$USER /var/www/axelmond

echo "=========================================================="
echo "🎉 Serveur Hetzner prêt pour le déploiement !"
echo "=========================================================="
echo "Prochaines étapes :"
echo "1. Cloner le repo dans /var/www/axelmond"
echo "2. Créer le fichier .env (sans HOSTINGER_WEBAPP, avec REDIS_URL=redis://127.0.0.1:6379)"
echo "3. Exécuter: npm ci && npx prisma migrate deploy && npm run build"
echo "4. Lancer PM2: pm2 start ecosystem.config.cjs && pm2 save && pm2 startup"
echo "5. Activer le SSL: certbot --nginx -d perfacademy.ma -d www.perfacademy.ma -d axelmond.com -d www.axelmond.com"
echo "=========================================================="
