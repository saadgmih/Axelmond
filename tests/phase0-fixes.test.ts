import assert from "node:assert/strict";
import fs from "node:fs";

const serverSource = fs.readFileSync("server.ts", "utf8");
const appSource = fs.readFileSync("src/App.tsx", "utf8");
const navigationSource = fs.readFileSync("src/hooks/usePlatformNavigation.ts", "utf8");
const sessionSource = fs.readFileSync("src/hooks/useStudentCourseSession.ts", "utf8");
const paymentModalSource = fs.readFileSync("src/components/PaymentModal.tsx", "utf8");

assert.match(serverSource, /await revokeAllUserRefreshTokens\(user\.id\)/);
assert.match(serverSource, /await revokeAllUserRefreshTokens\(authUser\.id\)/);
assert.match(serverSource, /seedQuizModuleCourseMap\[moduleId\]/);
assert.match(serverSource, /err instanceof ChatTutorServiceError/);
assert.match(serverSource, /process\.env\.NODE_ENV !== "production" && err\.cause instanceof Error/);

assert.match(navigationSource, /INSTITUTIONAL_VIEWS\.has\(view\)/);
assert.match(appSource, /onClick=\{\(\) => navigateTo\("research"\)\}/);
assert.match(appSource, /onClick=\{\(\) => navigateTo\("privacy"\)\}/);
assert.doesNotMatch(appSource, /onClick=\{\(\) => setCurrentView\("research"\)\}/);

assert.match(sessionSource, /if \(!syncedUser\)/);
assert.doesNotMatch(sessionSource, /api\.enrollMock\(courseId\)/);
assert.doesNotMatch(sessionSource, /INV-2026-00/);

assert.match(paymentModalSource, /if \(!result\.user\)/);

console.log("Phase 0 security and UX fixes passed");
