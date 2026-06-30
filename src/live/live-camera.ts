import { Track, type Room, type VideoCaptureOptions, type VideoResolution } from "livekit-client";

export const DEFAULT_LIVE_CAMERA_FACING_MODE = "user" as const;
export const LIVE_CAMERA_DEFAULT_RESOLUTION: VideoResolution = {
  width: 1280,
  height: 720,
  aspectRatio: 16 / 9,
};

type LiveCameraFacingMode = typeof DEFAULT_LIVE_CAMERA_FACING_MODE | "environment";
export type LiveCameraCaptureOptions = VideoCaptureOptions & {
  resizeMode?: ConstrainDOMString;
  advanced?: Array<Record<string, unknown>>;
};

export type LiveCameraDevice = Pick<MediaDeviceInfo, "deviceId" | "groupId" | "kind" | "label">;

function liveCameraFacingScore(device: LiveCameraDevice): number {
  const label = device.label.trim();
  if (/front|user|facetime|avant/i.test(label)) return 0;
  if (/back|rear|environment|arrière|arriere/i.test(label)) return 1;
  return 2;
}

function liveCameraLensScore(device: LiveCameraDevice): number {
  const label = device.label.trim();
  if (/tele|télé|telephoto|téléobjectif|zoom/i.test(label)) return 30;
  if (/macro/i.test(label)) return 25;
  if (/ultra|wide|grand.?angle|large/i.test(label)) return 5;
  return 0;
}

function sortLiveCameraDevices(devices: readonly LiveCameraDevice[]): LiveCameraDevice[] {
  return [...devices].sort((a, b) => {
    const facingDelta = liveCameraFacingScore(a) - liveCameraFacingScore(b);
    if (facingDelta !== 0) return facingDelta;
    const lensDelta = liveCameraLensScore(a) - liveCameraLensScore(b);
    if (lensDelta !== 0) return lensDelta;
    return a.label.localeCompare(b.label);
  });
}

export function normalizeLiveCameraDevices(devices: readonly LiveCameraDevice[]): LiveCameraDevice[] {
  const uniqueDevices = new Map<string, LiveCameraDevice>();

  devices.forEach((device) => {
    if (device.kind !== "videoinput" || !device.deviceId || uniqueDevices.has(device.deviceId)) return;
    uniqueDevices.set(device.deviceId, device);
  });

  return sortLiveCameraDevices(Array.from(uniqueDevices.values()));
}

export function nextLiveCameraDevice(
  devices: readonly LiveCameraDevice[],
  activeDeviceId?: string | null,
): LiveCameraDevice | null {
  if (devices.length < 2) return null;
  const sortedDevices = sortLiveCameraDevices(devices);
  const activeDevice = sortedDevices.find((device) => device.deviceId === activeDeviceId);
  const activeFacingScore = activeDevice ? liveCameraFacingScore(activeDevice) : 2;
  const targetFacingScore = activeFacingScore === 0 ? 1 : 0;
  const preferredOppositeCamera = sortedDevices.find((device) => liveCameraFacingScore(device) === targetFacingScore);
  if (preferredOppositeCamera) return preferredOppositeCamera;

  const activeIndex = sortedDevices.findIndex((device) => device.deviceId === activeDeviceId);
  return sortedDevices[(activeIndex + 1) % sortedDevices.length] || null;
}

export function liveCameraDeviceLabel(device: LiveCameraDevice, index: number): string {
  const label = device.label.trim();
  if (/front|user|facetime|avant/i.test(label)) return "Caméra avant";
  if (/back|rear|environment|arrière|arriere/i.test(label)) return "Caméra arrière";
  return label || `Caméra ${index + 1}`;
}

export function buildLiveCameraCaptureOptions({
  deviceId,
  facingMode = DEFAULT_LIVE_CAMERA_FACING_MODE,
  resolution = LIVE_CAMERA_DEFAULT_RESOLUTION,
}: {
  deviceId?: ConstrainDOMString;
  facingMode?: LiveCameraFacingMode;
  resolution?: VideoResolution;
} = {}): LiveCameraCaptureOptions {
  const captureOptions: LiveCameraCaptureOptions = {
    resolution: {
      width: resolution.width,
      height: resolution.height,
      aspectRatio: resolution.aspectRatio ?? resolution.width / resolution.height,
    },
    frameRate: { ideal: resolution.frameRate ?? 30, max: 30 },
    resizeMode: { ideal: "none" },
    advanced: [
      {
        zoom: 1,
        focusMode: "continuous",
        exposureMode: "continuous",
        whiteBalanceMode: "continuous",
      },
    ],
  };

  if (deviceId) {
    captureOptions.deviceId = deviceId;
  } else {
    captureOptions.facingMode = facingMode;
  }

  return captureOptions;
}

type LiveCameraCapabilities = MediaTrackCapabilities & {
  zoom?: { min?: number; max?: number };
  focusMode?: string[];
  exposureMode?: string[];
  whiteBalanceMode?: string[];
};

export async function stabilizeLiveCameraMediaTrack(mediaStreamTrack?: MediaStreamTrack | null): Promise<void> {
  if (!mediaStreamTrack?.applyConstraints || !mediaStreamTrack.getCapabilities) return;

  try {
    const capabilities = mediaStreamTrack.getCapabilities() as LiveCameraCapabilities;
    const advanced: Record<string, unknown> = {};

    if (capabilities.zoom) {
      const minZoom = capabilities.zoom.min ?? 1;
      const maxZoom = capabilities.zoom.max ?? minZoom;
      advanced.zoom = Math.min(Math.max(1, minZoom), maxZoom);
    }

    if (capabilities.focusMode?.includes("continuous")) {
      advanced.focusMode = "continuous";
    }
    if (capabilities.exposureMode?.includes("continuous")) {
      advanced.exposureMode = "continuous";
    }
    if (capabilities.whiteBalanceMode?.includes("continuous")) {
      advanced.whiteBalanceMode = "continuous";
    }

    if (Object.keys(advanced).length === 0) return;
    await mediaStreamTrack.applyConstraints({ advanced: [advanced] } as MediaTrackConstraints);
  } catch (err) {
    console.warn("[livekit] Camera stabilization constraints ignored", err);
  }
}

export function getLiveCameraMediaStreamTrack(room: Room | null): MediaStreamTrack | null {
  return room?.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack?.mediaStreamTrack ?? null;
}

export async function restartLiveCameraTrack(room: Room, options: LiveCameraCaptureOptions): Promise<void> {
  const videoTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
  if (videoTrack?.restartTrack) {
    await videoTrack.restartTrack(options);
  } else {
    await room.localParticipant.setCameraEnabled(true, options);
  }
  await stabilizeLiveCameraMediaTrack(getLiveCameraMediaStreamTrack(room));
}
