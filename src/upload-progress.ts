/** Clamp upload progress to the valid 0–100 range. */
export function clampUploadProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/** Round to at most one decimal place after clamping. */
export function normalizeUploadProgressDisplay(value: number): number {
  const clamped = clampUploadProgress(value);
  return Math.round(clamped * 10) / 10;
}

/** Format progress for display: integer or one decimal, never above 100. */
export function formatUploadProgressPercent(value: number): string {
  const normalized = normalizeUploadProgressDisplay(value);
  if (Math.abs(normalized - Math.round(normalized)) < 1e-9) {
    return String(Math.round(normalized));
  }
  return normalized.toFixed(1);
}

/** Human-readable label, e.g. `73%`, `73.5%`, `100%`. */
export function formatUploadProgressLabel(value: number): string {
  return `${formatUploadProgressPercent(value)}%`;
}

/** Safe width for CSS progress bars. */
export function uploadProgressBarWidth(value: number): string {
  return `${clampUploadProgress(value)}%`;
}

/** Normalize UploadThing `onUploadProgress` callbacks. */
export function bindUploadProgress(onProgress: (progress: number) => void): (args: { progress: number }) => void {
  return ({ progress }) => onProgress(clampUploadProgress(progress));
}
