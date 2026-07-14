import type { CourseModule } from "../types";

/** Every pedagogical item in the supplied student-visible list contributes to progress. */
export function getCourseContentProgress(modules: CourseModule[]): {
  completedContents: number;
  totalContents: number;
  progressPercent: number;
} {
  const completedContents = modules.filter((module) => module.completed).length;
  const totalContents = modules.length;
  const progressPercent = totalContents > 0 ? Math.round((completedContents / totalContents) * 100) : 0;

  return { completedContents, totalContents, progressPercent };
}
