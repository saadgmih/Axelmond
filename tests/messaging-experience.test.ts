import assert from "node:assert/strict";
import fs from "node:fs";
import { rulesTest } from "./helpers/rulesTest.ts";

rulesTest("messaging-experience", () => {
  const messagesSource = fs.readFileSync("src/views/shared/MessagesView.tsx", "utf8");
  const virtualListSource = fs.readFileSync("src/components/VirtualList.tsx", "utf8");
  const socketSource = fs.readFileSync("src/hooks/useMessagingSocket.ts", "utf8");
  const recorderSource = fs.readFileSync("src/hooks/useMessageAudioRecorder.ts", "utf8");
  const audioPlayerSource = fs.readFileSync("src/components/messaging/MessageAudioPlayer.tsx", "utf8");

  assert.match(messagesSource, /data-testid="messaging-shell"/);
  assert.match(messagesSource, /stickToEnd/);
  assert.match(messagesSource, /max-w-4xl/);
  assert.match(messagesSource, /maxLength=\{4000\}/);
  assert.match(messagesSource, /messageRequestRef/);
  assert.match(messagesSource, /sendingRef/);
  assert.match(messagesSource, /audioRecorder\.cancelRecording/);
  assert.match(messagesSource, /formatMessageDay/);

  assert.match(virtualListSource, /stickToEnd/);
  assert.match(virtualListSource, /ref=\{scrollRef\}[\s\S]*?onScroll=\{onScroll\}/);
  assert.match(virtualListSource, /justifyContent:\s*"flex-end"/);

  assert.match(socketSource, /activeConversationRef/);
  assert.match(socketSource, /socket\.on\("connect"/);
  assert.match(socketSource, /socketRef\.current\?\.connected/);

  assert.match(recorderSource, /cancelRecording/);
  assert.match(recorderSource, /recordingSeconds/);
  assert.match(audioPlayerSource, /aria-label="Position du message vocal"/);
  assert.doesNotMatch(audioPlayerSource, /if \(!audio\.paused\) \{[\s\S]*?audio\.currentTime\s*=\s*0[\s\S]*?return;/);
});
