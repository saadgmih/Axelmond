import assert from "node:assert/strict";
import { issueAuthenticatedSession } from "../src/auth-session.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("auth-session-enrollment-sync", async () => {
  const calls: string[] = [];
  const user = {
    id: "student-1",
    role: "STUDENT",
    authTokenVersion: 3,
    enrolledCourses: [2],
  };
  const api = {
    prisma: {
      user: {
        update: async () => {
          calls.push("update-user");
        },
      },
    },
    invalidateAuthUserCache: (userId: string) => {
      calls.push(`invalidate:${userId}`);
      return true;
    },
    toAppUser: () => {
      calls.push("map-user");
      return user;
    },
    createRefreshToken: async () => "refresh-token",
    setAuthCookies: () => "csrf-token",
    persistCsrfTokenForRefreshSession: async () => undefined,
    signAuthToken: () => "access-token",
    withMobileRefreshToken: (_req: unknown, payload: unknown) => payload,
    logSecurity: () => undefined,
  };

  const result = (await issueAuthenticatedSession({} as never, {} as never, api as never, user as never)) as {
    enrolledCourses: number[];
  };

  assert.deepEqual(result.enrolledCourses, [2]);
  assert.deepEqual(calls.slice(0, 3), ["update-user", "invalidate:student-1", "map-user"]);
});
