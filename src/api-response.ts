export const TEMPORARY_SERVICE_MESSAGE =
  "Le service est momentanément indisponible. Veuillez patienter quelques instants puis réessayer.";
export const NETWORK_ERROR_MESSAGE =
  "Connexion au serveur momentanément impossible. Vérifiez votre connexion puis réessayez.";
export const TIMEOUT_ERROR_MESSAGE = "Le serveur met trop de temps à répondre. Veuillez réessayer.";

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const TEMPORARY_HTTP_STATUSES = new Set([429, 502, 503, 504]);
const DEFINITIVE_REFRESH_CODES = new Set([
  "REFRESH_TOKEN_REQUIRED",
  "REFRESH_TOKEN_INVALID",
  "REFRESH_TOKEN_EXPIRED",
  "REFRESH_TOKEN_REVOKED",
  "REFRESH_TOKEN_REUSED",
]);

export type ApiResponseBody =
  | { kind: "json"; payload: Record<string, unknown> | unknown[] | null }
  | { kind: "html"; payload: null }
  | { kind: "empty"; payload: null }
  | { kind: "unexpected"; payload: null };

export interface NormalizedApiError {
  message: string;
  code?: string;
  isTransient: boolean;
  responseKind: ApiResponseBody["kind"];
  requestId?: string;
  retryAfter?: number;
  maxAttempts?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function looksLikeHtml(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith("<!doctype html") || normalized.startsWith("<html") || /<\s*(script|body|head)\b/i.test(value)
  );
}

export function sanitizeApplicationMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = [...value]
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 32 || codePoint === 127 ? " " : character;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized || normalized.length > 500 || looksLikeHtml(normalized) || /<[^>]+>/.test(normalized)) return null;
  return normalized;
}

export function isCdnLikeResponse(response: Response, bodyKind?: ApiResponseBody["kind"]): boolean {
  const contentType = response.headers.get("content-type")?.toLowerCase() || "";
  return (
    bodyKind === "html" ||
    contentType.includes("text/html") ||
    Boolean(response.headers.get("x-hcdn-request-id")) ||
    (Boolean(response.headers.get("cf-ray")) && response.status === 403)
  );
}

export function shouldRetryHttpResponse(method: string, response: Response, attempt: number, maxRetries = 2): boolean {
  if (!IDEMPOTENT_METHODS.has(method.toUpperCase()) || attempt >= maxRetries) return false;
  if (TEMPORARY_HTTP_STATUSES.has(response.status)) return true;
  return response.status === 403 && isCdnLikeResponse(response);
}

export function shouldRetryNetworkError(method: string, attempt: number, maxRetries = 2): boolean {
  return IDEMPOTENT_METHODS.has(method.toUpperCase()) && attempt < maxRetries;
}

export function getRetryDelayMs(attempt: number, response?: Response): number {
  const retryAfter = response?.headers.get("retry-after")?.trim();
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1_000, 5_000);
    const at = Date.parse(retryAfter);
    if (Number.isFinite(at)) return Math.min(Math.max(0, at - Date.now()), 5_000);
  }
  return Math.min(250 * 2 ** attempt, 2_000);
}

export async function readApiResponseBody(response: Response): Promise<ApiResponseBody> {
  if (response.status === 204 || response.status === 205) return { kind: "empty", payload: null };

  const text = await response.text();
  if (!text.trim()) return { kind: "empty", payload: null };

  const contentType = response.headers.get("content-type")?.toLowerCase() || "";
  if (contentType.includes("text/html") || looksLikeHtml(text)) return { kind: "html", payload: null };

  if (contentType.includes("json") || /^[{[]/.test(text.trim())) {
    try {
      const payload = JSON.parse(text) as unknown;
      if (payload === null) return { kind: "json", payload: null };
      if (Array.isArray(payload)) return { kind: "json", payload };
      if (isRecord(payload)) return { kind: "json", payload };
    } catch {
      return { kind: "unexpected", payload: null };
    }
  }

  return { kind: "unexpected", payload: null };
}

export function isDefinitiveRefreshFailure(response: Response, body: ApiResponseBody): boolean {
  if (response.status !== 401 || body.kind !== "json" || !isRecord(body.payload)) return false;
  return typeof body.payload.code === "string" && DEFINITIVE_REFRESH_CODES.has(body.payload.code);
}

export function normalizeApiError(response: Response, body: ApiResponseBody): NormalizedApiError {
  const payload = body.kind === "json" && isRecord(body.payload) ? body.payload : null;
  const code = typeof payload?.code === "string" ? payload.code : undefined;
  const cdnLike = isCdnLikeResponse(response, body.kind);
  const isTransient = TEMPORARY_HTTP_STATUSES.has(response.status) || cdnLike;
  const applicationMessage = sanitizeApplicationMessage(payload?.error) || sanitizeApplicationMessage(payload?.message);
  const message =
    isTransient && !applicationMessage
      ? response.status === 429
        ? "Trop de demandes ont été envoyées. Veuillez patienter avant de réessayer."
        : TEMPORARY_SERVICE_MESSAGE
      : applicationMessage || "La requête n’a pas pu être traitée. Veuillez réessayer.";

  return {
    message,
    code,
    isTransient,
    responseKind: body.kind,
    requestId: response.headers.get("x-hcdn-request-id") || response.headers.get("cf-ray") || undefined,
    retryAfter: typeof payload?.retryAfter === "number" ? payload.retryAfter : undefined,
    maxAttempts: typeof payload?.maxAttempts === "number" ? payload.maxAttempts : undefined,
  };
}
