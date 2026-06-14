import fs from "node:fs";

const originalPath = "src/views/teacher/TeacherCurriculumView.tsx";
const backup = fs.readFileSync(originalPath, "utf8");
const originalLines = backup.split(/\r?\n/);

const importBlockEnd = originalLines.findIndex((line) => line.startsWith("export interface TeacherCurriculumViewProps"));
const rawImports = originalLines.slice(0, importBlockEnd).join("\n");
const importLines = rawImports
  .replace(/import \{[\s\S]*?\} from "\.\/curriculum-theme";\n?/m, "")
  .split("\n")
  .map((line) =>
    line
      .replace(/from "\.\.\/\.\.\//g, 'from "../../../')
      .replace(/from "\.\.\/components\//g, 'from "../../../components/'),
  )
  .filter((line, index, arr) => line.trim() !== "" || (index > 0 && arr[index - 1]?.trim() !== ""));

function sliceContent(startLine, endLine) {
  return originalLines.slice(startLine, endLine).join("\n");
}

const propsBlock = originalLines.slice(36, 143).join("\n");
const propNames = [...propsBlock.matchAll(/^\s+(\w+):/gm)].map((match) => match[1]);
const destructureLine = `  const { ${propNames.join(", ")} } = props;`;

fs.mkdirSync("src/views/teacher/curriculum-steps", { recursive: true });
fs.writeFileSync(
  "src/views/teacher/curriculum-types.ts",
  `import type { Dispatch, SetStateAction } from "react";
import type { Course, ContentSection, FacultyDomain, LessonContent } from "../../types";

${propsBlock}
`,
);

const stepperInner = sliceContent(254, 415)
  .split("\n")
  .map((line) => line.replace(/^                  /, ""))
  .join("\n");

const stepperProps = [
  "activeCurriculumStep",
  "setActiveCurriculumStep",
  "curriculumSuccessMsg",
  "curriculumErrorMsg",
  "managedCourse",
  "managedCourses",
  "newSectionCourseId",
  "showCurriculumSuccess",
  "showCurriculumError",
  "handleSelectManagedCourse",
  "loadTeacherQuizzes",
];

fs.writeFileSync(
  "src/views/teacher/curriculum-steps/CurriculumStepper.tsx",
  `${importLines.join("\n")}
import { CURRICULUM_STEPS, curriculumUi, getStepTheme } from "../curriculum-theme";
import { formatCredits } from "../../../utils/morocco-locale";
import type { TeacherCurriculumViewProps } from "../curriculum-types";

type Props = Pick<TeacherCurriculumViewProps, ${stepperProps.map((p) => `"${p}"`).join(" | ")}>;

export default function CurriculumStepper(props: Props) {
  const { ${stepperProps.join(", ")} } = props;

  return (
    <>
${stepperInner}
    </>
  );
}
`,
);

const steps = [
  ["CurriculumModulesStep", 417, 730],
  ["CurriculumChaptersStep", 732, 869],
  ["CurriculumOutlineStep", 871, 1070],
  ["CurriculumMediaStep", 1072, 1323],
  ["CurriculumQuizStep", 1325, 1628],
];

for (const [name, openLine, closeLine] of steps) {
  const inner = sliceContent(openLine, closeLine - 1)
    .split("\n")
    .map((line) => line.replace(/^                    /, ""))
    .join("\n");

  fs.writeFileSync(
    `src/views/teacher/curriculum-steps/${name}.tsx`,
    `${importLines.join("\n")}
import { curriculumUi, getStepTheme, publishedBadge, publishedLabel } from "../curriculum-theme";
import type { TeacherCurriculumViewProps } from "../curriculum-types";

export default function ${name}(props: TeacherCurriculumViewProps) {
${destructureLine}
  const inputFocus = \`\${curriculumUi.input} \${getStepTheme(activeCurriculumStep).focus}\`;
  return (
${inner}
  );
}
`,
  );
}

const orchestrator = `import type { TeacherCurriculumViewProps } from "./curriculum-types";
export type { TeacherCurriculumViewProps } from "./curriculum-types";
import { curriculumUi } from "./curriculum-theme";
import CurriculumStepper from "./curriculum-steps/CurriculumStepper";
import CurriculumModulesStep from "./curriculum-steps/CurriculumModulesStep";
import CurriculumChaptersStep from "./curriculum-steps/CurriculumChaptersStep";
import CurriculumOutlineStep from "./curriculum-steps/CurriculumOutlineStep";
import CurriculumMediaStep from "./curriculum-steps/CurriculumMediaStep";
import CurriculumQuizStep from "./curriculum-steps/CurriculumQuizStep";

export default function TeacherCurriculumView(props: TeacherCurriculumViewProps) {
  const { activeCurriculumStep } = props;

  return (
    <div className={curriculumUi.page}>
      <CurriculumStepper {...props} />

      {activeCurriculumStep === 1 && <CurriculumModulesStep {...props} />}
      {activeCurriculumStep === 2 && <CurriculumChaptersStep {...props} />}
      {activeCurriculumStep === 3 && <CurriculumOutlineStep {...props} />}
      {activeCurriculumStep === 4 && <CurriculumMediaStep {...props} />}
      {activeCurriculumStep === 5 && <CurriculumQuizStep {...props} />}
    </div>
  );
}
`;

fs.writeFileSync(originalPath, orchestrator);
console.log("Curriculum split complete");
