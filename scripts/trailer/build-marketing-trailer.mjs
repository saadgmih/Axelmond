import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(__dirname, "raw", "walkthrough.webm");
const PROF_RAW = path.join(__dirname, "raw", "professor.webm");
const ASSETS = path.join(__dirname, "assets");
const OFFICE_MAN = path.join(ASSETS, "office-worker.mp4");
const OFFICE_WOMAN = path.join(ASSETS, "office-woman.mp4");
const WORK = path.join(__dirname, "work", "marketing");
const OUT_DIR = path.join(__dirname, "output");
const FINAL_MP4 = path.join(OUT_DIR, "performance-academique-marketing.mp4");
const SRT_FILE = path.join(OUT_DIR, "performance-academique-marketing.srt");

const FONT =
  process.platform === "win32"
    ? "C\\:/Windows/Fonts/segoeui.ttf"
    : "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";

const BRAND_GREEN = "0x10B981";
const BG_DARK = "0x040806";
const CROSSFADE = 0.2;

const SCREEN = { x: 268, y: 158, w: 1384, h: 780 };
const BEZEL_OUTER = { x: 254, y: 144, w: 1412, h: 808 };
const BEZEL_INNER = { x: 266, y: 156, w: 1388, h: 784 };

const PRIVACY = {
  loginFields: [{ x: 560, y: 360, w: 800, h: 320 }],
  shellHeader: [{ x: 1460, y: 4, w: 450, h: 104 }],
  shellSidebarUser: [{ x: 6, y: 948, w: 318, h: 120 }],
  welcomeBanner: [{ x: 282, y: 162, w: 420, h: 68 }],
  instructorLine: [{ x: 1020, y: 770, w: 320, h: 32 }],
  profileCard: [{ x: 520, y: 168, w: 720, h: 130 }],
};

function run(cmd, args, label) {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`${label || cmd} failed with code ${result.status}`);
}

function writeUtf8Text(filePath, text) {
  fs.writeFileSync(filePath, `\uFEFF${text}`, "utf8");
}

function toFf(pathValue) {
  return pathValue.replace(/\\/g, "/").replace(/:/g, "\\:");
}

function fontArg() {
  return `fontfile='${FONT}'`;
}

function officeBackgroundChain(cropBiasY = -50) {
  return [
    "scale=2120:1193:force_original_aspect_ratio=increase",
    `crop=1920:1080:x='(iw-ow)/2+22*sin(2*PI*t/9)':y='max(0,(ih-oh)/2+${cropBiasY}+14*cos(2*PI*t/7))'`,
    "eq=brightness=-0.05:contrast=1.12:saturation=0.9:gamma=0.98",
    "colorbalance=rs=0.05:gs=0.02:bs=-0.04",
    "vignette=PI/3.2",
  ].join(",");
}

