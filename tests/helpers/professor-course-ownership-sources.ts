import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

/** Concatenate teacher ownership UI + curriculum hooks for static analysis tests. */
export function readProfessorCourseOwnershipSources(): string {
  const parts = [
    "src/views/teacher/TeacherDashboardView.tsx",
    "src/views/teacher/TeacherLiveControlView.tsx",
    "src/hooks/useTeacherCurriculum.tsx",
    "src/hooks/useTeacherDashboard.ts",
    "src/views/teacher/curriculum-steps/CurriculumStepper.tsx",
    "src/views/teacher/curriculum-steps/CurriculumModulesStep.tsx",
    "src/views/teacher/curriculum-steps/CurriculumQuizStep.tsx",
  ];

  return parts
    .map((relativePath) => path.join(root, relativePath))
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => fs.readFileSync(filePath, "utf8"))
    .join("\n");
}
