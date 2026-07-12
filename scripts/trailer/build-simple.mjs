/**
 * Montage simple — pages nettes, sans écrans de chargement, libellés en haut à gauche.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(__dirname, "raw", "walkthrough.webm");
const MARKERS_PATH = path.join(__dirname, "raw", "markers.json");
const WORK = path.join(__dirname, "work", "simple");
const OUT_DIR = path.join(__dirname, "output");
const FINAL = path.join(OUT_DIR, "performance-academique-simple.mp4");
const VERSION_COPY = path.join(OUT_DIR, "versions", "04-simple-pages-nettes.mp4");

const FONT =
  process.platform === "win32"
    ? "C\\:/Windows/Fonts/segoeui.ttf"
    : "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";

const BRAND_GREEN = "0x10B981";

const SCENES = [
  { id: "login", title: "Connexion étudiante", subtitle: "Accès sécurisé à votre espace", startExtra: 1.0 },
  { id: "dashboard", title: "Mon Espace Étudiant", subtitle: "Tableau de bord et progression", startExtra: 1.2 },
  { id: "profile", title: "Profil étudiant", subtitle: "Informations et parcours académique", startExtra: 1.4 },
  { id: "account-security", title: "Sécurité du compte", subtitle: "Mot de passe et authentification", startExtra: 1.4 },
  { id: "catalog", title: "Catalogue des modules", subtitle: "Domaines et formations disponibles", startExtra: 1.6 },
  { id: "course", title: "Espace cours", subtitle: "Syllabus et contenus du module", startExtra: 1.8 },
  { id: "video", title: "Leçons vidéo", subtitle: "Cours en streaming intégré", startExtra: 2.6 },
  { id: "pdf", title: "Documents PDF", subtitle: "Ressources pédagogiques consultables", startExtra: 1.8 },
  { id: "study-plan", title: "Plan d'étude", subtitle: "Objectifs et organisation", startExtra: 1.4 },
  { id: "messages", title: "Messagerie", subtitle: "Échanges avec les enseignants", startExtra: 1.2 },
  { id: "notifications", title: "Notifications", subtitle: "Alertes et rappels importants", startExtra: 2.8 },
  { id: "charity", title: "Solidarité", subtitle: "Engagement et bienfaisance", startExtra: 1.6 },
  { id: "live", title: "Classes en direct", subtitle: "Sessions live interactives", startExtra: 2.4 },
];

const PAD_IN = 0.4;
const PAD_OUT = 0.55;
const MIN_CLIP = 4.2;
const MAX_CLIP = 7.0;
const CROSSFADE = 0.18;

function fontArg() {
  return `fontfile='${FONT}'`;
}

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

function probeDuration(file) {
  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file],
    { encoding: "utf8" },
  );
  const value = Number.parseFloat((probe.stdout || "").trim());
  return Number.isFinite(value) ? value : 0;
}

function loadMarkers() {
  return JSON.parse(fs.readFileSync(MARKERS_PATH, "utf8"));
}

function clipsFromMarkers(markers, sourceDuration) {
  const markerMap = new Map(markers.map((m) => [m.id, m.t]));
  const endT = markerMap.get("end") ?? sourceDuration;

  return SCENES.map((meta, index) => {
    const startT = markerMap.get(meta.id) ?? 0;
    const nextId = SCENES[index + 1]?.id ?? "end";
    const nextT = nextId === "end" ? endT : (markerMap.get(nextId) ?? endT);
    const gap = nextT - startT;

    if (nextId === "end") {
      const segStart = startT + Math.max(2.2, meta.startExtra);
      const segEnd = endT - 0.55;
      const segLen = Math.max(0.8, segEnd - segStart);
      const duration = Math.max(2.4, Math.min(3.4, segLen - 0.06));
      const start = segStart;
      return { ...meta, start, duration };
    }

    const navReserve =
      gap > 9
        ? Math.min(5.2, Math.max(4.2, gap * 0.48))
        : gap > 7
          ? Math.min(4.0, Math.max(2.8, gap * 0.36))
          : Math.max(1.0, gap * 0.2);

    let startExtra = meta.startExtra;
    let segStart = startT + startExtra;
    let segEnd = Math.min(nextT - PAD_OUT, nextT - navReserve);

    while (segStart >= segEnd - 0.3 && startExtra > 0.45) {
      startExtra -= 0.35;
      segStart = startT + startExtra;
    }

    if (segEnd - segStart < MIN_CLIP) {
      segStart = startT + Math.min(startExtra, 0.65);
    }

    const segLen = Math.max(0.45, segEnd - segStart);
    let duration = Math.min(MAX_CLIP, Math.max(3.4, segLen * 0.84));
    duration = Math.min(duration, segLen - 0.06);

    let start = segStart;
    if (segLen > duration + 0.45) {
      start = segStart + (segLen - duration) * 0.22;
    }
    start = Math.max(segStart, Math.min(start, segEnd - duration - 0.05));

    if (start + duration > sourceDuration - 0.06) {
      duration = Math.max(2.8, sourceDuration - start - 0.08);
    }
    duration = Math.max(2.8, Math.min(duration, segEnd - start - 0.04));

    return { ...meta, start, duration };
  });
}

function pageLabelOverlay(work, scene, duration) {
  const titlePath = path.join(work, `${scene.id}-title.txt`);
  const subtitlePath = path.join(work, `${scene.id}-subtitle.txt`);
  writeUtf8Text(titlePath, scene.title);
  writeUtf8Text(subtitlePath, scene.subtitle);
  const tp = toFf(titlePath);
  const sp = toFf(subtitlePath);
  const showUntil = Math.max(0.9, duration - 0.15).toFixed(2);

  return [
    `drawbox=x=28:y=24:w=520:h=92:color=black@0.42:t=fill:enable='between(t,0.08,${showUntil})'`,
    `drawbox=x=28:y=24:w=4:h=92:color=${BRAND_GREEN}@0.95:t=fill:enable='between(t,0.08,${showUntil})'`,
    `drawtext=${fontArg()}:textfile='${tp}':fontcolor=white:fontsize=34:x=48:y=40:shadowcolor=black@0.55:shadowx=1:shadowy=1:enable='between(t,0.1,${showUntil})'`,
    `drawtext=${fontArg()}:textfile='${sp}':fontcolor=${BRAND_GREEN}:fontsize=21:x=48:y=78:enable='between(t,0.12,${showUntil})'`,
  ].join(",");
}

function sharpFilter(work, scene) {
  const duration = scene.duration;
  return [
    "scale=1920:1080:force_original_aspect_ratio=increase",
    "crop=1920:1080",
    "fps=30",
    "format=yuv420p",
    pageLabelOverlay(work, scene, duration),
  ].join(",");
}

function buildClip(scene, index) {
  const out = path.join(WORK, `${String(index).padStart(2, "0")}-${scene.id}.mp4`);
  // Rough seek before -i, then accurate seek after -i (avoids landing on earlier keyframes / loading screens).
  const preSeek = Math.max(0, scene.start - 3);
  const fineSeek = scene.start - preSeek;
  run(
    "ffmpeg",
    [
      "-y",
      "-ss",
      String(preSeek.toFixed(3)),
      "-i",
      RAW,
      "-ss",
      String(fineSeek.toFixed(3)),
      "-t",
      String(scene.duration.toFixed(3)),
      "-an",
      "-vf",
      sharpFilter(WORK, scene),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "15",
      "-preset",
      "medium",
      out,
    ],
    `clip ${scene.id}`,
  );
  return { path: out, duration: scene.duration };
}

function concatClips(clips) {
  const merged = path.join(WORK, "merged.mp4");
  if (clips.length === 1) return clips[0].path;

  let filter = "";
  let lastLabel = "[0:v]";
  for (let i = 1; i < clips.length; i += 1) {
    const offset = clips.slice(0, i).reduce((sum, c) => sum + c.duration, 0) - CROSSFADE * i;
    const outLabel = i === clips.length - 1 ? "[vout]" : `[v${i}]`;
    filter += `${lastLabel}[${i}:v]xfade=transition=fade:duration=${CROSSFADE}:offset=${offset.toFixed(3)}${outLabel};`;
    lastLabel = outLabel;
  }

  const args = ["-y"];
  for (const clip of clips) args.push("-i", clip.path);
  args.push(
    "-filter_complex",
    filter.slice(0, -1),
    "-map",
    "[vout]",
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "15",
    "-preset",
    "medium",
    "-movflags",
    "+faststart",
    merged,
  );
  run("ffmpeg", args, "merge");
  return merged;
}

function addLightAudio(input, output, totalDuration) {
  const d = totalDuration.toFixed(2);
  const fadeOut = Math.max(0, totalDuration - 2).toFixed(2);
  run(
    "ffmpeg",
    [
      "-y",
      "-i",
      input,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=220:duration=${d}:sample_rate=48000`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=330:duration=${d}:sample_rate=48000`,
      "-filter_complex",
      `[1:a]volume=0.04[a1];[2:a]volume=0.025[a2];[a1][a2]amix=inputs=2:duration=longest,lowpass=f=800,afade=t=in:st=0:d=1,afade=t=out:st=${fadeOut}:d=2,volume=0.35[a]`,
      "-map",
      "0:v",
      "-map",
      "[a]",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-shortest",
      output,
    ],
    "audio",
  );
}

function main() {
  if (!fs.existsSync(RAW) || !fs.existsSync(MARKERS_PATH)) {
    console.error("Footage manquant. Lancez: npm run trailer:capture");
    process.exit(1);
  }

  fs.mkdirSync(WORK, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(VERSION_COPY), { recursive: true });
  if (fs.existsSync(WORK)) {
    for (const f of fs.readdirSync(WORK)) fs.unlinkSync(path.join(WORK, f));
  }

  const sourceDuration = probeDuration(RAW);
  const markers = loadMarkers();
  const scenes = clipsFromMarkers(markers, sourceDuration);

  console.log(`Montage simple — ${scenes.length} pages (sans chargement, libellés)`);
  for (const s of scenes) {
    console.log(`  ${s.id}: start=${s.start.toFixed(2)}s dur=${s.duration.toFixed(2)}s`);
  }

  const built = scenes.map((scene, index) => buildClip(scene, index));
  const merged = concatClips(built);
  const duration = probeDuration(merged);

  addLightAudio(merged, FINAL, duration);
  fs.copyFileSync(FINAL, VERSION_COPY);

  console.log(`\nVidéo simple prête:`);
  console.log(`  ${FINAL} (${duration.toFixed(1)}s)`);
  console.log(`  ${VERSION_COPY}`);
}

main();
