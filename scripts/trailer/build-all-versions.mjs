/**
 * Génère toutes les versions du trailer dans output/versions/
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
const VERSIONS_DIR = path.join(__dirname, "output", "versions");

const FONT =
  process.platform === "win32"
    ? "C\\:/Windows/Fonts/segoeui.ttf"
    : "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";

const BRAND_GREEN = "0x10B981";
const BG = "0x031512";
const BG_DARK = "0x040806";

const PRIVACY = {
  loginFields: [{ x: 560, y: 360, w: 800, h: 320 }],
  shellHeader: [{ x: 1460, y: 4, w: 450, h: 104 }],
  shellSidebarUser: [{ x: 6, y: 948, w: 318, h: 120 }],
  welcomeBanner: [{ x: 282, y: 162, w: 420, h: 68 }],
  instructorLine: [{ x: 1020, y: 770, w: 320, h: 32 }],
  profileCard: [{ x: 520, y: 168, w: 720, h: 130 }],
};

const SCENE_COPY = {
  login: { title: "Connexion sécurisée", subtitle: "Accédez à votre espace en un instant", privacy: ["loginFields"] },
  dashboard: { title: "Mon Espace Étudiant", subtitle: "Tableau de bord et progression globale", privacy: ["shellHeader", "shellSidebarUser", "welcomeBanner"] },
  profile: { title: "Profil étudiant", subtitle: "Identité académique centralisée", privacy: ["shellHeader", "shellSidebarUser", "profileCard"] },
  "account-security": { title: "Sécurité du compte", subtitle: "Protection avancée de votre accès", privacy: ["shellHeader", "shellSidebarUser"] },
  catalog: { title: "Catalogue des modules", subtitle: "Domaines, disciplines et formations", privacy: ["shellHeader", "shellSidebarUser"] },
  course: { title: "Espace cours", subtitle: "Syllabus, chapitres et avancement", privacy: ["shellHeader", "shellSidebarUser", "instructorLine"] },
  video: { title: "Leçons vidéo", subtitle: "Contenus premium en streaming", privacy: ["shellHeader", "shellSidebarUser"] },
  pdf: { title: "Documents PDF", subtitle: "Ressources pédagogiques intégrées", privacy: ["shellHeader", "shellSidebarUser"] },
  "study-plan": { title: "Plan d'étude", subtitle: "Objectifs et organisation du travail", privacy: ["shellHeader", "shellSidebarUser"] },
  messages: { title: "Messagerie", subtitle: "Échanges avec vos enseignants", privacy: ["shellHeader", "shellSidebarUser"] },
  notifications: { title: "Notifications", subtitle: "Alertes et rappels en temps réel", privacy: ["shellHeader", "shellSidebarUser"] },
  charity: { title: "Solidarité", subtitle: "Engagement et bienfaisance académique", privacy: ["shellHeader", "shellSidebarUser"] },
  live: { title: "Classes en direct", subtitle: "Sessions live interactives", privacy: ["shellHeader", "shellSidebarUser"] },
};

const SCENE_ORDER = Object.keys(SCENE_COPY);
const SCREEN = { x: 268, y: 158, w: 1384, h: 780 };
const BEZEL_OUTER = { x: 254, y: 144, w: 1412, h: 808 };
const BEZEL_INNER = { x: 266, y: 156, w: 1388, h: 784 };

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

function hashLabel(value) {
  return value.replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
}

function regionsForScene(scene) {
  const regions = [];
  for (const key of scene.privacy || []) {
    for (const r of PRIVACY[key] || []) regions.push(r);
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

function clipsFromMarkers(markers, sourceDuration, style) {
  const markerMap = new Map(markers.map((m) => [m.id, m.t]));
  const endT = markerMap.get("end") ?? sourceDuration;
  return SCENE_ORDER.map((id, index) => {
    const meta = SCENE_COPY[id];
    const startT = markerMap.get(id) ?? 0;
    const nextId = SCENE_ORDER[index + 1] ?? "end";
    const nextT = nextId === "end" ? endT : (markerMap.get(nextId) ?? endT);
    let start = startT + style.padIn;
    let end = nextT - style.padOut;
    let duration = Math.min(style.maxClip, Math.max(style.minClip, end - start));
    end = start + duration;
    if (end > sourceDuration) {
      end = sourceDuration;
      start = Math.max(0, end - duration);
      duration = end - start;
    }
    return {
      id,
      kind: "clip",
      ...meta,
      start,
      end,
      duration,
      transition: style.transitions[index % style.transitions.length],
    };
  });
}

function uiMotionChain(duration, zoomDir, panY, strong = false) {
  const frames = Math.max(1, Math.round(duration * 30));
  const zStart = zoomDir === "in" ? (strong ? 1.0 : 1.02) : strong ? 1.07 : 1.1;
  const zEnd = zoomDir === "in" ? (strong ? 1.07 : 1.1) : strong ? 1.0 : 1.02;
  const yExpr =
    panY === 0
      ? "ih/2-(ih/zoom/2)"
      : `max(0,min(ih-ih/zoom,(ih/2-(ih/zoom/2))+${panY}*on/${frames}))`;
  const grade = strong
    ? "eq=contrast=1.12:brightness=0.02:saturation=1.15:gamma=1.05,colorbalance=rs=0.02:gs=0.08:bs=-0.04,unsharp=5:5:0.4:5:5:0,vignette=PI/4.5"
    : "eq=contrast=1.1:brightness=0.03:saturation=1.12:gamma=1.04,colorbalance=rs=0.01:gs=0.06:bs=-0.03,unsharp=5:5:0.4:5:5:0";
  return [
    "scale=1920:1080:force_original_aspect_ratio=increase",
    "crop=1920:1080",
    `zoompan=z='${zStart}+(${zEnd}-${zStart})*on/${frames}':x='iw/2-(iw/zoom/2)':y='${yExpr}':d=${frames}:s=1920x1080:fps=30`,
    grade,
  ].join(",");
}

function deviceFrameTail(duration) {
  const fadeOut = Math.max(0.08, duration - 0.12).toFixed(2);
  return [
    "scale=1540:866:force_original_aspect_ratio=decrease",
    "pad=1540:866:(ow-iw)/2:(oh-ih)/2:color=black",
    "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x040806",
    "drawbox=x=179:y=106:w=1562:h=870:color=0x1f2937:t=10",
    "drawbox=x=191:y=118:w=1538:h=846:color=0x111827:t=3",
    "vignette=PI/5",
    `fade=t=in:st=0:d=0.12,fade=t=out:st=${fadeOut}:d=0.12,fps=30,format=yuv420p`,
  ].join(",");
}

function overlayTitleFilter(work, duration, title, subtitle) {
  const titlePath = path.join(work, `overlay-${hashLabel(title)}-title.txt`);
  const subtitlePath = path.join(work, `overlay-${hashLabel(title)}-subtitle.txt`);
  writeUtf8Text(titlePath, title);
  writeUtf8Text(subtitlePath, subtitle);
  const tp = toFf(titlePath);
  const sp = toFf(subtitlePath);
  const showFrom = 0.5;
  const showUntil = Math.max(1.4, duration - 0.5);
  return [
    `drawbox=x=0:y=0:w=iw:h=140:color=black@0.55:t=fill:enable='between(t,${showFrom},${showUntil.toFixed(2)})'`,
    `drawtext=${fontArg()}:textfile='${tp}':fontcolor=white:fontsize=46:x=84:y=52:shadowcolor=black@0.7:shadowx=2:shadowy=2:enable='between(t,${showFrom},${showUntil.toFixed(2)})'`,
    `drawtext=${fontArg()}:textfile='${sp}':fontcolor=${BRAND_GREEN}:fontsize=26:x=84:y=104:enable='between(t,${(showFrom + 0.1).toFixed(2)},${showUntil.toFixed(2)})'`,
  ].join(",");
}

function titleCardFilter(duration, titlePath, subtitlePath) {
  return [
    `drawbox=x=0:y=ih*0.42:w=iw:h=2:color=${BRAND_GREEN}@0.92:t=fill`,
    `drawtext=${fontArg()}:textfile='${titlePath}':fontcolor=white:fontsize=74:x=(w-text_w)/2:y=(h-text_h)/2-42:alpha='if(lt(t,0.65),t/0.65,1)'`,
    `drawtext=${fontArg()}:textfile='${subtitlePath}':fontcolor=${BRAND_GREEN}:fontsize=34:x=(w-text_w)/2:y=(h-text_h)/2+38:alpha='if(lt(t,0.95),(t-0.2)/0.75,1)'`,
    "fade=t=in:st=0:d=0.4",
    `fade=t=out:st=${Math.max(0.1, duration - 0.5)}:d=0.5,fps=30,format=yuv420p`,
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
    `drawtext=${fontArg()}:textfile='${titlePath}':fontcolor=white:fontsize=78:x=(w-text_w)/2:y=(h-text_h)/2-36`,
    `drawtext=${fontArg()}:textfile='${subtitlePath}':fontcolor=${BRAND_GREEN}:fontsize=30:x=(w-text_w)/2:y=(h-text_h)/2+42`,
    `drawbox=x=${BEZEL_OUTER.x}:y=${BEZEL_OUTER.y}:w=${BEZEL_OUTER.w}:h=${BEZEL_OUTER.h}:color=0x1e293b:t=16`,
    "vignette=PI/5",
    "fade=t=in:st=0:d=0.25",
    `fade=t=out:st=${Math.max(0.1, duration - 0.35)}:d=0.35,fps=30,format=yuv420p`,
  ].join(",");
}

function pickOfficeClip(index, sceneId) {
  if (sceneId === "login" || sceneId === "dashboard" || sceneId === "course") return OFFICE_MAN;
  return index % 2 === 0 ? OFFICE_MAN : OFFICE_WOMAN;
}

function officeSeek(index, officeDuration, clipDuration) {
  const slots = [2, 6, 11, 16, 22, 28, 33];
  return Math.min(slots[index % slots.length], Math.max(0, officeDuration - clipDuration - 0.5));
}

function buildUiClip(work, scene, index, style) {
  const out = path.join(work, `${String(index).padStart(2, "0")}-${scene.id}.mp4`);
  const duration = scene.duration;
  const zoomDir = index % 2 === 0 ? "in" : "out";
  const panY = scene.id === "catalog" || scene.id === "profile" ? 14 : 0;
  const privacy = privacyBlurChain(regionsForScene(scene));
  let vf;

  if (style.name === "bureau") {
    const officePath = pickOfficeClip(index, scene.id);
    const officeStart = officeSeek(index, probeDuration(officePath), duration);
    const cropBiasY = scene.id === "login" ? -20 : -55;
    run(
      "ffmpeg",
      [
        "-y", "-stream_loop", "-1", "-ss", String(officeStart), "-i", officePath,
        "-ss", String(scene.start), "-i", RAW, "-t", String(duration),
        "-filter_complex", bureauCompositeFilter(duration, privacy, zoomDir, panY, cropBiasY),
        "-map", "[v]", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "slow", out,
      ],
      `${style.name} ${scene.id}`,
    );
    return { path: out, duration, transition: scene.transition };
  }

  const ui = `${uiMotionChain(duration, zoomDir, panY, style.name === "enterprise")}${privacy}`;
  const tail = deviceFrameTail(duration);
  if (style.overlays) {
    vf = `${ui},${overlayTitleFilter(work, duration, scene.title, scene.subtitle)},${tail}`;
  } else {
    vf = `${ui},${tail}`;
  }

  run(
    "ffmpeg",
    ["-y", "-ss", String(scene.start), "-i", RAW, "-t", String(duration), "-an", "-vf", vf, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "slow", out],
    `${style.name} ${scene.id}`,
  );
  return { path: out, duration, transition: scene.transition };
}

function buildTitleCard(work, index, id, duration, title, subtitle, transition) {
  const out = path.join(work, `${String(index).padStart(2, "0")}-${id}.mp4`);
  const titlePath = path.join(work, `${id}-title.txt`);
  const subtitlePath = path.join(work, `${id}-subtitle.txt`);
  writeUtf8Text(titlePath, title);
  writeUtf8Text(subtitlePath, subtitle);
  run(
    "ffmpeg",
    ["-y", "-f", "lavfi", "-i", `color=c=${BG}:s=1920x1080:d=${duration}:r=30`, "-vf", titleCardFilter(duration, toFf(titlePath), toFf(subtitlePath)), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", out],
    `title ${id}`,
  );
  return { path: out, duration, transition };
}

function buildOutro(work, index, style) {
  const out = path.join(work, `${String(index).padStart(2, "0")}-outro.mp4`);
  const duration = style.outroDuration;
  const titlePath = path.join(work, "outro-title.txt");
  const subtitlePath = path.join(work, "outro-subtitle.txt");
  writeUtf8Text(titlePath, "Performance Académique");
  writeUtf8Text(subtitlePath, "Formation · Progression · Réussite");

  if (style.name === "enterprise") {
    return buildTitleCard(work, index, "outro", duration, "Performance Académique", "Formation · Progression · Réussite", "fade");
  }

  run(
    "ffmpeg",
    ["-y", "-f", "lavfi", "-i", `color=c=${BG_DARK}:s=1920x1080:d=${duration}:r=30`, "-vf", cinematicOutroFilter(duration, toFf(titlePath), toFf(subtitlePath)), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "15", out],
    "outro",
  );
  return { path: out, duration, transition: "fade" };
}

function concatClips(work, clips, crossfade) {
  if (clips.length === 1) return clips[0].path;
  let filter = "";
  let lastLabel = "[0:v]";
  for (let i = 1; i < clips.length; i += 1) {
    const offset = clips.slice(0, i).reduce((sum, c) => sum + c.duration, 0) - crossfade * i;
    const outLabel = i === clips.length - 1 ? "[vout]" : `[v${i}]`;
    filter += `${lastLabel}[${i}:v]xfade=transition=${clips[i].transition || "fade"}:duration=${crossfade}:offset=${offset.toFixed(3)}${outLabel};`;
    lastLabel = outLabel;
  }
  const merged = path.join(work, "merged.mp4");
  const args = ["-y"];
  for (const clip of clips) args.push("-i", clip.path);
  args.push("-filter_complex", filter.slice(0, -1), "-map", "[vout]", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "15", "-preset", "slow", "-movflags", "+faststart", merged);
  run("ffmpeg", args, "merge");
  return merged;
}

function addAudio(style, input, output, totalDuration) {
  const d = totalDuration.toFixed(2);
  const fadeOut = Math.max(0, totalDuration - (style.name === "enterprise" ? 3 : 1.2)).toFixed(2);
  if (style.name === "enterprise") {
    run(
      "ffmpeg",
      [
        "-y", "-i", input,
        "-f", "lavfi", "-i", `sine=frequency=82:duration=${d}:sample_rate=48000`,
        "-f", "lavfi", "-i", `sine=frequency=123:duration=${d}:sample_rate=48000`,
        "-f", "lavfi", "-i", `sine=frequency=164:duration=${d}:sample_rate=48000`,
        "-f", "lavfi", "-i", `anoisesrc=d=${d}:color=pink:amplitude=0.003,lowpass=f=450`,
        "-filter_complex",
        `[1:a]volume=0.05[a1];[2:a]volume=0.032[a2];[3:a]volume=0.02[a3];[4:a]volume=0.015[a4];[a1][a2][a3][a4]amix=inputs=4:duration=longest,lowpass=f=1000,afade=t=in:st=0:d=2,afade=t=out:st=${fadeOut}:d=3,volume=0.65[a]`,
        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", output,
      ],
      "ambient audio",
    );
    return;
  }
  run(
    "ffmpeg",
    [
      "-y", "-i", input,
      "-f", "lavfi", "-i", `sine=frequency=110:duration=${d}:sample_rate=48000`,
      "-f", "lavfi", "-i", `sine=frequency=165:duration=${d}:sample_rate=48000`,
      "-f", "lavfi", "-i", `sine=frequency=220:duration=${d}:sample_rate=48000`,
      "-f", "lavfi", "-i", `sine=frequency=330:duration=${d}:sample_rate=48000`,
      "-f", "lavfi", "-i", `anoisesrc=d=${d}:color=pink:amplitude=0.02,highpass=f=800,lowpass=f=6000`,
      "-filter_complex",
      [
        "[1:a]volume='if(lt(mod(t,0.5),0.06),0.55,0.08)':eval=frame[kick];",
        "[2:a]volume=0.12[bass];[3:a]volume=0.09[mid];",
        "[4:a]volume='if(between(mod(t,1),0,0.04),0.14,0.05)':eval=frame[hat];",
        "[5:a]volume='if(between(mod(t,2),0,0.03),0.08,0.02)':eval=frame[sh];",
        "[kick][bass][mid][hat][sh]amix=inputs=5:duration=longest,lowpass=f=4200,highpass=f=55,",
        `afade=t=in:st=0:d=0.35,afade=t=out:st=${fadeOut}:d=1.1,volume=0.42,aformat=channel_layouts=stereo[a]`,
      ].join(""),
      "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", output,
    ],
    "cinematic audio",
  );
}

const STYLES = [
  {
    name: "enterprise",
    file: "01-enterprise-complet-86s.mp4",
    label: "Enterprise complet — 13 pages, titres, ~86 s",
    minClip: 3.2,
    maxClip: 7.2,
    padIn: 0.35,
    padOut: 0.25,
    crossfade: 0.32,
    outroDuration: 3.8,
    intro: true,
    overlays: true,
    transitions: ["fade", "smoothleft", "smoothright", "circlecrop", "dissolve", "smoothleft", "smoothright", "fade", "smoothleft", "circlecrop", "smoothright", "dissolve", "fade"],
  },
  {
    name: "cinematic",
    file: "02-cinematic-rapide-31s.mp4",
    label: "Cinématique rapide — écran seul, fond sombre, ~31 s",
    minClip: 1.45,
    maxClip: 2.35,
    padIn: 0.2,
    padOut: 0.12,
    crossfade: 0.2,
    outroDuration: 2.8,
    intro: false,
    overlays: false,
    transitions: ["hblur", "smoothleft", "smoothright", "smoothleft", "hblur"],
  },
  {
    name: "bureau",
    file: "03-bureau-personne-pc-31s.mp4",
    label: "Bureau entreprise — personne + vrai site sur PC, ~31 s",
    minClip: 1.5,
    maxClip: 2.4,
    padIn: 0.2,
    padOut: 0.12,
    crossfade: 0.22,
    outroDuration: 2.8,
    intro: false,
    overlays: false,
    transitions: ["hblur", "smoothleft", "smoothright", "smoothleft", "hblur"],
  },
];

function buildVersion(style, markers, sourceDuration) {
  const work = path.join(__dirname, "work", style.name);
  const output = path.join(VERSIONS_DIR, style.file);
  fs.mkdirSync(work, { recursive: true });
  for (const f of fs.readdirSync(work)) fs.unlinkSync(path.join(work, f));

  console.log(`\n=== ${style.label} ===`);
  const clipScenes = clipsFromMarkers(markers, sourceDuration, style);
  const built = [];
  let idx = 0;

  if (style.intro) {
    built.push(buildTitleCard(work, idx++, "intro", 3.4, "Performance Académique", "L'excellence académique, réinventée", "fade"));
  }

  for (const scene of clipScenes) {
    built.push(buildUiClip(work, scene, idx++, style));
  }
  built.push(buildOutro(work, idx, style));

  const merged = concatClips(work, built, style.crossfade);
  const duration = probeDuration(merged);
  addAudio(style, merged, output, duration);
  console.log(`→ ${output} (${duration.toFixed(1)}s)`);
  return output;
}

function ensureOfficeAssets() {
  if (!fs.existsSync(OFFICE_MAN) || !fs.existsSync(OFFICE_WOMAN)) {
    run("node", [path.join(__dirname, "fetch-assets.mjs")], "fetch-assets");
  }
}

function main() {
  if (!fs.existsSync(RAW) || !fs.existsSync(MARKERS_PATH)) {
    console.error("Footage manquant. Lancez: npm run trailer:capture");
    process.exit(1);
  }
  ensureOfficeAssets();
  fs.mkdirSync(VERSIONS_DIR, { recursive: true });

  const markers = loadMarkers();
  const sourceDuration = probeDuration(RAW);
  const outputs = STYLES.map((style) => buildVersion(style, markers, sourceDuration));

  const readme = [
    "# Versions du trailer Performance Académique",
    "",
    "| Fichier | Style |",
    "|---------|-------|",
    ...STYLES.map((s) => `| ${s.file} | ${s.label} |`),
    "",
    "Généré automatiquement par npm run trailer:versions",
  ].join("\n");
  fs.writeFileSync(path.join(VERSIONS_DIR, "README.txt"), readme, "utf8");

  const latest = path.join(__dirname, "output", "performance-academique-trailer.mp4");
  fs.copyFileSync(path.join(VERSIONS_DIR, "03-bureau-personne-pc-31s.mp4"), latest);

  console.log("\nToutes les versions sont dans:");
  console.log(VERSIONS_DIR);
  console.log("\nFichiers:");
  for (const f of outputs) console.log(`  • ${f}`);
}

main();
