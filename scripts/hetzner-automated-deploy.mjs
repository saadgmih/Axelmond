import { Client } from 'ssh2';
import fs from 'node:fs';
import path from 'node:path';

const host = '167.233.62.125';
const rootPassword = process.env.HETZNER_ROOT_PASSWORD || process.argv[2];
const newPassword = process.env.HETZNER_NEW_PASSWORD || 'Saadgmih2004@';

if (!rootPassword) {
  console.error('Usage: node scripts/hetzner-automated-deploy.mjs <ROOT_PASSWORD>');
  process.exit(1);
}

const envFilePath = path.join(process.cwd(), '.hetzner.env');
if (!fs.existsSync(envFilePath)) {
  console.error('Erreur: .hetzner.env introuvable. Exécutez d\'abord npm run hetzner:env');
  process.exit(1);
}
const envContent = fs.readFileSync(envFilePath, 'utf8');
const setupScriptContent = fs.readFileSync(
  path.join(process.cwd(), 'scripts', 'setup-hetzner.sh'),
  'utf8',
);

console.log('========================================================');
console.log('🚀 Déploiement automatisé sur Hetzner CPX32 (167.233.62.125)');
console.log('========================================================');

const conn = new Client();

function executeCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    console.log(`\n💻 [EXEC] ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let output = '';
      stream
        .on('close', (code, signal) => {
          if (code === 0) resolve(output);
          else reject(new Error(`Command failed with code ${code}: ${cmd}\nOutput: ${output}`));
        })
        .on('data', (data) => {
          output += data;
          process.stdout.write(data);
        })
        .stderr.on('data', (data) => {
          process.stderr.write(data);
        });
    });
  });
}

function uploadFile(sftp, remotePath, content) {
  return new Promise((resolve, reject) => {
    console.log(`📤 [UPLOAD] Envoi de ${remotePath} (${content.length} octets)...`);
    const stream = sftp.createWriteStream(remotePath);
    stream.on('close', () => {
      console.log(`✅ ${remotePath} écrit avec succès.`);
      resolve();
    });
    stream.on('error', reject);
    stream.end(content);
  });
}

conn
  .on('ready', async () => {
    console.log('✅ Connexion SSH établie avec succès !');

    try {
      // 1. Initialiser SFTP
      const sftp = await new Promise((res, rej) =>
        conn.sftp((err, sftp) => (err ? rej(err) : res(sftp))),
      );

      // 2. Transférer le script setup-hetzner.sh
      await uploadFile(sftp, '/root/setup-hetzner.sh', setupScriptContent);
      await executeCommand(conn, 'chmod +x /root/setup-hetzner.sh');

      // 3. Exécuter le setup du système
      console.log('\n⚙️ Exécution du script d\'installation système (Node, Redis, PM2, Nginx)...');
      await executeCommand(conn, '/root/setup-hetzner.sh');

      // 4. Cloner ou mettre à jour le projet dans /var/www/axelmond
      console.log('\n📁 Configuration du dépôt de l\'application...');
      await executeCommand(
        conn,
        'if [ ! -d "/var/www/axelmond/.git" ]; then ' +
          'rm -rf /var/www/axelmond && ' +
          'git clone https://github.com/saadgmih/Axelmond.git /var/www/axelmond && ' +
          'mkdir -p /var/www/axelmond/logs; ' +
          'else cd /var/www/axelmond && git fetch origin && git reset --hard origin/main; fi',
      );

      // 5. Uploader le .env de production complet
      console.log('\n🔐 Injection des variables d\'environnement de production (.hetzner.env)...');
      await uploadFile(sftp, '/var/www/axelmond/.env', envContent);

      // 6. Installation des dépendances et build
      console.log('\n📦 Installation des dépendances npm...');
      await executeCommand(conn, 'cd /var/www/axelmond && npm ci');

      console.log('\n🗄️ Application des migrations Prisma...');
      await executeCommand(conn, 'cd /var/www/axelmond && npx prisma migrate deploy');

      console.log('\n🔨 Compilation de l\'application (Vite + esbuild)...');
      await executeCommand(conn, 'cd /var/www/axelmond && npm run build');

      // 7. Lancement PM2 en mode cluster
      console.log('\n🚀 Lancement de PM2 Cluster...');
      await executeCommand(
        conn,
        'cd /var/www/axelmond && ' +
          'pm2 delete performance-academique 2>/dev/null || true && ' +
          'pm2 start ecosystem.config.cjs && ' +
          'pm2 save && ' +
          'pm2 startup systemd -u root --hp /root',
      );

      // 8. Test de santé de l'API
      console.log('\n🔍 Vérification de l\'état de l\'API...');
      await executeCommand(conn, 'curl -fsS http://127.0.0.1:3000/api/health || exit 1');

      console.log('\n========================================================');
      console.log('🎉 DÉPLOIEMENT HETZNER TERMINÉ AVEC SUCCÈS !');
      console.log('L\'application tourne sur http://167.233.62.125');
      console.log('========================================================');
      conn.end();
      process.exit(0);
    } catch (err) {
      console.error('\n❌ Erreur pendant le déploiement :', err.message);
      conn.end();
      process.exit(1);
    }
  })
  .on('change password', (message, prompt, respond) => {
    console.log(`[PASSWD_EXPIRED] Changement de mot de passe requis: ${message}`);
    respond(newPassword);
  })
  .on('keyboard-interactive', (name, instr, lang, prompts, finish) => {
    console.log('[KB_INTERACTIVE] Demande interactive :', prompts.map((p) => p.prompt));
    const responses = prompts.map((p) => {
      const lower = p.prompt.toLowerCase();
      if (lower.includes('current') || lower.includes('actuel')) return rootPassword;
      if (lower.includes('new') || lower.includes('nouveau')) return newPassword;
      if (lower.includes('retype') || lower.includes('confirm') || lower.includes('repeat') || lower.includes('ressaisir')) return newPassword;
      return rootPassword;
    });
    finish(responses);
  })
  .on('error', (err) => {
    console.error('❌ Échec de connexion SSH :', err.message);
    process.exit(1);
  })
  .connect({
    host,
    port: 22,
    username: 'root',
    password: rootPassword,
    tryKeyboard: true,
  });
