import { useCallback, useMemo } from "react";
import { Linking, Platform } from "react-native";
import { useCameraPermissions, useMicrophonePermissions } from "expo-camera";

export type LivePermissionState = "undetermined" | "granted" | "denied" | "blocked";

function mapPermission(status: { granted: boolean; canAskAgain: boolean } | null): LivePermissionState {
  if (!status) return "undetermined";
  if (status.granted) return "granted";
  if (status.canAskAgain) return "denied";
  return "blocked";
}

export function useLivePermissions() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  const camera = useMemo(() => mapPermission(cameraPermission), [cameraPermission]);
  const microphone = useMemo(() => mapPermission(microphonePermission), [microphonePermission]);

  const allGranted = camera === "granted" && microphone === "granted";
  const blocked = camera === "blocked" || microphone === "blocked";

  const ensurePermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return true;

    let cam = cameraPermission;
    if (!cam?.granted) {
      cam = await requestCameraPermission();
    }

    let mic = microphonePermission;
    if (!mic?.granted) {
      mic = await requestMicrophonePermission();
    }

    return Boolean(cam?.granted && mic?.granted);
  }, [cameraPermission, microphonePermission, requestCameraPermission, requestMicrophonePermission]);

  const openSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  return useMemo(
    () => ({
      camera,
      microphone,
      allGranted,
      blocked,
      ensurePermissions,
      openSettings,
    }),
    [allGranted, blocked, camera, ensurePermissions, microphone, openSettings],
  );
}
