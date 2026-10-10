import { useState, useEffect } from "react";
import { Copy, X, Loader2, ArrowRight, FolderPlus, Video, FileText, Image as ImageIcon } from "lucide-react";
import { api } from "../../api";
import type { Course, LessonContent } from "../../types";
import { formatLessonContentTypeLabel } from "../../utils/user-facing-labels";

export interface TeacherCopyMediaModalProps {
  content: LessonContent | null;
  currentCourseId: number;
  currentCourseTitle?: string;
  managedCourses: Course[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function TeacherCopyMediaModal({
  content,
  currentCourseId,
  currentCourseTitle,
  managedCourses,
  isOpen,
  onClose,
  onSuccess,
  onError,
}: TeacherCopyMediaModalProps) {
  const otherCourses = managedCourses.filter((c) => c.id !== currentCourseId);
  const [targetCourseId, setTargetCourseId] = useState<number>(otherCourses[0]?.id || 0);
  const [targetChapters, setTargetChapters] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [published, setPublished] = useState(true);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (content) {
      setCustomTitle(content.title);
      if (otherCourses.length > 0 && (!targetCourseId || targetCourseId === currentCourseId)) {
        setTargetCourseId(otherCourses[0].id);
      }
    }
  }, [content, currentCourseId, otherCourses]);

  useEffect(() => {
    if (!targetCourseId) {
      setTargetChapters([]);
      setSelectedSectionId("");
      return;
    }

    let active = true;
    setIsLoadingChapters(true);

    api
      .getCourseContent(targetCourseId)
      .then((sections) => {
        if (!active) return;
        const chapters = Array.isArray(sections)
          ? sections
              .filter((s: any) => !s.parentId)
              .map((s: any) => ({ id: String(s.id), title: String(s.title) }))
          : [];
        setTargetChapters(chapters);
        if (chapters.length > 0) {
          setSelectedSectionId(chapters[0].id);
        } else {
          setSelectedSectionId("");
        }
      })
      .catch((err) => {
        console.error("Failed to load target chapters:", err);
        if (active) setTargetChapters([]);
      })
      .finally(() => {
        if (active) setIsLoadingChapters(false);
      });

    return () => {
      active = false;
    };
  }, [targetCourseId]);

  if (!isOpen || !content) return null;

  const attachment = content.attachments?.[0];
  const targetCourseObj = managedCourses.find((c) => c.id === targetCourseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCourseId) {
      onError("Veuillez sélectionner un cours de destination.");
      return;
    }
    if (!customTitle.trim()) {
      onError("Veuillez renseigner un titre pour le média copié.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.copyLessonContent(currentCourseId, content.id, {
        targetCourseId,
        targetSectionId: selectedSectionId || null,
        title: customTitle.trim(),
        published,
      });

      onSuccess(
        `Le média « ${customTitle.trim()} » a été copié instantanément dans « ${targetCourseObj?.title || "le module cible"} » !`,
      );
      onClose();
    } catch (err: any) {
      console.error("Failed to copy lesson content:", err);
      onError(err.message || "Impossible de copier ce média.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-teal-500/30 bg-[#031512] p-6 shadow-2xl text-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-950 border border-teal-500/40 text-teal-300">
            <Copy className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Copier vers un autre module</h3>
            <p className="text-xs text-slate-400">
              Réutilisez instantanément ce média sans avoir à le retéléverser depuis votre ordinateur.
            </p>
          </div>
        </div>

        {/* Source Media Info Box */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
              content.type === "VIDEO"
                ? "border-emerald-500/30 bg-emerald-950/60 text-emerald-400"
                : content.type === "PDF"
                  ? "border-rose-500/30 bg-rose-950/60 text-rose-400"
                  : "border-sky-500/30 bg-sky-950/60 text-sky-400"
            }`}
          >
            {content.type === "VIDEO" && <Video className="h-4 w-4" />}
            {content.type === "PDF" && <FileText className="h-4 w-4" />}
            {content.type === "IMAGE" && <ImageIcon className="h-4 w-4" />}
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white truncate">{content.title}</span>
              <span className="shrink-0 rounded px-1.5 py-0.2 text-[8px] font-black uppercase bg-slate-800 text-slate-300">
                {formatLessonContentTypeLabel(content.type)}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {currentCourseTitle && <span>Module actuel : {currentCourseTitle} • </span>}
              {attachment?.fileName && <span>{attachment.fileName}</span>}
              {attachment?.size ? ` • ${formatBytes(attachment.size)}` : ""}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Module de destination
              </span>
              {otherCourses.length === 0 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-300">
                  Vous n'avez pas d'autre module disponible. Créez d'abord un autre cours dans l'étape Modules.
                </div>
              ) : (
                <select
                  value={targetCourseId}
                  onChange={(e) => setTargetCourseId(Number(e.target.value))}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {otherCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.instructor || "Professeur"})
                    </option>
                  ))}
                </select>
              )}
            </label>

            {targetCourseId > 0 && (
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Chapitre de destination
                </span>
                {isLoadingChapters ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                    <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                    Chargement des chapitres...
                  </div>
                ) : (
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {targetChapters.length === 0 ? (
                      <option value="">Racine du module (aucun chapitre créé)</option>
                    ) : (
                      <>
                        <option value="">Racine du module (hors chapitre)</option>
                        {targetChapters.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            Chapitre : {ch.title}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                )}
              </label>
            )}

            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Titre dans le module cible
              </span>
              <input
                type="text"
                required
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Titre de la ressource"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </label>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="h-4 w-4 rounded accent-teal-500 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-300">
                Rendre visible immédiatement dans le module cible
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || otherCourses.length === 0 || !customTitle.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-md hover:from-teal-600 hover:to-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Copie en cours...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Copier instantanément
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
