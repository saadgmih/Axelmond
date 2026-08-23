import { getRouteMetadata } from "../seo-metadata";

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function replaceMeta(html: string, attribute: "name" | "property", key: string, content: string): string {
  const escaped = escapeHtmlAttribute(content);
  const pattern = new RegExp(`(<meta\\s+${attribute}="${key}"\\s+content=")[^"]*("\\s*/?>)`, "i");
  return html.replace(pattern, `$1${escaped}$2`);
}

/**
 * Sérialise un objet schema.org pour <script type="application/ld+json">.
 * `</` est échappé en `<\/` : le JSON reste strictement identique après
 * JSON.parse, mais aucune séquence `</script>` ne peut fermer le bloc
 * prématurément (les titres/descriptions proviennent de ce dépôt, la
 * défense reste de rigueur).
 */
function serializeJsonLd(payload: Record<string, unknown>): string {
  return JSON.stringify(payload).replace(/<\//g, "<\\/");
}

export function renderPlatformHtml(indexTemplate: string, pathname: string): string {
  const metadata = getRouteMetadata(pathname);
  let html = indexTemplate;
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtmlAttribute(metadata.title)}</title>`);
  html = replaceMeta(html, "name", "description", metadata.description);
  html = replaceMeta(html, "name", "robots", metadata.robots);
  html = replaceMeta(html, "property", "og:title", metadata.title);
  html = replaceMeta(html, "property", "og:description", metadata.description);
  html = replaceMeta(html, "property", "og:url", metadata.canonical);
  html = replaceMeta(html, "name", "twitter:title", metadata.title);
  html = replaceMeta(html, "name", "twitter:description", metadata.description);
  html = html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*("\s*\/?>)/i, `$1${metadata.canonical}$2`);

  if (metadata.jsonLd?.length) {
    const jsonLdScripts = metadata.jsonLd
      .map((payload) => `<script type="application/ld+json">${serializeJsonLd(payload)}</script>`)
      .join("");
    html = html.replace(/<\/head>/i, `${jsonLdScripts}</head>`);
  }

  return html;
}
