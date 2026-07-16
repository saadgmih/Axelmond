import { useEffect } from "react";
import { getRouteMetadata } from "../seo-metadata";

function setMeta(selector: string, content: string) {
  document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
}

export default function RouteMetadata({ pathname }: { pathname: string }) {
  useEffect(() => {
    const metadata = getRouteMetadata(pathname);
    document.title = metadata.title;
    setMeta('meta[name="description"]', metadata.description);
    setMeta('meta[name="robots"]', metadata.robots);
    setMeta('meta[property="og:title"]', metadata.title);
    setMeta('meta[property="og:description"]', metadata.description);
    setMeta('meta[property="og:url"]', metadata.canonical);
    setMeta('meta[name="twitter:title"]', metadata.title);
    setMeta('meta[name="twitter:description"]', metadata.description);
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", metadata.canonical);
  }, [pathname]);
  return null;
}
