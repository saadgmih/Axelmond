import { useEffect, useState } from "react";
import { isNativeApp } from "../utils/platform-app";

/**
 * Hook to reactively determine if the interface is being displayed inside
 * the mobile application (APK, Play Store, App Store).
 */
export function useIsNativeApp(): boolean {
  const [isApp, setIsApp] = useState(isNativeApp);

  useEffect(() => {
    setIsApp(isNativeApp());
  }, []);

  return isApp;
}
