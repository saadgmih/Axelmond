import path from "node:path";

export function getStaticCacheControl(filePath: string, distPath: string): string | null {
  const normalizedFile = path.resolve(filePath);
  const normalizedAssets = `${path.resolve(distPath, "assets")}${path.sep}`;
  const fileName = path.basename(normalizedFile).toLowerCase();

  if (fileName.endsWith(".html") || fileName === "sw.js") return "no-store";
  if (fileName === "manifest.json") return "no-cache, must-revalidate";
  if (fileName === "robots.txt" || fileName.endsWith(".xml")) return "public, max-age=86400";
  if (
    normalizedFile.startsWith(normalizedAssets) &&
    /\.(js|css|woff2?|ttf|png|svg|jpg|jpeg|webp|ico)$/i.test(normalizedFile)
  ) {
    return "public, max-age=31536000, immutable";
  }
  if (/\.(png|svg|jpg|jpeg|webp|ico)$/i.test(normalizedFile)) {
    return "public, max-age=3600, must-revalidate";
  }
  return null;
}