// Draw a beautiful floating badge in the top-left corner
function badgeFilter(text) {
  if (!text) return "";
  const cleanText = text.replace(/'/g, "\\'");
  return [
    `drawbox=x=60:y=60:w=480:h=56:color=0x040806@0.8:t=fill`,
    `drawbox=x=60:y=60:w=6:h=56:color=${BRAND_GREEN}@0.95:t=fill`,
    `drawtext=${fontArg()}:text='${cleanText}':fontcolor=white:fontsize=20:x=84:y=76:borderw=1:bordercolor=black@0.6`
  ].join(",");
}

// Burn French subtitles directly into the bottom of the video clip
function subtitleFilter(text) {
  if (!text) return "";
  const cleanText = text.replace(/'/g, "\\'");
  return `drawtext=${fontArg()}:text='${cleanText}':fontcolor=white:fontsize=23:x=(w-text_w)/2:y=1000:borderw=2:bordercolor=black@0.8`;
}

function bureauCompositeFilter(duration, privacy, zoomDir, panY, cropBiasY, badgeText, subText, speedFactor = 1.0) {
  const speedFilter = speedFactor !== 1.0 ? `setpts=${speedFactor}*PTS` : "";
  const ui = [
    "scale=1920:1080:force_original_aspect_ratio=increase",
    "crop=1920:1080",
    speedFilter,
    privacy,
    `zoompan=z='1.02+0.08*on/(${Math.round(duration * 30)})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(duration * 30)}:s=1920x1080:fps=30`,
    "eq=contrast=1.1:brightness=0.03:saturation=1.12:gamma=1.04",
    "colorbalance=rs=0.01:gs=0.06:bs=-0.03",
    "unsharp=5:5:0.4:5:5:0"
  ].filter(Boolean).join(",");

  const { x, y, w, h } = SCREEN;
  const o = BEZEL_OUTER;
  const i = BEZEL_INNER;

  return [
    `[0:v]${officeBackgroundChain(cropBiasY)}[bg]`,
    `[1:v]${ui},setsar=1[ui]`,
    `[ui]scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0x020617[screen]`,
    `[bg][screen]overlay=${x}:${y}:format=auto[lap]`,
    `[lap]drawbox=x=${o.x}:y=${o.y}:w=${o.w}:h=${o.h}:color=0x1e293b:t=16,drawbox=x=${i.x}:y=${i.y}:w=${i.w}:h=${i.h}:color=0x0b1220:t=4,drawbox=x=${x}:y=${y + h - 2}:w=${w}:h=3:color=${BRAND_GREEN}@0.35:t=fill,vignette=PI/4.6${badgeText ? ',' + badgeFilter(badgeText) : ''}${subText ? ',' + subtitleFilter(subText) : ''},fade=t=in:st=0:d=0.14,fade=t=out:st=${Math.max(0.08, duration - 0.14).toFixed(2)}:d=0.14,fps=30,format=yuv420p[v]`,
  ].join(";");
}

function buildClip(scene, index) {
  const out = path.join(WORK, `${String(index).padStart(2, "0")}-${scene.id}.mp4`);
  const duration = scene.duration;
  
  let privacy = "";
  if (scene.id === "login") {
    privacy = `drawbox=x=738:y=528:w=415:h=46:color=0x03251D@1:t=fill,drawtext=fontfile='${FONT}':text='etudiant@performance-academique.com':fontcolor=white@0.85:fontsize=19:x=746:y=547`;
  }

  const officePath = scene.gender === "female" ? OFFICE_WOMAN : OFFICE_MAN;
  const officeStart = Math.min(2, Math.max(0, 30 - duration - 1));

  const filterComplex = bureauCompositeFilter(
    duration,
    privacy,
    "in",
    0,
    scene.id === "login" ? -20 : -55,
    scene.badge,
    scene.subtitle,
    scene.speedFactor || 1.0
  );

  run(
    "ffmpeg",
    [
      "-y",
      "-stream_loop",
      "-1",
      "-ss",
      String(officeStart),
      "-i",
      officePath,
      "-ss",
      String(scene.start),
      "-i",
      scene.source,
      "-t",
      String(duration),
      "-filter_complex",
      filterComplex,
      "-map",
      "[v]",
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "16",
      "-preset",
      "slow",
      out,
    ],
    `bureau-marketing ${scene.id}`,
  );
  return { path: out, duration };
}

function buildIntroCard(work, index) {
  const out = path.join(work, `${String(index).padStart(2, "0")}-intro.mp4`);
  const titlePath = path.join(work, "intro-title.txt");
  const subtitlePath = path.join(work, "intro-subtitle.txt");
  writeUtf8Text(titlePath, "Performance Académique");
  writeUtf8Text(subtitlePath, "Une nouvelle façon d’apprendre, d’enseigner et de progresser.");

  const filter = [
    `drawbox=x=0:y=0:w=iw:h=ih:color=0x031512:t=fill`, // opaline / forest theme
    `drawbox=x=-240+mod(t*520\\,2600):y=ih*0.48:w=620:h=90:color=${BRAND_GREEN}@0.35:t=fill`,
    `drawtext=${fontArg()}:textfile='${toFf(titlePath)}':fontcolor=white:fontsize=68:x=(w-text_w)/2:y=(h-text_h)/2-46:alpha='if(lt(t,0.65),t/0.65,1)'`,
    `drawtext=${fontArg()}:textfile='${toFf(subtitlePath)}':fontcolor=${BRAND_GREEN}:fontsize=23:x=(w-text_w)/2:y=(h-text_h)/2+38:alpha='if(lt(t,0.95),(t-0.2)/0.75,1)'`,
    "vignette=PI/5",
    "fade=t=in:st=0:d=0.25",
    `fade=t=out:st=5.6:d=0.4,fps=30,format=yuv420p`
  ].join(",");

  run(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=0x031512:s=1920x1080:d=6.0:r=30",
      "-vf",
      filter,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "15",
      out,
    ],
    "intro-card",
  );
  return { path: out, duration: 6.0 };
}

function buildOutroCard(work, index) {
  const out = path.join(work, `${String(index).padStart(2, "0")}-outro.mp4`);
  const titlePath = path.join(work, "outro-title.txt");
  const sub1Path = path.join(work, "outro-sub1.txt");
  const sub2Path = path.join(work, "outro-sub2.txt");

  writeUtf8Text(titlePath, "Performance Académique");
  writeUtf8Text(sub1Path, "Apprendre. Progresser. Réussir.");
  writeUtf8Text(sub2Path, "axelmond.com");

  const filter = [
    `drawbox=x=0:y=0:w=iw:h=ih:color=0x031512:t=fill`,
    `drawbox=x=mod(t*640\\,2600)-280:y=ih*0.52:w=520:h=60:color=${BRAND_GREEN}@0.22:t=fill`,
    `drawtext=${fontArg()}:textfile='${toFf(titlePath)}':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2-78`,
    `drawtext=${fontArg()}:textfile='${toFf(sub1Path)}':fontcolor=${BRAND_GREEN}:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2+12`,
    `drawtext=${fontArg()}:textfile='${toFf(sub2Path)}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2+76`,
    subtitleFilter("Performance Académique. Transformez votre manière d’apprendre et d’enseigner."),
    "vignette=PI/5",
    "fade=t=in:st=0:d=0.25",
    `fade=t=out:st=5.6:d=0.4,fps=30,format=yuv420p`
  ].filter(Boolean).join(",");

  run(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=0x031512:s=1920x1080:d=6.0:r=30",
      "-vf",
      filter,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "15",
      out,
    ],
    "outro-card",
  );
  return { path: out, duration: 6.0 };
}

