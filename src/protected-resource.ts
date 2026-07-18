import { getFreshSessionToken, getSessionRefreshState, refreshSessionToken } from "./api";
import { getRetryDelayMs, isCdnLikeResponse } from "./api-response";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const TEMPORARY_STATUSES = new Set([429, 502, 503, 504]);

export type ProtectedResourceKind = "PDF" | "IMAGE";
export type ProtectedResourceFailureKind = "temporary" | "permanent" | "session" | "cancelled";

export class ProtectedResourceError extends Error {
  readonly kind: ProtectedResourceFailureKind;
  readonly status?: number;

  constructor(message: string, kind: ProtectedResourceFailureKind, status?: number) {
    super(message);
    this.name = "ProtectedResourceError";
    this.kind = kind;
    this.status = status;
  }
}

interface ProtectedResourceDependencies {
  fetchImpl?: typeof fetch;
  getToken?: typeof getFreshSessionToken;
  refreshToken?: typeof refreshSessionToken;
  wait?: (milliseconds: number) => Promise<void>;
}

export interface LoadProtectedResourceOptions {
  url: string;
  kind: ProtectedResourceKind;
  requiresSession?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onAttempt?: (attempt: number) => void;
  onPhase?: (phase: "WAITING_FOR_SESSION" | "LOADING_RESOURCE") => void;
  dependencies?: ProtectedResourceDependencies;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function expectedMimeType(kind: ProtectedResourceKind, contentType: string): boolean {
  const normalized = contentType.toLowerCase().split(";", 1)[0].trim();
  if (kind === "PDF") return normalized === "application/pdf" || normalized === "application/octet-stream";
  return normalized.startsWith("image/") || normalized === "application/octet-stream";
}

async function hasExpectedSignature(blob: Blob, kind: ProtectedResourceKind): Promise<boolean> {
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  if (kind === "PDF") {
    return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  }

  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes
    .slice(0, 8)
    .every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  const isGif = bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)));
  const isWebp =
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return isJpeg || isPng || isGif || isWebp;
}

function temporaryMessage(status?: number): string {
  if (status === 429) return "Le service reçoit trop de demandes. Patientez un instant puis réessayez.";
  return "Ce contenu est momentanément indisponible. Veuillez réessayer.";
}

function permanentMessage(status: number): string {
  if (status === 401 || status === 403) return "Votre session ne permet plus d’accéder à ce contenu.";
  if (status === 404) return "Ce contenu est introuvable.";
  if (status === 413) return "Ce fichier est trop volumineux pour l’aperçu intégré.";
  return "Impossible d’afficher ce contenu dans la plateforme.";
}

function createRequestSignal(parent: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parent?.reason);
  if (parent?.aborted) abortFromParent();
  else parent?.addEventListener("abort", abortFromParent, { once: true });
  const timer = window.setTimeout(
    () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
    timeoutMs,
  );
  return {
    signal: controller.signal,
    dispose() {
      window.clearTimeout(timer);
      parent?.removeEventListener("abort", abortFromParent);
    },
  };
}

