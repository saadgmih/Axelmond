import assert from "node:assert/strict";
import fs from "node:fs";
import { readApiRouteSources } from "./helpers/api-route-sources.ts";
import {
  isLessonModuleLink,
  isQuizModuleLink,
  lessonContentLinkKey,
  mapLessonTypeToModuleType,
  quizModuleLinkKey,
} from "../src/course-curriculum-sync.ts";
import { resolveCourseModules } from "../src/course-syllabus-modules.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-curriculum-sync", () => {
  const syncSource = fs.readFileSync("src/course-curriculum-sync.ts", "utf8");
  const catalogSource = fs.readFileSync("src/server/mappers/catalog-mappers.ts", "utf8");
  const coursesRoutesSource = fs.readFileSync("src/routes/courses-routes.ts", "utf8");
  const contentRoutesSource = fs.readFileSync("src/routes/content-routes.ts", "utf8");
  const uploadthingSource = fs.readFileSync("src/uploadthing.ts", "utf8");
  const studentSessionSource = fs.readFileSync("src/hooks/useStudentCourseSession.ts", "utf8");
  const serverSource = readApiRouteSources();

  assert.equal(lessonContentLinkKey("abc123"), "lesson:abc123");
  assert.equal(quizModuleLinkKey("quiz123"), "quiz:quiz123");
  assert.equal(isLessonModuleLink("lesson:abc123"), true);
  assert.equal(isQuizModuleLink("quiz:quiz123"), true);
  assert.equal(isLessonModuleLink("section-cuid"), false);
  assert.equal(mapLessonTypeToModuleType("VIDEO"), "video");
  assert.equal(mapLessonTypeToModuleType("TEXT"), "pdf");

  const modules = resolveCourseModules(
    {
      courseModules: [
        {
          courseId: 1,
          id: 101,
          sortOrder: 0,
          title: "Published",
          type: "video",
          duration: "10m",
          contentMarkdown: null,
          attachmentUrl: null,
          attachmentName: null,
          sectionId: lessonContentLinkKey("content-1"),
          published: true,
        },
        {
          courseId: 1,
          id: 102,
          sortOrder: 1,
          title: "Draft",
          type: "pdf",
          duration: "5m",
          contentMarkdown: null,
          attachmentUrl: null,
          attachmentName: null,
          sectionId: lessonContentLinkKey("content-2"),
          published: false,
        },
      ],
    },
    undefined,
    { studentView: true },
  );
  assert.equal(modules.length, 1);
  assert.equal(modules[0]?.title, "Published");

  assert.match(syncSource, /syncPublishedLessonModules/);
  assert.match(syncSource, /client\.quiz\.findMany/);
  assert.match(syncSource, /type:\s*"quiz"/);
  assert.match(syncSource, /client\.quiz\.update\(\{ where:\s*\{ id:\s*quiz\.id \}, data:\s*\{ moduleId:/);
  assert.match(catalogSource, /toCoursesForStudent/);
  assert.match(catalogSource, /attachSyncedCourseModules\(courses\)/);
  assert.doesNotMatch(catalogSource, /syncPublishedLessonModulesForCourses/);
  assert.match(coursesRoutesSource, /toCoursesForStudent/);
  assert.match(coursesRoutesSource, /syncPublishedLessonModules/);
  assert.match(contentRoutesSource, /refreshStudentCourseModules/);
  assert.match(uploadthingSource, /syncPublishedLessonModules/);
  assert.match(studentSessionSource, /api\.getCourse\(courseId\)/);
  assert.match(serverSource, /export \{[\s\S]*syncPublishedLessonModules/);

  console.log("Student curriculum sync rules passed");
});
