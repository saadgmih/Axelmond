import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("student-academic-notifications", () => {
  const notificationsSource = fs.readFileSync("src/notifications.ts", "utf8");
  const academicNotificationsSource = fs.readFileSync("src/academic-notifications.ts", "utf8");
  const academicEventsSource = fs.readFileSync("src/utils/academic-notification-events.ts", "utf8");
  const coursesSource = fs.readFileSync("src/routes/courses-routes.ts", "utf8");
  const contentSource = fs.readFileSync("src/routes/content-routes.ts", "utf8");
  const quizSource = fs.readFileSync("src/routes/quiz-routes.ts", "utf8");
  const uploadSource = fs.readFileSync("src/uploadthing.ts", "utf8");
  const appSource = fs.readFileSync("src/app/usePlatformApp.ts", "utf8");
  const notificationViewSource = fs.readFileSync("src/views/shared/NotificationsView.tsx", "utf8");

  assert.match(notificationsSource, /export async function notifyAllStudents/);
  assert.match(notificationsSource, /where: \{ role: "STUDENT", emailVerified: true \}/);
  assert.match(notificationsSource, /active: true,[\s\S]*user: \{ role: "STUDENT", emailVerified: true \}/);
  assert.match(notificationsSource, /filter\(\(entry\) => isEnrollmentActive\(entry\)\)/);

  assert.match(coursesSource, /notifyPublishedCourse/);
  assert.match(coursesSource, /notifyCourseModuleCreated/);
  assert.match(coursesSource, /notifyLiveStarted/);
  assert.match(coursesSource, /notifyLiveFinished/);
  assert.match(academicNotificationsSource, /type: "NEW_COURSE"/);
  assert.match(academicNotificationsSource, /type: "NEW_MODULE"/);
  assert.match(academicNotificationsSource, /type: "LIVE_STARTED"/);
  assert.match(academicNotificationsSource, /type: "LIVE_FINISHED"/);

  assert.match(contentSource, /notifyPublishedChapter/);
  assert.match(contentSource, /notifyPublishedSection/);
  assert.match(contentSource, /notifyPublishedLessonContent/);
  assert.match(academicNotificationsSource, /type: "NEW_CHAPTER"/);
  assert.match(academicNotificationsSource, /type: "NEW_SECTION"/);
  assert.match(academicNotificationsSource, /type: "NEW_CONTENT"/);
  assert.match(academicNotificationsSource, /type: "LIVE_REPLAY_AVAILABLE"/);
  assert.match(contentSource, /content\.published && !existingContent\?\.published/);
  assert.match(contentSource, /section\.published && !existingSection\?\.published/);
  assert.match(contentSource, /published && !existingChapter\?\.published/);

  assert.match(quizSource, /type: "NEW_QUIZ"/);
  assert.match(uploadSource, /if \(content\.published\) \{[\s\S]*notifyPublishedLessonContent/);
  assert.match(uploadSource, /sourceEvent: "LESSON_ASSET_PUBLISHED"/);

  assert.match(appSource, /shouldRefreshCourseForNotification/);
  assert.match(academicEventsSource, /"NEW_COURSE"/);
  assert.match(academicEventsSource, /"NEW_CONTENT"/);
  assert.match(academicEventsSource, /"LIVE_REPLAY_AVAILABLE"/);
  assert.match(appSource, /prev\.some\(\(course\) => course\.id === courseId\)/);

  assert.match(notificationViewSource, /case "NEW_COURSE"/);
  assert.match(notificationViewSource, /case "NEW_CONTENT"/);
  assert.match(notificationViewSource, /case "LIVE_REPLAY_AVAILABLE"/);
});
