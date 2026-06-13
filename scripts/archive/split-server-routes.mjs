/**
 * One-shot helper: extracts route registration blocks from server.ts into src/routes/*.ts
 * Run: node scripts/split-server-routes.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const serverPath = path.join(root, "server.ts");
const source = fs.readFileSync(serverPath, "utf8");
const lines = source.split("\n");

const ROUTE_GROUPS = {
  admin: [
    [3281, 3405],
    [4524, 4541],
  ],
  auth: [
    [3407, 4105],
    [4415, 4522],
    [4920, 4970],
  ],
  objectives: [[4107, 4413]],
  live: [[4543, 4917]],
  payments: [[4972, 5169]],
  courses: [[2028, 2231], [2833, 3092]],
  content: [[2233, 2831], [3094, 3279]],
  misc: [[5172, 5424]],
};

const routesDir = path.join(root, "src", "routes");
fs.mkdirSync(routesDir, { recursive: true });

function extractLines(ranges) {
  const chunks = [];
  for (const [start, end] of ranges) {
    chunks.push(lines.slice(start - 1, end).join("\n"));
  }
  return chunks.join("\n\n");
}

for (const [name, ranges] of Object.entries(ROUTE_GROUPS)) {
  const body = extractLines(ranges);
  const fnName = `register${name.charAt(0).toUpperCase()}${name.slice(1)}Routes`;
  const content = `import type { Express } from "express";
import type { RouteContext } from "../server/route-context";

export function ${fnName}(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, requireAdmin, validateBody } = ctx.middleware;

${body.replace(/^/gm, "  ")}
}
`;
  fs.writeFileSync(path.join(routesDir, `${name}-routes.ts`), content);
  console.log(`Wrote ${name}-routes.ts (${ranges.length} block(s))`);
}

console.log("Done. Manual follow-up: wire imports in route-context + server.ts");
