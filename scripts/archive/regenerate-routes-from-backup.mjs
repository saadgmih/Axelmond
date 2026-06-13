import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const lines = fs.readFileSync(path.join(import.meta.dirname, "server-backup.ts"), "utf8").split("\n");

const ranges = {
  courses: [[1985, 2188], [2788, 3055]],
  content: [[2189, 2787], [3056, 3240]],
  admin: [[3243, 3367], [4496, 4513]],
  auth: [[3369, 4091], [4409, 4494], [4825, 4875]],
  objectives: [[4093, 4407]],
  live: [[4515, 4823]],
  payments: [[4877, 5145]],
  misc: [[5147, 5400]],
};

const routesDir = path.join(root, "src", "routes");

for (const [name, rgs] of Object.entries(ranges)) {
  const body = rgs.map(([s, e]) => lines.slice(s - 1, e).join("\n")).join("\n\n");
  const fnName = `register${name.charAt(0).toUpperCase()}${name.slice(1)}Routes`;
  const content = `import type { Express } from "express";
import type { RouteContext } from "../server/route-context";
import type { AppUser } from "../server/route-deps";
import * as api from "../server/route-deps";

export function ${fnName}(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, requireAdmin, validateBody } = ctx.middleware;

${body.replace(/^/gm, "  ")}
}
`;
  fs.writeFileSync(path.join(routesDir, `${name}-routes.ts`), content);
  console.log(`Wrote ${name}-routes.ts (${body.split("\n").length} lines)`);
}
