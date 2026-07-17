import { describe, expect, it, vi } from "vitest";
import { canAccessApiRoute } from "../src/rbac";
import { registerCenterPaymentRoutes } from "../src/routes/center-payment-routes";

describe("center payment authorization", () => {
  it("allows only students through the global RBAC for their payment routes", () => {
    expect(canAccessApiRoute("STUDENT", "POST", "/api/courses/42/center-payment-requests")).toBe(true);
    expect(canAccessApiRoute("PROFESSOR", "POST", "/api/courses/42/center-payment-requests")).toBe(false);
    expect(canAccessApiRoute("STUDENT", "GET", "/api/me/center-payment-requests")).toBe(true);
    expect(canAccessApiRoute("PROFESSOR", "GET", "/api/me/center-payment-requests")).toBe(false);
  });

  it("registers every administration endpoint behind requireAuth and requireAdmin", () => {
    const routes: Array<{ method: string; path: string; handlers: unknown[] }> = [];
    const app = {
      get: (path: string, ...handlers: unknown[]) => routes.push({ method: "GET", path, handlers }),
      post: (path: string, ...handlers: unknown[]) => routes.push({ method: "POST", path, handlers }),
    };
    const requireAuth = vi.fn();
    const requireAdmin = vi.fn();
    registerCenterPaymentRoutes(app as any, {
      middleware: { requireAuth, requireAdmin } as any,
      deps: { logAudit: vi.fn(), invalidateAuthUserCache: vi.fn() } as any,
    });

    const adminRoutes = routes.filter((route) => route.path.startsWith("/api/admin/center-payment-requests"));
    expect(adminRoutes).toHaveLength(8);
    for (const route of adminRoutes) {
      expect(route.handlers[0]).toBe(requireAuth);
      expect(route.handlers[1]).toBe(requireAdmin);
    }
  });

  it("rejects a professor from the student-only configuration handler", () => {
    const routes: Array<{ path: string; handlers: any[] }> = [];
    const app = {
      get: (path: string, ...handlers: any[]) => routes.push({ path, handlers }),
      post: vi.fn(),
    };
    registerCenterPaymentRoutes(app as any, {
      middleware: { requireAuth: vi.fn(), requireAdmin: vi.fn() } as any,
      deps: { logAudit: vi.fn(), invalidateAuthUserCache: vi.fn() } as any,
    });
    const route = routes.find((candidate) => candidate.path === "/api/center-payment/config")!;
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    route.handlers.at(-1)({ authUser: { id: "prof-1", role: "PROFESSOR" } }, { status, json });
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: "STUDENT_ACCESS_REQUIRED" }));
  });
});
