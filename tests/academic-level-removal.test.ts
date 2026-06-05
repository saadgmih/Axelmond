import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const authSource = readFileSync("src/components/AuthScreen.tsx", "utf8");
const sidebarSource = readFileSync("src/components/Sidebar.tsx", "utf8");
const serverSource = readFileSync("server.ts", "utf8");
const migrationSource = readFileSync("prisma/migrations/20260604192000_remove_academic_levels/migration.sql", "utf8");

assert.doesNotMatch(authSource, /Niveau Académique d'Études/i);
assert.doesNotMatch(authSource, /const \[levelOrTitle, setLevelOrTitle\]/);
assert.match(sidebarSource, /role === "student" \? currentUser\?\.filiere \|\| DEFAULT_STUDENT_LABEL/);
assert.match(serverSource, /normalizedRole === "STUDENT" \? DEFAULT_STUDENT_LABEL/);
assert.match(migrationSource, /UPDATE "Course"/);
assert.match(migrationSource, /UPDATE "User"/);

console.log("Academic level removal rules passed");
