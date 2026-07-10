import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isTeacherSpaceRole } from "../../rbac";
import { LiveKitSessionContext } from "../../context/livekit-session-context";
import { useLiveKitRoom, type UseLiveKitRoomOptions } from "../../hooks/useLiveKitRoom";

export default function LiveKitSessionHost(options: UseLiveKitRoomOptions) {
  const liveKit = useLiveKitRoom(options);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!options.activeLiveCourse) {
      setPortalTarget(null);
      return;
    }

    const resolvePortalTarget = () => document.getElementById("live-room-portal-target");

    const existingTarget = resolvePortalTarget();
    if (existingTarget) {
      setPortalTarget(existingTarget);
      return;
    }

    const observer = new MutationObserver(() => {
      const target = resolvePortalTarget();
      if (target) {
        setPortalTarget(target);
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [options.activeLiveCourse]);

  return (
    <LiveKitSessionContext.Provider value={liveKit}>
      {options.activeLiveCourse && <div ref={liveKit.liveAudioContainerRef} className="hidden" aria-hidden="true" />}
      {portalTarget && options.activeLiveCourse
        ? createPortal(
            liveKit.renderLiveRoomInterface(
              options.currentUser?.role && isTeacherSpaceRole(options.currentUser.role) ? "teacher" : "student",
            ),
            portalTarget,
          )
        : null}
    </LiveKitSessionContext.Provider>
  );
}
