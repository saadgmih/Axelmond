import { seedStudentCourseRuntimeFixtures } from "./helpers/security-runtime-fixtures.ts";

if (!process.env.DATABASE_URL?.trim()) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const fixture = await seedStudentCourseRuntimeFixtures();
console.log("Mobile v1 fixtures seeded");
console.log(
  JSON.stringify(
    {
      studentEmail: fixture.users.enrolledStudent.email,
      teacherEmail: fixture.users.ownerProfessor.email,
      courseId: fixture.courseId,
    },
    null,
    2,
  ),
);
