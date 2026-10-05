import { platformLog, type PlatformLogLevel } from "./logger";

export function logLiveKit(level: PlatformLogLevel, message: string, data?: unknown) {
  platformLog(level, "livekit", message, data);
}

export function logInvitation(level: PlatformLogLevel, message: string, data?: unknown) {
  platformLog(level, "invitation", message, data);
}

export function logEmail(level: PlatformLogLevel, message: string, data?: unknown) {
  platformLog(level, "email", message, data);
}

export function logDb(level: PlatformLogLevel, message: string, data?: unknown) {
  platformLog(level, "db", message, data);
}
