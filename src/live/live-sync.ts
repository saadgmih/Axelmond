import { sanitizeLiveSharedResource } from "./live-sync-validation";

export const LIVE_SYNC_TOPIC = "axelmond-live-sync";

export interface LiveSyncPoint {
  x: number;
  y: number;
}

export interface LiveWhiteboardStroke {
  id: string;
  tool: "draw" | "shapes";
  color: string;
  width: number;
  points: LiveSyncPoint[];
}

export interface LivePollState {
  question: string;
  options: string[];
  votes: Record<string, number>;
  voters: Record<string, string>;
  active: boolean;
}

export interface LiveSharedResource {
  title: string;
  url: string;
  sharedBy: string;
  kind: "pdf" | "link";
}

export type LiveSyncMessage =
  | { type: "SYNC_REQUEST" }
  | { type: "WHITEBOARD_STROKE"; stroke: LiveWhiteboardStroke }
  | { type: "WHITEBOARD_CLEAR" }
  | { type: "WHITEBOARD_SNAPSHOT"; strokes: LiveWhiteboardStroke[] }
  | { type: "POLL_START"; question: string; options: string[] }
  | { type: "POLL_SYNC"; poll: LivePollState }
  | { type: "POLL_VOTE"; voterId: string; option: string }
  | { type: "POLL_END" }
  | { type: "RESOURCE_SHARE"; resource: LiveSharedResource }
  | { type: "RESOURCE_DISMISS" };

export const DEFAULT_POLL_QUESTION = "Comprenez-vous la notion de base abordée ?";
export const DEFAULT_POLL_OPTIONS = ["Oui, c'est très clair", "J'ai besoin de plus d'exemples", "Non, je suis perdu"];

export function createEmptyPoll(): LivePollState {
  const votes: Record<string, number> = {};
  for (const option of DEFAULT_POLL_OPTIONS) {
    votes[option] = 0;
  }
  return {
    question: DEFAULT_POLL_QUESTION,
    options: [...DEFAULT_POLL_OPTIONS],
    votes,
    voters: {},
    active: false,
  };
}

export function buildPollVotes(options: string[]): Record<string, number> {
  const votes: Record<string, number> = {};
  for (const option of options) {
    votes[option] = 0;
  }
  return votes;
}

export function applyPollStart(question: string, options: string[]): LivePollState {
  const safeOptions = options.filter((option) => option.trim()).slice(0, 6);
  return {
    question: question.trim() || DEFAULT_POLL_QUESTION,
    options: safeOptions.length > 0 ? safeOptions : [...DEFAULT_POLL_OPTIONS],
    votes: buildPollVotes(safeOptions.length > 0 ? safeOptions : DEFAULT_POLL_OPTIONS),
    voters: {},
    active: true,
  };
}

export function mergePollVote(poll: LivePollState, voterId: string, option: string): LivePollState | null {
  if (!poll.active || !poll.options.includes(option) || poll.voters[voterId]) {
    return null;
  }
  return {
    ...poll,
    votes: {
      ...poll.votes,
      [option]: (poll.votes[option] || 0) + 1,
    },
    voters: {
      ...poll.voters,
      [voterId]: option,
    },
  };
}

export function detectResourceKind(url: string): "pdf" | "link" {
  const normalized = url.trim().toLowerCase();
  if (normalized.endsWith(".pdf") || normalized.includes(".pdf?") || normalized.includes("/pdf")) {
    return "pdf";
  }
  return "link";
}

export function buildSharedResource(title: string, url: string, sharedBy: string): LiveSharedResource | null {
  const safeTitle = title.trim();
  const safeUrl = url.trim();
  if (!safeUrl) return null;

  return sanitizeLiveSharedResource({
    title: safeTitle || "Ressource partagée",
    url: safeUrl,
    sharedBy,
    kind: detectResourceKind(safeUrl),
  });
}

export function appendWhiteboardStroke(
  strokes: LiveWhiteboardStroke[],
  stroke: LiveWhiteboardStroke,
): LiveWhiteboardStroke[] {
  if (strokes.some((entry) => entry.id === stroke.id)) {
    return strokes;
  }
  return [...strokes, stroke];
}
