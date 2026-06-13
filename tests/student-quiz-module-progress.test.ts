import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/hooks/useStudentCourseSession.ts", "utf8");

assert.match(source, /api\.submitQuizAttempt\(selectedCourse\.id,\s*selectedModule\.id,\s*quizAnswers\)/);
assert.match(source, /api\.completeModule\(selectedCourse\.id,\s*selectedModule\.id\)/);
assert.match(source, /Failed to synchronize module completion/);
assert.doesNotMatch(source, /const progressPercentage = Math\.round/);
assert.doesNotMatch(source, /progress:\s*progressPercentage/);

console.log("Student quiz module progress synchronization rules passed");
