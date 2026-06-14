import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("academic-level-removal", () => {
  const authSource = readFileSync("src/components/AuthScreen.tsx", "utf8");
  const sidebarSource = readFileSync("src/components/Sidebar.tsx", "utf8");
  const serverSource = readApiRouteSources();
  const migrationSource = readFileSync("prisma/migrations/20260604192000_remove_academic_levels/migration.sql", "utf8");

  assert.doesNotMatch(authSource, /Niveau Académique d'Études/i);
  assert.doesNotMatch(authSource, /const \[levelOrTitle, setLevelOrTitle\]/);
  assert.match(sidebarSource, /role === "student"[\s\S]*?currentUser\?\.filiere \|\| DEFAULT_STUDENT_LABEL/);
  assert.match(serverSource, /normalizedRole === "STUDENT" \? api\.DEFAULT_STUDENT_LABEL/);
  assert.match(migrationSource, /UPDATE "Course"/);
  assert.match(migrationSource, /UPDATE "User"/);
});
