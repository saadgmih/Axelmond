import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readLines(file) {
  return fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/);
}

function writeLines(file, lines) {
  fs.writeFileSync(path.join(root, file), lines.join("\n") + "\n");
}

// ─── profile-routes.ts from auth-routes.ts ───────────────────────────────────
const authLines = readLines("src/routes/auth-routes.ts");
const profileBodyStart = authLines.findIndex((l) => l.includes("// GET /api/me/profile"));
const profileBodyEnd = authLines.findIndex((l, i) => i > profileBodyStart && l.trim() === "}" && authLines[i - 1]?.includes("User sync failed"));
// find closing brace of registerAuthRoutes
const registerClose = authLines.lastIndexOf("}");

const profileBody = authLines.slice(profileBodyStart, registerClose);
const profileHeader = `import type { Express } from "express";
import type { RouteContext } from "../server/route-context";
import type { AppUser } from "../server/route-deps";
import * as api from "../server/route-deps";

export function registerProfileRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, validateBody } = ctx.middleware;

`;

const profileFooter = "}\n";
writeLines("src/routes/profile-routes.ts", [...profileHeader.split("\n"), ...profileBody, profileFooter.trimEnd()]);

const authKept = [
  ...authLines.slice(0, profileBodyStart),
  "}",
];
writeLines("src/routes/auth-routes.ts", authKept);

// ─── quiz-routes.ts from content-routes.ts ───────────────────────────────────
const contentLines = readLines("src/routes/content-routes.ts");
const quizStart = contentLines.findIndex((l) => l.includes("// GET /api/api.quizzes/:moduleId") || l.includes('app.get("/api/quizzes/:moduleId"'));
const quizEnd = contentLines.findIndex((l, i) => i > quizStart && l.includes('app.put("/api/content-sections/:id"'));

const quizBody = contentLines.slice(quizStart, quizEnd);
// Fix stale comments
const quizBodyFixed = quizBody.map((l) =>
  l.replace(/\/api\/api\.quizzes/g, "/api/quizzes").replace(/\/api\/courses\/:courseId\/api\.quizzes/g, "/api/courses/:courseId/quizzes"),
);

const quizHeader = `import type { Express } from "express";
import type { RouteContext } from "../server/route-context";
import type { AppUser } from "../server/route-deps";
import * as api from "../server/route-deps";

export function registerQuizRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, validateBody } = ctx.middleware;

`;

writeLines("src/routes/quiz-routes.ts", [...quizHeader.split("\n"), ...quizBodyFixed, "}"]);

const contentKept = [
  ...contentLines.slice(0, quizStart),
  ...contentLines.slice(quizEnd),
];
writeLines("src/routes/content-routes.ts", contentKept);

console.log("Split profile-routes.ts and quiz-routes.ts");
