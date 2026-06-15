import { usePlatformBindings, usePlatformCatalog, usePlatformLive, usePlatformNavigation, usePlatformSession, usePlatformUi } from "./platform-app-slices";

/** @deprecated Prefer domain hooks: usePlatformSession, usePlatformCatalog, etc. */
export function usePlatformAppContext() {
  return {
    ...usePlatformSession(),
    ...usePlatformCatalog(),
    ...usePlatformNavigation(),
    ...usePlatformLive(),
    ...usePlatformBindings(),
    ...usePlatformUi(),
  };
}

export { PlatformAppSlicesProvider as PlatformAppProvider } from "./platform-app-slices";
