import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync("src/App.tsx", "utf8");
const studentCourseSessionSource = readFileSync("src/hooks/useStudentCourseSession.ts", "utf8");
const studentCourseBundle = appSource + studentCourseSessionSource;
const studentCourseViewSource = readFileSync("src/views/student/StudentCourseView.tsx", "utf8");
const serverSource = readFileSync("server.ts", "utf8");

assert.match(serverSource, /function invalidateAuthUserCache\(userId: string\)/);
assert.match(serverSource, /invalidateAuthUserCache\(authUser\.id\);\s*await logAudit\(authUser\.id, authUser\.email, "ENROLL_MOCK"/);

assert.match(studentCourseBundle, /refreshCourseContent\(selectedCourse\.id\)/);
assert.match(appSource, /currentView === "course" && selectedCourse && selectedModule/);
assert.match(appSource, /StudentCourseView/);
assert.match(studentCourseViewSource, /selectedCourse\.title/);

console.log("Student module content synchronization rules passed");
