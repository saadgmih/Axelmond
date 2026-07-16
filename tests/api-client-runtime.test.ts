/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const freshToken = `eyJhbGciOiJub25lIn0.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1_000) + 3_600 }))}.`;
const expiredToken = `eyJhbGciOiJub25lIn0.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1_000) - 3_600 }))}.`;

async function loadApi() {
  vi.resetModules();
  return import("../src/api");
}

function jsonResponse(payload: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("API client resilience", () => {
  beforeEach(() => {
    document.cookie = "csrf_token=test-csrf; Path=/; SameSite=Strict";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.cookie = "csrf_token=; Path=/; Max-Age=0; SameSite=Strict";
  });

  test("preserves an active session when refresh has a network failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    const apiClient = await loadApi();
    apiClient.setSessionToken(freshToken, "test-csrf");
    const expired = vi.fn();
    const unavailable = vi.fn();
    window.addEventListener(apiClient.sessionAvailabilityEvents.expired, expired);
    window.addEventListener(apiClient.sessionAvailabilityEvents.unavailable, unavailable);

    await expect(apiClient.refreshSessionToken()).resolves.toBeNull();

    expect(apiClient.getSessionRefreshState()).toBe("temporarily-unavailable");
    await expect(apiClient.getFreshSessionToken()).resolves.toBe(freshToken);
    expect(expired).not.toHaveBeenCalled();
    expect(unavailable).toHaveBeenCalledOnce();
  });

  test("does not treat an HTML CDN 403 as an expired refresh token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<!doctype html><title>Forbidden</title><script>edge()</script>", {
          status: 403,
          headers: { "content-type": "text/html", "x-hcdn-request-id": "edge-123" },
        }),
      ),
    );
    const apiClient = await loadApi();
    apiClient.setSessionToken(freshToken, "test-csrf");

    await expect(apiClient.refreshSessionToken()).resolves.toBeNull();

    expect(apiClient.getSessionRefreshState()).toBe("temporarily-unavailable");
    await expect(apiClient.getFreshSessionToken()).resolves.toBe(freshToken);
  });

  test("clears and expires only a definitive JSON refresh rejection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "Jeton invalide", code: "REFRESH_TOKEN_INVALID" }, 401)),
    );
    const apiClient = await loadApi();
    apiClient.setSessionToken(expiredToken, "test-csrf");
    const expired = vi.fn();
    window.addEventListener(apiClient.sessionAvailabilityEvents.expired, expired);

    await expect(apiClient.refreshSessionToken()).resolves.toBeNull();

    expect(apiClient.getSessionRefreshState()).toBe("expired");
    expect(expired).toHaveBeenCalledOnce();
    expect(document.cookie).not.toContain("csrf_token=");
  });

  test("shares a single refresh request between concurrent callers", async () => {
    let releaseResponse!: (value: Response) => void;
    const pendingResponse = new Promise<Response>((resolve) => {
      releaseResponse = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(pendingResponse);
    vi.stubGlobal("fetch", fetchMock);
    const apiClient = await loadApi();
    apiClient.setSessionToken(expiredToken, "test-csrf");

    const first = apiClient.getFreshSessionToken();
    const second = apiClient.getFreshSessionToken();
    releaseResponse(jsonResponse({ token: freshToken, csrfToken: "next", id: "user-1" }));

    await expect(Promise.all([first, second])).resolves.toEqual([freshToken, freshToken]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  test("retries temporary idempotent responses but never retries a POST", async () => {
    const getFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "temp" }, 503))
      .mockResolvedValueOnce(jsonResponse({ forceDesktopMode: false }));
    vi.stubGlobal("fetch", getFetch);
    let apiClient = await loadApi();

    await expect(apiClient.api.getSiteSettings()).resolves.toEqual({ forceDesktopMode: false });
    expect(getFetch).toHaveBeenCalledTimes(2);

    const html = "<!doctype html><html><script>secretEdgeDetails()</script></html>";
    const postFetch = vi.fn().mockResolvedValue(
      new Response(html, {
        status: 403,
        headers: { "content-type": "text/html", "x-hcdn-request-id": "edge-456" },
      }),
    );
    vi.stubGlobal("fetch", postFetch);
    apiClient = await loadApi();

    await expect(apiClient.api.login("student@example.com", "password", "student")).rejects.toMatchObject({
      message: expect.not.stringContaining("secretEdgeDetails"),
      responseKind: "html",
      isTransient: true,
    });
    expect(postFetch).toHaveBeenCalledOnce();
  });
});
