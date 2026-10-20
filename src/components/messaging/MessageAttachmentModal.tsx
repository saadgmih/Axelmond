import React, { useEffect } from "react";
import { Download, ExternalLink, FileText, Image as ImageIcon, Video, X } from "lucide-react";
import type { MessageAttachment } from "../../types/messaging";

interface MessageAttachmentModalProps {
  attachment: MessageAttachment | null;
  onClose: () => void;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function MessageAttachmentModal({ attachment, onClose }: MessageAttachmentModalProps) {
  useEffect(() => {
    if (!attachment) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [attachment, onClose]);

  if (!attachment) return null;

  const isImage = attachment.kind === "IMAGE";
  const isVideo = attachment.kind === "VIDEO";
  const isDoc = attachment.kind === "DOCUMENT";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md duration-200 animate-in fade-in sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#071d18] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#092620]/80 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              {isImage && <ImageIcon className="h-4 w-4" />}
              {isVideo && <Video className="h-4 w-4" />}
              {isDoc && <FileText className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white sm:text-sm">{attachment.fileName}</p>
              <p className="text-[10px] text-slate-400">
                {attachment.kind} {attachment.sizeBytes ? `· ${formatFileSize(attachment.sizeBytes)}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={attachment.url}
              download={attachment.fileName}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-emerald-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Télécharger</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer la prévisualisation"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="flex min-h-[240px] max-h-[70vh] flex-1 items-center justify-center overflow-auto bg-black/40 p-4">
          {isImage && (
            <img
              src={attachment.url}
              alt={attachment.fileName}
              className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-lg"
            />
          )}

          {isVideo && (
            <video
              src={attachment.url}
              controls
              autoPlay
              playsInline
              className="max-h-[65vh] max-w-full rounded-xl"
            />
          )}

          {isDoc && (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                <FileText className="h-10 w-10" />
              </div>
              <div className="max-w-md">
                <p className="font-bold text-white text-sm">{attachment.fileName}</p>
                {attachment.mimeType && (
                  <p className="mt-1 text-xs text-slate-400 font-mono">{attachment.mimeType}</p>
                )}
                {attachment.sizeBytes && (
                  <p className="mt-0.5 text-xs text-emerald-300 font-semibold">
                    {formatFileSize(attachment.sizeBytes)}
                  </p>
                )}
              </div>
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-teal-900/30 transition hover:from-emerald-500 hover:to-teal-500"
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir dans un nouvel onglet
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
