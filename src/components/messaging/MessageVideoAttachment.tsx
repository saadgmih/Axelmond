import { useEffect, useId, useState } from "react";
import { PlayCircle, Video, X } from "lucide-react";
import PremiumVideoPlayer from "../PremiumVideoPlayer";

interface MessageVideoAttachmentProps {
  url: string;
  role: "student" | "teacher";
}

export function MessageVideoAttachment({ url, role }: MessageVideoAttachmentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const playButtonClass =
    role === "student" ? "text-indigo-300 fill-indigo-300" : "text-pink-300 fill-pink-300";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Lire la vidéo"
        className="relative aspect-video w-[220px] max-w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950 shadow-md transition-transform hover:scale-[1.01]"
      >
        <video
          src={url}
          preload="metadata"
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-50"
          aria-hidden="true"
        />
        <div className="relative flex h-full flex-col items-center justify-center gap-2 bg-slate-950/35 px-3">
          <PlayCircle className={`h-10 w-10 ${playButtonClass}`} aria-hidden="true" />
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-100">
            <Video className="h-3.5 w-3.5" aria-hidden="true" />
            Vidéo
          </span>
        </div>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 id={titleId} className="text-sm font-bold text-white">
                Lecture vidéo
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fermer la vidéo"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition-colors hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <PremiumVideoPlayer
              src={url}
              title="Vidéo"
              instructor=""
              activeSector={role}
              showMetadata={false}
            />
          </div>
        </div>
      )}
    </>
  );
}
