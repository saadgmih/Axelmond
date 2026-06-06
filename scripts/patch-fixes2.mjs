import fs from "fs";
const APP = "C:/Users/saadg/Desktop/unicode/src/App.tsx";
let t = fs.readFileSync(APP, "utf8");
if (!t.includes("const handleTeacherViewChange")) {
  const needle = `    window.scrollTo({ top: 0, behavior: "smooth" });
  };`;
  const insert = `    window.scrollTo({ top: 0, behavior: "smooth" });
    if (currentUser) {
      const uiRole = getAllowedUiRole(currentUser.role);
      navigate(buildPlatformPath(uiRole, view, uiRole === "teacher" ? teacherView : undefined));
    }
  };

  const handleTeacherViewChange = (view: string) => {
    setTeacherView(view);
    setIsMobileMenuOpen(false);
    navigate(buildPlatformPath("teacher", currentView, view));
  };`;
  if (!t.includes(needle)) throw new Error("navigateTo end not found");
  t = t.replace(needle, insert);
  fs.writeFileSync(APP, t);
}
const CURR = "C:/Users/saadg/Desktop/unicode/src/views/teacher/TeacherCurriculumView.tsx";
let c = fs.readFileSync(CURR, "utf8");
if (!c.includes("handleSetUploadSectionId: (sectionId: string) => void")) {
  c = c.replace(
    "  selectedManagedContents: LessonContent[];",
    "  selectedManagedContents: LessonContent[];\n  handleSetUploadSectionId: (sectionId: string) => void;",
  );
}
c = c.replace(
  /  handleSelectManagedCourse: \(\.\.\.args: any\[\]\) => void \| Promise<void>;/,
  "  handleSelectManagedCourse: (courseId: number) => Promise<void>;",
);
fs.writeFileSync(CURR, c);
console.log("ok");
