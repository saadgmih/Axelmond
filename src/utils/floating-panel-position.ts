export interface FloatingPanelPosition {
  top: number;
  left: number;
  maxHeight?: number;
}

export interface ComputeFloatingPanelPositionInput {
  triggerRect: Pick<DOMRect, "top" | "right" | "bottom" | "left">;
  panelWidth: number;
  panelHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  padding?: number;
  gap?: number;
}

export function computeFloatingPanelPosition({
  triggerRect,
  panelWidth,
  panelHeight,
  viewportWidth,
  viewportHeight,
  padding = 16,
  gap = 8,
}: ComputeFloatingPanelPositionInput): FloatingPanelPosition {
  const maxLeft = Math.max(padding, viewportWidth - panelWidth - padding);
  const maxTop = Math.max(padding, viewportHeight - panelHeight - padding);

  let top = triggerRect.bottom + gap;
  let left = triggerRect.right - panelWidth;

  if (left < padding) {
    left = triggerRect.left;
  }
  left = Math.min(Math.max(padding, left), maxLeft);

  const spaceBelow = viewportHeight - padding - top;
  const spaceAbove = triggerRect.top - gap - padding;

  if (panelHeight > spaceBelow && spaceAbove >= spaceBelow) {
    top = triggerRect.top - gap - panelHeight;
  }

  if (top + panelHeight > viewportHeight - padding) {
    top = Math.max(padding, viewportHeight - padding - panelHeight);
  }

  top = Math.min(Math.max(padding, top), maxTop);

  const availableHeight = viewportHeight - top - padding;
  const maxHeight = panelHeight > availableHeight ? Math.max(120, availableHeight) : undefined;

  return { top, left, maxHeight };
}
