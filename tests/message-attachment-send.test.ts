import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("message-attachment-send", () => {
  const messagesSource = fs.readFileSync("src/views/shared/MessagesView.tsx", "utf8");
  const uploadSource = fs.readFileSync("src/message-attachment-upload.ts", "utf8");
  const audioSource = fs.readFileSync("src/hooks/useMessageAudioRecorder.ts", "utf8");
  const audioPlayerSource = fs.readFileSync("src/components/messaging/MessageAudioPlayer.tsx", "utf8");
  const videoAttachmentSource = fs.readFileSync("src/components/messaging/MessageVideoAttachment.tsx", "utf8");

  assert.match(messagesSource, /storageKey: attachment\.storageKey/);
  assert.match(messagesSource, /uploadMessageAttachmentFile/);
  assert.match(messagesSource, /useMessageAudioRecorder/);
  assert.match(messagesSource, /audioRecorder\.toggleRecording/);
  assert.match(uploadSource, /storageKey/);
  assert.match(messagesSource, /MessageAudioPlayer/);
  assert.doesNotMatch(messagesSource, /<audio controls/);
  assert.match(messagesSource, /MessageVideoAttachment/);
  assert.doesNotMatch(messagesSource, /PremiumVideoPlayer/);
  assert.match(videoAttachmentSource, /showMetadata=\{false\}/);
  assert.match(videoAttachmentSource, /Vidéo/);
  assert.match(audioPlayerSource, /rounded-full/);
  assert.match(audioSource, /MediaRecorder/);
});
