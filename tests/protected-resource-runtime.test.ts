/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { loadProtectedResource, ProtectedResourceError, type ProtectedResourceKind } from "../src/protected-resource";

const pdfBytes = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<<>>\nendobj");
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const gifBytes = new TextEncoder().encode("GIF89a......");
const webpBytes = new TextEncoder().encode("RIFF....WEBP");

function resourceResponse(bytes: BodyInit, contentType: string, status = 200, extraHeaders = {}) {
  return new Response(bytes, { status, headers: { "content-type": contentType, ...extraHeaders } });
}

function jsonError(status: number) {
  return resourceResponse(JSON.stringify({ error: "Erreur applicative" }), "application/json", status);
}

function dependencies(fetchImpl: typeof fetch, refreshToken = vi.fn(async () => "fresh-token")) {
  return {
    fetchImpl,
    getToken: vi.fn(async () => "initial-token"),
    refreshToken,
    wait: vi.fn(async () => undefined),
  };
}

async function expectFailure(promise: Promise<Blob>, kind: ProtectedResourceError["kind"], status?: number) {
  await expect(promise).rejects.toMatchObject({ name: "ProtectedResourceError", kind, ...(status ? { status } : {}) });
}

async function expectValidBlob(promise: Promise<Blob>) {
  const blob = await promise;
  expect(blob.size).toBeGreaterThan(0);
  expect(typeof blob.arrayBuffer).toBe("function");
}

