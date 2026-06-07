import assert from "node:assert/strict";
import {
  assertCourseLearningAccess,
  canAccessCourseLearning,
  COURSE_LEARNING_ACCESS_ERRORS,
  evaluateCourseLearningAccess,
  type CourseLearningAccessRecord,
  type CourseLearningAccessUser,
} from "../src/course-access.ts";

const course: CourseLearningAccessRecord = {
  id: 42,
  title: "Algorithmique",
  createdById: "prof-1",
  modules: [{ id: 101, title: "Chapitre 1" }],
};

const enrolledStudent: CourseLearningAccessUser = {
  id: "student-1",
  role: "STUDENT",
  enrolledCourses: [42],
};

const unenrolledStudent: CourseLearningAccessUser = {
  id: "student-2",
  role: "STUDENT",
  enrolledCourses: [7],
};

const courseOwner: CourseLearningAccessUser = {
  id: "prof-1",
  role: "PROFESSOR",
  enrolledCourses: [],
};

const foreignProfessor: CourseLearningAccessUser = {
  id: "prof-2",
  role: "PROFESSOR",
  enrolledCourses: [],
};

const courseResearcher: CourseLearningAccessUser = {
  id: "researcher-1",
  role: "RESEARCHER",
  enrolledCourses: [],
};

const adminUser: CourseLearningAccessUser = {
  id: "admin-1",
  role: "ADMIN",
  enrolledCourses: [],
};

assert.equal(canAccessCourseLearning(enrolledStudent, course), true);
assert.equal(canAccessCourseLearning(unenrolledStudent, course), false);
assert.equal(canAccessCourseLearning(courseOwner, course), true);
assert.equal(canAccessCourseLearning(foreignProfessor, course), false);
assert.equal(canAccessCourseLearning(courseResearcher, { ...course, createdById: "researcher-1" }), true);
assert.equal(canAccessCourseLearning(adminUser, course), true);

assert.deepEqual(evaluateCourseLearningAccess(enrolledStudent, course), { ok: true, course });
assert.deepEqual(evaluateCourseLearningAccess(unenrolledStudent, course), {
  ok: false,
  status: 403,
  error: COURSE_LEARNING_ACCESS_ERRORS.enrollmentRequired,
});
assert.deepEqual(evaluateCourseLearningAccess(foreignProfessor, course), {
  ok: false,
  status: 403,
  error: COURSE_LEARNING_ACCESS_ERRORS.accessDenied,
});
assert.deepEqual(evaluateCourseLearningAccess(enrolledStudent, null), {
  ok: false,
  status: 404,
  error: COURSE_LEARNING_ACCESS_ERRORS.notFound,
});
assert.deepEqual(evaluateCourseLearningAccess(enrolledStudent, undefined), {
  ok: false,
  status: 404,
  error: COURSE_LEARNING_ACCESS_ERRORS.notFound,
});

const allowed = await assertCourseLearningAccess(enrolledStudent, course.id, async (courseId) => {
  assert.equal(courseId, course.id);
  return course;
});
assert.deepEqual(allowed, { ok: true, course });

const denied = await assertCourseLearningAccess(unenrolledStudent, course.id, async () => course);
assert.deepEqual(denied, {
  ok: false,
  status: 403,
  error: COURSE_LEARNING_ACCESS_ERRORS.enrollmentRequired,
});

const missing = await assertCourseLearningAccess(enrolledStudent, 999, async () => null);
assert.deepEqual(missing, {
  ok: false,
  status: 404,
  error: COURSE_LEARNING_ACCESS_ERRORS.notFound,
});

console.log("Course access rules passed");
