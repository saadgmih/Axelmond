/**
 * Phase Mobile UI v1 — navigation and API smoke checks.
 * Usage: node scripts/test-ui-flow.mjs
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const requiredScreens = [
  "src/screens/LoginScreen.tsx",
  "src/screens/RegisterScreen.tsx",
  "src/screens/StudentDashboardScreen.tsx",
  "src/screens/CourseCatalogScreen.tsx",
  "src/screens/CourseDetailsScreen.tsx",
  "src/screens/StudentProfileScreen.tsx",
  "src/screens/TeacherDashboardScreen.tsx",
  "src/screens/TeacherProfileScreen.tsx",
];

const requiredApiModules = [
  "src/services/api/client.ts",
  "src/services/api/auth.api.ts",
  "src/services/api/courses.api.ts",
  "src/services/api/profile.api.ts",
  "src/services/api/index.ts",
];

const forbiddenPhase1 = [
  "LiveClassroom",
  "getLiveKitToken",
  "PayPal",
  "enrollMock",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log("Phase Mobile UI v1 checks\n");

for (const file of [...requiredScreens, ...requiredApiModules]) {
  assert(readFileSync(file, "utf8").length > 0, `Missing ${file}`);
  console.log(`✓ ${file}`);
}

const appSource = readFileSync("App.tsx", "utf8");
const navSource = readFileSync("src/navigation/StudentNavigator.tsx", "utf8")
  + readFileSync("src/navigation/TeacherNavigator.tsx", "utf8");

assert(appSource.includes("ThemeProvider"), "ThemeProvider missing in App.tsx");
assert(navSource.includes("createBottomTabNavigator"), "Bottom tabs missing");
assert(navSource.includes("TeacherProfile"), "Teacher profile tab missing");
assert(!navSource.includes("LiveClassroom"), "LiveClassroom must be excluded in phase v1");
console.log("✓ Navigation structure");

const apiIndex = readFileSync("src/services/api/index.ts", "utf8");
for (const token of forbiddenPhase1) {
  assert(!apiIndex.includes(token), `Forbidden phase-1 symbol found in api index: ${token}`);
}
console.log("✓ API layer excludes LiveKit/PayPal for phase v1");

await new Promise((resolve, reject) => {
  const child = spawn("node", ["scripts/test-api.mjs"], { stdio: "inherit", shell: true });
  child.on("exit", (code) => (code === 0 ? resolve(undefined) : reject(new Error("test-api failed"))));
});

console.log("\nPhase Mobile UI v1 automated checks passed.");
