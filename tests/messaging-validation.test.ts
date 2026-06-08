import assert from "node:assert/strict";
import {
  MESSAGE_ATTACHMENT_LIMITS,
  MESSAGE_BODY_MAX,
  MESSAGE_SEARCH_MIN,
  validateMessageAttachmentInput,
} from "../src/messaging.ts";

assert.equal(MESSAGE_BODY_MAX, 4000);
assert.equal(MESSAGE_SEARCH_MIN, 2);

assert.equal(
  validateMessageAttachmentInput({
    kind: "IMAGE",
    fileName: "photo.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    url: "https://uploadthing.com/f/abc",
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
  }),
  null,
);

console.log("Messaging validation tests passed");
