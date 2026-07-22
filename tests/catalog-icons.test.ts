import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("catalog-icons", () => {
  const catalogIcons = fs.readFileSync("src/app/catalogIcons.tsx", "utf8");
  const studentDashboard = fs.readFileSync("src/views/student/StudentDashboardView.tsx", "utf8");
  const sidebar = fs.readFileSync("src/components/Sidebar.tsx", "utf8");

  assert.doesNotMatch(catalogIcons, /\bCpu\b/);
  assert.match(catalogIcons, /BookOpen/);
  assert.doesNotMatch(studentDashboard, /\bCpu\b/);
  assert.match(studentDashboard, /GraduationCap className="w-full h-full text-white"/);
  assert.doesNotMatch(studentDashboard, /Licence 3 d'Informatique/);
  assert.doesNotMatch(sidebar, /GraduationCap/);
});

console.log("Catalog icons rules passed");
