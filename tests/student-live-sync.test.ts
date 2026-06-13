import assert from "node:assert/strict";
import fs from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import { readAppSources } from "./helpers/app-sources.ts";

const apiSource = fs.readFileSync("src/api.ts", "utf8");
const appSource = readAppSources();
const studentCourseSessionSource = fs.readFileSync("src/hooks/useStudentCourseSession.ts", "utf8");
const studentCourseBundle = appSource + studentCourseSessionSource;
const liveKitHookSource = fs.readFileSync("src/hooks/useLiveKitRoom.tsx", "utf8");
const liveKitSource = appSource + liveKitHookSource;
const serverSource = readApiRouteSources();

assert.doesNotMatch(apiSource, /enrollMock:/);
assert.doesNotMatch(apiSource, /syncUser:/);
assert.doesNotMatch(apiSource, /getUser:\s*\(/);

assert.match(studentCourseSessionSource, /if \(!syncedUser\)/);
assert.match(studentCourseSessionSource, /syncedUser\.enrolledCourses\?\.includes\(courseId\)/);
assert.match(studentCourseSessionSource, /updateSessionUser\(syncedUser\)/);
assert.doesNotMatch(studentCourseSessionSource, /await\s+api\.enrollMock\(courseId\)/);
assert.doesNotMatch(studentCourseBundle, /setEnrolledCourses\(\(prev\)\s*=>\s*\[\.\.\.prev,\s*courseId\]\)/);
assert.match(liveKitSource, /if\s*\(\(err as any\)\?\.status === 403 && currentUser && isStudentRole\(currentUser\.role\)\)/);
assert.match(liveKitSource, /const syncedUser = await api\.me\(\)/);
assert.match(liveKitSource, /setCourseToPurchase\(activeLiveCourse\)/);

assert.match(serverSource, /res\.json\(\{\s*ok:\s*true,\s*message:\s*"Inscription réussie",\s*invoice:\s*newInvoice,\s*user:\s*api\.toAppUser\(updatedUser\)\s*\}\)/);

console.log("Student live synchronization rules passed");
