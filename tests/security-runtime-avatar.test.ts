import assert from "node:assert/strict";
import {
  allocateSecurityRuntimePort,
  authedFetch,
  loginViaHttp,
  startSecurityRuntimeServer,
  stopSecurityRuntimeServer,
  waitForSecurityRuntimeHealth,
} from "./helpers/security-runtime-harness.ts";
import { skipSecurityRuntimeTests } from "./helpers/security-runtime-harness.ts";
import {
  cleanupChatTutorRuntimeFixtures,
  seedChatTutorRuntimeFixtures,
  SECURITY_RUNTIME_TEST_PASSWORD,
} from "./helpers/security-runtime-fixtures.ts";
import { prisma } from "../src/db.ts";
import { runtimeTest } from "./helpers/runtimeTest.ts";

await runtimeTest("security-runtime-avatar", async () => {
  const AVATAR_PATH = "/api/me/avatar";
  const PROFILE_PATH = "/api/me/profile";
  const VALID_AVATAR_URL = "https://utfs.io/f/security-runtime-avatar.jpg";
  const REPLACEMENT_AVATAR_URL = "https://utfs.io/f/security-runtime-avatar-replacement.webp";

  async function postAvatar(baseUrl: string, body: unknown, session?: Awaited<ReturnType<typeof loginViaHttp>>) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session) {
      headers.Authorization = `Bearer ${session.accessToken}`;
      if (session.cookieHeader) headers.Cookie = session.cookieHeader;
      headers["X-CSRF-Token"] = session.csrfToken;
    } else {
      headers.Cookie = "csrf_token=security-runtime-forged-csrf";
      headers["X-CSRF-Token"] = "security-runtime-forged-csrf";
    }
    return fetch(`${baseUrl}${AVATAR_PATH}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  if (skipSecurityRuntimeTests()) return;

  let handle: ReturnType<typeof startSecurityRuntimeServer> | undefined;

  try {
    const fixture = await seedChatTutorRuntimeFixtures();
    const runtimePort = await allocateSecurityRuntimePort();
    handle = startSecurityRuntimeServer(runtimePort);
    await waitForSecurityRuntimeHealth(handle.baseUrl, { process: handle.process });

    const studentSession = await loginViaHttp(handle.baseUrl, {
      email: fixture.users.enrolledStudent.email,
      password: SECURITY_RUNTIME_TEST_PASSWORD,
      role: "STUDENT",
    });
    const professorSession = await loginViaHttp(handle.baseUrl, {
      email: fixture.users.ownerProfessor.email,
      password: SECURITY_RUNTIME_TEST_PASSWORD,
      role: "PROFESSOR",
    });

    // A1 — URL UploadThing valide
    {
      const response = await authedFetch(handle.baseUrl, studentSession, "POST", AVATAR_PATH, {
        avatarUrl: VALID_AVATAR_URL,
      });
      assert.equal(response.status, 200);
      const payload = (await response.json()) as { user?: { avatarUrl?: string } };
      assert.equal(payload.user?.avatarUrl, VALID_AVATAR_URL);
    }

    // A1b — le remplacement reste présent dans la session après relecture serveur
    {
      const response = await authedFetch(handle.baseUrl, studentSession, "POST", AVATAR_PATH, {
        avatarUrl: REPLACEMENT_AVATAR_URL,
      });
      assert.equal(response.status, 200);

      const sessionResponse = await authedFetch(handle.baseUrl, studentSession, "GET", "/api/auth/me");
      assert.equal(sessionResponse.status, 200);
      const sessionUser = (await sessionResponse.json()) as { avatarUrl?: string };
      assert.equal(sessionUser.avatarUrl, REPLACEMENT_AVATAR_URL);
    }

    // A2 — domaine externe
    {
      const response = await authedFetch(handle.baseUrl, studentSession, "POST", AVATAR_PATH, {
        avatarUrl: "https://evil.com/avatar.jpg",
      });
      assert.equal(response.status, 400);
      const payload = (await response.json()) as { code?: string };
      assert.equal(payload.code, "AVATAR_URL_INVALID");
    }

    // A3 — data:
    {
      const response = await authedFetch(handle.baseUrl, studentSession, "POST", AVATAR_PATH, {
        avatarUrl: "data:image/png;base64,iVBORw0KGgo=",
      });
      assert.equal(response.status, 400);
      const payload = (await response.json()) as { code?: string };
      assert.equal(payload.code, "AVATAR_URL_INVALID");
    }

    // A4 — http://
    {
      const response = await authedFetch(handle.baseUrl, studentSession, "POST", AVATAR_PATH, {
        avatarUrl: "http://utfs.io/avatar.jpg",
      });
      assert.equal(response.status, 400);
      const payload = (await response.json()) as { code?: string };
      assert.equal(payload.code, "AVATAR_URL_INVALID");
    }

    // A5 — PUT profil académique avec avatar externe
    {
      const response = await authedFetch(handle.baseUrl, professorSession, "PUT", PROFILE_PATH, {
        avatarUrl: "https://evil.com/avatar.jpg",
      });
      assert.equal(response.status, 400);
      const payload = (await response.json()) as { code?: string };
      assert.equal(payload.code, "AVATAR_URL_INVALID");
    }

    // A6 — PUT profil valide synchronise User.avatarUrl
    {
      const response = await authedFetch(handle.baseUrl, professorSession, "PUT", PROFILE_PATH, {
        avatarUrl: VALID_AVATAR_URL,
      });
      assert.equal(response.status, 200);
      const payload = (await response.json()) as { profile?: { avatarUrl?: string } };
      assert.equal(payload.profile?.avatarUrl, VALID_AVATAR_URL);

      const dbUser = await prisma.user.findUnique({ where: { id: fixture.users.ownerProfessor.id } });
      assert.equal(dbUser?.avatarUrl, VALID_AVATAR_URL);
    }

    // A6b — enregistrer les autres champs ne rétablit pas une ancienne photo
    {
      const replacementResponse = await authedFetch(handle.baseUrl, professorSession, "POST", AVATAR_PATH, {
        avatarUrl: REPLACEMENT_AVATAR_URL,
      });
      assert.equal(replacementResponse.status, 200);

      const profileUpdateResponse = await authedFetch(handle.baseUrl, professorSession, "PUT", PROFILE_PATH, {
        bio: "Profil mis à jour sans modifier la photo",
      });
      assert.equal(profileUpdateResponse.status, 200);
      const profilePayload = (await profileUpdateResponse.json()) as {
        user?: { avatarUrl?: string };
        profile?: { avatarUrl?: string };
      };
      assert.equal(profilePayload.user?.avatarUrl, REPLACEMENT_AVATAR_URL);
      assert.equal(profilePayload.profile?.avatarUrl, REPLACEMENT_AVATAR_URL);

      const sessionResponse = await authedFetch(handle.baseUrl, professorSession, "GET", "/api/auth/me");
      assert.equal(sessionResponse.status, 200);
      const sessionUser = (await sessionResponse.json()) as { avatarUrl?: string };
      assert.equal(sessionUser.avatarUrl, REPLACEMENT_AVATAR_URL);
    }

    // A7 — sans auth
    {
      const response = await postAvatar(handle.baseUrl, { avatarUrl: VALID_AVATAR_URL });
      assert.equal(response.status, 401);
    }

    // A8 — un vrai rafraîchissement de session restitue la dernière photo
    {
      const response = await fetch(`${handle.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          Cookie: studentSession.cookieHeader,
          "X-CSRF-Token": studentSession.csrfToken,
        },
      });
      assert.equal(response.status, 200);
      const refreshedUser = (await response.json()) as { avatarUrl?: string };
      assert.equal(refreshedUser.avatarUrl, REPLACEMENT_AVATAR_URL);
    }

    console.log("Security runtime avatar tests passed");
  } finally {
    if (handle) {
      await stopSecurityRuntimeServer(handle);
    }
    await cleanupChatTutorRuntimeFixtures();
  }
});
