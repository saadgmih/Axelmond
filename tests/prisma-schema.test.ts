import assert from "node:assert/strict";
import fs from "node:fs";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");

assert.match(schema, /provider\s*=\s*"postgresql"/);
assert.match(schema, /schemas\s*=\s*\["unicode"\]/);
assert.match(schema, /@@schema\("unicode"\)/);
for (const modelName of ["User", "AcademicProfile", "EmailVerificationCode", "EmailDeliveryLog", "ProfessorInviteCode", "FacultyDomain", "Discipline", "Course", "Enrollment", "LiveSession", "LiveMessage", "LiveAttendance", "LiveActionLog", "Chapter", "ContentSection", "LessonContent", "Attachment", "Quiz", "QuizQuestion", "QuizAttempt", "QuizAnswer"]) {
  assert.match(schema, new RegExp(`model\\s+${modelName}\\s+{`));
}

assert.match(schema, /enum\s+UserRole\s+{/);
assert.match(schema, /STUDENT/);
assert.match(schema, /PROFESSOR/);
assert.match(schema, /RESEARCHER/);
assert.match(schema, /ADMIN/);
assert.match(schema, /passwordHash\s+String/);
assert.match(schema, /emailVerified\s+Boolean\s+@default\(false\)/);
assert.match(schema, /avatarUrl\s+String\?/);
assert.match(schema, /codeHash\s+String/);
assert.match(schema, /expiresAt\s+DateTime/);
assert.match(schema, /attempts\s+Int\s+@default\(0\)/);
assert.match(schema, /messageId\s+String\?/);
assert.match(schema, /accepted\s+Json/);
assert.match(schema, /rejected\s+Json/);
assert.match(schema, /envelope\s+Json\?/);
assert.match(schema, /response\s+String\?/);
assert.match(schema, /providerStatus\s+String/);
assert.match(schema, /usedAt\s+DateTime\?/);
assert.match(schema, /revokedAt\s+DateTime\?/);
assert.match(schema, /@@unique\(\[userId,\s*courseId\]\)/);
assert.match(schema, /clientId\s+String\?\s+@unique/);
assert.match(schema, /enum\s+LessonContentType\s+{/);
assert.match(schema, /VIDEO/);
assert.match(schema, /PDF/);
assert.match(schema, /IMAGE/);
assert.match(schema, /parentId\s+String\?/);
assert.match(schema, /parent\s+ContentSection\?/);
assert.match(schema, /fileKey\s+String/);
assert.match(schema, /disciplineId\s+Int/);
assert.match(schema, /discipline\s+Discipline\s+@relation/);
assert.match(schema, /domainId\s+Int/);
assert.match(schema, /domain\s+FacultyDomain\s+@relation/);
assert.match(schema, /moduleId\s+Int/);
assert.match(schema, /scoreOutOf20\s+Float/);
assert.match(schema, /selectedAnswer\s+String/);
assert.match(schema, /isCorrect\s+Boolean/);
assert.match(schema, /academicProfile\s+AcademicProfile\?/);
assert.match(schema, /durationSeconds\s+Int\s+@default\(0\)/);
assert.match(schema, /participationScore\s+Int\s+@default\(0\)/);
assert.match(schema, /handRaised\s+Boolean\s+@default\(false\)/);
assert.match(schema, /targetIdentity\s+String\?/);
assert.match(schema, /action\s+String/);
assert.match(schema, /userId\s+String\s+@unique/);
assert.match(schema, /teachingDomains\s+Json\s+@default\("\[\]"\)/);
assert.match(schema, /researchDomains\s+Json\s+@default\("\[\]"\)/);
assert.match(schema, /links\s+Json\s+@default\("\{\}"\)/);

console.log("Prisma schema rules passed");
