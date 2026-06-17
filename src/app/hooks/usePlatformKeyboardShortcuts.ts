import type { Dispatch, RefObject, SetStateAction } from "react";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import type { Course } from "../../types";

export function usePlatformKeyboardShortcuts({
  showKeyboardHelp,
  setShowKeyboardHelp,
  courseToPurchase,
  setCourseToPurchase,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  currentView,
  role,
  isStudentLive,
  isTeacherLiveRoom,
  catalogSearchRef,
  currentUserId,
}: {
  showKeyboardHelp: boolean;
  setShowKeyboardHelp: Dispatch<SetStateAction<boolean>>;
  courseToPurchase: Course | null;
  setCourseToPurchase: Dispatch<SetStateAction<Course | null>>;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  currentView: string;
  role: string;
  isStudentLive: boolean;
  isTeacherLiveRoom: boolean;
  catalogSearchRef: RefObject<HTMLInputElement | null>;
  currentUserId?: string;
}) {
  useKeyboardShortcuts(
    [
      {
        key: "Escape",
        handler: () => {
          if (showKeyboardHelp) {
            setShowKeyboardHelp(false);
            return;
          }
          if (courseToPurchase) {
            setCourseToPurchase(null);
            return;
          }
          if (isMobileMenuOpen) {
            setIsMobileMenuOpen(false);
            return;
          }
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => undefined);
          }
        },
      },
      {
        key: "/",
        when: () => role === "student" && currentView === "catalog" && !isStudentLive,
        handler: () => {
          catalogSearchRef.current?.focus();
        },
      },
      {
        key: "?",
        when: () => !isStudentLive && !isTeacherLiveRoom,
        handler: () => setShowKeyboardHelp(true),
      },
      {
        key: "/",
        shift: true,
        when: () => !isStudentLive && !isTeacherLiveRoom,
        handler: () => setShowKeyboardHelp(true),
      },
    ],
    Boolean(currentUserId),
    [
      showKeyboardHelp,
      courseToPurchase,
      isMobileMenuOpen,
      currentView,
      role,
      isStudentLive,
      isTeacherLiveRoom,
      catalogSearchRef,
      currentUserId,
    ],
  );
}
