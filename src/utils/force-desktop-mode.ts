const DESKTOP_VIEWPORT_CONTENT = "width=1280, initial-scale=1, viewport-fit=cover";
const DEFAULT_VIEWPORT_CONTENT = "width=device-width, initial-scale=1, viewport-fit=cover";
const ORIGINAL_VIEWPORT_DATA_KEY = "originalViewportContent";

function getViewportMeta(): HTMLMetaElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector('meta[name="viewport"]');
}

function ensureViewportMeta(): HTMLMetaElement | null {
  if (typeof document === "undefined") return null;
  const existing = getViewportMeta();
  if (existing) return existing;

  const meta = document.createElement("meta");
  meta.name = "viewport";
  meta.content = DEFAULT_VIEWPORT_CONTENT;
  document.head.appendChild(meta);
  return meta;
}

export function applyForceDesktopMode(enabled: boolean) {
  if (typeof document === "undefined") return;

  document.documentElement.classList.toggle("force-desktop-mode", enabled);
  document.body?.classList.toggle("force-desktop-mode", enabled);

  const viewport = ensureViewportMeta();
  if (!viewport) return;

  if (!viewport.dataset[ORIGINAL_VIEWPORT_DATA_KEY]) {
    viewport.dataset[ORIGINAL_VIEWPORT_DATA_KEY] = viewport.content || DEFAULT_VIEWPORT_CONTENT;
  }

  viewport.content = enabled
    ? DESKTOP_VIEWPORT_CONTENT
    : viewport.dataset[ORIGINAL_VIEWPORT_DATA_KEY] || DEFAULT_VIEWPORT_CONTENT;
}

export const FORCE_DESKTOP_MODE_MIN_WIDTH = 1280;
