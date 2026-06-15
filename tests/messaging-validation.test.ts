import assert from "node:assert/strict";
import {
  MESSAGE_ATTACHMENT_LIMITS,
  MESSAGE_BODY_MAX,
  MESSAGE_SEARCH_MIN,
  validateMessageAttachmentInput,
} from "../src/messaging.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("messaging-validation", () => {
  assert.equal(MESSAGE_BODY_MAX, 4000);
  assert.equal(MESSAGE_SEARCH_MIN, 2);

  assert.equal(
    validateMessageAttachmentInput({
      kind: "IMAGE",
      fileName: "photo.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
      url: "https://uploadthing.com/f/abc",
      storageKey: "abc-key",
    }),
    null,
  );

  assert.match(
    validateMessageAttachmentInput({
      kind: "IMAGE",
      fileName: "photo.gif",
      mimeType: "image/gif",
      sizeBytes: 1024,
      url: "https://uploadthing.com/f/abc",
      storageKey: "gif-key",
    }) || "",
    /non autoris/i,
  );

  assert.match(
    validateMessageAttachmentInput({
      kind: "VIDEO",
      fileName: "clip.mp4",
      mimeType: "video/mp4",
      sizeBytes: MESSAGE_ATTACHMENT_LIMITS.VIDEO + 1,
      url: "https://uploadthing.com/f/abc",
      storageKey: "video-key",
    }) || "",
    /Taille/i,
  );

  assert.equal(
    validateMessageAttachmentInput({
      kind: "DOCUMENT",
      fileName: "notes.pdf",
      mimeType: "application/pdf",
      sizeBytes: 5000,
      url: "https://uploadthing.com/f/abc",
      storageKey: "doc-key",
    }),
    null,
  );

  assert.match(
    validateMessageAttachmentInput({
      kind: "IMAGE",
      fileName: "photo.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
      url: "https://uploadthing.com/f/abc",
    }) || "",
    /stockage/i,
  );

  assert.match(
    validateMessageAttachmentInput({
      kind: "IMAGE",
      fileName: "tracker.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
      url: "https://evil.example/tracker.jpg",
      storageKey: "evil-key",
    }) || "",
    /URL/i,
  );

  assert.match(
    validateMessageAttachmentInput({
      kind: "IMAGE",
      fileName: "photo.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
      url: "http://uploadthing.com/f/abc",
      storageKey: "http-key",
    }) || "",
    /URL/i,
  );

  console.log("Messaging validation tests passed");
});
