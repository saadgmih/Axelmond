import dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const HLS_BASE_DIR = process.env.HLS_BASE_DIR || '/var/www/axelmond/media/hls';

function runCmd(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`[CMD] ${cmd} ${args.join(' ')}`);
    const child = spawn(cmd, args, { stdio: 'inherit', ...options });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

function probeVideo(inputPath) {
  const stdout = execSync(
    `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of json "${inputPath}"`,
    { encoding: 'utf8' }
  );
  const data = JSON.parse(stdout);
  const stream = data.streams?.[0];
  if (!stream) throw new Error('No video stream found');
  return {
    width: parseInt(stream.width, 10),
    height: parseInt(stream.height, 10),
    duration: parseFloat(stream.duration || '0'),
  };
}

async function transcodeAttachment(attachment) {
  const { id, url, fileName, contentId, courseId } = attachment;
  console.log(`\n==================================================`);
  console.log(`[HLS] Processing Attachment [${id}] "${fileName}"`);
  console.log(`      Source: ${url}`);
  console.log(`==================================================`);

  const outDir = path.join(HLS_BASE_DIR, id);
  const masterPath = path.join(outDir, 'master.m3u8');

  if (fs.existsSync(masterPath)) {
    console.log(`[HLS] Master playlist already exists at ${masterPath}. Skipping transcode.`);
    return `/hls/${id}/master.m3u8`;
  }

  fs.mkdirSync(outDir, { recursive: true });

  // 1. Download or use local file
  let localSource = path.join(outDir, 'source.mp4');
  if (!fs.existsSync(localSource)) {
    console.log(`[HLS] Downloading source video from ${url}...`);
    await runCmd('curl', ['-L', '-s', '-o', localSource, url]);
    console.log(`[HLS] Downloaded source video: ${(fs.statSync(localSource).size / 1024 / 1024).toFixed(1)} MB`);
  }

  // 2. Probe resolution
  const { width, height, duration } = probeVideo(localSource);
  console.log(`[HLS] Source probed: ${width}x${height}, duration: ${duration.toFixed(1)}s`);

  // Define quality ladders
  // Each profile has: name, height, bitrate (video), maxrate, bufsize, audioBitrate
  const profiles = [
    { name: '1080p', height: 1080, vBitrate: '2500k', maxrate: '2800k', bufsize: '5000k', aBitrate: '128k', minSourceHeight: 900 },
    { name: '720p',  height: 720,  vBitrate: '1400k', maxrate: '1600k', bufsize: '2800k', aBitrate: '128k', minSourceHeight: 600 },
    { name: '480p',  height: 480,  vBitrate: '800k',  maxrate: '900k',  bufsize: '1600k', aBitrate: '96k',  minSourceHeight: 400 },
    { name: '360p',  height: 360,  vBitrate: '400k',  maxrate: '500k',  bufsize: '800k',  aBitrate: '64k',  minSourceHeight: 0 },
  ];

  const activeProfiles = profiles.filter(p => height >= p.minSourceHeight);
  // Ensure at least one profile
  if (activeProfiles.length === 0) {
    activeProfiles.push(profiles[profiles.length - 1]);
  }

  console.log(`[HLS] Generating ${activeProfiles.length} quality variants: ${activeProfiles.map(p => p.name).join(', ')}`);

  // Generate each variant
  for (const p of activeProfiles) {
    const playlistName = `${p.name}.m3u8`;
    const segmentPattern = `${p.name}_%03d.ts`;
    console.log(`\n[HLS] Encoding ${p.name} (height: ${p.height}, video: ${p.vBitrate})...`);

    const scaleFilter = `scale=-2:${p.height}`;

    await runCmd('ffmpeg', [
      '-y',
      '-i', localSource,
      '-vf', scaleFilter,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '22',
      '-b:v', p.vBitrate,
      '-maxrate', p.maxrate,
      '-bufsize', p.bufsize,
      '-c:a', 'aac',
      '-b:a', p.aBitrate,
      '-ar', '44100',
      '-hls_time', '4',
      '-hls_playlist_type', 'vod',
      '-hls_segment_filename', path.join(outDir, segmentPattern),
      path.join(outDir, playlistName),
    ]);
  }

  // Generate master.m3u8
  let masterContent = '#EXTM3U\n#EXT-X-VERSION:3\n';
  for (const p of activeProfiles) {
    const bandwidth = parseInt(p.maxrate, 10) * 1000 + parseInt(p.aBitrate, 10) * 1000;
    // Calculate approximate width maintaining aspect ratio
    const calcWidth = Math.round((width / height) * p.height / 2) * 2;
    masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${calcWidth}x${p.height},NAME="${p.name}"\n`;
    masterContent += `${p.name}.m3u8\n`;
  }

  fs.writeFileSync(masterPath, masterContent, 'utf8');
  console.log(`\n[HLS] Wrote master playlist at ${masterPath}`);

  // Clean up source.mp4 to save disk space
  if (fs.existsSync(localSource)) {
    fs.unlinkSync(localSource);
    console.log(`[HLS] Cleaned up temporary source file.`);
  }

  const hlsUrl = `/hls/${id}/master.m3u8`;

  // Update Database: Attachment.url and CourseModule.attachmentUrl
  await pool.query(
    `UPDATE "AxelmondResearchLab"."Attachment"
     SET url = $1, "mimeType" = 'application/vnd.apple.mpegurl'
     WHERE id = $2`,
    [hlsUrl, id]
  );
  console.log(`[DB] Updated Attachment [${id}] url -> ${hlsUrl}`);

  if (contentId) {
    const modRes = await pool.query(
      `UPDATE "AxelmondResearchLab"."CourseModule"
       SET "attachmentUrl" = $1
       WHERE "sectionId" = $2 OR "sectionId" = $3`,
      [hlsUrl, `lesson:${contentId}`, contentId]
    );
    console.log(`[DB] Updated ${modRes.rowCount} CourseModule row(s) for lesson ${contentId}`);
  }

  return hlsUrl;
}

async function main() {
  const targetId = process.argv.find(arg => arg.startsWith('--id='))?.split('=')[1];
  const processOne = process.argv.includes('--one');

  console.log(`[HLS Transcoder] Starting... targetId=${targetId || 'ALL'}, processOne=${processOne}`);

  let query = `
    SELECT a.id, a.url, a."fileName", a."contentId", a."courseId"
    FROM "AxelmondResearchLab"."Attachment" a
    WHERE a.type = 'VIDEO'
  `;
  const params = [];

  if (targetId) {
    query += ` AND a.id = $1`;
    params.push(targetId);
  }

  query += ` ORDER BY a."createdAt" ASC`;

  const res = await pool.query(query, params);
  console.log(`[HLS Transcoder] Found ${res.rows.length} video(s) to process.`);

  for (let i = 0; i < res.rows.length; i++) {
    const row = res.rows[i];
    console.log(`\nProgress: [${i + 1}/${res.rows.length}]`);
    try {
      await transcodeAttachment(row);
      // Flush Redis if on server
      try {
        execSync('redis-cli flushall', { stdio: 'ignore' });
      } catch {
        // Ignore if redis-cli not found locally
      }
    } catch (err) {
      console.error(`[ERROR] Failed to transcode [${row.id}]:`, err);
    }
    if (processOne) break;
  }

  console.log(`\n[HLS Transcoder] Done!`);
  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
