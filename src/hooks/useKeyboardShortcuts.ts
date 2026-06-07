import { useEffect } from "react";
import { isEditableTarget, matchShortcut, type ShortcutSpec } from "../utils/keyboardNavigation";

export function useKeyboardShortcuts(
  shortcuts: ShortcutSpec[],
  enabled = true,
  deps: unknown[] = [],
) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      for (const spec of shortcuts) {
        if (spec.when && !spec.when()) continue;
        if (!spec.allowInInput && isEditableTarget(event.target)) continue;
        if (!matchShortcut(event, spec)) continue;
        if (spec.preventDefault !== false) event.preventDefault();
        spec.handler(event);
        break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, ...deps]);
}
