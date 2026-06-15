import type { Express } from "express";
import { getAuthUser } from "../server/route-types";
import type { RouteContext } from "../server/route-context";
import * as api from "../server/route-deps";

export function registerGradesRoutes(app: Express, ctx: RouteContext): void {
  const { requireAuth } = ctx.middleware;

  app.get("/api/courses/:courseId/grades", requireAuth, async (req, res) => {
    const authUser = getAuthUser(req);

    const courseId = api.parsePositiveInt(req.params.courseId);
    if (!courseId) {
      res.status(400).json({ error: "Identifiant de cours invalide" });
      return;
    }

    const course = await api.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, createdById: true },
    });

    if (!course) {
      res.status(404).json({ error: api.PUBLIC_API_ERRORS.courseNotFound });
      return;
    }

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
      select: {
        user: {
          select: { id: true, fullName: true },
        },
      },
    });

    const studentIds = enrollments.map((enrollment) => enrollment.user.id);

    const [enrollmentCounts, attempts] = await Promise.all([
      studentIds.length
        ? api.prisma.enrollment.groupBy({
            by: ["userId"],
            where: { userId: { in: studentIds }, active: true },
            _count: { courseId: true },
          })
        : Promise.resolve([]),
      studentIds.length
        ? api.prisma.quizAttempt.findMany({
            where: { courseId, userId: { in: studentIds } },
            select: { userId: true, quizId: true, scoreOutOf20: true, createdAt: true },
          })
        : Promise.resolve([]),
    ]);

    const enrolledCoursesCountByUserId = new Map(
      enrollmentCounts.map((entry) => [entry.userId, entry._count.courseId]),
    );

    const gradeEnrollments = enrollments.map((enrollment) => ({
      user: {
        id: enrollment.user.id,
        fullName: enrollment.user.fullName,
        enrolledCoursesCount: enrolledCoursesCountByUserId.get(enrollment.user.id) ?? 0,
      },
    }));

    const rows = api
      .buildCourseGradeRows(gradeEnrollments, attempts)
      .sort((left, right) => left.studentName.localeCompare(right.studentName, "fr"));

    api.logDb("INFO", "Course grades listed", {
      courseId,
      userId: authUser.id,
      role: authUser.role,
      students: rows.length,
    });

    res.json(rows);
  });
}
