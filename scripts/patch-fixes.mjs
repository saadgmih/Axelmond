import fs from "fs";
const APP = "C:/Users/saadg/Desktop/AxelmondResearchLab/src/App.tsx";
let t = fs.readFileSync(APP, "utf8");
if (!t.includes("const navigate = useNavigate()")) {
  t = t.replace(
    "export default function App() {\n  const [courses, setCourses]",
    "export default function App() {\n  const navigate = useNavigate();\n  const location = useLocation();\n  const [courses, setCourses]",
  );
}
if (!t.includes("handleTeacherViewChange")) {
  t = t.replace(
    `    setCurrentView(view);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };`,
    `    setCurrentView(view);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (currentUser) {
      const uiRole = getAllowedUiRole(currentUser.role);
      navigate(buildPlatformPath(uiRole, view, uiRole === "teacher" ? teacherView : undefined));
    }
  };

  const handleTeacherViewChange = (view: string) => {
    setTeacherView(view);
    setIsMobileMenuOpen(false);
    navigate(buildPlatformPath("teacher", currentView, view));
  };`,
  );
}
if (!t.includes('import { useNavigate, useLocation }')) {
  t = t.replace(
    'import React, { useState, useEffect, useRef } from "react";',
    'import React, { useState, useEffect, useRef } from "react";\nimport { useNavigate, useLocation } from "react-router-dom";',
  );
}
// remove duplicate curriculum prop
t = t.replace(/\n                  handleSetUploadSectionId=\{handleSetUploadSectionId\}(\s*\n\s*\/>)/, "\n                />");
fs.writeFileSync(APP, t);

// fix TeacherCurriculumView types
const CURR = "C:/Users/saadg/Desktop/AxelmondResearchLab/src/views/teacher/TeacherCurriculumView.tsx";
let c = fs.readFileSync(CURR, "utf8");
if (!c.includes("Dispatch")) {
  c = c.replace(
    '} from "lucide-react";',
    '} from "lucide-react";\nimport type { Dispatch, SetStateAction } from "react";',
  );
}
c = c.replace(/\n  handleSetUploadSectionId: unknown;\n/, "\n");
c = c.replace(/\n  handleSetUploadSectionId: \(\.\.\.args: any\[\]\) => void \| Promise<void>;\n(?=.*handleSetUploadSectionId)/s, "\n");
// keep single handler line
const handlerLine = "  handleSetUploadSectionId: (sectionId: string) => void;";
if (!c.includes(handlerLine)) {
  c = c.replace(
    /  handleSetUploadSectionId:[^\n]+\n/,
    handlerLine + "\n",
  );
}
c = c.replace(
  /  editCourseForm: \{ title: string; description: string; level: string; duration: string; credits: number; disciplineId: number; price: number \};/,
  "  editCourseForm: { title: string; description: string; level: string; duration: string; credits: number; disciplineId: number; price: number };\n  setEditCourseForm: Dispatch<SetStateAction<{ title: string; description: string; level: string; duration: string; credits: number; disciplineId: number; price: number }>>;",
);
c = c.replace(
  /  setEditCourseForm: \(value: \{ title: string; description: string; level: string; duration: string; credits: number; disciplineId: number; price: number \}\) => void;/,
  "",
);
c = c.replace(
  /  newQuestionOptions: string\[\];/,
  "  newQuestionOptions: string[];\n  setNewQuestionOptions: Dispatch<SetStateAction<string[]>>;",
);
c = c.replace(
  /  setNewQuestionOptions: \(value: string\[\]\) => void;/,
  "",
);
c = c.replace(/managedSections: ContentSection\[\];/, "managedSections: (ContentSection & { depth?: number })[];");
c = c.replace(/chapterSections: ContentSection\[\];/, "chapterSections: (ContentSection & { depth?: number })[];");
c = c.replace(/uploadPartOptions: ContentSection\[\];/, "uploadPartOptions: (ContentSection & { depth?: number })[];");
c = c.replace(
  /  showCurriculumSuccess: \(\.\.\.args: any\[\]\) => void \| Promise<void>;/,
  "  showCurriculumSuccess: (message: string) => void;",
);
c = c.replace(
  /  showCurriculumError: \(\.\.\.args: any\[\]\) => void \| Promise<void>;/,
  "  showCurriculumError: (message: string) => void;",
);
c = c.replace(
  /  loadTeacherQuizzes: \(\.\.\.args: any\[\]\) => void \| Promise<void>;/,
  "  loadTeacherQuizzes: (courseId?: number) => void | Promise<void>;",
);
// dedupe destructured handleSetUploadSectionId
const destructureMatch = c.match(/export default function TeacherCurriculumView\(\{([\s\S]*?)\}: TeacherCurriculumViewProps\)/);
if (destructureMatch) {
  const parts = destructureMatch[1].split(",").map((p) => p.trim()).filter(Boolean);
  const seen = new Set();
  const unique = parts.filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });
  c = c.replace(destructureMatch[0], `export default function TeacherCurriculumView({\n  ${unique.join(",\n  ")}\n}: TeacherCurriculumViewProps)`);
}
fs.writeFileSync(CURR, c);
console.log("patched");
