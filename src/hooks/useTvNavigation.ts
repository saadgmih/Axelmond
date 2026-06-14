import { useEffect, type RefObject } from "react";
import { clickFocusedTvItem, focusNextInZone, isEditableTarget } from "../utils/keyboardNavigation";

type Direction = "up" | "down" | "left" | "right";

export function useTvNavigation(zoneRef: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const zone = zoneRef.current;
    if (!enabled || !zone) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const directionMap: Record<string, Direction | undefined> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      const direction = directionMap[event.key];
      if (direction) {
        event.preventDefault();
        focusNextInZone(zone, direction, document.activeElement as HTMLElement | null);
        return;
      }

      if (event.key === "Enter") {
        const active = document.activeElement as HTMLElement | null;
        if (active && zone.contains(active) && active.matches("[data-tv-focusable]")) {
          event.preventDefault();
          clickFocusedTvItem(active);
        }
      }
    };

    zone.addEventListener("keydown", onKeyDown);
    return () => zone.removeEventListener("keydown", onKeyDown);
  }, [enabled, zoneRef]);
}
