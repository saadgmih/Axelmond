import bcrypt from "bcryptjs";
import { DEFAULT_DISCIPLINE_ID } from "../../src/academic-taxonomy.ts";
import { prisma } from "../../src/db.ts";
import { buildLiveKitRoomName } from "../../src/livekit.ts";
import { SECURITY_RUNTIME_TEST_PASSWORD } from "./security-runtime-fixtures.ts";

export const LIVEKIT_RUNTIME_EMAIL_PREFIX = "security-runtime-livekit+";
export const LIVEKIT_RUNTIME_COURSE_TITLE = "Security runtime livekit course";

export interface LiveKitRuntimeFixture {
  courseId: number;
  roomName: string;
  missingCourseId: number;
  users: {
    ownerProfessor: { id: string; email: string; role: "PROFESSOR" };
    enrolledStudent: { id: string; email: string; role: "STUDENT" };
    unenrolledStudent: { id: string; email: string; role: "STUDENT" };
    foreignProfessor: { id: string; email: string; role: "PROFESSOR" };
    admin: { id: string; email: string; role: "ADMIN" };
  };
}

function runtimeEmail(label: string) {
  return `${LIVEKIT_RUNTIME_EMAIL_PREFIX}${label}@test.axelmond.local`;
}

async function cleanupLiveKitRuntimeData(courseIds: number[]) {
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
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
}

export async function cleanupLiveKitRuntimeFixtures() {
  const emails = [
    runtimeEmail("owner"),
    runtimeEmail("enrolled"),
    runtimeEmail("unenrolled"),
    runtimeEmail("foreign"),
    runtimeEmail("admin"),
  ];

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  if (userIds.length > 0) {
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.enrollment.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.academicProfile.deleteMany({ where: { userId: { in: userIds } } });
  }

  const courses = await prisma.course.findMany({
    where: { title: LIVEKIT_RUNTIME_COURSE_TITLE },
    select: { id: true },
  });
  await cleanupLiveKitRuntimeData(courses.map((course) => course.id));

  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

export async function seedLiveKitRuntimeFixtures(): Promise<LiveKitRuntimeFixture> {
  await cleanupLiveKitRuntimeFixtures();

  const passwordHash = bcrypt.hashSync(SECURITY_RUNTIME_TEST_PASSWORD, 10);
  const users = {
    ownerProfessor: {
      id: "sec-rt-lk-owner",
      email: runtimeEmail("owner"),
      role: "PROFESSOR" as const,
    },
    enrolledStudent: {
      id: "sec-rt-lk-enrolled",
      email: runtimeEmail("enrolled"),
      role: "STUDENT" as const,
    },
    unenrolledStudent: {
      id: "sec-rt-lk-unenrolled",
      email: runtimeEmail("unenrolled"),
      role: "STUDENT" as const,
    },
    foreignProfessor: {
      id: "sec-rt-lk-foreign",
      email: runtimeEmail("foreign"),
      role: "PROFESSOR" as const,
    },
    admin: {
      id: "sec-rt-lk-admin",
      email: runtimeEmail("admin"),
      role: "ADMIN" as const,
    },
  };

  for (const user of Object.values(users)) {
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        passwordHash,
        fullName: `Runtime ${user.id}`,
        role: user.role,
        emailVerified: true,
        levelOrTitle: user.role === "STUDENT" ? "Étudiant" : user.role === "ADMIN" ? "Administrateur" : "Professeur",
      },
    });
  }

  const course = await prisma.course.create({
    data: {
      title: LIVEKIT_RUNTIME_COURSE_TITLE,
      level: "Module académique",
      credits: 3,
      duration: "10 heures",
      category: "Test",
      disciplineId: DEFAULT_DISCIPLINE_ID,
      price: 49.99,
      iconName: "Video",
      color: "bg-purple-100",
      instructor: "Runtime Owner",
      description: "Cours éphémère pour les tests runtime LiveKit.",
      progress: 0,
      isLiveNow: true,
      liveSubject: "Session runtime LiveKit ACL",
      published: true,
      createdById: users.ownerProfessor.id,
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: users.enrolledStudent.id,
      courseId: course.id,
      active: true,
    },
  });

  await prisma.liveSession.create({
    data: {
      roomName: buildLiveKitRoomName(course.id),
      title: course.liveSubject,
      courseId: course.id,
      professorId: users.ownerProfessor.id,
      isActive: true,
    },
  });

  return {
    courseId: course.id,
    roomName: buildLiveKitRoomName(course.id),
    missingCourseId: 9_999_999,
    users,
  };
}
