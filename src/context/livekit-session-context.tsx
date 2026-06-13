import { createContext, useContext, type ReactNode, type RefObject } from "react";
import type { Course } from "../types";
import type { LiveKitClassroomBindings } from "../hooks/useLiveKitRoom";

export interface LiveKitSessionApi {
  liveAudioContainerRef: RefObject<HTMLDivElement | null>;
  toggleTeacherLiveSession: (
    courseId: number,
    toggleCourseLive: (id: number) => Promise<Course | null>,
  ) => void | Promise<void>;
  disconnectLiveSession: () => void;
  renderLiveRoomInterface: (mode: "student" | "teacher") => ReactNode;
  classroomBindings: LiveKitClassroomBindings;
}

const noopLiveKitSession: LiveKitSessionApi = {
  liveAudioContainerRef: { current: null },
  toggleTeacherLiveSession: async () => undefined,
  disconnectLiveSession: () => undefined,
  renderLiveRoomInterface: () => null,
  classroomBindings: {} as LiveKitClassroomBindings,
};

export const LiveKitSessionContext = createContext<LiveKitSessionApi>(noopLiveKitSession);

export function useLiveKitSession(): LiveKitSessionApi {
  return useContext(LiveKitSessionContext);
}
