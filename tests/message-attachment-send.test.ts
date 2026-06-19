import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("message-attachment-send", () => {
  const messagesSource = fs.readFileSync("src/views/shared/MessagesView.tsx", "utf8");
  const uploadSource = fs.readFileSync("src/message-attachment-upload.ts", "utf8");
  const audioSource = fs.readFileSync("src/hooks/useMessageAudioRecorder.ts", "utf8");

  assert.match(messagesSource, /storageKey: attachment\.storageKey/);
  assert.match(messagesSource, /uploadMessageAttachmentFile/);
  assert.match(messagesSource, /useMessageAudioRecorder/);
  assert.match(messagesSource, /audioRecorder\.toggleRecording/);
  assert.match(uploadSource, /storageKey/);
  assert.match(audioSource, /MediaRecorder/);
});
