import assert from "node:assert/strict";
import {
  canAccessStudentStudySession,
  findStudentStudyOverlap,
  validateStudentStudyPayload,
  type StudentStudySessionRecord,
} from "../src/student-study-schedule.ts";
import { validateScheduleEndAfterStart } from "../src/schedule.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-study-schedule-validation", () => {
  const studentA = "student-a-id";
  const studentB = "student-b-id";

  const baseSession = (overrides: Partial<StudentStudySessionRecord>): StudentStudySessionRecord => ({
    id: "session-1",
    studentId: studentA,
    dayOfWeek: 0,
    title: "Révision algorithmique",
    moduleName: "Informatique",
    startTime: "08:00",
    endTime: "10:00",
    sessionType: "REVISION",
    roomOrLink: "Bibliothèque",
    description: "",
    ...overrides,
  });

  assert.equal(
    validateScheduleEndAfterStart("10:00", "09:00"),
    "L'heure de fin doit être postérieure à l'heure de début",
  );

  const studentASessions = [
    baseSession({ id: "a1", startTime: "08:00", endTime: "10:00" }),
    baseSession({ id: "a2", dayOfWeek: 2, startTime: "14:00", endTime: "16:00", sessionType: "TD" }),
  ];

  const studentBSessions = studentASessions.map((session, index) => ({
    ...session,
    id: `b-${index}`,
    studentId: studentB,
    title: `Séance B ${index + 1}`,
  }));

  assert.match(
    validateStudentStudyPayload(
      {
        dayOfWeek: 0,
        title: "Devoir SQL",
        moduleName: "Bases de données",
        startTime: "09:00",
        endTime: "11:00",
        sessionType: "DEVOIR",
      },
      studentASessions,
    ) || "",
    /Conflit horaire/,
  );

  assert.equal(
    validateStudentStudyPayload(
      {
        dayOfWeek: 0,
        title: "Live Python",
        moduleName: "Programmation",
        startTime: "10:00",
        endTime: "12:00",
        sessionType: "LIVE",
      },
      studentASessions,
    ),
    null,
  );

  assert.equal(canAccessStudentStudySession(studentA, studentA), true);
  assert.equal(canAccessStudentStudySession(studentA, studentB), false);
  assert.equal(canAccessStudentStudySession(studentB, studentA), false);

  assert.ok(
    findStudentStudyOverlap(
      {
        dayOfWeek: 0,
        title: "Révision A",
        moduleName: "Module A",
        startTime: "08:30",
        endTime: "09:30",
        sessionType: "REVISION",
      },
      studentASessions,
    ),
  );

  assert.equal(
    validateStudentStudyPayload(
      {
        dayOfWeek: 0,
        title: "Révision B",
        moduleName: "Module B",
        startTime: "12:00",
        endTime: "13:00",
        sessionType: "REVISION",
      },
      studentBSessions,
    ),
    null,
  );

  assert.notEqual(studentASessions[0].studentId, studentBSessions[0].studentId);
});
