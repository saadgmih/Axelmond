import { describe, expect, it, vi, beforeEach } from "vitest";
import { canAccessApiRoute } from "../src/rbac";
import { registerMessagingRoutes } from "../src/routes/messaging-routes";
import { prisma } from "../src/db";

vi.mock("../src/db", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

describe("Notifications RBAC and Routes Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canAccessApiRoute permission verification", () => {
    const roles = ["STUDENT", "PROFESSOR", "ADMIN"] as const;
    const getRoutes = [
      "/api/notifications",
      "/api/notifications/overview",
      "/api/notifications/unread-count",
      "/api/notifications/vapid-public-key",
    ];

    const postRoutes = [
      "/api/notifications/read-all",
      "/api/notifications/push-subscribe",
    ];

    it("allows authorized roles (Student, Professor, Admin) for GET endpoints", () => {
      for (const role of roles) {
        for (const route of getRoutes) {
          expect(canAccessApiRoute(role, "GET", route)).toBe(true);
        }
      }
    });

    it("allows authorized roles (Student, Professor, Admin) for POST endpoints", () => {
      for (const role of roles) {
        for (const route of postRoutes) {
          expect(canAccessApiRoute(role, "POST", route)).toBe(true);
        }
      }
    });

    it("allows authorized roles (Student, Professor, Admin) for PATCH read endpoint", () => {
      for (const role of roles) {
        expect(canAccessApiRoute(role, "PATCH", "/api/notifications/123/read")).toBe(true);
      }
    });

    it("denies access for unauthenticated or invalid roles", () => {
      expect(canAccessApiRoute(null, "GET", "/api/notifications")).toBe(false);
      expect(canAccessApiRoute(undefined, "GET", "/api/notifications/overview")).toBe(false);
      expect(canAccessApiRoute("INVALID_ROLE", "GET", "/api/notifications")).toBe(false);
    });
  });

  describe("API Endpoint Handlers & Scoping", () => {
    let routes: Array<{ method: string; path: string; handler: Function }>;
    const mockApp: any = {
      get: (path: string, ...handlers: any[]) => routes.push({ method: "GET", path, handler: handlers.at(-1) }),
      post: (path: string, ...handlers: any[]) => routes.push({ method: "POST", path, handler: handlers.at(-1) }),
      patch: (path: string, ...handlers: any[]) => routes.push({ method: "PATCH", path, handler: handlers.at(-1) }),
      delete: (path: string, ...handlers: any[]) => routes.push({ method: "DELETE", path, handler: handlers.at(-1) }),
    };

    beforeEach(() => {
      routes = [];
      registerMessagingRoutes(mockApp, {
        requireAuth: vi.fn((req, res, next) => next()),
        requireRbac: vi.fn((req, res, next) => next()),
        validateBody: vi.fn(() => (req, res, next) => next()),
      } as any);
    });

    it("GET /api/notifications returns empty list if no notifications exist", async () => {
      const getNotifsRoute = routes.find((r) => r.method === "GET" && r.path === "/api/notifications")!;
      vi.mocked(prisma.notification.findMany).mockResolvedValueOnce([]);

      const req: any = { authUser: { id: "user-1", role: "STUDENT" } };
      const res: any = { json: vi.fn() };

      await getNotifsRoute.handler(req, res);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
        })
      );
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("GET /api/notifications returns list of user's notifications", async () => {
      const getNotifsRoute = routes.find((r) => r.method === "GET" && r.path === "/api/notifications")!;
      const mockNotifs = [
        { id: "n-1", userId: "user-1", type: "NEW_COURSE", title: "T1", body: "B1", readAt: null, createdAt: new Date() },
      ];
      vi.mocked(prisma.notification.findMany).mockResolvedValueOnce(mockNotifs as any);

      const req: any = { authUser: { id: "user-1", role: "STUDENT" } };
      const res: any = { json: vi.fn() };

      await getNotifsRoute.handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "n-1", title: "T1" }),
        ])
      );
    });

    it("GET /api/notifications/unread-count returns correct unread count", async () => {
      const getUnreadRoute = routes.find((r) => r.method === "GET" && r.path === "/api/notifications/unread-count")!;
      vi.mocked(prisma.notification.count).mockResolvedValueOnce(5);

      const req: any = { authUser: { id: "user-1", role: "STUDENT" } };
      const res: any = { json: vi.fn() };

      await getUnreadRoute.handler(req, res);

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: "user-1", readAt: null },
      });
      expect(res.json).toHaveBeenCalledWith({ count: 5 });
    });

    it("PATCH /api/notifications/:id/read marks notification as read if owned by user", async () => {
      const patchReadRoute = routes.find((r) => r.method === "PATCH" && r.path === "/api/notifications/:id/read")!;
      vi.mocked(prisma.notification.updateMany).mockResolvedValueOnce({ count: 1 });

      const req: any = { params: { id: "n-1" }, authUser: { id: "user-1", role: "STUDENT" } };
      const res: any = { json: vi.fn() };

      await patchReadRoute.handler(req, res);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: "n-1", userId: "user-1" },
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      });
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it("PATCH /api/notifications/:id/read returns 404 if notification not owned by user", async () => {
      const patchReadRoute = routes.find((r) => r.method === "PATCH" && r.path === "/api/notifications/:id/read")!;
      vi.mocked(prisma.notification.updateMany).mockResolvedValueOnce({ count: 0 });

      const req: any = { params: { id: "n-2" }, authUser: { id: "user-1", role: "STUDENT" } };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await patchReadRoute.handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Notification introuvable" });
    });

    it("POST /api/notifications/read-all marks all user's notifications as read", async () => {
      const postReadAllRoute = routes.find((r) => r.method === "POST" && r.path === "/api/notifications/read-all")!;
      vi.mocked(prisma.notification.updateMany).mockResolvedValueOnce({ count: 3 });

      const req: any = { authUser: { id: "user-1", role: "STUDENT" } };
      const res: any = { json: vi.fn() };

      await postReadAllRoute.handler(req, res);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", readAt: null },
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      });
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
  });
});
