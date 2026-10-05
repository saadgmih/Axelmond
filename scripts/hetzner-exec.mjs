import { Client } from 'ssh2';

const host = '167.233.62.125';
const password = process.env.HETZNER_PASSWORD || 'Saadgmih2004@';
const cmd = process.argv.slice(2).join(' ') || 'echo SSH_OK';

const conn = new Client();
conn
  .on('ready', () => {
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error('Exec error:', err);
        conn.end();
        process.exit(1);
      }
      stream
        .on('close', (code) => {
          conn.end();
          process.exit(code);
        })
        .on('data', (d) => process.stdout.write(d))
        .stderr.on('data', (d) => process.stderr.write(d));
    });
  })
  .on('error', (err) => {
    console.error('Conn error:', err.message);
    process.exit(1);
  })
  .connect({ host, port: 22, username: 'root', password });
