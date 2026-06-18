import { useEffect, useState } from "react";

/** Docked sidebar (PC / TV / tablette paysage large). Drawer below this width. */
export const SIDEBAR_DOCK_MIN_WIDTH = 1024;

export type SidebarLayoutMode = "drawer" | "docked";

export interface SidebarLayoutState {
  mode: SidebarLayoutMode;
  isDocked: boolean;
  isDrawer: boolean;
  /** Large screen without precise pointer (TV, console browser). */
  isTvLike: boolean;
  /** Touch-first pointer (phone, tablet tactile). */
  isCoarsePointer: boolean;
}

function readSidebarLayoutState(): SidebarLayoutState {
  if (typeof window === "undefined") {
    return { mode: "docked", isDocked: true, isDrawer: false, isTvLike: false, isCoarsePointer: false };
  }

  const docked = window.matchMedia(`(min-width: ${SIDEBAR_DOCK_MIN_WIDTH}px)`).matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  const tvLike =
    window.matchMedia(`(min-width: 1280px)`).matches && (coarse || noHover);

  const mode: SidebarLayoutMode = docked ? "docked" : "drawer";

  return {
    mode,
    isDocked: mode === "docked",
    isDrawer: mode === "drawer",
    isTvLike: tvLike,
    isCoarsePointer: coarse,
  };
}

export function useSidebarLayout(): SidebarLayoutState {
  const [state, setState] = useState(readSidebarLayoutState);

  useEffect(() => {
    const queries = [
      window.matchMedia(`(min-width: ${SIDEBAR_DOCK_MIN_WIDTH}px)`),
      window.matchMedia("(min-width: 1280px)"),
      window.matchMedia("(pointer: coarse)"),
      window.matchMedia("(hover: none)"),
    ];

    const update = () => setState(readSidebarLayoutState());
    for (const query of queries) {
      query.addEventListener("change", update);
    }
    update();

    return () => {
      for (const query of queries) {
        query.removeEventListener("change", update);
      }
    };
  }, []);

  return state;
}
