import assert from "node:assert/strict";
import fs from "node:fs";
import {
  bindUploadProgress,
  clampUploadProgress,
  formatUploadProgressLabel,
  formatUploadProgressPercent,
  normalizeUploadProgressDisplay,
  uploadProgressBarWidth,
} from "../src/upload-progress.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("upload-progress", () => {
  assert.equal(clampUploadProgress(-12), 0);
  assert.equal(clampUploadProgress(0), 0);
  assert.equal(clampUploadProgress(73.482918), 73.482918);
  assert.equal(clampUploadProgress(100), 100);
  assert.equal(clampUploadProgress(100.8367), 100);
  assert.equal(clampUploadProgress(Number.NaN), 0);
  assert.equal(clampUploadProgress(Number.POSITIVE_INFINITY), 0);

  assert.equal(normalizeUploadProgressDisplay(73.482918), 73.5);
  assert.equal(normalizeUploadProgressDisplay(100.8367), 100);

  assert.equal(formatUploadProgressPercent(0), "0");
  assert.equal(formatUploadProgressPercent(73), "73");
  assert.equal(formatUploadProgressPercent(73.482918), "73.5");
  assert.equal(formatUploadProgressPercent(100.8367), "100");
  assert.equal(formatUploadProgressPercent(50.04), "50");
  assert.equal(formatUploadProgressPercent(50.06), "50.1");

  assert.equal(formatUploadProgressLabel(73.5), "73.5%");
  assert.equal(formatUploadProgressLabel(100.8367), "100%");

  assert.equal(uploadProgressBarWidth(100.8367), "100%");
  assert.equal(uploadProgressBarWidth(-5), "0%");

  let received = -1;
  const handler = bindUploadProgress((progress) => {
    received = progress;
  });
  handler({ progress: 100.8367 });
  assert.equal(received, 100);
  handler({ progress: -3 });
  assert.equal(received, 0);

  const avatarSource = fs.readFileSync("src/app/hooks/usePlatformAvatarActions.ts", "utf8");
  const curriculumSource = fs.readFileSync("src/hooks/useTeacherCurriculum.tsx", "utf8");
  const supportSource = fs.readFileSync("src/components/SupportTicketForm.tsx", "utf8");
  const messagesSource = fs.readFileSync("src/views/shared/MessagesView.tsx", "utf8");
  const messageUploadSource = fs.readFileSync("src/message-attachment-upload.ts", "utf8");

  for (const source of [avatarSource, curriculumSource, supportSource]) {
    assert.match(source, /bindUploadProgress/);
    assert.match(source, /formatUploadProgressLabel/);
    assert.doesNotMatch(source, /\$\{progress\}%/);
  }

  assert.match(messageUploadSource, /bindUploadProgress/);
  assert.match(messagesSource, /formatUploadProgressLabel/);
  assert.doesNotMatch(messageUploadSource + messagesSource, /\$\{progress\}%/);

  console.log("Upload progress utility tests passed");
});
