import bcrypt from "bcryptjs";
import { DEFAULT_DISCIPLINE_ID } from "../../src/academic-taxonomy.ts";
import { prisma } from "../../src/db.ts";
import { SECURITY_RUNTIME_TEST_PASSWORD } from "./security-runtime-fixtures.ts";
import { deleteRuntimeCoursesByTitle } from "./security-runtime-course-cleanup.ts";

export const COURSE_CONTENT_RUNTIME_EMAIL_PREFIX = "security-runtime-course-content+";
export const COURSE_CONTENT_RUNTIME_COURSE_TITLE = "Security runtime course-content course";

export const COURSE_CONTENT_RUNTIME_PUBLISHED_SECTION_TITLE = "Runtime published section";
export const COURSE_CONTENT_RUNTIME_PUBLISHED_TREE_CONTENT_TITLE = "Runtime published tree content";
export const COURSE_CONTENT_RUNTIME_DRAFT_SECTION_TITLE = "Runtime draft section";
export const COURSE_CONTENT_RUNTIME_DRAFT_TREE_CONTENT_TITLE = "Runtime draft tree content";
export const COURSE_CONTENT_RUNTIME_PUBLISHED_MODULE_CONTENT_TITLE = "Runtime published module content";
export const COURSE_CONTENT_RUNTIME_DRAFT_MODULE_CONTENT_TITLE = "Runtime draft module content";

export interface CourseContentRuntimeFixture {
  courseId: number;
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
  return `${COURSE_CONTENT_RUNTIME_EMAIL_PREFIX}${label}@test.axelmond.local`;
}

export async function cleanupCourseContentRuntimeFixtures() {
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

  await deleteRuntimeCoursesByTitle(COURSE_CONTENT_RUNTIME_COURSE_TITLE);

  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

export async function seedCourseContentRuntimeFixtures(): Promise<CourseContentRuntimeFixture> {
  await cleanupCourseContentRuntimeFixtures();

  const passwordHash = bcrypt.hashSync(SECURITY_RUNTIME_TEST_PASSWORD, 10);
  const users = {
    ownerProfessor: {
      id: "sec-rt-cc-owner",
      email: runtimeEmail("owner"),
      role: "PROFESSOR" as const,
    },
    enrolledStudent: {
      id: "sec-rt-cc-enrolled",
      email: runtimeEmail("enrolled"),
      role: "STUDENT" as const,
    },
    unenrolledStudent: {
      id: "sec-rt-cc-unenrolled",
      email: runtimeEmail("unenrolled"),
      role: "STUDENT" as const,
    },
    foreignProfessor: {
      id: "sec-rt-cc-foreign",
      email: runtimeEmail("foreign"),
      role: "PROFESSOR" as const,
    },
    admin: {
      id: "sec-rt-cc-admin",
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
      title: COURSE_CONTENT_RUNTIME_COURSE_TITLE,
      level: "Module académique",
      credits: 3,
      duration: "10 heures",
      category: "Test",
      disciplineId: DEFAULT_DISCIPLINE_ID,
      price: 49.99,
      iconName: "Code",
      color: "bg-blue-100",
      instructor: "Runtime Owner",
      description: "Cours éphémère pour les tests runtime contenu payant.",
      progress: 0,
      isLiveNow: false,
      published: true,
      createdById: users.ownerProfessor.id,
      modules: [],
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: users.enrolledStudent.id,
      courseId: course.id,
      active: true,
    },
  });

  const publishedSection = await prisma.contentSection.create({
    data: {
      id: "sec-rt-cc-published-section",
      courseId: course.id,
      title: COURSE_CONTENT_RUNTIME_PUBLISHED_SECTION_TITLE,
      order: 0,
      published: true,
      createdById: users.ownerProfessor.id,
    },
  });

  await prisma.lessonContent.create({
    data: {
      id: "sec-rt-cc-published-tree-content",
      courseId: course.id,
      sectionId: publishedSection.id,
      type: "TEXT",
      title: COURSE_CONTENT_RUNTIME_PUBLISHED_TREE_CONTENT_TITLE,
      body: "Contenu publié dans l'arbre.",
      published: true,
      createdById: users.ownerProfessor.id,
    },
  });

  const draftSection = await prisma.contentSection.create({
    data: {
      id: "sec-rt-cc-draft-section",
      courseId: course.id,
      title: COURSE_CONTENT_RUNTIME_DRAFT_SECTION_TITLE,
      order: 1,
      published: false,
      createdById: users.ownerProfessor.id,
    },
  });

  await prisma.lessonContent.create({
    data: {
      id: "sec-rt-cc-draft-tree-content",
      courseId: course.id,
      sectionId: draftSection.id,
      type: "TEXT",
      title: COURSE_CONTENT_RUNTIME_DRAFT_TREE_CONTENT_TITLE,
      body: "Contenu brouillon dans l'arbre.",
      published: false,
      createdById: users.ownerProfessor.id,
    },
  });

  await prisma.lessonContent.create({
    data: {
      id: "sec-rt-cc-published-module-content",
      courseId: course.id,
      sectionId: null,
      type: "TEXT",
      title: COURSE_CONTENT_RUNTIME_PUBLISHED_MODULE_CONTENT_TITLE,
      body: "Contenu module publié.",
      published: true,
      createdById: users.ownerProfessor.id,
    },
  });

  await prisma.lessonContent.create({
    data: {
      id: "sec-rt-cc-draft-module-content",
      courseId: course.id,
      sectionId: null,
      type: "TEXT",
      title: COURSE_CONTENT_RUNTIME_DRAFT_MODULE_CONTENT_TITLE,
      body: "Contenu module brouillon.",
      published: false,
      createdById: users.ownerProfessor.id,
    },
  });

  return {
    courseId: course.id,
    missingCourseId: 9_999_999,
    users,
  };
}
