import { isTeacherSpaceRole, normalizeRole, type UserRole } from "../rbac";
import type { LivePollState, LiveSharedResource, LiveSyncMessage, LiveWhiteboardStroke } from "./live-sync";

export const LIVE_SYNC_MAX_PAYLOAD_BYTES = 64 * 1024;
export const LIVE_SYNC_MAX_STROKE_POINTS = 500;
export const LIVE_SYNC_MAX_STROKES_SNAPSHOT = 200;
export const LIVE_SYNC_MAX_STROKES_TOTAL = 500;
export const LIVE_SYNC_MAX_POLL_OPTIONS = 6;
export const LIVE_SYNC_MAX_POLL_QUESTION = 300;
export const LIVE_SYNC_MAX_OPTION_LENGTH = 120;
export const LIVE_SYNC_MAX_RESOURCE_TITLE = 200;
export const LIVE_SYNC_MAX_RESOURCE_URL = 2048;
export const LIVE_SYNC_MAX_STROKES_PER_MINUTE = 120;

const MODERATOR_ONLY_TYPES = new Set([
  "WHITEBOARD_CLEAR",
  "WHITEBOARD_SNAPSHOT",
  "POLL_START",
  "POLL_SYNC",
  "POLL_END",
  "RESOURCE_SHARE",
  "RESOURCE_DISMISS",
  "LIVE_ENDED",
]);

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{3,8}$/;

export function isModeratorOnlyLiveSyncType(type: string): boolean {
  return MODERATOR_ONLY_TYPES.has(type);
}

export function extractParticipantRole(
  participant:
    | {
        identity?: string;
        attributes?: Record<string, string>;
        metadata?: string;
      }
    | null
    | undefined,
  fallbackRole: UserRole = "STUDENT",
): UserRole {
  const fromAttributes = normalizeRole(participant?.attributes?.role);
  if (fromAttributes) return fromAttributes;

  try {
    const metadata = JSON.parse(participant?.metadata || "{}");
    const fromMetadata = normalizeRole(metadata?.role);
    if (fromMetadata) return fromMetadata;
  } catch {
    // Ignore malformed participant metadata.
  }

  return normalizeRole(fallbackRole) || "STUDENT";
}

function isAllowedLiveResourceHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "uploadthing.com" || host.endsWith(".uploadthing.com")) return true;
  if (host === "ufs.sh" || host.endsWith(".ufs.sh")) return true;
  if (host === "utfs.io" || host.endsWith(".utfs.io")) return true;

  const extra = process.env.LIVE_RESOURCE_ALLOWED_HOSTS?.trim();
  if (!extra) return false;

  return extra
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export function isSafeLiveResourceUrl(url: string): boolean {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > LIVE_SYNC_MAX_RESOURCE_URL) return false;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:") ||
    lower.startsWith("blob:")
  ) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  if (!parsed.hostname) return false;
  return isAllowedLiveResourceHost(parsed.hostname);
}

export function sanitizeLiveResourceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, LIVE_SYNC_MAX_RESOURCE_URL);
  return isSafeLiveResourceUrl(trimmed) ? trimmed : null;
}

export function sanitizeLiveSharedResource(value: unknown): LiveSharedResource | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const url = sanitizeLiveResourceUrl(record.url);
  if (!url) return null;

  const title =
    typeof record.title === "string"
      ? record.title.trim().slice(0, LIVE_SYNC_MAX_RESOURCE_TITLE) || "Ressource partagée"
      : "Ressource partagée";
  const sharedBy =
    typeof record.sharedBy === "string" ? record.sharedBy.trim().slice(0, 120) || "Animateur" : "Animateur";
  const kind =
    url.toLowerCase().endsWith(".pdf") || url.toLowerCase().includes(".pdf?") || url.toLowerCase().includes("/pdf")
      ? "pdf"
      : "link";

  return { title, url, sharedBy, kind };
}

