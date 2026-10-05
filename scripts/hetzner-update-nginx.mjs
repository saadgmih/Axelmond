import { Client } from 'ssh2';
import fs from 'node:fs';
import path from 'node:path';

const host = '167.233.62.125';
const password = process.env.HETZNER_PASSWORD || 'Saadgmih2004@';
const nginxConfPath = path.join(process.cwd(), 'scripts', 'nginx-axelmond.conf');
const confContent = fs.readFileSync(nginxConfPath, 'utf8');

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
    console.log(`📤 [UPLOAD] Envoi de ${remotePath}...`);
    const stream = sftp.createWriteStream(remotePath);
    stream.on('close', () => {
      console.log(`✅ ${remotePath} écrit.`);
      resolve();
    });
    stream.on('error', reject);
    stream.end(content);
  });
}

conn
  .on('ready', async () => {
    console.log('✅ Connecté.');
    try {
      const sftp = await new Promise((res, rej) =>
        conn.sftp((err, sftp) => (err ? rej(err) : res(sftp))),
      );

      await uploadFile(sftp, '/etc/nginx/sites-available/axelmond', confContent);
      await executeCommand(conn, 'nginx -t && systemctl reload nginx');
      console.log('🎉 Nginx mis à jour avec succès (HTTP + HTTPS).');
    } catch (err) {
      console.error('❌ Erreur:', err);
      process.exit(1);
    } finally {
      conn.end();
    }
  })
  .on('error', (err) => {
    console.error('❌ Erreur de connexion SSH:', err);
    process.exit(1);
  })
  .connect({ host, port: 22, username: 'root', password });
