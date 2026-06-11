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
  "src/services/api/live.api.ts",
  "src/services/api/index.ts",
];

const forbiddenPhase1 = [
  "LiveClassroom",
  "PayPal",
  "enrollMock",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log("Phase Mobile UI checks\n");

for (const file of [...requiredScreens, ...requiredApiModules]) {
  assert(readFileSync(file, "utf8").length > 0, `Missing ${file}`);
  console.log(`✓ ${file}`);
}

const liveApiSource = readFileSync("src/services/api/live.api.ts", "utf8");
assert(liveApiSource.includes("getToken"), "live.api.ts must expose getToken");
assert(liveApiSource.includes("getMessages"), "live.api.ts must expose getMessages");
console.log("✓ Live API module (V2.0 infra)");

const appSource = readFileSync("App.tsx", "utf8");
const navSource = readFileSync("src/navigation/StudentNavigator.tsx", "utf8")
  + readFileSync("src/navigation/TeacherNavigator.tsx", "utf8");

assert(appSource.includes("ThemeProvider"), "ThemeProvider missing in App.tsx");
assert(navSource.includes("createBottomTabNavigator"), "Bottom tabs missing");
assert(navSource.includes("TeacherProfile"), "Teacher profile tab missing");
assert(!navSource.includes("LiveClassroom"), "LiveClassroom UI must stay excluded until V2.1");
console.log("✓ Navigation structure (no LiveClassroom screen yet)");

const apiIndex = readFileSync("src/services/api/index.ts", "utf8");
assert(apiIndex.includes("liveApi"), "API facade must include liveApi for V2");
for (const token of forbiddenPhase1) {
  assert(!navSource.includes(token), `Forbidden symbol found in navigation: ${token}`);
}
console.log("✓ API/navigation excludes LiveClassroom UI and PayPal");

const easJson = readFileSync("eas.json", "utf8");
const appJson = readFileSync("app.json", "utf8");
assert(easJson.includes("development"), "eas.json must define a development profile");
assert(appJson.includes("@livekit/react-native-expo-plugin"), "app.json must include LiveKit expo plugin");
assert(appJson.includes("NSCameraUsageDescription"), "iOS camera permission missing");
assert(appJson.includes("RECORD_AUDIO"), "Android microphone permission missing");
console.log("✓ EAS + native permissions (V2.0 infra)");

await new Promise((resolve, reject) => {
  const child = spawn("node", ["scripts/test-api.mjs"], { stdio: "inherit", shell: true });
  child.on("exit", (code) => (code === 0 ? resolve(undefined) : reject(new Error("test-api failed"))));
});

console.log("\nPhase Mobile automated checks passed.");
