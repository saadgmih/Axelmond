import assert from "node:assert/strict";
import {
  canAccessStudentObjective,
  isAllowedFocusContentUrl,
  serializeStudentObjective,
  sortStudentObjectives,
  validateStudentObjectivePayload,
  type StudentObjectiveRecord,
} from "../src/student-objectives.ts";

const studentA = "student-a-id";
const studentB = "student-b-id";

const startAt = "2026-06-11T08:00:00.000Z";
const endAt = "2026-06-11T10:00:00.000Z";

assert.equal(validateStudentObjectivePayload({
  title: "Terminer le chapitre 1",
  startAt,
  endAt,
  objectiveType: "CHAPITRE",
}), null);

assert.match(
  validateStudentObjectivePayload({
    title: "",
    startAt,
    endAt,
  }) || "",
  /titre/i,
);

assert.match(
  validateStudentObjectivePayload({
    title: "TD2",
    startAt: endAt,
    endAt: startAt,
  }) || "",
  /postérieure/,
);

assert.equal(isAllowedFocusContentUrl("https://example.com/podcast"), true);
assert.equal(isAllowedFocusContentUrl("http://example.com/audio"), true);
assert.equal(isAllowedFocusContentUrl("notaurl"), false);

assert.equal(canAccessStudentObjective(studentA, studentA), true);
assert.equal(canAccessStudentObjective(studentA, studentB), false);

const baseRecord = (overrides: Partial<StudentObjectiveRecord>): StudentObjectiveRecord => ({
  id: "objective-1",
  studentId: studentA,
  title: "Résumé du cours",
  description: "",
  startAt: new Date(startAt),
  endAt: new Date(endAt),
  status: "IN_PROGRESS",
  objectiveType: "RESUME",
  focusContentTitle: "Podcast de concentration",
  focusContentUrl: "https://example.com/podcast",
  focusContentType: "PODCAST",
  completedAt: null,
  createdAt: new Date(startAt),
  updatedAt: new Date(startAt),
  ...overrides,
});

const serialized = serializeStudentObjective(baseRecord({}));
assert.equal(serialized.statusLabel, "En cours");
assert.equal(serialized.objectiveTypeLabel, "Résumé");
assert.equal(serialized.focusContentTypeLabel, "Podcast");

const sorted = sortStudentObjectives([
  baseRecord({ id: "done", status: "COMPLETED", endAt: new Date("2026-06-10T10:00:00.000Z") }),
  baseRecord({ id: "soon", endAt: new Date("2026-06-10T09:00:00.000Z") }),
  baseRecord({ id: "later", endAt: new Date("2026-06-12T09:00:00.000Z") }),
]);
assert.deepEqual(sorted.map((objective) => objective.id), ["soon", "later", "done"]);

console.log("Student objectives validation rules passed");
