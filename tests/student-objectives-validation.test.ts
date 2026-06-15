import assert from "node:assert/strict";
import {
  canAccessStudentObjective,
  addRecurrenceInterval,
  buildNextRecurringObjectiveData,
  buildStudentObjectiveSummary,
  isAllowedFocusContentUrl,
  serializeStudentObjective,
  sortStudentObjectives,
  validateStudentObjectivePayload,
  type StudentObjectiveRecord,
} from "../src/student-objectives.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-objectives-validation", () => {
  const studentA = "student-a-id";
  const studentB = "student-b-id";

  const startAt = "2026-06-11T08:00:00.000Z";
  const endAt = "2026-06-11T10:00:00.000Z";

  assert.equal(
    validateStudentObjectivePayload({
      title: "Terminer le chapitre 1",
      startAt,
      endAt,
      objectiveType: "CHAPITRE",
    }),
    null,
  );

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
  assert.equal(isAllowedFocusContentUrl("http://example.com/audio"), false);
  assert.equal(isAllowedFocusContentUrl("javascript:alert(1)"), false);
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
    recurrence: "NONE",
    recurrenceSourceId: null,
    recurrenceCreatedAt: null,
    completedAt: null,
    createdAt: new Date(startAt),
    updatedAt: new Date(startAt),
    ...overrides,
  });

  const serialized = serializeStudentObjective(baseRecord({}));
  assert.equal(serialized.statusLabel, "En cours");
  assert.equal(serialized.objectiveTypeLabel, "Résumé");
  assert.equal(serialized.focusContentTypeLabel, "Podcast");
  assert.equal(serialized.recurrenceLabel, "Pas de récurrence");

  const sorted = sortStudentObjectives([
    baseRecord({ id: "done", status: "COMPLETED", endAt: new Date("2026-06-10T10:00:00.000Z") }),
    baseRecord({ id: "soon", endAt: new Date("2026-06-10T09:00:00.000Z") }),
    baseRecord({ id: "later", endAt: new Date("2026-06-12T09:00:00.000Z") }),
  ]);
  assert.deepEqual(
    sorted.map((objective) => objective.id),
    ["soon", "later", "done"],
  );

  assert.equal(
    addRecurrenceInterval(new Date("2026-06-11T08:00:00.000Z"), "DAILY").toISOString(),
    "2026-06-12T08:00:00.000Z",
  );
  assert.equal(
    addRecurrenceInterval(new Date("2026-06-11T08:00:00.000Z"), "WEEKLY").toISOString(),
    "2026-06-18T08:00:00.000Z",
  );

  const recurring = baseRecord({ id: "daily", recurrence: "DAILY" });
  const next = buildNextRecurringObjectiveData(recurring, new Date("2026-06-11T11:00:00.000Z"));
  assert.equal(next?.recurrence, "DAILY");
  assert.equal(next?.recurrenceSourceId, "daily");
  assert.equal(next?.startAt.toISOString(), "2026-06-12T08:00:00.000Z");

  const summaryNow = new Date("2026-06-11T12:00:00.000Z");
  const summary = buildStudentObjectiveSummary(
    [
      baseRecord({ id: "created-this-week", createdAt: new Date("2026-06-11T07:00:00.000Z") }),
      baseRecord({
        id: "completed-today",
        status: "COMPLETED",
        createdAt: new Date("2026-06-11T07:00:00.000Z"),
        completedAt: new Date("2026-06-11T09:00:00.000Z"),
      }),
      baseRecord({
        id: "overdue",
        startAt: new Date("2026-06-10T08:00:00.000Z"),
        endAt: new Date("2026-06-10T10:00:00.000Z"),
      }),
    ],
    summaryNow,
  );
  assert.equal(summary.weeklyProgress.created, 3);
  assert.equal(summary.weeklyProgress.completed, 1);
  assert.equal(summary.stats.totalCreated, 3);
  assert.equal(summary.stats.totalCompleted, 1);
  assert.equal(summary.stats.overdue, 2);
  assert.equal(summary.streak.days, 1);
  assert.ok(summary.calendar.days.some((day) => day.objectiveCount > 0));

  console.log("Student objectives validation rules passed");
});
