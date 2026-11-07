#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "   Performance Academy Mail (PAM) - Postfix & OpenDKIM    "
echo "   Automated Installation & Hardening on Ubuntu 24.04     "
echo "=========================================================="

export DEBIAN_FRONTEND=noninteractive

# 1. Pre-seed debconf for silent non-interactive Postfix installation
echo "postfix postfix/mailname string perfacademy.ma" | debconf-set-selections
echo "postfix postfix/main_mailer_type string 'Internet Site'" | debconf-set-selections

# 2. Install Postfix and OpenDKIM packages
echo "[1/6] Installing postfix, opendkim, opendkim-tools..."
apt-get update -qq
apt-get install -y -qq postfix opendkim opendkim-tools mailutils

# 3. Configure /etc/mailname
echo "perfacademy.ma" > /etc/mailname

# 4. Configure OpenDKIM
echo "[2/6] Configuring OpenDKIM..."
mkdir -p /etc/opendkim/keys
chown -R opendkim:opendkim /etc/opendkim
chmod 750 /etc/opendkim
chmod 700 /etc/opendkim/keys

cat << 'EOF' > /etc/opendkim.conf
# OpenDKIM configuration for Performance Academy Mail (PAM)
Syslog                  yes
SyslogSuccess           yes
LogWhy                  yes
UMask                   007
Canonicalization        relaxed/simple
Mode                    sv
SubDomains              no
AutoRestart             yes
AutoRestartRate         10/1h
Background              yes
DNSTimeout              5
SignatureAlgorithm      rsa-sha256

# Socket listening for Postfix Milter
Socket                  inet:8891@127.0.0.1
PidFile                 /run/opendkim/opendkim.pid
UserID                  opendkim:opendkim

# Tables
KeyTable                /etc/opendkim/KeyTable
SigningTable            refile:/etc/opendkim/SigningTable
ExternalIgnoreList      refile:/etc/opendkim/TrustedHosts
InternalHosts           refile:/etc/opendkim/TrustedHosts
EOF

# Setup KeyTable, SigningTable, TrustedHosts
cat << 'EOF' > /etc/opendkim/KeyTable
mail._domainkey.perfacademy.ma perfacademy.ma:mail:/etc/opendkim/keys/mail.private
EOF

cat << 'EOF' > /etc/opendkim/SigningTable
*@perfacademy.ma mail._domainkey.perfacademy.ma
*@mail.perfacademy.ma mail._domainkey.perfacademy.ma
EOF

cat << 'EOF' > /etc/opendkim/TrustedHosts
127.0.0.1
::1
localhost
167.233.62.125
perfacademy.ma
mail.perfacademy.ma
EOF

chown -R opendkim:opendkim /etc/opendkim
chmod 640 /etc/opendkim/KeyTable /etc/opendkim/SigningTable /etc/opendkim/TrustedHosts

# 5. Copy DKIM private key if passed via environment or local file
if [ -f "/var/www/axelmond/performance-academy-mail/infrastructure/opendkim/mail.private" ]; then
  cp /var/www/axelmond/performance-academy-mail/infrastructure/opendkim/mail.private /etc/opendkim/keys/mail.private
  chown opendkim:opendkim /etc/opendkim/keys/mail.private
  chmod 600 /etc/opendkim/keys/mail.private
  echo "[3/6] DKIM private key successfully installed into /etc/opendkim/keys/mail.private"
fi

# 6. Apply Postfix main.cf
echo "[4/6] Configuring Postfix main.cf..."
if [ -f "/var/www/axelmond/performance-academy-mail/infrastructure/postfix/main.cf" ]; then
  cp /var/www/axelmond/performance-academy-mail/infrastructure/postfix/main.cf /etc/postfix/main.cf
  chmod 644 /etc/postfix/main.cf
fi

# Check Postfix syntax
postfix check
echo "[5/6] Postfix syntax check PASSED."

# 7. Restart and enable services
echo "[6/6] Starting OpenDKIM and Postfix services..."
systemctl restart opendkim
systemctl enable opendkim
systemctl restart postfix
systemctl enable postfix

echo "=========================================================="
echo "   Postfix & OpenDKIM status check:                       "
echo "=========================================================="
systemctl is-active opendkim
systemctl is-active postfix
postconf myhostname inet_interfaces smtpd_relay_restrictions

echo "=========================================================="
echo "   INSTALLATION COMPLETE - PAM MTA IS READY               "
echo "=========================================================="