function concatClips(clips) {
  let filter = "";
  let lastLabel = "[0:v]";
  for (let i = 1; i < clips.length; i += 1) {
    const offset = clips.slice(0, i).reduce((sum, c) => sum + c.duration, 0) - CROSSFADE * i;
    const outLabel = i === clips.length - 1 ? "[vout]" : `[v${i}]`;
    filter += `${lastLabel}[${i}:v]xfade=transition=fade:duration=${CROSSFADE}:offset=${offset.toFixed(3)}${outLabel};`;
    lastLabel = outLabel;
  }
  const merged = path.join(WORK, "merged.mp4");
  const args = ["-y"];
  for (const clip of clips) args.push("-i", clip.path);
  args.push("-filter_complex", filter.slice(0, -1), "-map", "[vout]", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "15", "-preset", "slow", "-movflags", "+faststart", merged);
  run("ffmpeg", args, "merge");
  return merged;
}

function mixFinalAudio(inputVideo, outputVideo, totalDuration) {
  const d = totalDuration.toFixed(2);
  const fadeOut = Math.max(0, totalDuration - 2.0).toFixed(2);
  const voiceoverDir = path.join(__dirname, "work", "voiceovers");

  // Voiceover files
  const v2 = path.join(voiceoverDir, "02_dashboard.wav");
  const v3 = path.join(voiceoverDir, "03_catalog.wav");
  const v4 = path.join(voiceoverDir, "04_content.wav");
  const v5 = path.join(voiceoverDir, "05_progression.wav");
  const v6 = path.join(voiceoverDir, "06_live.wav");
  const v7 = path.join(voiceoverDir, "07_professor.wav");
  const v8 = path.join(voiceoverDir, "08_conclusion.wav");

  const args = [
    "-y",
    "-i", inputVideo,
    "-i", v2,
    "-i", v3,
    "-i", v4,
    "-i", v5,
    "-i", v6,
    "-i", v7,
    "-i", v8,
    // Add 5 synthesized music oscillators + pink noise
    "-f", "lavfi", "-i", `sine=frequency=110:duration=${d}:sample_rate=48000`,
    "-f", "lavfi", "-i", `sine=frequency=165:duration=${d}:sample_rate=48000`,
    "-f", "lavfi", "-i", `sine=frequency=220:duration=${d}:sample_rate=48000`,
    "-f", "lavfi", "-i", `sine=frequency=330:duration=${d}:sample_rate=48000`,
    "-f", "lavfi", "-i", `anoisesrc=d=${d}:color=pink:amplitude=0.015,highpass=f=800,lowpass=f=6000`,
    "-filter_complex",
    [
      // Background music generator
      "[8:a]volume='if(lt(mod(t,0.5),0.06),0.55,0.08)':eval=frame[kick];",
      "[9:a]volume=0.12[bass];[10:a]volume=0.09[mid];",
      "[11:a]volume='if(between(mod(t,1),0,0.04),0.14,0.05)':eval=frame[hat];",
      "[12:a]volume='if(between(mod(t,2),0,0.03),0.08,0.02)':eval=frame[sh];",
      "[kick][bass][mid][hat][sh]amix=inputs=5:duration=longest,lowpass=f=3800,highpass=f=60,",
      `afade=t=in:st=0:d=0.5,afade=t=out:st=${fadeOut}:d=1.5,volume=0.35[bg_music];`,

      // Voiceovers delayed to match visual timings:
      // Clip 0 (Intro): 0.0 - 5.8s
      // Clip 1 & 2 (Dashboard): 5.8 - 14.4s (Starts at 6.2s)
      "[1:a]adelay=6200|6200[a2];",
      // Clip 3 & 4 (Catalog): 14.4 - 26.0s (Starts at 15.2s)
      "[2:a]adelay=15200|15200[a3];",
      // Clip 5 & 6 (Content): 26.0 - 39.6s (Starts at 27.2s)
      "[3:a]adelay=27200|27200[a4];",
      // Clip 7 (Progression): 39.6 - 47.4s (Starts at 41.2s)
      "[4:a]adelay=41200|41200[a5];",
      // Clip 8 (Live): 47.4 - 57.2s (Starts at 49.2s)
      "[5:a]adelay=49200|49200[a6];",
      // Clip 9 (Prof): 57.2 - 64.0s (Starts at 59.2s)
      "[6:a]adelay=59200|59200[a7];",
      // Clip 10 (Outro): 64.0 - 70.0s (Starts at 66.2s)
      "[7:a]adelay=66200|66200[a8];",
      // Mix all voiceovers together and restore their volume (since amix with inputs=7 divides by 7)
      "[a2][a3][a4][a5][a6][a7][a8]amix=inputs=7:duration=longest,volume=7.0[voice_mix];",
      // Mix background music (volume=0.25) and voiceovers together, and restore their volume (since amix with inputs=2 divides by 2)
      "[bg_music][voice_mix]amix=inputs=2:duration=longest,volume=2.0[aout]"
    ].join(""),
    "-map", "0:v",
    "-map", "[aout]",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    outputVideo
  ];

  run("ffmpeg", args, "audio-mixing");
}

