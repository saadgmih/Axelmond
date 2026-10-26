import { execSync } from 'child_process';
import { Client } from 'ssh2';

const buildId = 'f092fb30-1f85-4382-ad12-5df75e1912c2';
console.log(`Watching EAS build ${buildId}...`);

async function checkBuild() {
  while (true) {
    try {
      const out = execSync(`npx eas-cli build:view ${buildId} --json`, {
        cwd: 'c:\\Users\\saadg\\Desktop\\Projets_Dev\\Unicode\\axelmond-mobile',
        encoding: 'utf8'
      });
      // Extract JSON part
      const jsonStart = out.indexOf('{');
      if (jsonStart !== -1) {
        const data = JSON.parse(out.slice(jsonStart));
        console.log(`[${new Date().toLocaleTimeString()}] Status: ${data.status}`);
        
        if (data.status === 'FINISHED') {
          const apkUrl = data.artifacts?.buildUrl || data.artifacts?.applicationArchiveUrl;
          console.log('BUILD FINISHED! APK URL:', apkUrl);
          
          if (!apkUrl) {
            console.error('No artifact URL found in build payload!');
            process.exit(1);
          }

          console.log('Connecting to Hetzner to download new APK directly to production...');
          const conn = new Client();
          conn.on('ready', () => {
            const cmd = `
              curl -L -o /var/www/axelmond/dist/perfacademy.apk "${apkUrl}"
              cp -f /var/www/axelmond/dist/perfacademy.apk /var/www/axelmond/public/perfacademy.apk
              ls -lh /var/www/axelmond/dist/perfacademy.apk
            `;
            conn.exec(cmd, (err, stream) => {
              if (err) {
                console.error('Exec error:', err);
                conn.end();
                process.exit(1);
              }
              stream.on('data', d => process.stdout.write(d));
              stream.stderr.on('data', d => process.stderr.write(d));
              stream.on('close', code => {
                console.log(`APK successfully deployed to production! (code: ${code})`);
                conn.end();
                process.exit(0);
              });
            });
          }).connect({
            host: '167.233.62.125',
            port: 22,
            username: 'root',
            password: process.env.HETZNER_PASSWORD || 'Saadgmih2004@'
          });
          return;
        }

        if (data.status === 'ERRORED' || data.status === 'CANCELED') {
          console.error('Build ended with status:', data.status);
          process.exit(1);
        }
      }
    } catch (e) {
      console.warn('Check failed, retrying in 20s...', e.message);
    }

    await new Promise(r => setTimeout(r, 20000));
  }
}

checkBuild();