export async function loadProtectedResource(options: LoadProtectedResourceOptions): Promise<Blob> {
  const {
    url,
    kind,
    requiresSession = true,
    maxRetries = DEFAULT_MAX_RETRIES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    onAttempt,
    onPhase,
    dependencies = {},
  } = options;
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const getToken = dependencies.getToken ?? getFreshSessionToken;
  const refreshToken = dependencies.refreshToken ?? refreshSessionToken;
  const pause = dependencies.wait ?? wait;
  let token: string | null = null;
  let sessionRefreshAttempted = false;

  if (requiresSession) {
    onPhase?.("WAITING_FOR_SESSION");
    token = await getToken();
    if (!token) {
      const refreshState = getSessionRefreshState();
      const temporary = refreshState === "temporarily-unavailable" || refreshState === "refreshing";
      throw new ProtectedResourceError(
        temporary
          ? "Restauration de la session momentanément impossible. Veuillez réessayer."
          : "Votre session a expiré. Reconnectez-vous pour consulter ce contenu.",
        temporary ? "temporary" : "session",
      );
    }
  }

  onPhase?.("LOADING_RESOURCE");

  for (let attempt = 0; ; attempt += 1) {
    if (signal?.aborted) throw new ProtectedResourceError("Chargement annulé.", "cancelled");
    onAttempt?.(attempt);
    const requestSignal = createRequestSignal(signal, timeoutMs);
    const startTime = Date.now();

    try {
      const response = await fetchImpl(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: kind === "PDF" ? "application/pdf" : "image/*",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: requestSignal.signal,
      });

      const contentType = response.headers.get("content-type") || "";

      // Safe debug logging of response headers
      try {
        const duration = Date.now() - startTime;
        console.log(`[PDF-DEBUG] URL: ${url}`);
        console.log(`[PDF-DEBUG] Status: ${response.status}`);
        console.log(`[PDF-DEBUG] Content-Type: ${contentType}`);
        console.log(`[PDF-DEBUG] Content-Length: ${response.headers.get("content-length") || "unknown"}`);
        console.log(`[PDF-DEBUG] Redirected: ${response.redirected}`);
        console.log(`[PDF-DEBUG] Duration: ${duration}ms`);
      } catch (e: any) {
        console.log(`[PDF-DEBUG] Header logging failed: ${e.message}`);
      }

      if (response.status === 401 && requiresSession && !sessionRefreshAttempted) {
        sessionRefreshAttempted = true;
        token = await refreshToken();
        await response.body?.cancel().catch(() => undefined);
        if (token) continue;
      }

      const retryableStatus =
        TEMPORARY_STATUSES.has(response.status) || (response.status === 403 && isCdnLikeResponse(response));
      if (!response.ok) {
        // Safe debug logging of error body since we're about to fail the request
        try {
          const errorText = await response.text();
          console.log(`[PDF-DEBUG] Error Response Body: "${errorText.substring(0, 200)}"`);
        } catch (e: any) {
          console.log(`[PDF-DEBUG] Error body logging failed: ${e.message}`);
          await response.body?.cancel().catch(() => undefined);
        }

        if (retryableStatus && attempt < maxRetries) {
          await pause(getRetryDelayMs(attempt, response));
          continue;
        }
        throw new ProtectedResourceError(
          retryableStatus ? temporaryMessage(response.status) : permanentMessage(response.status),
          retryableStatus ? "temporary" : response.status === 401 ? "session" : "permanent",
          response.status,
        );
      }

      const blob = await response.blob();

      // Safe debug logging of downloaded blob since it's now in memory
      try {
        console.log(`[PDF-DEBUG] Blob Size: ${blob.size} bytes`);
        const headerBytes = new Uint8Array(await blob.slice(0, 20).arrayBuffer());
        const signatureText = String.fromCharCode(...headerBytes);
        console.log(`[PDF-DEBUG] First 20 bytes hex: ${Array.from(headerBytes).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        console.log(`[PDF-DEBUG] First 20 bytes text: "${signatureText.replace(/[\r\n]/g, ' ')}"`);
      } catch (e: any) {
        console.log(`[PDF-DEBUG] Blob logging failed: ${e.message}`);
      }

      const validMime = expectedMimeType(kind, contentType || blob.type);
      const validSignature = blob.size > 0 && (await hasExpectedSignature(blob, kind));
      if (!validMime || !validSignature) {
        if (attempt < maxRetries) {
          await pause(getRetryDelayMs(attempt));
          continue;
        }
        throw new ProtectedResourceError(
          "Le document reçu n'a pas pu être interprété. Veuillez réessayer.",
          "temporary",
          response.status
        );
      }

      return blob;
    } catch (error) {
      if (error instanceof ProtectedResourceError) throw error;
      if (signal?.aborted) throw new ProtectedResourceError("Chargement annulé.", "cancelled");
      if (attempt < maxRetries) {
        await pause(getRetryDelayMs(attempt));
        continue;
      }
      throw new ProtectedResourceError(temporaryMessage(), "temporary");
    } finally {
      requestSignal.dispose();
    }
  }
}
