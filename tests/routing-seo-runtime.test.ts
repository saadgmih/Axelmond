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

  test("renders route-specific metadata without inline executable content", () => {
    const template = readFileSync("index.html", "utf8");
    const html = renderPlatformHtml(template, "/contact");
    const metadata = getRouteMetadata("/contact");
    expect(html).toContain(`<title>${metadata.title}</title>`);
    expect(html).toContain(`href="${metadata.canonical}"`);
    expect(html).not.toMatch(/<style\b/i);
    // Aucun script exécutable inline : seuls les scripts externes (src=)
    // et les blocs de données ld+json sont autorisés.
    expect(html).not.toMatch(/<script(?![^>]*(?:\bsrc=|type="application\/ld\+json"))[^>]*>/i);
    expect(html).toContain('itemtype="https://schema.org/Organization"');
  });

  test("embeds escaped JSON-LD structured data for indexable routes", () => {
    const template = readFileSync("index.html", "utf8");
    const home = renderPlatformHtml(template, "/");
    expect(home).toContain('"@type":"Organization"');
    expect(home).toContain('"@type":"WebSite"');

    const contact = renderPlatformHtml(template, "/contact");
    expect(contact).toContain('"@type":"WebPage"');
    expect(contact).toContain('"@type":"BreadcrumbList"');
    // Chaque bloc ld+json doit rester du JSON valide après déséchappement </.
    const blocks = contact.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) ?? [];
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      const payload = block
        .replace(/^<script type="application\/ld\+json">/, "")
        .replace(/<\/script>$/, "")
        .replace(/<\\\//g, "</");
      expect(() => JSON.parse(payload)).not.toThrow();
    }

    // Les pages privées/inconnues ne transportent aucune donnée structurée.
    const priv = renderPlatformHtml(template, "/student/dashboard");
    expect(priv).not.toContain("application/ld+json");
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
