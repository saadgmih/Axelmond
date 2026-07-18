import assert from "node:assert/strict";
import {
  allocateSecurityRuntimePort,
  authedFetch,
  loginViaHttp,
  startSecurityRuntimeServer,
  stopSecurityRuntimeServer,
  waitForSecurityRuntimeHealth,
  type SecurityRuntimeSession,
} from "./helpers/security-runtime-harness.ts";
import { skipSecurityRuntimeTests } from "./helpers/security-runtime-harness.ts";
import {
  cleanupChatTutorRuntimeFixtures,
  seedChatTutorRuntimeFixtures,
  SECURITY_RUNTIME_TEST_PASSWORD,
} from "./helpers/security-runtime-fixtures.ts";
import {
  cleanupAdminRuntimeFixtures,
  seedAdminRuntimeFixtures,
} from "./helpers/security-runtime-admin-fixtures.ts";
import { prisma } from "../src/db.ts";
import { runtimeTest } from "./helpers/runtimeTest.ts";

await runtimeTest("security-runtime-notifications", async () => {
  if (skipSecurityRuntimeTests()) return;

  let handle: ReturnType<typeof startSecurityRuntimeServer> | undefined;

  try {
    // 1. Seed fixtures
    const chatFixture = await seedChatTutorRuntimeFixtures();
    const adminFixture = await seedAdminRuntimeFixtures();

    const runtimePort = await allocateSecurityRuntimePort();
    handle = startSecurityRuntimeServer(runtimePort);
    await waitForSecurityRuntimeHealth(handle.baseUrl, { process: handle.process });

    // 2. Perform logins
    const studentSession = await loginViaHttp(handle.baseUrl, {
      email: chatFixture.users.enrolledStudent.email,
      password: SECURITY_RUNTIME_TEST_PASSWORD,
      role: "STUDENT",
    });
    const professorSession = await loginViaHttp(handle.baseUrl, {
      email: chatFixture.users.ownerProfessor.email,
      password: SECURITY_RUNTIME_TEST_PASSWORD,
      role: "PROFESSOR",
    });
    const adminSession = await loginViaHttp(handle.baseUrl, {
      email: adminFixture.users.adminA.email,
      password: SECURITY_RUNTIME_TEST_PASSWORD,
      role: "ADMIN",
    });

    const sessions = [
      { name: "STUDENT", session: studentSession },
      { name: "PROFESSOR", session: professorSession },
      { name: "ADMIN", session: adminSession },
    ];

    // Clean up existing notifications for these users
    const allUserIds = [
      chatFixture.users.enrolledStudent.id,
      chatFixture.users.ownerProfessor.id,
      adminFixture.users.adminA.id,
    ];
    await prisma.notification.deleteMany({
      where: { userId: { in: allUserIds } },
    });

    // 3. Test basic endpoint access for all roles
    for (const { name, session } of sessions) {
      // GET /api/notifications
      {
        const res = await authedFetch(handle.baseUrl, session, "GET", "/api/notifications");
        assert.equal(res.status, 200, `GET /api/notifications should be 200 for ${name}`);
        const data = await res.json();
        assert.ok(Array.isArray(data), `GET /api/notifications should return an array for ${name}`);
      }

      // GET /api/notifications/overview
      {
        const res = await authedFetch(handle.baseUrl, session, "GET", "/api/notifications/overview");
        assert.equal(res.status, 200, `GET /api/notifications/overview should be 200 for ${name}`);
        const data = (await res.json()) as { notifications: any[]; unreadCount: number };
        assert.ok(Array.isArray(data.notifications), `overview.notifications should be an array for ${name}`);
        assert.equal(typeof data.unreadCount, "number", `overview.unreadCount should be a number for ${name}`);
      }

      // GET /api/notifications/unread-count
      {
        const res = await authedFetch(handle.baseUrl, session, "GET", "/api/notifications/unread-count");
        assert.equal(res.status, 200, `GET /api/notifications/unread-count should be 200 for ${name}`);
        const data = (await res.json()) as { count: number };
        assert.equal(typeof data.count, "number", `unread-count should return a number for ${name}`);
      }

      // POST /api/notifications/push-subscribe (should NOT be 401/403)
      {
        const validSubscription = {
          endpoint: "https://fcm.googleapis.com/fcm/send/device-token-123",
          keys: {
            p256dh: "BNcRdskM_twdnP9Z8ZnwKNBFsONNbStHYxK23TyDCk9hjWKZuebglPp2n6c1c0JYtH_uaHUSMXZOa8d6oh4MX2U",
            auth: "tBHItJI5svbpez7KI4CCXg",
          },
        };
        const res = await authedFetch(
          handle.baseUrl,
          session,
          "POST",
          "/api/notifications/push-subscribe",
          validSubscription,
        );
        assert.ok(
          res.status === 200 || res.status === 503,
          `push-subscribe should be 200 or 503 for ${name}, got ${res.status}`,
        );
      }
    }

    // 4. Test unauthenticated request rejection (401)
    {
      const res1 = await fetch(`${handle.baseUrl}/api/notifications`);
      assert.equal(res1.status, 401, "Unauthenticated GET /api/notifications should be 401");

      const res2 = await fetch(`${handle.baseUrl}/api/notifications/overview`);
      assert.equal(res2.status, 401, "Unauthenticated GET /api/notifications/overview should be 401");

      const res3 = await fetch(`${handle.baseUrl}/api/notifications/unread-count`);
      assert.equal(res3.status, 401, "Unauthenticated GET /api/notifications/unread-count should be 401");
    }

    // 5. Test ownership scoping (Users only see/modify their own notifications)
    // Create notifications in the DB
    const studentNotif = await prisma.notification.create({
      data: {
        userId: chatFixture.users.enrolledStudent.id,
        type: "NEW_COURSE",
        title: "Test Student Notif",
        body: "Test Body Student",
      },
    });

    const profNotif = await prisma.notification.create({
      data: {
        userId: chatFixture.users.ownerProfessor.id,
        type: "NEW_COURSE",
        title: "Test Prof Notif",
        body: "Test Body Prof",
      },
    });

    // Student checks notifications
    {
      const res = await authedFetch(handle.baseUrl, studentSession, "GET", "/api/notifications");
      const list = (await res.json()) as any[];
      assert.equal(list.length, 1);
      assert.equal(list[0].id, studentNotif.id);
      assert.equal(list[0].title, "Test Student Notif");
    }

    // Professor checks notifications
    {
      const res = await authedFetch(handle.baseUrl, professorSession, "GET", "/api/notifications");
      const list = (await res.json()) as any[];
      assert.equal(list.length, 1);
      assert.equal(list[0].id, profNotif.id);
      assert.equal(list[0].title, "Test Prof Notif");
    }

    // Student tries to mark professor's notification as read (should return 404)
    {
      const res = await authedFetch(
        handle.baseUrl,
        studentSession,
        "PATCH",
        `/api/notifications/${profNotif.id}/read`,
      );
      assert.equal(res.status, 404, "Student marking prof's notification as read should return 404");
    }

    // Student marks their own notification as read (should return 200)
    {
      const res = await authedFetch(
        handle.baseUrl,
        studentSession,
        "PATCH",
        `/api/notifications/${studentNotif.id}/read`,
      );
      assert.equal(res.status, 200, "Student marking own notification as read should return 200");

      // Verify it is marked read
      const updatedNotif = await prisma.notification.findUnique({
        where: { id: studentNotif.id },
      });
      assert.ok(updatedNotif?.readAt !== null, "Notification should have a readAt timestamp");
    }

    // 6. Test Mark All as Read scoping
    // Re-create unread notifications
    await prisma.notification.deleteMany({ where: { userId: { in: allUserIds } } });

    const studentNotif1 = await prisma.notification.create({
      data: {
        userId: chatFixture.users.enrolledStudent.id,
        type: "NEW_COURSE",
        title: "S1",
        body: "B1",
      },
    });
    const studentNotif2 = await prisma.notification.create({
      data: {
        userId: chatFixture.users.enrolledStudent.id,
        type: "NEW_COURSE",
        title: "S2",
        body: "B2",
      },
    });
    const profNotif1 = await prisma.notification.create({
      data: {
        userId: chatFixture.users.ownerProfessor.id,
        type: "NEW_COURSE",
        title: "P1",
        body: "BP1",
      },
    });

    // Student marks all read
    {
      const res = await authedFetch(handle.baseUrl, studentSession, "POST", "/api/notifications/read-all");
      assert.equal(res.status, 200, "POST /api/notifications/read-all should return 200");

      // Verify student notifications are read
      const s1 = await prisma.notification.findUnique({ where: { id: studentNotif1.id } });
      const s2 = await prisma.notification.findUnique({ where: { id: studentNotif2.id } });
      assert.ok(s1?.readAt !== null);
      assert.ok(s2?.readAt !== null);

      // Verify prof notification is still unread
      const p1 = await prisma.notification.findUnique({ where: { id: profNotif1.id } });
      assert.ok(p1?.readAt === null);
    }

    console.log("All notifications security and scoping tests passed successfully!");
  } finally {
    if (handle) {
      await stopSecurityRuntimeServer(handle);
    }
    await Promise.all([cleanupChatTutorRuntimeFixtures(), cleanupAdminRuntimeFixtures()]);
  }
});
