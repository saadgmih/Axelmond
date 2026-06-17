import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LiveKitSessionContext } from "../../context/livekit-session-context";
import { useLiveKitRoom, type UseLiveKitRoomOptions } from "../../hooks/useLiveKitRoom";

export default function LiveKitSessionHost(options: UseLiveKitRoomOptions) {
  const liveKit = useLiveKitRoom(options);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById("live-room-portal-target"));
  }, []);

  useEffect(() => {
    if (options.activeLiveCourse) {
      setPortalTarget(document.getElementById("live-room-portal-target"));
    }
  }, [options.activeLiveCourse]);

  return (
    <LiveKitSessionContext.Provider value={liveKit}>
      {options.activeLiveCourse && <div ref={liveKit.liveAudioContainerRef} className="hidden" aria-hidden="true" />}
      {portalTarget && options.activeLiveCourse
        ? createPortal(
            liveKit.renderLiveRoomInterface(options.currentUser?.role === "teacher" ? "teacher" : "student"),
            portalTarget
          )
        : null}
    </LiveKitSessionContext.Provider>
  );
}
