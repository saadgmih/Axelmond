import { Client } from 'ssh2';
import fs from 'node:fs';
import path from 'node:path';

const host = '167.233.62.125';
const password = process.env.HETZNER_PASSWORD || 'Saadgmih2004@';
const envFilePath = path.join(process.cwd(), '.hetzner.env');
const envContent = fs.readFileSync(envFilePath, 'utf8');

const conn = new Client();

function executeCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    console.log(`\n💻 [EXEC] ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let output = '';
      stream
        .on('close', (code) => {
          if (code === 0) resolve(output);
          else reject(new Error(`Command failed code ${code}: ${cmd}\n${output}`));
        })
        .on('data', (d) => {
          output += d;
          process.stdout.write(d);
        })
        .stderr.on('data', (d) => process.stderr.write(d));
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
    console.log('✅ Connecté à Hetzner.');
    try {
      const sftp = await new Promise((res, rej) =>
        conn.sftp((err, sftp) => (err ? rej(err) : res(sftp))),
      );

      // 1. Upload .env
      await uploadFile(sftp, '/var/www/axelmond/.env', envContent);

      // 2. Restart PM2 cluster
      console.log('\n🚀 Redémarrage PM2 Cluster...');
      await executeCommand(
        conn,
        'cd /var/www/axelmond && pm2 reload ecosystem.config.cjs --update-env && pm2 save',
      );

      // 3. Pause 2s then test health check
      await new Promise((r) => setTimeout(r, 2000));
      console.log('\n🔍 Test de santé de l\'API...');
      await executeCommand(conn, 'curl -i http://127.0.0.1:3000/api/health');

      console.log('\n🔍 Test Nginx direct...');
      await executeCommand(conn, 'curl -i http://127.0.0.1/api/health');

      console.log('\n🎉 SUCCÈS TOTAL !');
      conn.end();
      process.exit(0);
    } catch (e) {
      console.error('❌ Erreur:', e.message);
      conn.end();
      process.exit(1);
    }
  })
  .on('error', (err) => {
    console.error('Erreur SSH:', err.message);
    process.exit(1);
  })
  .connect({ host, port: 22, username: 'root', password });
