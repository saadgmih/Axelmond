/** Returns true when the event target is an editable field (skip most shortcuts). */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function isShortcutHelpKey(event: KeyboardEvent): boolean {
  return event.key === "?" || (event.key === "/" && event.shiftKey);
}

export function isSearchFocusKey(event: KeyboardEvent): boolean {
  return event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
}

export interface ShortcutSpec {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  allowInInput?: boolean;
  preventDefault?: boolean;
  when?: () => boolean;
  handler: (event: KeyboardEvent) => void;
}

export function matchShortcut(event: KeyboardEvent, spec: ShortcutSpec): boolean {
  const key = spec.key.length === 1 ? spec.key.toLowerCase() : spec.key;
  const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (eventKey !== key && event.code !== spec.key) return false;
  if (Boolean(spec.ctrl) !== (event.ctrlKey || event.metaKey)) return false;
  if (Boolean(spec.shift) !== event.shiftKey) return false;
  if (Boolean(spec.alt) !== event.altKey) return false;
  if (Boolean(spec.meta) !== event.metaKey) return false;
  return true;
}

export function clickFocusedTvItem(element: HTMLElement | null) {
  if (!element) return;
  element.click();
}

export function focusNextInZone(
  zone: HTMLElement,
  direction: "up" | "down" | "left" | "right",
  current: HTMLElement | null,
): HTMLElement | null {
  const items = Array.from(zone.querySelectorAll<HTMLElement>("[data-tv-focusable]")).filter(
    (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
  );
  if (!items.length) return null;

  if (!current || !zone.contains(current)) {
    items[0]?.focus();
    return items[0] ?? null;
  }

  const currentRect = current.getBoundingClientRect();
  const currentCenter = {
    x: currentRect.left + currentRect.width / 2,
    y: currentRect.top + currentRect.height / 2,
  };

  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const item of items) {
    if (item === current) continue;
    const rect = item.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const dx = center.x - currentCenter.x;
    const dy = center.y - currentCenter.y;

    if (direction === "left" && dx >= -8) continue;
    if (direction === "right" && dx <= 8) continue;
    if (direction === "up" && dy >= -8) continue;
    if (direction === "down" && dy <= 8) continue;

    const primary = direction === "left" || direction === "right" ? Math.abs(dx) : Math.abs(dy);
    const secondary = direction === "left" || direction === "right" ? Math.abs(dy) : Math.abs(dx);
    const score = primary * 10 + secondary;
    if (score < bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (best) {
    best.focus();
    return best;
  }

  const idx = items.indexOf(current);
  const nextIdx =
    direction === "left" || direction === "up" ? (idx - 1 + items.length) % items.length : (idx + 1) % items.length;
  items[nextIdx]?.focus();
  return items[nextIdx] ?? null;
}
