import { LiveKitSessionContext } from "../../context/livekit-session-context";
import { useLiveKitRoom, type UseLiveKitRoomOptions } from "../../hooks/useLiveKitRoom";

export default function LiveKitSessionHost(options: UseLiveKitRoomOptions) {
  const liveKit = useLiveKitRoom(options);

  return (
    <LiveKitSessionContext.Provider value={liveKit}>
      {options.activeLiveCourse && (
        <div ref={liveKit.liveAudioContainerRef} className="hidden" aria-hidden="true" />
      )}
    </LiveKitSessionContext.Provider>
  );
}
