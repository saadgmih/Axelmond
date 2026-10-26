import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const cmd = `
    cp -f /var/www/axelmond/dist/perfacademy.apk /var/www/axelmond/dist/perfacademy-v2.apk
    sed -i 's|/perfacademy.apk|/perfacademy-v2.apk|g' /etc/nginx/sites-available/axelmond
    nginx -t && systemctl reload nginx
  `;
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', code => {
      console.log('Finished with code:', code);
      conn.end();
    });
  });
}).connect({
  host: '167.233.62.125',
  port: 22,
  username: 'root',
  password: process.env.HETZNER_PASSWORD || 'Saadgmih2004@'
});
