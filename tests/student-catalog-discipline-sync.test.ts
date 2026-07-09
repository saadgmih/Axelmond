import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  courseMatchesSelectedDiscipline,
  mergeCatalogCourseRows,
  resolveCatalogSourceCourses,
} from "../src/app/hooks/usePlatformCatalogData.ts";
import type { Course } from "../src/types.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

function makeCourse(id: number, overrides: Partial<Course> = {}): Course {
  return {
    id,
    title: `Module ${id}`,
    level: "Module académique",
    credits: 3,
    duration: "20 heures",
    category: "Programmation",
    disciplineId: 601,
    price: 0,
    iconName: "Code",
    color: "bg-blue-100",
    instructor: "Professeur",
    description: "Module publié",
    progress: 0,
    isLiveNow: false,
    modules: [],
    published: true,
    ...overrides,
  };
}

rulesTest("student-catalog-discipline-sync", () => {
  const catalogHookSource = readFileSync("src/app/hooks/usePlatformCatalogData.ts", "utf8");
  const studentCatalogSource = readFileSync("src/views/student/StudentCatalogView.tsx", "utf8");
  const routeSwitchSource = readFileSync("src/app/StudentRouteSwitch.tsx", "utf8");
  const apiSource = readFileSync("src/api.ts", "utf8");
  const coursesRoutesSource = readFileSync("src/routes/courses-routes.ts", "utf8");

  assert.match(catalogHookSource, /api\.getCourses\(\{ disciplineId,\s*fresh:\s*true \}\)/);
  assert.match(catalogHookSource, /disciplineCoursesById/);
  assert.match(catalogHookSource, /setDisciplineCoursesById/);
  assert.match(catalogHookSource, /mergeCatalogCourseRows/);
  assert.match(catalogHookSource, /courseMatchesSelectedDiscipline/);
  assert.match(catalogHookSource, /setSelectedDisciplineIdState\(disciplineId\)/);
  assert.match(catalogHookSource, /void loadCatalogDiscipline\(disciplineId\)/);
  assert.match(studentCatalogSource, /isDisciplineCoursesLoading/);
  assert.match(studentCatalogSource, /Chargement des modules/);
  assert.match(routeSwitchSource, /isDisciplineCoursesLoading=\{isDisciplineCoursesLoading\}/);
  assert.match(catalogHookSource, /resolveCatalogSourceCourses/);
  assert.match(catalogHookSource, /api\.getDomains\(\{ fresh: true \}\)/);
  assert.match(apiSource, /getDomains: \(options\?: \{ fresh\?: boolean \}\)/);
  assert.match(apiSource, /fresh\?: boolean/);
  assert.match(apiSource, /params\.set\("fresh", "1"\)/);
  assert.match(coursesRoutesSource, /const bypassCache = req\.query\.fresh === "1"/);
  assert.match(coursesRoutesSource, /if \(!bypassCache\)/);

  const existing = makeCourse(3, { title: "Ancien titre" });
  const loaded = makeCourse(3, { title: "Programmation en C++" });
  const newCourse = makeCourse(7, { title: "Algorithmique" });
  assert.deepEqual(
    mergeCatalogCourseRows([existing], [loaded, newCourse]).map((course) => [course.id, course.title]),
    [
      [3, "Programmation en C++"],
      [7, "Algorithmique"],
    ],
  );

  assert.equal(courseMatchesSelectedDiscipline(makeCourse(1), 601, "Programmation"), true);
  assert.equal(
    courseMatchesSelectedDiscipline(makeCourse(2, { disciplineId: 999, category: "Programmation" }), 601, "Programmation"),
    true,
  );
  assert.equal(
    courseMatchesSelectedDiscipline(makeCourse(4, { disciplineId: 999, category: "Bases de Données" }), 601, "Programmation"),
    false,
  );
  assert.equal(
    courseMatchesSelectedDiscipline(makeCourse(5, { disciplineId: "601" as unknown as number }), 601, "Programmation"),
    true,
  );

  const disciplineCourse = makeCourse(8, { title: "Programmation en C++" });
  const globalCourse = makeCourse(9, { disciplineId: 601, title: "Algorithmique" });
  assert.deepEqual(
    resolveCatalogSourceCourses(601, { 601: [disciplineCourse] }, [globalCourse], "Programmation").map((course) => course.id),
    [8, 9],
  );
  assert.deepEqual(
    resolveCatalogSourceCourses(601, { 601: [] }, [globalCourse], "Programmation").map((course) => course.id),
    [9],
  );
});