function sanitizePoint(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.x !== "number" || typeof record.y !== "number") return null;
  if (!Number.isFinite(record.x) || !Number.isFinite(record.y)) return null;
  return {
    x: Math.min(1, Math.max(0, record.x)),
    y: Math.min(1, Math.max(0, record.y)),
  };
}

export function sanitizeWhiteboardStroke(value: unknown, senderIdentity?: string): LiveWhiteboardStroke | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id.length === 0 || record.id.length > 120) return null;
  if (senderIdentity && !record.id.startsWith(`${senderIdentity}-`)) return null;
  if (record.tool !== "draw" && record.tool !== "shapes") return null;
  if (typeof record.color !== "string" || !HEX_COLOR_PATTERN.test(record.color)) return null;
  if (typeof record.width !== "number" || !Number.isFinite(record.width)) return null;
  const width = Math.min(20, Math.max(1, record.width));
  if (
    !Array.isArray(record.points) ||
    record.points.length === 0 ||
    record.points.length > LIVE_SYNC_MAX_STROKE_POINTS
  ) {
    return null;
  }

  const points = record.points
    .map((point) => sanitizePoint(point))
    .filter((point): point is { x: number; y: number } => point !== null);
  if (points.length === 0) return null;

  return {
    id: record.id,
    tool: record.tool,
    color: record.color,
    width,
    points,
  };
}

function sanitizePollState(value: unknown): LivePollState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.question !== "string" || typeof record.active !== "boolean") return null;
  if (!Array.isArray(record.options)) return null;

  const options = record.options
    .filter((option): option is string => typeof option === "string")
    .map((option) => option.trim().slice(0, LIVE_SYNC_MAX_OPTION_LENGTH))
    .filter(Boolean)
    .slice(0, LIVE_SYNC_MAX_POLL_OPTIONS);
  if (options.length === 0) return null;

  const votes: Record<string, number> = {};
  const voters: Record<string, string> = {};
  for (const option of options) {
    votes[option] = 0;
  }

  if (record.votes && typeof record.votes === "object") {
    for (const option of options) {
      const count = (record.votes as Record<string, unknown>)[option];
      if (typeof count === "number" && Number.isFinite(count) && count >= 0) {
        votes[option] = Math.floor(count);
      }
    }
  }

  if (record.voters && typeof record.voters === "object") {
    for (const [voterId, option] of Object.entries(record.voters as Record<string, unknown>)) {
      if (typeof voterId !== "string" || typeof option !== "string") continue;
      if (!options.includes(option)) continue;
      voters[voterId.slice(0, 120)] = option;
      votes[option] = (votes[option] || 0) + 1;
    }
  }

  return {
    question: record.question.trim().slice(0, LIVE_SYNC_MAX_POLL_QUESTION) || "Question",
    options,
    votes,
    voters,
    active: record.active,
  };
}

function sanitizePollOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((option): option is string => typeof option === "string")
    .map((option) => option.trim().slice(0, LIVE_SYNC_MAX_OPTION_LENGTH))
    .filter(Boolean)
    .slice(0, LIVE_SYNC_MAX_POLL_OPTIONS);
}

export interface LiveSyncValidationContext {
  senderIdentity: string;
  senderRole: UserRole | null;
  localIdentity: string;
  currentPoll: LivePollState;
  currentStrokeCount: number;
  payloadSize: number;
}

