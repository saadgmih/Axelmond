import type { CourseModule } from "../types";

/** Syllabus chapters exclude quizzes and other evaluation-only modules. */
export function isSyllabusChapterModule(module: Pick<CourseModule, "type">): boolean {
  return module.type !== "quiz";
}

export function getSyllabusChapterModules(modules: CourseModule[]): CourseModule[] {
  return modules.filter(isSyllabusChapterModule);
}

export function getSyllabusChapterProgress(modules: CourseModule[]): {
  completedChapters: number;
  totalChapters: number;
  progressPercent: number;
} {
  const chapters = getSyllabusChapterModules(modules);
  const completedChapters = chapters.filter((module) => module.completed).length;
  const totalChapters = chapters.length;
  const progressPercent =
    totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
  return { completedChapters, totalChapters, progressPercent };
}
