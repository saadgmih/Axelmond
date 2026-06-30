import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildLiveCameraCaptureOptions,
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
  const rearTelephoto = camera("rear-telephoto", "Back Telephoto Camera");
  const rearWide = camera("rear-wide", "Back Wide Camera");
  const devices = normalizeLiveCameraDevices([front, rear, front]);
  const lensDevices = normalizeLiveCameraDevices([rearTelephoto, front, rearWide]);

  assert.equal(DEFAULT_LIVE_CAMERA_FACING_MODE, "user");
  assert.deepEqual(devices, [front, rear]);
  assert.deepEqual(lensDevices, [front, rearWide, rearTelephoto]);
  assert.equal(nextLiveCameraDevice(devices, "front")?.deviceId, "rear");
  assert.equal(nextLiveCameraDevice(devices, "rear")?.deviceId, "front");
  assert.equal(nextLiveCameraDevice(lensDevices, "front")?.deviceId, "rear-wide");
  assert.equal(nextLiveCameraDevice([front], "front"), null);
  assert.deepEqual(buildLiveCameraCaptureOptions().resolution, {
    width: 1280,
    height: 720,
    aspectRatio: 16 / 9,
  });

  const liveKitSource = readLiveKitHookSources();
  const classroomSource = readLiveClassroomSources();
  const cameraSource = readFileSync("src/live/live-camera.ts", "utf8");
  const participantTileSource = readFileSync("src/components/live/LiveParticipantTile.tsx", "utf8");

  assert.match(liveKitSource, /Room\.getLocalDevices\("videoinput", false\)/);
  assert.match(liveKitSource, /buildLiveCameraCaptureOptions\([\s\S]*facingMode: DEFAULT_LIVE_CAMERA_FACING_MODE/);
  assert.match(liveKitSource, /restartLiveCameraTrack\(/);
  assert.match(liveKitSource, /cameraDevices\.length > 1/);
  assert.match(liveKitSource, /addEventListener\("devicechange"/);
  assert.match(classroomSource, /Changer de caméra avant ou arrière/);
  assert.match(classroomSource, /<SwitchCamera/);
  assert.match(cameraSource, /zoom: 1/);
  assert.match(cameraSource, /resizeMode: \{ ideal: "none" \}/);
  assert.match(cameraSource, /device\.kind !== "videoinput"/);
  assert.match(participantTileSource, /object-contain/);
});
