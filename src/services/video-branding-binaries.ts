import fs from "fs";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";

export type VideoBrandingExecutable = "ffmpeg" | "ffprobe";

function configuredPath(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized || fallback;
}

function ensureExecutablePermission(executablePath: string): string {
  if (process.platform === "win32" || !fs.existsSync(executablePath)) return executablePath;

  const currentMode = fs.statSync(executablePath).mode;
  if ((currentMode & 0o111) === 0) {
    fs.chmodSync(executablePath, 0o755);
  }
  return executablePath;
}

/**
 * Resolve the video tools from production dependencies instead of relying on
 * binaries installed by the hosting provider. Explicit environment overrides
 * remain available for operators who provide newer system binaries.
 */
export function getVideoBrandingExecutable(
  executable: VideoBrandingExecutable,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (executable === "ffmpeg") {
    return ensureExecutablePermission(configuredPath(env.FFMPEG_PATH, ffmpegInstaller.path));
  }
  return ensureExecutablePermission(configuredPath(env.FFPROBE_PATH, ffprobeInstaller.path));
}

export function getVideoBrandingBinaryInfo(env: NodeJS.ProcessEnv = process.env) {
  return {
    ffmpegPath: getVideoBrandingExecutable("ffmpeg", env),
    ffmpegVersion: ffmpegInstaller.version,
    ffprobePath: getVideoBrandingExecutable("ffprobe", env),
    ffprobeVersion: ffprobeInstaller.version,
  };
}
