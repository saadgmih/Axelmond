import type { Express } from "express";
import { getOnboardingFlow, ONBOARDING_VERSION } from "../onboarding/onboarding-types";
import type { OnboardingSnapshot } from "../onboarding/onboarding-types";
import type { RouteContext } from "../server/route-context";
import { getAuthUser } from "../server/route-types";
import * as api from "../server/route-deps";

function serializeOnboarding(
  flow: OnboardingSnapshot["flow"],
  record?: {
    status: "IN_PROGRESS" | "COMPLETED" | "DISMISSED";
    currentStep: number;
    completedAt: Date | null;
    dismissedAt: Date | null;
  } | null,
): OnboardingSnapshot {
  const status = record?.status || "NOT_STARTED";
  return {
    flow,
    version: ONBOARDING_VERSION,
    status,
    currentStep: record?.currentStep || 0,
    completedAt: record?.completedAt?.toISOString() || null,
    dismissedAt: record?.dismissedAt?.toISOString() || null,
    shouldAutoStart: status === "NOT_STARTED" || status === "IN_PROGRESS",
  };
}

export function registerOnboardingRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth, requireRbac, validateBody } = ctx.middleware;

  app.get("/api/onboarding", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);
    const flow = getOnboardingFlow(authUser.role);
    const record = await api.prisma.userOnboarding.findUnique({
      where: { userId_flow_version: { userId: authUser.id, flow, version: ONBOARDING_VERSION } },
    });

    res.json(serializeOnboarding(flow, record));
  });

  app.put("/api/onboarding", requireAuth, requireRbac, validateBody(api.onboardingUpdateSchema), async (req, res) => {
    const authUser = getAuthUser(req);
    const flow = getOnboardingFlow(authUser.role);
    const now = new Date();
    const data = {
      status: req.body.status,
      currentStep: req.body.currentStep,
      completedAt: req.body.status === "COMPLETED" ? now : null,
      dismissedAt: req.body.status === "DISMISSED" ? now : null,
    };
    const record = await api.prisma.userOnboarding.upsert({
      where: { userId_flow_version: { userId: authUser.id, flow, version: ONBOARDING_VERSION } },
      update: data,
      create: { userId: authUser.id, flow, version: ONBOARDING_VERSION, ...data },
    });

    if (req.body.status !== "IN_PROGRESS") {
      await api.logAudit(
        authUser.id,
        authUser.email,
        req.body.status === "COMPLETED" ? "ONBOARDING_COMPLETED" : "ONBOARDING_DISMISSED",
        "UserOnboarding",
        record.id,
        { flow, version: ONBOARDING_VERSION, currentStep: req.body.currentStep },
        req.ip,
      );
    }

    res.json(serializeOnboarding(flow, record));
  });

  app.post("/api/onboarding/restart", requireAuth, requireRbac, async (req, res) => {
    const authUser = getAuthUser(req);
    const flow = getOnboardingFlow(authUser.role);
    const record = await api.prisma.userOnboarding.upsert({
      where: { userId_flow_version: { userId: authUser.id, flow, version: ONBOARDING_VERSION } },
      update: { status: "IN_PROGRESS", currentStep: 0, completedAt: null, dismissedAt: null },
      create: { userId: authUser.id, flow, version: ONBOARDING_VERSION, status: "IN_PROGRESS" },
    });

    await api.logAudit(
      authUser.id,
      authUser.email,
      "ONBOARDING_RESTARTED",
      "UserOnboarding",
      record.id,
      { flow, version: ONBOARDING_VERSION },
      req.ip,
    );
    res.json(serializeOnboarding(flow, record));
  });
}
