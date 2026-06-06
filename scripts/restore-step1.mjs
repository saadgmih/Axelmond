import fs from "fs";
const APP = "C:/Users/saadg/Desktop/unicode/src/App.tsx";
let text = fs.readFileSync(APP, "utf8");
console.log("read", text.length);
if (!text.includes("useNavigate")) {
  text = text.replace(
    'import React, { useState, useEffect, useRef } from "react";',
    'import React, { useState, useEffect, useRef } from "react";\nimport { useNavigate, useLocation } from "react-router-dom";',
  );
}
const viewImports = `import InstitutionalViewSwitch from "./views/InstitutionalViewSwitch";
import { buildPlatformPath, INSTITUTIONAL_VIEWS, parsePlatformPath } from "./navigation/platformPaths";
import TeacherWorkspace from "./views/teacher/TeacherWorkspace";
import TeacherDashboardView from "./views/teacher/TeacherDashboardView";
import TeacherAcademicProfileView from "./views/teacher/TeacherAcademicProfileView";
import TeacherCurriculumView from "./views/teacher/TeacherCurriculumView";
import StudentDashboardView from "./views/student/StudentDashboardView";
import StudentCatalogView from "./views/student/StudentCatalogView";
import StudentCourseView from "./views/student/StudentCourseView";
import StudentProfileView from "./views/student/StudentProfileView";
import StudentLiveView from "./views/student/StudentLiveView";
`;
if (text.includes("ContactView")) {
  text = text.replace(
    /import ContactView[\s\S]*?import PublicationsView from "\.\/components\/PublicationsView";\r?\n/,
    viewImports,
  );
}
text = text.replace(
  "export default function App() {\n  const [courses, setCourses]",
  "export default function App() {\n  const navigate = useNavigate();\n  const location = useLocation();\n  const [courses, setCourses]",
);
const rbacStart = text.indexOf("const redirectPath = getRedirectPathForRole(currentUser.role, window.location.pathname)");
if (rbacStart < 0) throw new Error("rbac start");
const rbacEnd = text.indexOf("  }, [currentUser]);", rbacStart);
if (rbacEnd < 0) throw new Error("rbac end");
const rbacBlockStart = text.lastIndexOf("  useEffect(() => {", rbacStart);
const rbacInsert = `  useEffect(() => {
    if (!currentUser) return;
    const redirectPath = getRedirectPathForRole(currentUser.role, location.pathname);
    if (redirectPath) {
      console.info("[rbac] Client route redirected", {
        role: currentUser.role,
        from: location.pathname,
        to: redirectPath,
      });
      navigate(redirectPath, { replace: true });
      if (isStudentRole(currentUser.role)) {
        setCurrentView("dashboard");
      } else {
        setTeacherView("dashboard");
      }
    }
  }, [currentUser, location.pathname, navigate]);

  useEffect(() => {
    if (!currentUser) return;
    const parsed = parsePlatformPath(location.pathname);
    if (parsed.institutionalView) {
      setCurrentView(parsed.institutionalView);
      return;
    }
    if (isStudentRole(currentUser.role)) {
      setCurrentView(parsed.studentView);
    } else {
      setTeacherView(parsed.teacherView);
    }
  }, [location.pathname, currentUser]);`;
text = text.slice(0, rbacBlockStart) + rbacInsert + text.slice(rbacEnd + "  }, [currentUser]);".length);
text = text.replace(
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
text = text.replace("setTeacherView={setTeacherView}", "setTeacherView={handleTeacherViewChange}");
fs.writeFileSync(APP, text);
console.log("step1 done", text.split(/\r?\n/).length);