function writeSrtSubtitles() {
  const content = [
    "1",
    "00:00:01,000 --> 00:00:05,000",
    "Une nouvelle façon d’apprendre, d’enseigner et de progresser.",
    "",
    "2",
    "00:00:06,200 --> 00:00:14,000",
    "Performance Académique réunit tous les outils essentiels de l’apprentissage dans une seule plateforme.",
    "",
    "3",
    "00:00:15,200 --> 00:00:26,000",
    "Des formations structurées et accessibles.",
    "",
    "4",
    "00:00:27,200 --> 00:00:40,000",
    "Vidéos, documents et ressources pédagogiques sont organisés pour offrir une expérience d’apprentissage claire et continue.",
    "",
    "5",
    "00:00:41,200 --> 00:00:48,000",
    "Chaque étudiant peut suivre son avancement et reprendre son apprentissage là où il s’est arrêté.",
    "",
    "6",
    "00:00:49,200 --> 00:00:58,000",
    "Les sessions en direct rapprochent les professeurs et les étudiants, où qu’ils soient.",
    "",
    "7",
    "00:00:59,200 --> 00:01:05,000",
    "Les professeurs disposent d’un espace complet pour organiser, publier et accompagner leurs étudiants.",
    "",
    "8",
    "00:01:06,200 --> 00:01:11,000",
    "Performance Académique. Transformez votre manière d’apprendre et d’enseigner."
  ].join("\n");
  fs.writeFileSync(SRT_FILE, content, "utf8");
  console.log(`Fichier SRT sous-titres écrit sous : ${SRT_FILE}`);
}

