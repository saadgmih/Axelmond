import { Client } from 'ssh2';
import path from 'node:path';
import fs from 'node:fs';

import { execSync } from 'node:child_process';

const host = '167.233.62.125';
const password = process.env.HETZNER_PASSWORD || 'Saadgmih2004@';
const localTar = path.resolve('dist.tar.gz');
const remoteTar = '/var/www/axelmond/dist.tar.gz';

console.log('Compressing dist directory into fresh dist.tar.gz...');
execSync('tar -czf dist.tar.gz -C dist .', { stdio: 'inherit' });

console.log('Connecting to Hetzner for dist deployment...');
const conn = new Client();

conn
  .on('ready', () => {
    console.log('SSH connection established. Starting SFTP upload...');
    conn.sftp((err, sftp) => {
      if (err) {
        console.error('SFTP error:', err);
        conn.end();
        process.exit(1);
      }

      const totalBytes = fs.statSync(localTar).size;
      let lastReport = 0;

      sftp.fastPut(
        localTar,
        remoteTar,
        {
          step: (total_transferred) => {
            const percent = Math.round((total_transferred / totalBytes) * 100);
            if (percent >= lastReport + 20 || percent === 100) {
              console.log(`Upload progress: ${percent}% (${Math.round(total_transferred / 1024 / 1024)} MB)`);
              lastReport = percent;
            }
          },
        },
        (err) => {
          if (err) {
            console.error('FastPut error:', err);
            conn.end();
            process.exit(1);
          }
          console.log('dist.tar.gz uploaded successfully!');

          const extractCmd =
            'mkdir -p /var/www/axelmond/dist && tar -xzf /var/www/axelmond/dist.tar.gz -C /var/www/axelmond/dist && rm -f /var/www/axelmond/dist.tar.gz && pm2 reload all';
          console.log(`Executing remote command: ${extractCmd}`);

          conn.exec(extractCmd, (err, stream) => {
            if (err) {
              console.error('Exec error:', err);
              conn.end();
              process.exit(1);
            }
            stream
              .on('close', (code) => {
                console.log(`Deployment completed with code ${code}!`);
                conn.end();
                process.exit(code);
              })
              .on('data', (d) => process.stdout.write(d))
              .stderr.on('data', (d) => process.stderr.write(d));
          });
        },
      );
    });
  })
  .on('error', (err) => {
    console.error('Conn error:', err.message);
    process.exit(1);
  })
  .connect({ host, port: 22, username: 'root', password });
