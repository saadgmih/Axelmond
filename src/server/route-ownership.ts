import { prisma } from "../db";
import type { AppUser } from "./route-types";
import { cacheDel, cacheDelByPrefix } from "../cache";

export async function verifyCourseAccess(authUser: AppUser, courseId: number): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return false;
  return course.createdById === authUser.id || course.instructor === authUser.fullName;
}

export async function verifyChapterAccess(authUser: AppUser, chapterId: string): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) return false;
  return verifyCourseAccess(authUser, chapter.courseId);
}

export async function verifySectionAccess(authUser: AppUser, sectionId: string): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const section = await prisma.contentSection.findUnique({ where: { id: sectionId } });
  if (!section) return false;
  return verifyCourseAccess(authUser, section.courseId);
}

export async function verifyContentAccess(authUser: AppUser, contentId: string): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const content = await prisma.lessonContent.findUnique({ where: { id: contentId } });
  if (!content) return false;
  return verifyCourseAccess(authUser, content.courseId);
}

export async function verifyQuizAccess(authUser: AppUser, quizId: string): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) return false;
  return verifyCourseAccess(authUser, quiz.courseId);
}

export async function verifyQuizQuestionAccess(authUser: AppUser, questionId: string): Promise<boolean> {
  if (authUser.role === "ADMIN") return true;
  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    include: { quiz: true },
  });
  if (!question || !question.quiz) return false;
  return verifyCourseAccess(authUser, question.quiz.courseId);
}

export async function invalidateStudentCatalogCache(userId?: string): Promise<void> {
  await cacheDelByPrefix(userId ? `api:courses:student:${userId}:` : "api:courses:student:");
}

export async function invalidatePublicCatalogCache(): Promise<void> {
  await cacheDel("api:domains:public");
  await cacheDelByPrefix("api:courses:public:");
  await invalidateStudentCatalogCache();
}