function main() {
  if (!fs.existsSync(RAW) || !fs.existsSync(PROF_RAW)) {
    console.error("Footage brut manquant !");
    process.exit(1);
  }

  fs.mkdirSync(WORK, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Génération des fichiers SRT de sous-titres...");
  writeSrtSubtitles();

  const scenes = [
    // 2. Connexion et tableau de bord
    { id: "login", source: RAW, start: 2.79, duration: 4.0, gender: "male", badge: "Connexion", subtitle: "Performance Académique réunit tous les outils essentiels..." },
    { id: "dashboard", source: RAW, start: 6.73, duration: 5.0, gender: "male", badge: "Espace Étudiant", subtitle: "...de l’apprentissage dans une seule plateforme." },
    // 3. Catalogue et cours
    { id: "catalog", source: RAW, start: 32.99, duration: 6.0, gender: "female", badge: "Catalogue", subtitle: "Des formations structurées et accessibles." },
    { id: "course", source: RAW, start: 46.65, duration: 6.0, gender: "male", badge: "Plan d’apprentissage", subtitle: "Des formations structurées et accessibles." },
    // 4. Contenus
    { id: "video", source: RAW, start: 52.49, duration: 7.0, gender: "female", badge: "Leçons vidéo", subtitle: "Vidéos, documents et ressources pédagogiques sont organisés..." },
    { id: "pdf", source: RAW, start: 59.16, duration: 7.0, gender: "female", badge: "Support PDF", subtitle: "...pour offrir une expérience d’apprentissage claire et continue." },
    // 5. Progression
    { id: "study-plan", source: RAW, start: 68.11, duration: 8.0, gender: "female", badge: "Plan d’étude", subtitle: "Chaque étudiant peut suivre son avancement et reprendre son apprentissage là où il s’est arrêté." },
    // 6. Direct & Interactions (looping/stretching live from 4.8s to 10s using speedFactor=2.08)
    { id: "live", source: RAW, start: 106.7, duration: 10.0, gender: "female", badge: "Classes en Direct", subtitle: "Les sessions en direct rapprochent les professeurs et les étudiants, où qu’ils soient.", speedFactor: 2.08 },
    // 7. Espace Professeur
    { id: "professor", source: PROF_RAW, start: 10.0, duration: 7.0, gender: "male", badge: "Espace Enseignant", subtitle: "Les professeurs disposent d’un espace complet pour organiser, publier et accompagner leurs étudiants." }
  ];

  console.log("Génération des clips intermédiaires...");
  const clips = [];
  clips.push(buildIntroCard(WORK, 0));
  scenes.forEach((s, idx) => {
    clips.push(buildClip(s, idx + 1));
  });
  clips.push(buildOutroCard(WORK, clips.length));

  console.log("Fusion des clips avec transition xfade...");
  const merged = concatClips(clips);

  console.log("Mixage audio final (musique + voix off)...");
  mixFinalAudio(merged, FINAL_MP4, 70.0);

  console.log(`\nVidéo finale générée avec succès : ${FINAL_MP4}`);
}

main();