describe("protected resource loading", () => {
  it("loads a valid PDF only after obtaining the session token", async () => {
    const fetchImpl = vi.fn(async () => resourceResponse(pdfBytes, "application/pdf"));
    const deps = dependencies(fetchImpl as typeof fetch);
    await expectValidBlob(loadProtectedResource({ url: "/document", kind: "PDF", dependencies: deps }));
    expect(deps.getToken).toHaveBeenCalledBefore(fetchImpl);
  });

  it("sends credentials, no-store, accept and bearer headers", async () => {
    const fetchImpl = vi.fn(async () => resourceResponse(pdfBytes, "application/pdf"));
    await loadProtectedResource({
      url: "/document",
      kind: "PDF",
      dependencies: dependencies(fetchImpl as typeof fetch),
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/document",
      expect.objectContaining({
        credentials: "include",
        cache: "no-store",
        headers: expect.objectContaining({ Accept: "application/pdf", Authorization: "Bearer initial-token" }),
      }),
    );
  });

  it("loads a public PDF without waiting for a session", async () => {
    const fetchImpl = vi.fn(async () => resourceResponse(pdfBytes, "application/pdf"));
    const deps = dependencies(fetchImpl as typeof fetch);
    await loadProtectedResource({ url: "/legal.pdf", kind: "PDF", requiresSession: false, dependencies: deps });
    expect(deps.getToken).not.toHaveBeenCalled();
  });

  it("accepts an octet-stream PDF only when its signature is valid", async () => {
    const fetchImpl = vi.fn(async () => resourceResponse(pdfBytes, "application/octet-stream"));
    await expectValidBlob(
      loadProtectedResource({ url: "/document", kind: "PDF", dependencies: dependencies(fetchImpl as typeof fetch) }),
    );
  });

  it.each([
    ["PNG", pngBytes, "image/png"],
    ["JPEG", jpegBytes, "image/jpeg"],
    ["GIF", gifBytes, "image/gif"],
    ["WebP", webpBytes, "image/webp"],
  ])("loads a valid %s image", async (_name, bytes, contentType) => {
    const fetchImpl = vi.fn(async () => resourceResponse(bytes, contentType));
    await expectValidBlob(
      loadProtectedResource({ url: "/image", kind: "IMAGE", dependencies: dependencies(fetchImpl as typeof fetch) }),
    );
  });

  it("refreshes the session once after a 401 then retries with the new token", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonError(401))
      .mockResolvedValueOnce(resourceResponse(pdfBytes, "application/pdf"));
    const refreshToken = vi.fn(async () => "renewed-token");
    await loadProtectedResource({
      url: "/document",
      kind: "PDF",
      dependencies: dependencies(fetchImpl as typeof fetch, refreshToken),
    });
    expect(refreshToken).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer renewed-token" }) }),
    );
  });

  it("classifies a 401 rejected after refresh as a session failure", async () => {
    const fetchImpl = vi.fn(async () => jsonError(401));
    await expectFailure(
      loadProtectedResource({
        url: "/document",
        kind: "PDF",
        dependencies: dependencies(
          fetchImpl as typeof fetch,
          vi.fn(async () => null),
        ),
      }),
      "session",
      401,
    );
  });

  it("never launches more than one refresh for one resource load", async () => {
    const fetchImpl = vi.fn(async () => jsonError(401));
    const refreshToken = vi.fn(async () => "renewed-token");
    await expectFailure(
      loadProtectedResource({
        url: "/document",
        kind: "PDF",
        dependencies: dependencies(fetchImpl as typeof fetch, refreshToken),
      }),
      "session",
      401,
    );
    expect(refreshToken).toHaveBeenCalledOnce();
  });

  it.each([429, 502, 503, 504])("retries temporary HTTP %i and succeeds", async (status) => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonError(status))
      .mockResolvedValueOnce(resourceResponse(pdfBytes, "application/pdf"));
    await expectValidBlob(
      loadProtectedResource({ url: "/document", kind: "PDF", dependencies: dependencies(fetchImpl as typeof fetch) }),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it.each([429, 502, 503, 504])("classifies exhausted HTTP %i retries as temporary", async (status) => {
    const fetchImpl = vi.fn(async () => jsonError(status));
    await expectFailure(
      loadProtectedResource({ url: "/document", kind: "PDF", dependencies: dependencies(fetchImpl as typeof fetch) }),
      "temporary",
      status,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("retries an ambiguous HTML CDN 403", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(resourceResponse("<!doctype html>", "text/html", 403, { "cf-ray": "edge" }))
      .mockResolvedValueOnce(resourceResponse(pdfBytes, "application/pdf"));
    await loadProtectedResource({
      url: "/document",
      kind: "PDF",
      dependencies: dependencies(fetchImpl as typeof fetch),
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry an application JSON 403", async () => {
    const fetchImpl = vi.fn(async () => jsonError(403));
    await expectFailure(
      loadProtectedResource({ url: "/document", kind: "PDF", dependencies: dependencies(fetchImpl as typeof fetch) }),
      "permanent",
      403,
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it.each([404, 413])("classifies HTTP %i as permanent", async (status) => {
    const fetchImpl = vi.fn(async () => jsonError(status));
    await expectFailure(
      loadProtectedResource({ url: "/document", kind: "PDF", dependencies: dependencies(fetchImpl as typeof fetch) }),
      "permanent",
      status,
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it.each([
    ["HTML", "<!doctype html><html></html>", "text/html"],
    ["JSON", '{"error":"edge"}', "application/json"],
    ["text", "not a pdf", "text/plain"],
    ["fake PDF", "not a pdf", "application/pdf"],
  ])("rejects a successful %s response that is not a real PDF", async (_name, body, contentType) => {
    const fetchImpl = vi.fn(async () => resourceResponse(body, contentType));
    await expectFailure(
      loadProtectedResource({ url: "/document", kind: "PDF", dependencies: dependencies(fetchImpl as typeof fetch) }),
      "temporary",
      200,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("rejects an empty file after bounded retries", async () => {
    const fetchImpl = vi.fn(async () => resourceResponse("", "application/pdf"));
    await expectFailure(
      loadProtectedResource({ url: "/document", kind: "PDF", dependencies: dependencies(fetchImpl as typeof fetch) }),
      "temporary",
      200,
    );
  });

  it("retries a network failure and succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(resourceResponse(pdfBytes, "application/pdf"));
    await expectValidBlob(
      loadProtectedResource({ url: "/document", kind: "PDF", dependencies: dependencies(fetchImpl as typeof fetch) }),
    );
  });

  it("classifies exhausted network failures as temporary", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expectFailure(
      loadProtectedResource({ url: "/document", kind: "PDF", dependencies: dependencies(fetchImpl as typeof fetch) }),
      "temporary",
    );
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("respects a zero-retry policy", async () => {
    const fetchImpl = vi.fn(async () => jsonError(503));
    await expectFailure(
      loadProtectedResource({
        url: "/document",
        kind: "PDF",
        maxRetries: 0,
        dependencies: dependencies(fetchImpl as typeof fetch),
      }),
      "temporary",
      503,
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("reports every bounded attempt", async () => {
    const fetchImpl = vi.fn(async () => jsonError(503));
    const onAttempt = vi.fn();
    await expectFailure(
      loadProtectedResource({
        url: "/document",
        kind: "PDF",
        onAttempt,
        dependencies: dependencies(fetchImpl as typeof fetch),
      }),
      "temporary",
      503,
    );
    expect(onAttempt.mock.calls.map(([attempt]) => attempt)).toEqual([0, 1, 2]);
  });

  it("cancels immediately when the parent signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn(async () => resourceResponse(pdfBytes, "application/pdf"));
    await expectFailure(
      loadProtectedResource({
        url: "/document",
        kind: "PDF",
        signal: controller.signal,
        dependencies: dependencies(fetchImpl as typeof fetch),
      }),
      "cancelled",
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses an image accept header for images", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      resourceResponse(pngBytes, "image/png"),
    );
    await loadProtectedResource({
      url: "/image",
      kind: "IMAGE",
      dependencies: dependencies(fetchImpl as typeof fetch),
    });
    expect(fetchImpl.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ headers: expect.objectContaining({ Accept: "image/*" }) }),
    );
  });

  it("rejects a PDF signature returned as an image", async () => {
    const fetchImpl = vi.fn(async () => resourceResponse(pdfBytes, "image/png"));
    await expectFailure(
      loadProtectedResource({ url: "/image", kind: "IMAGE", dependencies: dependencies(fetchImpl as typeof fetch) }),
      "temporary",
      200,
    );
  });

  it("keeps the requested resource kind stable across retries", async () => {
    const kinds: ProtectedResourceKind[] = ["PDF", "IMAGE"];
    for (const kind of kinds) {
      const body = kind === "PDF" ? pdfBytes : pngBytes;
      const type = kind === "PDF" ? "application/pdf" : "image/png";
      const fetchImpl = vi
        .fn()
        .mockRejectedValueOnce(new TypeError())
        .mockResolvedValueOnce(resourceResponse(body, type));
      await loadProtectedResource({ url: "/resource", kind, dependencies: dependencies(fetchImpl as typeof fetch) });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    }
  });
});
