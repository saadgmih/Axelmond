/**
 * Download royalty-free office B-roll (Pexels license) for bureau compositing.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, "assets");

const SOURCES = [
  {
    file: "office-worker.mp4",
    url: "https://www.pexels.com/download/video/7578618/",
    label: "Businessman at laptop in modern office",
  },
  {
    file: "office-woman.mp4",
    url: "https://www.pexels.com/download/video/10040712/",
    label: "Businesswoman using laptop in office",
  },
];

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) throw new Error(`${cmd} failed`);
}

function hasVideo(filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 500_000) return false;
  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath],
    { encoding: "utf8" },
  );
  const duration = Number.parseFloat((probe.stdout || "").trim());
  return Number.isFinite(duration) && duration > 1;
}

async function main() {
  fs.mkdirSync(ASSETS, { recursive: true });
  for (const source of SOURCES) {
    const dest = path.join(ASSETS, source.file);
    if (hasVideo(dest)) {
      console.log(`OK ${source.file}`);
      continue;
    }
    console.log(`Downloading ${source.label}…`);
    run("curl", ["-L", source.url, "-o", dest, "--max-time", "180"]);
    if (!hasVideo(dest)) throw new Error(`Invalid download: ${source.file}`);
    console.log(`Saved ${dest}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
