import { useEffect, useState } from "react";

/** Docked sidebar (PC / TV / tablette paysage large). Drawer below this width. */
export const SIDEBAR_DOCK_MIN_WIDTH = 1024;

export type SidebarLayoutMode = "drawer" | "docked";

export interface SidebarLayoutState {
  mode: SidebarLayoutMode;
  /** Sidebar fixe visible (TV / grand écran sans souris précise). */
  isDocked: boolean;
  /** Sidebar en tiroir, masquée jusqu'à ouverture. */
  isDrawer: boolean;
  /** Grand écran (≥1024px) — layout topbar console complet. */
  isWideViewport: boolean;
  /** Large screen without precise pointer (TV, console browser). */
  isTvLike: boolean;
  /** Touch-first pointer (phone, tablet tactile). */
  isCoarsePointer: boolean;
}

function readSidebarLayoutState(): SidebarLayoutState {
  if (typeof window === "undefined") {
    return {
      mode: "drawer",
      isDocked: false,
      isDrawer: true,
      isWideViewport: false,
      isTvLike: false,
      isCoarsePointer: false,
    };
  }

  const isWideViewport = window.matchMedia(`(min-width: ${SIDEBAR_DOCK_MIN_WIDTH}px)`).matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  const tvLike = window.matchMedia(`(min-width: 1280px)`).matches && (coarse || noHover);

  const isDocked = tvLike;
  const isDrawer = !isDocked;
  const mode: SidebarLayoutMode = isDocked ? "docked" : "drawer";

  return {
    mode,
    isDocked,
    isDrawer,
    isWideViewport,
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
