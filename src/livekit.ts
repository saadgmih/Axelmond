export interface LiveKitConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export const DEFAULT_LIVE_SUBJECT = "Session académique en direct";

export interface LiveKitTokenResponse {
  url: string;
  token: string;
  roomName: string;
  participantName: string;
}

export interface LiveChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe?: boolean;
}

export function getLiveKitConfig(env: Record<string, string | undefined>): LiveKitConfig | null {
  const url = env.LIVEKIT_URL?.trim();
  const apiKey = env.LIVEKIT_API_KEY?.trim();
  const apiSecret = env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}

export function buildLiveKitRoomName(courseId: number | string): string {
  return `axelmond-course-${String(courseId).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function getLiveKitParticipantIdentity(userId: string): string {
  return `axelmond-user-${userId}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}