export function validateIncomingLiveSyncMessage(
  raw: unknown,
  context: LiveSyncValidationContext,
): LiveSyncMessage | null {
  if (context.payloadSize > LIVE_SYNC_MAX_PAYLOAD_BYTES) return null;
  if (!raw || typeof raw !== "object") return null;

  const record = raw as Record<string, unknown>;
  const type = record.type;
  if (typeof type !== "string") return null;

  const isServerRelay = !context.senderIdentity;
  if (isServerRelay) {
    if (!isModeratorOnlyLiveSyncType(type)) return null;
  } else if (isModeratorOnlyLiveSyncType(type) && !isTeacherSpaceRole(context.senderRole)) {
    return null;
  }

  switch (type) {
    case "SYNC_REQUEST":
      return { type: "SYNC_REQUEST" };

    case "WHITEBOARD_STROKE": {
      const stroke = sanitizeWhiteboardStroke(record.stroke, context.senderIdentity);
      if (!stroke) return null;
      if (context.currentStrokeCount >= LIVE_SYNC_MAX_STROKES_TOTAL) return null;
      return { type: "WHITEBOARD_STROKE", stroke };
    }

    case "WHITEBOARD_CLEAR":
      return { type: "WHITEBOARD_CLEAR" };

    case "WHITEBOARD_SNAPSHOT": {
      if (!Array.isArray(record.strokes) || record.strokes.length > LIVE_SYNC_MAX_STROKES_SNAPSHOT) return null;
      const strokes = record.strokes
        .map((stroke) => sanitizeWhiteboardStroke(stroke))
        .filter((stroke): stroke is LiveWhiteboardStroke => stroke !== null);
      return { type: "WHITEBOARD_SNAPSHOT", strokes };
    }

    case "POLL_START": {
      const options = sanitizePollOptions(record.options);
      if (options.length === 0) return null;
      const question =
        typeof record.question === "string" ? record.question.trim().slice(0, LIVE_SYNC_MAX_POLL_QUESTION) : "";
      return { type: "POLL_START", question, options };
    }

    case "POLL_SYNC": {
      const poll = sanitizePollState(record.poll);
      if (!poll) return null;
      return { type: "POLL_SYNC", poll };
    }

    case "POLL_VOTE": {
      if (typeof record.voterId !== "string" || typeof record.option !== "string") return null;
      if (record.voterId !== context.senderIdentity) return null;
      if (!context.currentPoll.active || !context.currentPoll.options.includes(record.option)) return null;
      if (context.currentPoll.voters[record.voterId]) return null;
      return { type: "POLL_VOTE", voterId: record.voterId, option: record.option };
    }

    case "POLL_END":
      return { type: "POLL_END" };

    case "RESOURCE_SHARE": {
      const resource = sanitizeLiveSharedResource(record.resource);
      if (!resource) return null;
      return { type: "RESOURCE_SHARE", resource };
    }

    case "RESOURCE_DISMISS":
      return { type: "RESOURCE_DISMISS" };

    case "LIVE_ENDED":
      return { type: "LIVE_ENDED" };

    default:
      return null;
  }
}

export interface LiveSyncOutgoingContext {
  localIdentity: string;
  canModerate: boolean;
  currentPoll: LivePollState;
  currentStrokeCount: number;
}

export function validateOutgoingLiveSyncMessage(
  message: LiveSyncMessage,
  context: LiveSyncOutgoingContext,
): LiveSyncMessage | null {
  const payload = JSON.stringify(message);
  const payloadSize = new TextEncoder().encode(payload).byteLength;

  return validateIncomingLiveSyncMessage(message, {
    senderIdentity: context.localIdentity,
    senderRole: context.canModerate ? "PROFESSOR" : "STUDENT",
    localIdentity: context.localIdentity,
    currentPoll: context.currentPoll,
    currentStrokeCount: context.currentStrokeCount,
    payloadSize,
  });
}

export function shouldPublishLiveSyncViaServer(message: LiveSyncMessage, canModerate: boolean): boolean {
  return canModerate && isModeratorOnlyLiveSyncType(message.type);
}

export function isWhiteboardStrokeRateLimited(timestamps: number[], now = Date.now()): boolean {
  const windowStart = now - 60_000;
  const recent = timestamps.filter((value) => value >= windowStart);
  return recent.length >= LIVE_SYNC_MAX_STROKES_PER_MINUTE;
}

export function trackWhiteboardStrokeTimestamp(timestamps: number[], now = Date.now()): number[] {
  const windowStart = now - 60_000;
  return [...timestamps.filter((value) => value >= windowStart), now];
}
