import type { Express } from "express";
import type { RouteContext } from "../server/route-context";
import * as api from "../server/route-deps";

import type { AppUser } from "../server/route-deps";

export function registerGradesRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth } = ctx.middleware;

  app.get("/api/courses/:courseId/grades", requireAuth, async (req, res) => {
  
    const authUser = (req as any).authUser as AppUser;
  
    const courseId = parseInt(req.params.courseId);
  
    const course = await api.prisma.course.findUnique({
  
      where: { id: courseId },
  
      select: { id: true, createdById: true },
  
    });
  
    if (!course) { res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound }); return; }
  
    if (!api.canReadCourseGrades(authUser, course)) {
  
      res.status(403).json({ error: "Accès aux notes refusé pour ce module" });
  
      return;
  
    }
  
  
  
    const enrollments = await api.prisma.enrollment.findMany({
  
      where: {
  
        courseId,
  
        active: true,
  
        ...(authUser.role === "STUDENT" ? { userId: authUser.id } : {}),
  
        user: { role: "STUDENT" },
  
      },
  
      include: {
  
        user: {
  
          include: {
  
            enrollments: {
  
              where: { active: true },
  
              select: { courseId: true },
  
            },
  
          },
  
        },
  
      },
  
    });
  
    const studentIds = enrollments.map((enrollment) => enrollment.user.id);
  
    const attempts = studentIds.length
  
      ? await api.prisma.quizAttempt.findMany({
  
        where: { courseId, userId: { in: studentIds } },
  
        select: { userId: true, quizId: true, scoreOutOf20: true, createdAt: true },
  
      })
  
      : [];
  
    const rows = api.buildCourseGradeRows(enrollments, attempts)
  
      .sort((left, right) => left.studentName.localeCompare(right.studentName, "fr"));
  
  
  
    api.logDb("INFO", "Course grades listed", { courseId, userId: authUser.id, role: authUser.role, students: rows.length });
  
    res.json(rows);
  
  });
  
  
  
}
