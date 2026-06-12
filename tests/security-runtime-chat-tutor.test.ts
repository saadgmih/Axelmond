import assert from "node:assert/strict";
import {
  authedFetch,
  DEFAULT_SECURITY_RUNTIME_PORT,
  isSecurityRuntimeDatabaseAvailable,
  loginViaHttp,
  startSecurityRuntimeServer,
  stopSecurityRuntimeServer,
  waitForSecurityRuntimeHealth,
  type SecurityRuntimeSession,
} from "./helpers/security-runtime-harness.ts";
import {
  cleanupChatTutorRuntimeFixtures,
  seedChatTutorRuntimeFixtures,
  SECURITY_RUNTIME_TEST_PASSWORD,
  type ChatTutorRuntimeFixture,
} from "./helpers/security-runtime-fixtures.ts";

const CHAT_TUTOR_PATH = "/api/chat-tutor";
const RUNTIME_PORT = DEFAULT_SECURITY_RUNTIME_PORT;

function chatTutorBody(fixture: ChatTutorRuntimeFixture, overrides: Record<string, unknown> = {}) {
  return {
    courseId: fixture.courseId,
    prompt: "Expliquez-moi la complexité algorithmique en une phrase.",
    ...overrides,
  };
}

async function postChatTutor(
  baseUrl: string,
  body: unknown,
  session?: SecurityRuntimeSession,
  options: { includeCsrf?: boolean; forgedCsrf?: boolean } = {},
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (session) {
    headers.Authorization = `Bearer ${session.accessToken}`;
    if (session.cookieHeader) {
      headers.Cookie = session.cookieHeader;
    }
    if (options.includeCsrf !== false) {
      headers["X-CSRF-Token"] = session.csrfToken;
    }
  } else if (options.forgedCsrf) {
    const forgedCsrf = "security-runtime-forged-csrf";
    headers.Cookie = `csrf_token=${forgedCsrf}`;
    headers["X-CSRF-Token"] = forgedCsrf;
  }

  return fetch(`${baseUrl}${CHAT_TUTOR_PATH}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

if (!isSecurityRuntimeDatabaseAvailable()) {
  console.log("Security runtime chat-tutor tests skipped: DATABASE_URL missing");
  process.exit(0);
}

const previousOpenAIKey = process.env.OPENAI_API_KEY;
delete process.env.OPENAI_API_KEY;

let fixture: ChatTutorRuntimeFixture;
let handle: ReturnType<typeof startSecurityRuntimeServer> | undefined;

try {
  fixture = await seedChatTutorRuntimeFixtures();
  handle = startSecurityRuntimeServer(RUNTIME_PORT);
  await waitForSecurityRuntimeHealth(handle.baseUrl, { process: handle.process });

  const ownerSession = await loginViaHttp(handle.baseUrl, {
    email: fixture.users.ownerProfessor.email,
    password: SECURITY_RUNTIME_TEST_PASSWORD,
    role: "PROFESSOR",
  });
  const enrolledSession = await loginViaHttp(handle.baseUrl, {
    email: fixture.users.enrolledStudent.email,
    password: SECURITY_RUNTIME_TEST_PASSWORD,
    role: "STUDENT",
  });
  const unenrolledSession = await loginViaHttp(handle.baseUrl, {
    email: fixture.users.unenrolledStudent.email,
    password: SECURITY_RUNTIME_TEST_PASSWORD,
    role: "STUDENT",
  });
  const foreignSession = await loginViaHttp(handle.baseUrl, {
    email: fixture.users.foreignProfessor.email,
    password: SECURITY_RUNTIME_TEST_PASSWORD,
    role: "PROFESSOR",
  });

  // 1. Sans auth → 401 (CSRF contourné pour atteindre requireAuth)
  {
    const response = await postChatTutor(handle.baseUrl, chatTutorBody(fixture), undefined, { forgedCsrf: true });
    assert.equal(response.status, 401);
  }

  // 2. Body sans courseId → 400
  {
    const response = await postChatTutor(handle.baseUrl, { prompt: "Question sans courseId" }, enrolledSession);
    assert.equal(response.status, 400);
    const payload = await response.json() as { code?: string };
    assert.equal(payload.code, "VALIDATION_ERROR");
  }

  // 3. Étudiant inscrit → 200
  {
    const response = await authedFetch(handle.baseUrl, enrolledSession, "POST", CHAT_TUTOR_PATH, chatTutorBody(fixture));
    assert.equal(response.status, 200);
    const payload = await response.json() as { text?: string };
    assert.equal(typeof payload.text, "string");
    assert.ok(payload.text!.length > 0);
  }

  // 4. Étudiant non inscrit → 403
  {
    const response = await authedFetch(handle.baseUrl, unenrolledSession, "POST", CHAT_TUTOR_PATH, chatTutorBody(fixture));
    assert.equal(response.status, 403);
  }

  // 5. Prof propriétaire → 200
  {
    const response = await authedFetch(handle.baseUrl, ownerSession, "POST", CHAT_TUTOR_PATH, chatTutorBody(fixture));
    assert.equal(response.status, 200);
    const payload = await response.json() as { text?: string };
    assert.equal(typeof payload.text, "string");
  }

  // 6. Prof non propriétaire → 403
  {
    const response = await authedFetch(handle.baseUrl, foreignSession, "POST", CHAT_TUTOR_PATH, chatTutorBody(fixture));
    assert.equal(response.status, 403);
  }

  // 7. courseId inexistant → 404
  {
    const response = await authedFetch(
      handle.baseUrl,
      enrolledSession,
      "POST",
      CHAT_TUTOR_PATH,
      chatTutorBody(fixture, { courseId: fixture.missingCourseId }),
    );
    assert.equal(response.status, 404);
  }

  // 8. moduleId invalide → 400
  {
    const response = await authedFetch(
      handle.baseUrl,
      enrolledSession,
      "POST",
      CHAT_TUTOR_PATH,
      chatTutorBody(fixture, { moduleId: fixture.invalidModuleId }),
    );
    assert.equal(response.status, 400);
    const payload = await response.json() as { error?: string };
    assert.match(payload.error || "", /Module introuvable/i);
  }

  // 9. Session valide sans CSRF → 403
  {
    const response = await postChatTutor(handle.baseUrl, chatTutorBody(fixture), enrolledSession, { includeCsrf: false });
    assert.equal(response.status, 403);
    const payload = await response.json() as { code?: string };
    assert.equal(payload.code, "CSRF_TOKEN_INVALID");
  }

  console.log("Security runtime chat-tutor ACL tests passed");
} finally {
  if (handle) {
    await stopSecurityRuntimeServer(handle);
  }
  await cleanupChatTutorRuntimeFixtures();
  if (previousOpenAIKey !== undefined) {
    process.env.OPENAI_API_KEY = previousOpenAIKey;
  } else {
    delete process.env.OPENAI_API_KEY;
  }
}
