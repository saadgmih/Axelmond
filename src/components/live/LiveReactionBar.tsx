import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SmilePlus } from "lucide-react";

const REACTIONS = ["👍", "👏", "❤️", "😂", "🎉", "🤔", "🔥", "✅"] as const;

interface LiveReactionBarProps {
  onReaction: (reaction: string) => void;
  compact?: boolean;
  activeReaction?: string | null;
}

export default function LiveReactionBar({ onReaction, compact = false, activeReaction = null }: LiveReactionBarProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!compact || !open || !buttonRef.current) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [compact, open]);

  useEffect(() => {
    if (!compact || !open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (
        buttonRef.current?.contains(target)
        || menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("touchstart", handlePointerDown);
      document.addEventListener("keydown", handleEscape);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [compact, open]);

  const pickReaction = (reaction: string) => {
    onReaction(reaction);
    setOpen(false);
  };

  if (compact) {
    return (
      <>
        <button
          ref={buttonRef}
          type="button"
          data-tv-focusable
          tabIndex={0}
          onClick={() => setOpen((value) => !value)}
          aria-label="Ouvrir les réactions live"
          aria-expanded={open}
          aria-haspopup="menu"
          className={`kbd-nav-focus relative shrink-0 flex flex-col items-center justify-center min-w-[52px] min-h-[52px] w-[52px] h-[52px] sm:min-w-[60px] sm:min-h-[60px] sm:w-[60px] sm:h-[60px] rounded-xl transition-all ${
            open ? "bg-indigo-500/10 border border-indigo-400/30 text-indigo-300" : "hover:bg-zinc-800 text-zinc-300"
          }`}
        >
          <SmilePlus className="w-5 h-5 mb-1.5" />
          <span className="text-[10px] font-bold">Réagir</span>
        </button>

        {open && menuPosition && typeof document !== "undefined"
          ? createPortal(
              <div
                ref={menuRef}
                role="menu"
                aria-label="Réactions live"
                className="fixed z-[200] flex max-w-[min(92vw,320px)] -translate-x-1/2 -translate-y-full flex-wrap justify-center gap-1.5 rounded-2xl border border-white/10 bg-zinc-900/95 p-2 shadow-2xl backdrop-blur-md"
                style={{ top: menuPosition.top, left: menuPosition.left }}
              >
                {REACTIONS.map((reaction) => {
                  const isActive = activeReaction === reaction;
                  return (
                  <button
                    key={reaction}
                    type="button"
                    role="menuitem"
                    onClick={() => pickReaction(reaction)}
                    aria-pressed={isActive}
                    className={`flex h-10 min-w-10 items-center justify-center rounded-xl border text-lg transition hover:scale-105 ${
                      isActive
                        ? "border-indigo-400/50 bg-indigo-500/20 ring-2 ring-indigo-400/30"
                        : "border-white/10 bg-zinc-950/80 hover:border-indigo-400/30 hover:bg-indigo-500/10"
                    }`}
                    aria-label={isActive ? `Retirer la réaction ${reaction}` : `Réagir ${reaction}`}
                  >
                    {reaction}
                  </button>
                  );
                })}
              </div>,
              document.body,
            )
          : null}
      </>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-3">
      <p className="mb-2 w-full text-[10px] font-bold uppercase tracking-wider text-zinc-500">Réactions live</p>
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map((reaction) => (
          <button
            key={reaction}
            type="button"
            onClick={() => onReaction(reaction)}
            className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/80 text-lg transition hover:scale-105 hover:border-indigo-400/30 hover:bg-indigo-500/10"
            aria-label={`Réagir ${reaction}`}
          >
            {reaction}
          </button>
        ))}
      </div>
    </div>
  );
}
