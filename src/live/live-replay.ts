export const LIVE_REPLAY_SOURCE = "live_replay";

export type LiveReplayBodyMeta = {
  source: typeof LIVE_REPLAY_SOURCE;
  liveSessionId: string;
  recordedAt: string;
};

export function buildLiveReplayBody(liveSessionId: string, recordedAt = new Date().toISOString()): string {
  const meta: LiveReplayBodyMeta = {
    source: LIVE_REPLAY_SOURCE,
    liveSessionId,
    recordedAt,
  };
  return JSON.stringify(meta);
}

export function parseLiveReplayBody(body: string | null | undefined): LiveReplayBodyMeta | null {
  if (!body?.trim()) return null;
  try {
    const parsed = JSON.parse(body) as Partial<LiveReplayBodyMeta>;
    if (parsed.source !== LIVE_REPLAY_SOURCE || typeof parsed.liveSessionId !== "string") return null;
    return {
      source: LIVE_REPLAY_SOURCE,
      liveSessionId: parsed.liveSessionId,
      recordedAt: typeof parsed.recordedAt === "string" ? parsed.recordedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function isLiveReplayContent(body: string | null | undefined): boolean {
  return parseLiveReplayBody(body) !== null;
}

export function buildLiveReplayTitle(courseTitle: string, liveSubject?: string | null, recordedAt = new Date()): string {
  const label = liveSubject?.trim() || courseTitle.trim() || "Session live";
  const dateLabel = recordedAt.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Rediffusion — ${label} — ${dateLabel}`;
}
