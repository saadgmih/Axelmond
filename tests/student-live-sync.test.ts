import assert from "node:assert/strict";
import fs from "node:fs";

const apiSource = fs.readFileSync("src/api.ts", "utf8");
const appSource = fs.readFileSync("src/App.tsx", "utf8");
const serverSource = fs.readFileSync("server.ts", "utf8");

assert.match(apiSource, /enrollMock:\s*\(courseId:\s*number\)/);
assert.match(apiSource, /request<any>\("POST",\s*"\/api\/payments\/enroll-mock",\s*\{\s*courseId\s*\}\)/);

assert.match(appSource, /await\s+api\.enrollMock\(courseId\)/);
assert.match(appSource, /updateSessionUser\(user\)/);
assert.doesNotMatch(appSource, /setEnrolledCourses\(\(prev\)\s*=>\s*\[\.\.\.prev,\s*courseId\]\)/);
assert.match(appSource, /if\s*\(\(err as any\)\?\.status === 403 && currentUser && isStudentRole\(currentUser\.role\)\)/);
assert.match(appSource, /const syncedUser = await api\.me\(\)/);
assert.match(appSource, /setCourseToPurchase\(activeLiveCourse\)/);

assert.match(serverSource, /res\.json\(\{\s*ok:\s*true,\s*message:\s*"Inscription réussie",\s*invoice:\s*newInvoice,\s*user:\s*toAppUser\(updatedUser\)\s*\}\)/);

console.log("Student live synchronization rules passed");
