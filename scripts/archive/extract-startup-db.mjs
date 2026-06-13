import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const lines = fs.readFileSync(path.join(import.meta.dirname, "server-backup.ts"), "utf8").split("\n");
const chunk = [...lines.slice(766, 918), "", ...lines.slice(1477, 1655)].join("\n");

const header = `import { prisma } from "../db";
import { Course, CourseModule, DEFAULT_MODULE_CLASSIFICATION, DEFAULT_STUDENT_LABEL } from "../types";
import { ACADEMIC_DOMAINS, DEFAULT_DISCIPLINE_ID, getDisciplineIdForCourse } from "../academic-taxonomy";
import { shouldSkipStartupSeed } from "../startup-seed";
import { decodeStoredText, decodeStoredValue } from "../text";
import { Prisma } from "@prisma/client";

function logDb(level: "INFO" | "WARN" | "ERROR", message: string, data?: unknown) {
  console.log(\`[\${new Date().toISOString()}] [\${level}] [db] \${message}\${data ? " " + JSON.stringify(data) : ""}\`);
}

`;

const body = chunk
  .replace(/^async function seedDatabase/m, "export async function seedDatabase")
  .replace(/^async function synchronizePostgresSequences/m, "export async function synchronizePostgresSequences");

fs.writeFileSync(path.join(root, "src", "server", "startup-db.ts"), header + body);
console.log("Wrote startup-db.ts");
