import assert from "node:assert/strict";
import {
  buildLessonAssetCustomId,
  isLessonAssetCustomIdFor,
  lessonAssetContentId,
  LessonAssetConfirmationError,
  resolveConfirmedLessonAsset,
  type LessonAssetIntent,
} from "../src/lesson-asset-confirmation.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("lesson-asset-confirmation", async () => {
  const userId = "professor-1";
  const intent: LessonAssetIntent = {
    courseId: 42,
    sectionId: "section-1",
    title: "Cours de probabilités",
    contentType: "PDF",
    published: true,
    fileName: "cours.pdf",
    mimeType: "application/pdf",
    size: 4096,
  };
  const customId = buildLessonAssetCustomId(intent, userId, "0123456789abcdef0123456789abcdef");

  assert.equal(isLessonAssetCustomIdFor(customId, intent, userId), true);
  assert.equal(isLessonAssetCustomIdFor(customId, { ...intent, sectionId: "section-2" }, userId), false);
  assert.equal(isLessonAssetCustomIdFor(customId, { ...intent, title: "Titre modifié" }, userId), false);
  assert.equal(isLessonAssetCustomIdFor(customId, { ...intent, published: false }, userId), false);
  assert.equal(isLessonAssetCustomIdFor(customId, intent, "professor-2"), false);
  assert.equal(lessonAssetContentId(customId), lessonAssetContentId(customId));

  let requestedKeyType = "";
  const confirmed = await resolveConfirmedLessonAsset(customId, intent, userId, async (requestedId, options) => {
    assert.equal(requestedId, customId);
    requestedKeyType = options.keyType;
    return { data: [{ key: "lesson-key", url: "https://ufs.sh/f/lesson-key" }] };
  });
  assert.equal(requestedKeyType, "customId");
  assert.deepEqual(confirmed, { fileKey: "lesson-key", url: "https://ufs.sh/f/lesson-key" });

  await assert.rejects(
    () =>
      resolveConfirmedLessonAsset(customId, { ...intent, contentType: "IMAGE" }, userId, async () => ({ data: [] })),
    (error: unknown) => error instanceof LessonAssetConfirmationError && error.statusCode === 403,
  );
  await assert.rejects(
    () => resolveConfirmedLessonAsset(customId, intent, userId, async () => ({ data: [] })),
    (error: unknown) => error instanceof LessonAssetConfirmationError && error.statusCode === 404,
  );
  await assert.rejects(
    () =>
      resolveConfirmedLessonAsset(customId, intent, userId, async () => ({
        data: [{ key: "lesson-key", url: "https://example.com/lesson-key" }],
      })),
    (error: unknown) => error instanceof LessonAssetConfirmationError && error.statusCode === 400,
  );
});
