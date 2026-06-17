import bcrypt from "bcryptjs";
import { DEFAULT_DISCIPLINE_ID } from "../../src/academic-taxonomy.ts";
import { prisma } from "../../src/db.ts";
import { deleteRuntimeCoursesByTitle } from "./security-runtime-course-cleanup.ts";

const CHAT_TUTOR_RUNTIME_COURSE_TITLE = "Security runtime chat-tutor course";

export const SECURITY_RUNTIME_TEST_PASSWORD = "Password123!";
export const CHAT_TUTOR_RUNTIME_EMAIL_PREFIX = "security-runtime-chat-tutor+";
export const CHAT_TUTOR_RUNTIME_VALID_MODULE_ID = 99001;

export interface ChatTutorRuntimeFixture {
  courseId: number;
  validModuleId: number;
  missingCourseId: number;
  invalidModuleId: number;
  users: {
    ownerProfessor: { id: string; email: string; role: "PROFESSOR" };
    enrolledStudent: { id: string; email: string; role: "STUDENT" };
    unenrolledStudent: { id: string; email: string; role: "STUDENT" };
    foreignProfessor: { id: string; email: string; role: "PROFESSOR" };
  };
}

function runtimeEmail(label: string) {
  return `${CHAT_TUTOR_RUNTIME_EMAIL_PREFIX}${label}@test.axelmond.local`;
}

export async function cleanupChatTutorRuntimeFixtures() {
  const emails = [runtimeEmail("owner"), runtimeEmail("enrolled"), runtimeEmail("unenrolled"), runtimeEmail("foreign")];

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

  await deleteRuntimeCoursesByTitle(CHAT_TUTOR_RUNTIME_COURSE_TITLE);

  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

export async function seedChatTutorRuntimeFixtures(): Promise<ChatTutorRuntimeFixture> {
  await cleanupChatTutorRuntimeFixtures();

  const passwordHash = bcrypt.hashSync(SECURITY_RUNTIME_TEST_PASSWORD, 10);
  const users = {
    ownerProfessor: {
      id: "sec-rt-chat-owner",
      email: runtimeEmail("owner"),
      role: "PROFESSOR" as const,
    },
    enrolledStudent: {
      id: "sec-rt-chat-enrolled",
      email: runtimeEmail("enrolled"),
      role: "STUDENT" as const,
    },
    unenrolledStudent: {
      id: "sec-rt-chat-unenrolled",
      email: runtimeEmail("unenrolled"),
      role: "STUDENT" as const,
    },
    foreignProfessor: {
      id: "sec-rt-chat-foreign",
      email: runtimeEmail("foreign"),
      role: "PROFESSOR" as const,
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
        levelOrTitle: user.role === "STUDENT" ? "Étudiant" : "Professeur",
      },
    });
  }

  const course = await prisma.course.create({
    data: {
      title: CHAT_TUTOR_RUNTIME_COURSE_TITLE,
      level: "Module académique",
      credits: 3,
      duration: "10 heures",
      category: "Test",
      disciplineId: DEFAULT_DISCIPLINE_ID,
      price: 0,
      iconName: "Code",
      color: "bg-blue-100",
      instructor: "Runtime Owner",
      description: "Cours éphémère pour les tests runtime chat-tutor.",
      progress: 0,
      isLiveNow: false,
      published: true,
      createdById: users.ownerProfessor.id,
      courseModules: {
        create: [
          {
            id: CHAT_TUTOR_RUNTIME_VALID_MODULE_ID,
            title: "Chapitre runtime ACL",
            type: "video",
            duration: "10 min",
            sortOrder: 0,
          },
        ],
      },
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: users.enrolledStudent.id,
      courseId: course.id,
      active: true,
    },
  });

  return {
    courseId: course.id,
    validModuleId: CHAT_TUTOR_RUNTIME_VALID_MODULE_ID,
    missingCourseId: 9_999_999,
    invalidModuleId: 9_888_888,
    users,
  };
}
