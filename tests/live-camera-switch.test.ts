import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  DEFAULT_LIVE_CAMERA_FACING_MODE,
  nextLiveCameraDevice,
  normalizeLiveCameraDevices,
  type LiveCameraDevice,
} from "../src/live/live-camera.ts";
import { readLiveClassroomSources, readLiveKitHookSources } from "./helpers/live-classroom-sources.ts";
import { rulesTest } from "./helpers/rulesTest.ts";

const camera = (deviceId: string, label: string): LiveCameraDevice => ({
  deviceId,
  groupId: "group",
  kind: "videoinput",
  label,
});

rulesTest("live-camera-switch", () => {
  const front = camera("front", "Front Camera");
  const rear = camera("rear", "Back Camera");
  const devices = normalizeLiveCameraDevices([front, rear, front]);

  assert.equal(DEFAULT_LIVE_CAMERA_FACING_MODE, "user");
  assert.deepEqual(devices, [front, rear]);
  assert.equal(nextLiveCameraDevice(devices, "front")?.deviceId, "rear");
  assert.equal(nextLiveCameraDevice(devices, "rear")?.deviceId, "front");
  assert.equal(nextLiveCameraDevice([front], "front"), null);

  const liveKitSource = readLiveKitHookSources();
  const classroomSource = readLiveClassroomSources();
  const cameraSource = readFileSync("src/live/live-camera.ts", "utf8");

  assert.match(liveKitSource, /Room\.getLocalDevices\("videoinput", false\)/);
  assert.match(liveKitSource, /setCameraEnabled\([\s\S]*facingMode: DEFAULT_LIVE_CAMERA_FACING_MODE/);
  assert.match(liveKitSource, /switchActiveDevice\("videoinput", nextDevice\.deviceId\)/);
  assert.match(liveKitSource, /cameraDevices\.length > 1/);
  assert.match(liveKitSource, /addEventListener\("devicechange"/);
  assert.match(classroomSource, /Changer de caméra avant ou arrière/);
  assert.match(classroomSource, /<SwitchCamera/);
  assert.match(cameraSource, /device\.kind !== "videoinput"/);
});
