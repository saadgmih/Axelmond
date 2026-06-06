import fs from "fs";

const APP = "src/App.tsx";
const OUT = "src/views/teacher/TeacherCurriculumView.tsx";
const START = 2398; // 0-indexed `{teacherView === "curriculum" && (`
const END = 3788; // 0-indexed closing `)}`

const lines = fs.readFileSync(APP, "utf8").split(/\r?\n/);
const jsxInner = lines.slice(START + 1, END).join("\n"); // inner root div only

function uses(name, text) {
  return new RegExp(`\\b${name}\\b`).test(text);
}

const appBefore = lines.slice(0, START).join("\n");
const statePairs = [...appBefore.matchAll(/const \[(\w+), (set\w+)\]/g)]
  .map((m) => [m[1], m[2]])
  .filter(([name, setter]) => uses(name, jsxInner) || uses(setter, jsxInner));
const handlers = [...appBefore.matchAll(/const ((?:handle|show|load)\w+) =/g)]
  .map((m) => m[1])
  .filter((name) => uses(name, jsxInner));
const computed = [
  "domains",
  "allDisciplines",
  "managedCourses",
  "managedCourse",
  "managedSections",
  "chapterSections",
  "uploadPartOptions",
  "selectedManagedContents",
  "handleSetUploadSectionId",
].filter((name) => uses(name, jsxInner));

const typeMap = {
  domains: "FacultyDomain[]",
  allDisciplines: "FacultyDomain['disciplines'][number][]",
  managedCourses: "Course[]",
  managedCourse: "Course | null",
  managedSections: "ContentSection[]",
  chapterSections: "ContentSection[]",
  uploadPartOptions: "ContentSection[]",
  selectedManagedContents: "LessonContent[]",
  activeCurriculumStep: "number",
  curriculumSuccessMsg: "string",
  curriculumErrorMsg: "string",
  selectedChapterId: "string",
  selectedPartieId: "string",
  newSectionMode: '"chapter" | "part" | "subpart"',
  uploadChapterId: "string",
  uploadPartId: "string",
  uploadSubpartId: "string",
  quizChapterId: "string",
  quizPartId: "string",
  quizSubpartId: "string",
  newCourseTitle: "string",
  newCourseDescription: "string",
  newCourseDisciplineId: "number",
  newCourseLevel: "string",
  newCourseCredits: "number",
  newCourseDuration: "string",
  newCoursePrice: "number",
  newCoursePublished: "boolean",
  newSectionCourseId: "number",
  newSectionTitle: "string",
  newSectionParentId: "string",
  newSectionPublished: "boolean",
  uploadCourseId: "number",
  uploadSectionId: "string",
  uploadTitle: "string",
  uploadType: '"VIDEO" | "PDF" | "IMAGE"',
  uploadFile: "File | null",
  uploadPublished: "boolean",
  uploadStatusMsg: "string",
  editingCourse: "Course | null",
  editCourseForm: "{ title: string; description: string; level: string; duration: string; credits: number; disciplineId: number; price: number }",
  teacherQuizzes: "any[]",
  quizCourseId: "number",
  newQuizTitle: "string",
  selectedQuizId: "string",
  newQuestionText: "string",
  newQuestionOptions: "string[]",
  newQuestionAnswer: "string",
  newQuestionExplanation: "string",
  quizManagerMsg: "string",
  quizManagerError: "string",
};

const iconImports = [
  "BookOpen",
  "Layers",
  "FolderTree",
  "Video",
  "HelpCircle",
  "Plus",
  "Trash2",
  "Edit3",
  "Save",
  "Check",
  "ChevronDown",
  "ChevronUp",
  "FilePlus",
  "Eye",
  "EyeOff",
  "FileText",
  "Download",
  "CheckCircle",
  "X",
  "Sparkles",
  "Info",
  "GraduationCap",
  "DollarSign",
  "Clock",
  "Award",
  "ChevronRight",
  "ChevronLeft",
];

const usedIcons = iconImports.filter((icon) => uses(icon, jsxInner));

const propLines = [];
for (const [name, setter] of statePairs) {
  const t = typeMap[name] || "unknown";
  propLines.push(`  ${name}: ${t};`);
  if (uses(setter, jsxInner)) {
    const st = typeMap[name] ? `(value: ${typeMap[name]}) => void` : "(value: unknown) => void";
    propLines.push(`  ${setter}: ${st};`);
  }
}
for (const name of computed) {
  if (statePairs.some(([n]) => n === name)) continue;
  const t = typeMap[name] || "unknown";
  propLines.push(`  ${name}: ${t};`);
}
for (const name of handlers) {
  propLines.push(`  ${name}: (...args: any[]) => void | Promise<void>;`);
}

const destructured = [
  ...statePairs.flatMap(([name, setter]) => {
    const items = [name];
    if (uses(setter, jsxInner)) items.push(setter);
    return items;
  }),
  ...computed.filter((n) => !statePairs.some(([sn]) => sn === n)),
  ...handlers,
];

const header = `import {
  ${usedIcons.join(",\n  ")}
} from "lucide-react";
import type { Course, ContentSection, FacultyDomain, LessonContent } from "../../types";

export interface TeacherCurriculumViewProps {
${propLines.join("\n")}
}

export default function TeacherCurriculumView({
  ${destructured.join(",\n  ")}
}: TeacherCurriculumViewProps) {
  return (
${jsxInner}
  );
}
`;

fs.writeFileSync(OUT, header, "utf8");

const jsxUsageProps = destructured.map((p) => `                  ${p}={${p}}`).join("\n");
const replacement = `{teacherView === "curriculum" && (
                <TeacherCurriculumView
${jsxUsageProps}
                />
              )}`;

const newLines = [
  ...lines.slice(0, START),
  ...replacement.split("\n"),
  ...lines.slice(END + 1),
];

const importLine = 'import TeacherCurriculumView from "./views/teacher/TeacherCurriculumView";';
const appText = newLines.join("\n");
if (!appText.includes(importLine)) {
  const patched = appText.replace(
    'import TeacherAcademicProfileView from "./views/teacher/TeacherAcademicProfileView";',
    'import TeacherAcademicProfileView from "./views/teacher/TeacherAcademicProfileView";\nimport TeacherCurriculumView from "./views/teacher/TeacherCurriculumView";',
  );
  fs.writeFileSync(APP, patched, "utf8");
} else {
  fs.writeFileSync(APP, appText, "utf8");
}

console.log(`Wrote ${OUT} (${header.split("\n").length} lines)`);
console.log(`App.tsx: ${lines.length} -> ${newLines.length} lines (${lines.length - newLines.length} removed)`);
console.log(`Props: ${destructured.length}`);

