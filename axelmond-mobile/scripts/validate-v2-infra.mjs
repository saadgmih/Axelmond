/**
 * V2.0 infrastructure validation — auth refresh + live API catalog.
 * Usage: node scripts/validate-v2-infra.mjs [baseUrl]
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

const STUDENT = {
  email: process.env.TEST_STUDENT_EMAIL || "security-runtime-chat-tutor+enrolled@test.axelmond.local",
  password: process.env.TEST_STUDENT_PASSWORD || "Password123!",
  role: "STUDENT",
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

function checkSourceFiles() {
  const client = readFileSync("src/services/api/client.ts", "utf8");
  const auth = readFileSync("src/hooks/useAuth.tsx", "utf8");
  const live = readFileSync("src/services/api/live.api.ts", "utf8");
  const app = readFileSync("app.json", "utf8");
  const eas = readFileSync("eas.json", "utf8");

  record("client uses getFreshAccessToken", client.includes("getFreshAccessToken()"));
  record("client session invalidation", client.includes("onSessionInvalidated"));
  record("useAuth cold start refresh", auth.includes("getFreshAccessToken"));
  record("useAuth listens session invalidation", auth.includes("onSessionInvalidated"));
  record("live.api getToken", live.includes("getToken"));
  record("live.api getMessages", live.includes("getMessages"));
  record("live.api moderate", live.includes("moderate"));
  record("app.json LiveKit plugin", app.includes("@livekit/react-native-expo-plugin"));
  record("app.json camera permission", app.includes("NSCameraUsageDescription"));
  record("eas.json development profile", eas.includes('"development"'));
}

async function main() {
  console.log(`Validation V2.0 infrastructure\nAPI: ${BASE_URL}\n`);
  checkSourceFiles();

  const routes = await request("GET", "/api/mobile/routes");
  const liveCatalog = routes.payload?.routes?.live;
  record(
    "mobile routes live catalog",
    routes.status === 200 && liveCatalog?.token && liveCatalog?.messagesSend && liveCatalog?.moderation,
  );

  const login = await request("POST", "/api/auth/login", STUDENT);
  if (login.status !== 200 || !login.payload?.token) {
    record("student login for live token test", false, login.payload?.error || `HTTP ${login.status}`);
  } else {
    record("student login", true);
    const auth = { Authorization: `Bearer ${login.payload.token}` };
    const tokenRes = await request("POST", "/api/livekit/token", { courseId: 1 }, auth);
    record(
      "POST /api/livekit/token",
      tokenRes.status === 200 || tokenRes.status === 403 || tokenRes.status === 503,
      `HTTP ${tokenRes.status}`,
    );
    if (tokenRes.status === 200) {
      record("live token payload", Boolean(tokenRes.payload?.url && tokenRes.payload?.token));
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.error("\nÉchecs:", failed.map((f) => f.name).join(", "));
    process.exit(1);
  }
  console.log("\nValidation V2.0 infrastructure OK.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
