import assert from "node:assert/strict";
import {
  canAccessProfessorScheduleSession,
  findScheduleOverlap,
  validateScheduleEndAfterStart,
  validateSchedulePayload,
  type ScheduleSessionRecord,
} from "../src/schedule.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("schedule-validation", () => {
  const professorA = "professor-a-id";
  const professorB = "professor-b-id";

  const baseSession = (overrides: Partial<ScheduleSessionRecord>): ScheduleSessionRecord => ({
    id: "session-1",
    professorId: professorA,
    dayOfWeek: 0,
    title: "Algorithmique",
    moduleName: "Informatique",
    startTime: "08:00",
    endTime: "10:00",
    sessionType: "COURS",
    roomOrLink: "Amphi A",
    description: "",
    ...overrides,
  });

  assert.equal(
    validateScheduleEndAfterStart("10:00", "09:00"),
    "L'heure de fin doit être postérieure à l'heure de début",
  );
  assert.equal(validateScheduleEndAfterStart("08:00", "10:00"), null);

  const existing = [
    baseSession({ id: "s1", startTime: "08:00", endTime: "10:00" }),
    baseSession({ id: "s2", dayOfWeek: 1, startTime: "14:00", endTime: "16:00" }),
  ];

  assert.match(
    validateSchedulePayload(
      {
        dayOfWeek: 0,
        title: "TP SQL",
        moduleName: "Bases de données",
        startTime: "09:00",
        endTime: "11:00",
        sessionType: "TP",
      },
      existing,
    ) || "",
    /Conflit horaire/,
  );

  assert.equal(
    validateSchedulePayload(
      {
        dayOfWeek: 0,
        title: "TD Structures",
        moduleName: "Informatique",
        startTime: "10:00",
        endTime: "12:00",
        sessionType: "TD",
      },
      existing,
    ),
    null,
  );

  assert.equal(canAccessProfessorScheduleSession(professorA, professorA), true);
  assert.equal(canAccessProfessorScheduleSession(professorA, professorB), false);
  assert.equal(canAccessProfessorScheduleSession(professorB, professorA), false);

  const professorASessions = existing.map((session) => ({ ...session, professorId: professorA }));
  const professorBSessions = existing.map((session, index) => ({
    ...session,
    id: `b-${index}`,
    professorId: professorB,
    title: `Séance B ${index + 1}`,
  }));

  assert.ok(
    findScheduleOverlap(
      {
        dayOfWeek: 0,
        title: "Live A",
        moduleName: "Module A",
        startTime: "08:30",
        endTime: "09:30",
        sessionType: "LIVE",
      },
      professorASessions,
    ),
  );

  assert.equal(
    validateSchedulePayload(
      {
        dayOfWeek: 0,
        title: "Cours B",
        moduleName: "Module B",
        startTime: "12:00",
        endTime: "13:00",
        sessionType: "COURS",
      },
      professorBSessions,
    ),
    null,
  );

  assert.notEqual(professorASessions[0].professorId, professorBSessions[0].professorId);
});
