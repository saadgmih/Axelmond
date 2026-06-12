import { prisma } from "../../src/db.ts";
import { buildLiveKitRoomName } from "../../src/livekit.ts";

export async function deleteRuntimeCoursesByTitle(title: string) {
  const courses = await prisma.course.findMany({
    where: { title },
    select: { id: true },
  });
  await deleteRuntimeCoursesByIds(courses.map((course) => course.id));
}

export async function deleteRuntimeCoursesByIds(courseIds: number[]) {
  if (courseIds.length === 0) {
    return;
  }

  const roomNames = courseIds.map((courseId) => buildLiveKitRoomName(courseId));
  const sessions = await prisma.liveSession.findMany({
    where: { courseId: { in: courseIds } },
    select: { id: true },
  });
  const sessionIds = sessions.map((session) => session.id);

  if (sessionIds.length > 0) {
    await prisma.liveAttendance.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await prisma.liveActionLog.deleteMany({ where: { sessionId: { in: sessionIds } } });
  }

  await prisma.liveMessage.deleteMany({ where: { roomName: { in: roomNames } } });
  await prisma.liveActionLog.deleteMany({ where: { roomName: { in: roomNames } } });
  await prisma.liveSession.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.lessonContent.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.contentSection.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.enrollment.deleteMany({ where: { courseId: { in: courseIds } } });
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
}
