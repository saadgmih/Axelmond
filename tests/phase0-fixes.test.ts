import assert from "node:assert/strict";import { readApiRouteSources } from "./helpers/api-route-sources.ts";import { readAppSources } from "./helpers/app-sources.ts";import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("phase0-fixes", () => {
const serverSource = readApiRouteSources();
const appSource = readAppSources();
const navigationSource = fs.readFileSync("src/hooks/usePlatformNavigation.ts", "utf8");
const sessionSource = fs.readFileSync("src/hooks/useStudentCourseSession.ts", "utf8");
const paymentModalSource = fs.readFileSync("src/components/PaymentModal.tsx", "utf8");

assert.match(serverSource, /await api\.revokeAllUserRefreshTokens\(user\.id\)/);
assert.match(serverSource, /await api\.revokeAllUserRefreshTokens\(authUser\.id\)/);
assert.match(serverSource, /api\.seedQuizModuleCourseMap\[moduleId\]/);
assert.match(serverSource, /err instanceof api\.ChatTutorServiceError/);
assert.match(serverSource, /toChatTutorClientResponse\(err\)/);
assert.doesNotMatch(serverSource, /details:\s*err\.cause\.message/);

assert.match(navigationSource, /INSTITUTIONAL_VIEWS\.has\(view\)/);
assert.match(appSource, /onClick=\{\(\) => navigateTo\("research"\)\}/);
assert.match(appSource, /onClick=\{\(\) => navigateTo\("privacy"\)\}/);
assert.doesNotMatch(appSource, /onClick=\{\(\) => setCurrentView\("research"\)\}/);

assert.match(sessionSource, /if \(!syncedUser\)/);
assert.doesNotMatch(sessionSource, /api\.enrollMock\(courseId\)/);
assert.doesNotMatch(sessionSource, /INV-2026-00/);

assert.match(paymentModalSource, /if \(!result\.user\)/);

});
console.log("Phase 0 security and UX fixes passed");
