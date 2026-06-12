import type { Express, Request, RequestHandler, Response } from "express";
import { MOBILE_CLIENT_HEADER, MOBILE_CLIENT_VALUE } from "./auth-mobile";
import { buildStudentObjectiveSummary } from "./student-objectives";
import { prisma } from "./db";

export const MOBILE_API_ROUTE_CATALOG = {
  auth: {
    login: "POST /api/auth/login",
    register: "POST /api/auth/register",
    refresh: "POST /api/auth/refresh",
    verifyEmail: "POST /api/auth/verify-email",
    me: "GET /api/auth/me",
    logout: "POST /api/auth/logout",
  },
  live: {
    token: "POST /api/livekit/token",
    messagesList: "GET /api/livekit/messages/:courseId",
    messagesSend: "POST /api/livekit/messages",
    attendanceLeave: "POST /api/livekit/attendance/leave",
    attendanceReport: "GET /api/livekit/attendance/:courseId",
    events: "POST /api/livekit/events",
    moderation: "POST /api/livekit/moderation",
  },
  student: {
    profile: "GET /api/mobile/student-profile",
    objectivesSummary: "GET /api/me/objectives/summary",
    studySchedule: "GET /api/me/study-schedule",
    dashboard: "GET /api/auth/me + GET /api/courses",
    courseDetails: "GET /api/courses/:id",
    liveToken: "POST /api/livekit/token",
    liveMessages: "GET /api/livekit/messages/:courseId",
    liveMessageSend: "POST /api/livekit/messages",
    liveAttendanceLeave: "POST /api/livekit/attendance/leave",
    liveEvents: "POST /api/livekit/events",
  },
  teacher: {
    dashboard: "GET /api/courses",
    courseDetails: "GET /api/courses/:id",
    academicProfile: "GET /api/me/profile",
    toggleLive: "PATCH /api/courses/:courseId { isLiveNow, liveSubject? }",
    liveToken: "POST /api/livekit/token",
    liveModeration: "POST /api/livekit/moderation",
    liveMessages: "GET /api/livekit/messages/:courseId",
    liveMessageSend: "POST /api/livekit/messages",
    liveAttendanceLeave: "POST /api/livekit/attendance/leave",
    liveAttendanceReport: "GET /api/livekit/attendance/:courseId",
    liveEvents: "POST /api/livekit/events",
  },
  public: {
    health: "GET /api/health",
    courses: "GET /api/courses",
    courseDetails: "GET /api/courses/:id",
    domains: "GET /api/domains",
  },
} as const;

export function applyMobileApiCorsHeaders(
  req: Pick<Request, "headers" | "path">,
  res: Response,
  options: { originAllowed?: boolean } = {},
): void {
  if (req.path.startsWith("/api/")) {
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-CSRF-Token, X-Axelmond-Client, X-Axelmond-Mobile-Secret",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }

  const origin = req.headers.origin;
  const originAllowed = options.originAllowed !== false;
  if (typeof origin === "string" && origin.length > 0 && originAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
}

type MobileRouteDeps = {
  requireAuth: RequestHandler;
};

export function registerMobileApiRoutes(app: Express, deps: MobileRouteDeps): void {
  app.get("/api/mobile/routes", (_req, res) => {
    res.json({
      clientHeader: MOBILE_CLIENT_HEADER,
      clientValue: MOBILE_CLIENT_VALUE,
      routes: MOBILE_API_ROUTE_CATALOG,
    });
  });

  app.get("/api/mobile/student-profile", deps.requireAuth, async (req, res) => {
    const authUser = (req as any).authUser as { role: string; id: string };
    if (authUser.role !== "STUDENT") {
      res.status(403).json({ error: "Réservé aux étudiants" });
      return;
    }

    const objectives = await prisma.studentObjective.findMany({ where: { studentId: authUser.id } });
    res.json({
      user: authUser,
      objectivesSummary: buildStudentObjectiveSummary(objectives as any),
    });
  });
}
