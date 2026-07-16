import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { isKnownPlatformPath, resolveInitialPlatformRoute } from "../src/navigation/platformPaths";
import { getRouteMetadata, PUBLIC_ROUTE_METADATA } from "../src/seo-metadata";
import { renderPlatformHtml } from "../src/server/html-document";

describe("unknown routes and SEO", () => {
  test("marks unknown public and private paths as not found", () => {
    expect(resolveInitialPlatformRoute("/this-does-not-exist")).toMatchObject({
      currentView: "not-found",
      notFound: true,
    });
    expect(resolveInitialPlatformRoute("/student/this-does-not-exist")).toMatchObject({
      currentView: "not-found",
      notFound: true,
    });
    expect(isKnownPlatformPath("/about")).toBe(true);
    expect(isKnownPlatformPath("/student/catalog")).toBe(true);
    expect(isKnownPlatformPath("/student/nope")).toBe(false);
  });

  test("renders route-specific metadata and nonce into the production document", () => {
    const template = readFileSync("index.html", "utf8");
    const html = renderPlatformHtml(template, "/contact", "nonce-value");
    const metadata = getRouteMetadata("/contact");
    expect(html).toContain(`<title>${metadata.title}</title>`);
    expect(html).toContain(`href="${metadata.canonical}"`);
    expect(html).toContain('nonce="nonce-value"');
    expect(html).not.toContain("__CSP_NONCE__");
  });

  test("keeps private and unknown pages out of search indexes", () => {
    expect(getRouteMetadata("/student/dashboard").robots).toBe("noindex, nofollow");
    expect(getRouteMetadata("/unknown").robots).toBe("noindex, nofollow");
  });

  test("keeps public metadata aligned with sitemap entries", () => {
    const sitemap = readFileSync("public/sitemap.xml", "utf8");
    for (const metadata of Object.values(PUBLIC_ROUTE_METADATA)) {
      expect(sitemap).toContain(`<loc>${metadata.canonical}</loc>`);
      expect(metadata.robots).toBe("index, follow");
    }
  });
});
