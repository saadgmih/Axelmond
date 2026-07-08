import assert from "node:assert/strict";
import {
  buildEnrollmentEndDate,
  getActiveEnrolledCourseIds,
  getEnrollmentRemainingMs,
  isEnrollmentActive,
  isEnrollmentEndingSoon,
  isEnrollmentExpired,
} from "../src/enrollment-access.ts";
import {
  findMissingEnrolledCourseIds,
  hydrateEnrolledCourses,
  mergeCoursesById,
} from "../src/app/hooks/useEnrolledCoursesHydration.ts";
import type { Course } from "../src/types.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("enrollment-access", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  assert.equal(isEnrollmentActive({ active: true, startDate: "2026-06-01T12:00:00.000Z", endDate: null }, now), true);
  assert.equal(isEnrollmentActive({ active: true, startDate: "2026-05-01T12:00:00.000Z", endDate: null }, now), false);
  assert.equal(isEnrollmentActive({ active: true, endDate: undefined }, now), false);
  assert.equal(isEnrollmentActive({ active: true, endDate: "2026-07-01T00:00:00.000Z" }, now), true);
  assert.equal(isEnrollmentActive({ active: true, endDate: "2026-05-01T00:00:00.000Z" }, now), false);
  assert.equal(isEnrollmentActive({ active: false, endDate: null }, now), false);
  assert.equal(
    isEnrollmentActive({ active: true, startDate: "2026-06-01T12:00:00.000Z", endDate: "not-a-date" }, now),
    true,
  );
  assert.equal(isEnrollmentExpired({ active: true, startDate: "2026-06-01T12:00:00.000Z", endDate: null }, now), false);
  assert.equal(isEnrollmentExpired({ active: false, endDate: null }, now), true);
  assert.equal(
    getEnrollmentRemainingMs({ active: true, startDate: "2026-06-01T12:00:00.000Z", endDate: null }, now),
    1_382_400_000,
  );
  assert.equal(getEnrollmentRemainingMs({ active: true, endDate: "2026-06-16T12:00:00.000Z" }, now), 86_400_000);
  assert.equal(isEnrollmentEndingSoon({ active: true, endDate: "2026-06-17T12:00:00.000Z" }, 259_200_000, now), true);
  assert.equal(
    isEnrollmentEndingSoon(
      { active: true, startDate: "2026-05-18T12:00:00.000Z", endDate: null },
      259_200_000,
      now,
    ),
    true,
  );

  assert.deepEqual(
    getActiveEnrolledCourseIds(
      [
        { courseId: 2, active: true, startDate: "2026-06-01T12:00:00.000Z", endDate: null },
        { courseId: 3, active: true, endDate: "2026-05-01T00:00:00.000Z" },
        { courseId: 4, active: true, endDate: "2026-08-01T00:00:00.000Z" },
        { courseId: 5, active: false, endDate: null },
      ],
      now,
    ),
    [2, 4],
  );

  const endDate = buildEnrollmentEndDate(now);
  assert.equal(endDate.getTime() - now.getTime(), 30 * 24 * 60 * 60 * 1000);

  console.log("Enrollment access rules passed");
});

rulesTest("enrolled-courses-hydration", () => {
  const sampleCourse = { id: 2, title: "C++" } as Course;

  assert.deepEqual(findMissingEnrolledCourseIds([2], []), [2]);
  assert.deepEqual(findMissingEnrolledCourseIds([2], [sampleCourse]), []);
  assert.deepEqual(findMissingEnrolledCourseIds([2, 3], [sampleCourse]), [3]);

  const merged = mergeCoursesById(
    [{ id: 1, title: "A" } as Course, sampleCourse],
    [{ id: 2, title: "C++ updated" } as Course, { id: 3, title: "B" } as Course],
  );
  assert.deepEqual(
    merged.map((course) => [course.id, course.title]),
    [
      [1, "A"],
      [2, "C++ updated"],
      [3, "B"],
    ],
  );

  void hydrateEnrolledCourses([]).then(({ courses, failedIds }) => {
    assert.deepEqual(courses, []);
    assert.deepEqual(failedIds, []);
  });

  console.log("Enrolled courses hydration rules passed");
});
