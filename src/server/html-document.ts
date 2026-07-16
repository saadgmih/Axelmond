import { getRouteMetadata } from "../seo-metadata";

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function replaceMeta(html: string, attribute: "name" | "property", key: string, content: string): string {
  const escaped = escapeHtmlAttribute(content);
  const pattern = new RegExp(`(<meta\\s+${attribute}="${key}"\\s+content=")[^"]*("\\s*/?>)`, "i");
  return html.replace(pattern, `$1${escaped}$2`);
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
  return html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*("\s*\/?>)/i, `$1${metadata.canonical}$2`);
}
