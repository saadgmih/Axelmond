import path from "node:path";
import { describe, expect, test } from "vitest";
import { getStaticCacheControl } from "../src/server/static-cache-policy";

describe("static cache policy", () => {
  const dist = path.resolve("dist");

  test("keeps hashed build assets immutable", () => {
    expect(getStaticCacheControl(path.join(dist, "assets", "abc123.js"), dist)).toBe(
      "public, max-age=31536000, immutable",
    );
  });

  test("allows non-versioned public images to be refreshed", () => {
    const policy = getStaticCacheControl(path.join(dist, "performance-logo-e6657b8a.png"), dist);
    expect(policy).toBe("public, max-age=3600, must-revalidate");
    expect(policy).not.toContain("immutable");
  });

  test("forces service worker and manifest revalidation", () => {
    expect(getStaticCacheControl(path.join(dist, "sw.js"), dist)).toBe("no-store");
    expect(getStaticCacheControl(path.join(dist, "manifest.json"), dist)).toBe("no-cache, must-revalidate");
  });
});
