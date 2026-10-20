import React, { useEffect, useState } from "react";
import { FileText, Image as ImageIcon, Video, X } from "lucide-react";
import { formatFileSize } from "./MessageAttachmentModal";

interface PendingAttachmentPreviewProps {
  file: File;
  onRemove: () => void;
}

export default function PendingAttachmentPreview({ file, onRemove }: PendingAttachmentPreviewProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  useEffect(() => {
    if (!isImage) {
      setThumbnailUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setThumbnailUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return (
    <div className="mx-auto mb-2.5 flex max-w-4xl items-center justify-between gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-950/40 p-2.5 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="flex items-center gap-3 min-w-0">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="Aperçu miniature"
            className="h-11 w-11 shrink-0 rounded-xl border border-emerald-500/30 object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
            {isVideo ? <Video className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-white">{file.name}</p>
          <div className="flex items-center gap-2 text-[10px] text-emerald-300/80">
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span className="text-slate-400">Prêt à être envoyé avec votre message</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Annuler la pièce jointe"
        title="Retirer le fichier"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-rose-500/20 hover:text-rose-200 hover:border-rose-500/30 transition-all"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
