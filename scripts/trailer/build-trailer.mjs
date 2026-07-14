/**
 * Bureau cinématique — personne en entreprise + vrai site sur l'écran du PC.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(__dirname, "raw", "walkthrough.webm");
const MARKERS_PATH = path.join(__dirname, "raw", "markers.json");
const ASSETS = path.join(__dirname, "assets");
const OFFICE_MAN = path.join(ASSETS, "office-worker.mp4");
const OFFICE_WOMAN = path.join(ASSETS, "office-woman.mp4");
const WORK = path.join(__dirname, "work");
const OUT_DIR = path.join(__dirname, "output");
const FINAL = path.join(OUT_DIR, "performance-academique-trailer.mp4");

const FONT =
  process.platform === "win32" ? "C\\:/Windows/Fonts/segoeui.ttf" : "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";

const BRAND_GREEN = "0x10B981";
const BG_DARK = "0x040806";
const CROSSFADE = 0.22;
const MIN_CLIP = 1.5;
const MAX_CLIP = 2.4;
const PAD_IN = 0.2;
const PAD_OUT = 0.12;
const OUTRO_DURATION = 2.8;

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

const SCENE_META = [
  { id: "login", privacy: ["loginFields"], transition: "hblur" },
  { id: "dashboard", privacy: ["shellHeader", "shellSidebarUser", "welcomeBanner"], transition: "smoothleft" },
  { id: "profile", privacy: ["shellHeader", "shellSidebarUser", "profileCard"], transition: "hblur" },
  { id: "account-security", privacy: ["shellHeader", "shellSidebarUser"], transition: "smoothright" },
  { id: "catalog", privacy: ["shellHeader", "shellSidebarUser"], transition: "hblur" },
  { id: "course", privacy: ["shellHeader", "shellSidebarUser", "instructorLine"], transition: "smoothleft" },
  { id: "video", privacy: ["shellHeader", "shellSidebarUser"], transition: "hblur" },
  { id: "pdf", privacy: ["shellHeader", "shellSidebarUser"], transition: "smoothright" },
  { id: "study-plan", privacy: ["shellHeader", "shellSidebarUser"], transition: "hblur" },
  { id: "messages", privacy: ["shellHeader", "shellSidebarUser"], transition: "smoothleft" },
  { id: "notifications", privacy: ["shellHeader", "shellSidebarUser"], transition: "hblur" },
  { id: "charity", privacy: ["shellHeader", "shellSidebarUser"], transition: "smoothright" },
  { id: "live", privacy: ["shellHeader", "shellSidebarUser"], transition: "hblur" },
];

const WHIP_TRANSITIONS = ["hblur", "smoothleft", "smoothright", "smoothleft", "hblur"];

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

function ensureOfficeAssets() {
  const missing = [OFFICE_MAN, OFFICE_WOMAN].filter((f) => !fs.existsSync(f));
  if (missing.length) {
    console.log("Téléchargement des plans bureau (Pexels)…");
    run("node", [path.join(__dirname, "fetch-assets.mjs")], "fetch-assets");
  }
}

function regionsForScene(scene) {
  const regions = [];
  for (const key of scene.privacy || []) {
    const batch = PRIVACY[key];
    if (batch) regions.push(...batch);
  }
  return regions;
}

function privacyBlurChain(regions) {
  if (!regions.length) return "";
  if (regions.length === 1) {
    const r = regions[0];
    return `,split[pb][pt];[pt]crop=${r.w}:${r.h}:${r.x}:${r.y},boxblur=7:2[pf];[pb][pf]overlay=${r.x}:${r.y}`;
  }
  let chain = "";
  for (let i = 0; i < regions.length; i += 1) {
    const r = regions[i];
    const inLabel = i === 0 ? "" : `[pv${i - 1}]`;
    const outLabel = i === regions.length - 1 ? "" : `[pv${i}]`;
    if (i === 0) {
      chain += `split[p${i}b][p${i}t];[p${i}t]crop=${r.w}:${r.h}:${r.x}:${r.y},boxblur=7:2[p${i}f];[p${i}b][p${i}f]overlay=${r.x}:${r.y}${outLabel}`;
    } else {
      chain += `;${inLabel}split[p${i}b][p${i}t];[p${i}t]crop=${r.w}:${r.h}:${r.x}:${r.y},boxblur=7:2[p${i}f];[p${i}b][p${i}f]overlay=${r.x}:${r.y}${outLabel}`;
    }
  }
  return `,${chain}`;
}

function uiMotionChain(duration, zoomDir = "in", panY = 0) {
  const frames = Math.max(1, Math.round(duration * 30));
  const zStart = zoomDir === "in" ? 1.02 : 1.1;
  const zEnd = zoomDir === "in" ? 1.1 : 1.02;
  const yExpr = panY === 0 ? "ih/2-(ih/zoom/2)" : `max(0,min(ih-ih/zoom,(ih/2-(ih/zoom/2))+${panY}*on/${frames}))`;
  return [
    "scale=1920:1080:force_original_aspect_ratio=increase",
    "crop=1920:1080",
    `zoompan=z='${zStart}+(${zEnd}-${zStart})*on/${frames}':x='iw/2-(iw/zoom/2)':y='${yExpr}':d=${frames}:s=1920x1080:fps=30`,
    "eq=contrast=1.1:brightness=0.03:saturation=1.12:gamma=1.04",
    "colorbalance=rs=0.01:gs=0.06:bs=-0.03",
    "unsharp=5:5:0.4:5:5:0",
  ].join(",");
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

function bureauCompositeFilter(duration, privacy, zoomDir, panY, cropBiasY) {
  const ui = `${uiMotionChain(duration, zoomDir, panY)}${privacy}`;
  const fadeOut = Math.max(0.08, duration - 0.14).toFixed(2);
  const { x, y, w, h } = SCREEN;
  const o = BEZEL_OUTER;
  const i = BEZEL_INNER;
  return [
    `[0:v]${officeBackgroundChain(cropBiasY)}[bg]`,
    `[1:v]${ui},setsar=1[ui]`,
    `[ui]scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0x020617[screen]`,
    `[bg][screen]overlay=${x}:${y}:format=auto[lap]`,
    `[lap]drawbox=x=${o.x}:y=${o.y}:w=${o.w}:h=${o.h}:color=0x1e293b:t=16,drawbox=x=${i.x}:y=${i.y}:w=${i.w}:h=${i.h}:color=0x0b1220:t=4,drawbox=x=${x}:y=${y + h - 2}:w=${w}:h=3:color=${BRAND_GREEN}@0.35:t=fill,vignette=PI/4.6,fade=t=in:st=0:d=0.14,fade=t=out:st=${fadeOut}:d=0.14,fps=30,format=yuv420p[v]`,
  ].join(";");
}

function cinematicOutroFilter(duration, titlePath, subtitlePath) {
  return [
    `drawbox=x=0:y=0:w=iw:h=ih:color=0x064e3b:t=fill`,
    `drawbox=x=-240+mod(t*820\\,2600):y=ih*0.46:w=520:h=90:color=${BRAND_GREEN}@0.35:t=fill`,
    `drawbox=x=mod(t*640\\,2600)-280:y=ih*0.52:w=420:h=50:color=${BRAND_GREEN}@0.22:t=fill`,
    `drawtext=${fontArg()}:textfile='${titlePath}':fontcolor=white:fontsize=78:x=(w-text_w)/2:y=(h-text_h)/2-36`,
    `drawtext=${fontArg()}:textfile='${subtitlePath}':fontcolor=${BRAND_GREEN}:fontsize=30:x=(w-text_w)/2:y=(h-text_h)/2+42`,
    `drawbox=x=${BEZEL_OUTER.x}:y=${BEZEL_OUTER.y}:w=${BEZEL_OUTER.w}:h=${BEZEL_OUTER.h}:color=0x1e293b:t=16`,
    `drawbox=x=${BEZEL_INNER.x}:y=${BEZEL_INNER.y}:w=${BEZEL_INNER.w}:h=${BEZEL_INNER.h}:color=0x0b1220:t=4`,
    "vignette=PI/5",
    "fade=t=in:st=0:d=0.25",
    `fade=t=out:st=${Math.max(0.1, duration - 0.35)}:d=0.35,fps=30,format=yuv420p`,
  ].join(",");
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
  if (!fs.existsSync(MARKERS_PATH)) return null;
  return JSON.parse(fs.readFileSync(MARKERS_PATH, "utf8"));
}

function clipsFromMarkers(markers, sourceDuration) {
  const markerMap = new Map(markers.map((m) => [m.id, m.t]));
  const endT = markerMap.get("end") ?? sourceDuration;

  return SCENE_META.map((meta, index) => {
    const startT = markerMap.get(meta.id) ?? 0;
    const nextId = SCENE_META[index + 1]?.id ?? "end";
    const nextT = nextId === "end" ? endT : (markerMap.get(nextId) ?? endT);

    let start = startT + PAD_IN;
    let end = nextT - PAD_OUT;
    let duration = end - start;
    duration = Math.min(MAX_CLIP, Math.max(MIN_CLIP, duration));
    end = start + duration;
    if (end > sourceDuration) {
      end = sourceDuration;
      start = Math.max(0, end - duration);
    }

    return {
      ...meta,
      kind: "clip",
      start,
      end,
      duration: end - start,
      transition: meta.transition || WHIP_TRANSITIONS[index % WHIP_TRANSITIONS.length],
    };
  });
}

function pickOfficeClip(index, sceneId) {
  if (sceneId === "login" || sceneId === "dashboard" || sceneId === "course") return OFFICE_MAN;
  if (index % 2 === 0) return OFFICE_MAN;
  return OFFICE_WOMAN;
}

function officeSeek(index, officeDuration, clipDuration) {
  const slots = [2, 6, 11, 16, 22, 28, 33];
  const base = slots[index % slots.length];
  const maxStart = Math.max(0, officeDuration - clipDuration - 0.5);
  return Math.min(base, maxStart);
}

function buildClip(scene, index) {
  const out = path.join(WORK, `${String(index).padStart(2, "0")}-${scene.id}.mp4`);
  const duration = scene.duration;
  const zoomDir = index % 2 === 0 ? "in" : "out";
  const panY = scene.id === "catalog" || scene.id === "profile" ? 14 : 0;
  const cropBiasY = scene.id === "login" ? -20 : -55;
  const privacy = privacyBlurChain(regionsForScene(scene));
  const officePath = pickOfficeClip(index, scene.id);
  const officeDuration = probeDuration(officePath);
  const officeStart = officeSeek(index, officeDuration, duration);
  const filterComplex = bureauCompositeFilter(duration, privacy, zoomDir, panY, cropBiasY);

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
      RAW,
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
    `bureau ${scene.id}`,
  );
  return { path: out, duration, transition: scene.transition };
}

function buildOutro(index) {
  const out = path.join(WORK, `${String(index).padStart(2, "0")}-outro.mp4`);
  const titlePath = path.join(WORK, "outro-title.txt");
  const subtitlePath = path.join(WORK, "outro-subtitle.txt");
  writeUtf8Text(titlePath, "Performance Académique");
  writeUtf8Text(subtitlePath, "Formation · Progression · Réussite");
  const tp = titlePath.replace(/\\/g, "/").replace(/:/g, "\\:");
  const sp = subtitlePath.replace(/\\/g, "/").replace(/:/g, "\\:");

  run(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=${BG_DARK}:s=1920x1080:d=${OUTRO_DURATION}:r=30`,
      "-vf",
      cinematicOutroFilter(OUTRO_DURATION, tp, sp),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "15",
      out,
    ],
    "cinematic outro",
  );
  return { path: out, duration: OUTRO_DURATION, transition: "fade" };
}

function concatWithWhipCuts(clips) {
  if (clips.length === 1) return clips[0].path;

  let filter = "";
  let lastLabel = "[0:v]";

  for (let i = 1; i < clips.length; i += 1) {
    const offset = clips.slice(0, i).reduce((sum, c) => sum + c.duration, 0) - CROSSFADE * i;
    const outLabel = i === clips.length - 1 ? "[vout]" : `[v${i}]`;
    const transition = clips[i].transition || "hblur";
    filter += `${lastLabel}[${i}:v]xfade=transition=${transition}:duration=${CROSSFADE}:offset=${offset.toFixed(3)}${outLabel};`;
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
    "slow",
    "-movflags",
    "+faststart",
    path.join(WORK, "merged.mp4"),
  );

  run("ffmpeg", args, "whip-cut merge");
  return path.join(WORK, "merged.mp4");
}

function addCinematicAudio(input, output, totalDuration) {
  const d = totalDuration.toFixed(2);
  const fadeOut = Math.max(0, totalDuration - 1.2).toFixed(2);
  run(
    "ffmpeg",
    [
      "-y",
      "-i",
      input,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=110:duration=${d}:sample_rate=48000`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=165:duration=${d}:sample_rate=48000`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=220:duration=${d}:sample_rate=48000`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=330:duration=${d}:sample_rate=48000`,
      "-f",
      "lavfi",
      "-i",
      `anoisesrc=d=${d}:color=pink:amplitude=0.02,highpass=f=800,lowpass=f=6000`,
      "-filter_complex",
      [
        "[1:a]volume='if(lt(mod(t,0.5),0.06),0.55,0.08)':eval=frame[kick];",
        "[2:a]volume=0.12[bass];",
        "[3:a]volume=0.09[mid];",
        "[4:a]volume='if(between(mod(t,1),0,0.04),0.14,0.05)':eval=frame[hat];",
        "[5:a]volume='if(between(mod(t,2),0,0.03),0.08,0.02)':eval=frame[sh];",
        "[kick][bass][mid][hat][sh]amix=inputs=5:duration=longest,",
        "lowpass=f=4200,highpass=f=55,",
        `afade=t=in:st=0:d=0.35,afade=t=out:st=${fadeOut}:d=1.1,`,
        "volume=0.42,",
        "aformat=channel_layouts=stereo[a]",
      ].join(""),
      "-map",
      "0:v",
      "-map",
      "[a]",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      output,
    ],
    "cinematic audio",
  );
}

function main() {
  if (!fs.existsSync(RAW)) {
    console.error(`Missing raw footage: ${RAW}\nRun: npm run trailer:capture`);
    process.exit(1);
  }

  ensureOfficeAssets();

  fs.mkdirSync(WORK, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (fs.existsSync(WORK)) {
    for (const f of fs.readdirSync(WORK)) fs.unlinkSync(path.join(WORK, f));
  }

  const sourceDuration = probeDuration(RAW);
  const markers = loadMarkers();
  if (!markers?.length) {
    console.error("Missing markers.json — re-run trailer:capture");
    process.exit(1);
  }

  console.log(`Montage bureau entreprise — source UI ${sourceDuration.toFixed(1)}s`);
  const clipScenes = clipsFromMarkers(markers, sourceDuration);
  const built = clipScenes.map((scene, index) => buildClip(scene, index));
  built.push(buildOutro(built.length));
  const merged = concatWithWhipCuts(built);
  const mergedDuration = probeDuration(merged);

  addCinematicAudio(merged, FINAL, mergedDuration);
  console.log(`\nTrailer prêt: ${FINAL} (${mergedDuration.toFixed(1)}s)`);
}

main();
