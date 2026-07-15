import assert from "node:assert/strict";
import {
  buildCourseImageCustomId,
  CourseImageConfirmationError,
  isCourseImageCustomIdFor,
  resolveConfirmedCourseImage,
} from "../src/course-image-confirmation.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("course-image-confirmation", async () => {
  const courseId = 42;
  const userId = "professor-1";
  const customId = buildCourseImageCustomId(courseId, userId, "0123456789abcdef0123456789abcdef");

  assert.equal(isCourseImageCustomIdFor(customId, courseId, userId), true);
  assert.equal(isCourseImageCustomIdFor(customId, courseId + 1, userId), false);
  assert.equal(isCourseImageCustomIdFor(customId, courseId, "professor-2"), false);

  let requestedKeyType = "";
  const confirmed = await resolveConfirmedCourseImage(customId, courseId, userId, async (requestedId, options) => {
    assert.equal(requestedId, customId);
    requestedKeyType = options.keyType;
    return {
      data: [{ key: "course-image-key", url: "https://ufs.sh/f/course-image-key" }],
    };
  });
  assert.equal(requestedKeyType, "customId");
  assert.deepEqual(confirmed, {
    imageKey: "course-image-key",
    imageUrl: "https://ufs.sh/f/course-image-key",
  });

  await assert.rejects(
    () => resolveConfirmedCourseImage(customId, courseId, "another-user", async () => ({ data: [] })),
    (error: unknown) => error instanceof CourseImageConfirmationError && error.statusCode === 403,
  );
  await assert.rejects(
    () => resolveConfirmedCourseImage(customId, courseId, userId, async () => ({ data: [] })),
    (error: unknown) => error instanceof CourseImageConfirmationError && error.statusCode === 404,
  );
  await assert.rejects(
    () =>
      resolveConfirmedCourseImage(customId, courseId, userId, async () => ({
        data: [{ key: "course-image-key", url: "https://example.com/course-image-key" }],
      })),
    (error: unknown) => error instanceof CourseImageConfirmationError && error.statusCode === 400,
  );
});
