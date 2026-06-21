export const DEFAULT_LIVE_CAMERA_FACING_MODE = "user" as const;

export type LiveCameraDevice = Pick<MediaDeviceInfo, "deviceId" | "groupId" | "kind" | "label">;

export function normalizeLiveCameraDevices(devices: readonly LiveCameraDevice[]): LiveCameraDevice[] {
  const uniqueDevices = new Map<string, LiveCameraDevice>();

  devices.forEach((device) => {
    if (device.kind !== "videoinput" || !device.deviceId || uniqueDevices.has(device.deviceId)) return;
    uniqueDevices.set(device.deviceId, device);
  });

  return Array.from(uniqueDevices.values());
}

export function nextLiveCameraDevice(
  devices: readonly LiveCameraDevice[],
  activeDeviceId?: string | null,
): LiveCameraDevice | null {
  if (devices.length < 2) return null;
  const activeIndex = devices.findIndex((device) => device.deviceId === activeDeviceId);
  return devices[(activeIndex + 1) % devices.length] || null;
}

export function liveCameraDeviceLabel(device: LiveCameraDevice, index: number): string {
  const label = device.label.trim();
  if (/front|user|facetime|avant/i.test(label)) return "Caméra avant";
  if (/back|rear|environment|arrière|arriere/i.test(label)) return "Caméra arrière";
  return label || `Caméra ${index + 1}`;
}
