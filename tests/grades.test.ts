import assert from "node:assert/strict";
import { buildCourseGradeRows } from "../src/grades.ts";

const rows = buildCourseGradeRows(
  [
    {
      user: {
        id: "student-1",
        fullName: "Étudiant Test",
        enrollments: [{ courseId: 1 }, { courseId: 2 }],
      },
    },
    {
      user: {
        id: "student-2",
        fullName: "Sans Note",
        enrollments: [{ courseId: 1 }],
      },
    },
  ],
  [
    {
      userId: "student-1",
      quizId: "quiz-1",
      scoreOutOf20: 10,
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
    },
    {
      userId: "student-1",
      quizId: "quiz-1",
      scoreOutOf20: 15,
      createdAt: new Date("2026-06-01T11:00:00.000Z"),
    },
    {
      userId: "student-1",
      quizId: "quiz-2",
      scoreOutOf20: 20,
      createdAt: new Date("2026-06-01T12:00:00.000Z"),
    },
  ],
);

assert.equal(rows.length, 2);
assert.equal(rows[0].studentId, "student-1");
assert.equal(rows[0].studentName, "Étudiant Test");
assert.equal(rows[0].enrolledCoursesCount, 2);
assert.equal(rows[0].completedQuizzesCount, 2);
assert.equal(rows[0].averageScoreOutOf20, 17.5);
assert.equal(rows[1].studentId, "student-2");
assert.equal(rows[1].completedQuizzesCount, 0);
assert.equal(rows[1].averageScoreOutOf20, null);

console.log("Grade calculation rules passed");
