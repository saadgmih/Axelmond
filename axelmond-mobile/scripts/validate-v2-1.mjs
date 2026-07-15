/**
 * Validation Phase Mobile V2.1 — LiveKit room UI (structure + API smoke).
 * Usage: node scripts/validate-v2-1.mjs [baseUrl]
 */
import { readFileSync } from "node:fs";

const BASE_URL = (process.argv[2] || process.env.API_BASE_URL || "http://127.0.0.1:31999").replace(/\/$/, "");
const MOBILE_CLIENT_KEY = (process.env.EXPO_PUBLIC_MOBILE_CLIENT_KEY || process.env.MOBILE_CLIENT_SECRET || "").trim();
const MOBILE_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": "Axelmond-Mobile-Validation/1.0",
  ...(MOBILE_CLIENT_KEY
    ? {
        "X-Axelmond-Client": "mobile",
        "X-Axelmond-Client-Key": MOBILE_CLIENT_KEY,
      }
    : {}),
};

const TEACHER = {
  email: process.env.TEST_TEACHER_EMAIL || "security-runtime-chat-tutor+owner@test.axelmond.local",
  password: process.env.TEST_TEACHER_PASSWORD || "Password123!",
  role: "PROFESSOR",
};

const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function request(method, path, body, extraHeaders = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { ...MOBILE_HEADERS, ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text?.slice(0, 120) };
  }
  return { status: res.status, payload };
}

function checkSources() {
  const screen = readFileSync("src/screens/LiveClassroomScreen.tsx", "utf8");
  const roomHook = readFileSync("src/hooks/useLiveKitRoom.ts", "utf8");
  const permHook = readFileSync("src/hooks/useLivePermissions.ts", "utf8");
  const studentNav = readFileSync("src/navigation/StudentNavigator.tsx", "utf8");
  const details = readFileSync("src/screens/CourseDetailsScreen.tsx", "utf8");

  record("LiveClassroomScreen exists", screen.includes("LiveKitRoom"));
  record("useLiveKitRoom getToken", roomHook.includes("api.getToken"));
  record("useLivePermissions ensurePermissions", permHook.includes("ensurePermissions"));
  record("navigation LiveClassroom route", studentNav.includes("LiveClassroom"));
  record("CourseDetails join button", details.includes("Rejoindre le live"));
  record("V2.1 excludes chat UI", !screen.includes("sendMessage") && !screen.includes("axelmond-live-chat"));
  record("registerGlobals in index.ts", readFileSync("index.ts", "utf8").includes("registerGlobals"));
}

async function main() {
  console.log(`Validation Phase Mobile V2.1\nAPI: ${BASE_URL}\n`);
  checkSources();

  const login = await request("POST", "/api/auth/login", TEACHER);
  if (login.status !== 200 || !login.payload?.token) {
    record("teacher login for live token", false, login.payload?.error || `HTTP ${login.status}`);
  } else {
    record("teacher login", true);
    const auth = { Authorization: `Bearer ${login.payload.token}` };
    const tokenRes = await request("POST", "/api/livekit/token", { courseId: 1 }, auth);
    const reachable = tokenRes.status === 200 || tokenRes.status === 403 || tokenRes.status === 503;
    record("POST /api/livekit/token", reachable, `HTTP ${tokenRes.status}`);
    if (tokenRes.status === 200) {
      record("LiveKit token payload", Boolean(tokenRes.payload?.url && tokenRes.payload?.token));
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.error("\nÉchecs:", failed.map((f) => f.name).join(", "));
    process.exit(1);
  }
  console.log("\nValidation V2.1 structure OK. Device tests (A/V, permissions) require dev build.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
