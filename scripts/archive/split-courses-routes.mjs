import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const coursesPath = path.join(root, "src/routes/courses-routes.ts");
const lines = fs.readFileSync(coursesPath, "utf8").split(/\r?\n/);

const domainsStart = lines.findIndex((l) => l.includes('app.get("/api/domains"'));
const domainsEnd = lines.findIndex((l, i) => i > domainsStart && l.includes("// GET /api/courses")) - 1;

const gradesStart = lines.findIndex((l) => l.includes('app.get("/api/courses/:courseId/grades"'));
const gradesEnd = lines.findIndex((l, i) => i > gradesStart && l.includes("// POST /api/courses/:courseId/modules/:moduleId/complete"));

const header = `import type { Express } from "express";
import type { RouteContext } from "../server/route-context";
import * as api from "../server/route-deps";

`;

fs.writeFileSync(
  path.join(root, "src/routes/catalog-routes.ts"),
  `${header}export function registerCatalogRoutes(app: Express, ctx: RouteContext): void {
  void ctx;

${lines.slice(domainsStart, domainsEnd + 1).join("\n")}
}
`,
);

fs.writeFileSync(
  path.join(root, "src/routes/grades-routes.ts"),
  `${header}import type { AppUser } from "../server/route-deps";

export function registerGradesRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth } = ctx.middleware;

${lines.slice(gradesStart, gradesEnd).join("\n")}
}
`,
);

let kept = [
  ...lines.slice(0, domainsStart),
  ...lines.slice(domainsEnd + 1, gradesStart),
  ...lines.slice(gradesEnd),
];

kept = kept.filter((line) =>
  !line.includes("async function invalidatePublicCatalogCache") &&
  !line.includes('await api.cacheDel("api:domains:public")') &&
  !line.includes('await api.cacheDelByPrefix("api:courses:public:")'),
);

// Drop empty invalidatePublicCatalogCache wrapper if any braces left orphaned - use simple join
fs.writeFileSync(coursesPath, kept.join("\n"));
console.log("Extracted catalog-routes.ts and grades-routes.ts");
