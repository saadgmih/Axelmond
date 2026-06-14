const BLOCKED_PREFIXES = ["/src/", "/node_modules/", "/prisma/", "/tests/", "/scripts/", "/docs/"];

const BLOCKED_EXACT = new Set([
  "/server.ts",
  "/vite.config.ts",
  "/package.json",
  "/package-lock.json",
  "/tsconfig.json",
  "/.env",
]);

const BLOCKED_EXTENSIONS = new Set([".map", ".ts", ".tsx", ".jsx", ".md", ".sql", ".env", ".cjs", ".mjs"]);

export function isBlockedProductionSourcePath(requestPath: string): boolean {
  const path = String(requestPath || "")
    .split("?")[0]
    .toLowerCase();
  if (!path || path === "/") return false;

  if (BLOCKED_EXACT.has(path)) return true;
  if (path.startsWith("/.")) return true;

  for (const prefix of BLOCKED_PREFIXES) {
    if (path.startsWith(prefix)) return true;
  }

  const lastSegment = path.slice(path.lastIndexOf("/"));
  const dotIndex = lastSegment.lastIndexOf(".");
  if (dotIndex === -1) return false;

  return BLOCKED_EXTENSIONS.has(lastSegment.slice(dotIndex));
}
