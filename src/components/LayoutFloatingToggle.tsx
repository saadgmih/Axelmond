import type { ReactNode } from "react";
import { useDraggableFloatingControl, type FloatingAnchor } from "../hooks/useDraggableFloatingControl";

interface LayoutFloatingToggleProps {
  anchor: FloatingAnchor;
  storageKey: string;
  ariaLabel: string;
  ariaPressed?: boolean;
  title?: string;
  onActivate: () => void;
  className?: string;
  inactive?: boolean;
  children: ReactNode;
}

export function LayoutFloatingToggle({
  anchor,
  storageKey,
  ariaLabel,
  ariaPressed,
  title = "Glisser pour déplacer, cliquer pour actionner",
  onActivate,
  className = "",
  inactive = false,
  children,
}: LayoutFloatingToggleProps) {
  const drag = useDraggableFloatingControl(storageKey, anchor);

  return (
    <button
      type="button"
      style={drag.style}
      {...drag.pointerHandlers}
      onClick={() => {
        if (drag.consumeDragClick()) return;
        drag.saveCurrentPosition();
        onActivate();
      }}
      className={`layout-collapse-toggle layout-floating-toggle layout-floating-toggle--${anchor} kbd-nav-focus ${inactive ? "layout-floating-toggle--inactive" : ""} ${className}`.trim()}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-hidden={inactive}
      tabIndex={inactive ? -1 : 0}
      title={title}
    >
      {children}
    </button>
  );
}
