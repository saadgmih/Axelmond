import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Video,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  HardDrive,
  Calendar,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { api } from "../../api";
import { formatLessonContentTypeLabel } from "../../utils/user-facing-labels";

export interface MediaLibraryItem {
  id: string;
  contentId: string;
  title: string;
  type: "VIDEO" | "PDF" | "IMAGE";
  fileName: string;
  fileKey: string;
  url: string;
  mimeType: string | null;
  size: number;
  courseId: number;
  courseTitle: string;
  sectionId?: string | null;
  sectionTitle?: string | null;
  createdAt: string;
}

export interface TeacherMediaLibraryPickerProps {
  currentCourseId: number;
  currentSectionId?: string | null;
  chapterTitle?: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  refreshCourseContent: (courseId: number) => Promise<any>;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 Mo";
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default function TeacherMediaLibraryPicker({
  currentCourseId,
  currentSectionId,
  chapterTitle,
  onSuccess,
  onError,
  refreshCourseContent,
}: TeacherMediaLibraryPickerProps) {
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "VIDEO" | "PDF" | "IMAGE">("ALL");
  const [selectedItem, setSelectedItem] = useState<MediaLibraryItem | null>(null);
  const [targetTitle, setTargetTitle] = useState("");
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [isInserting, setIsInserting] = useState(false);

  const fetchLibrary = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTeacherMediaLibrary();
      setItems(data);
    } catch (err: any) {
      console.error("Failed to fetch teacher media library:", err);
      onError(err.message || "Impossible de charger la bibliothèque de médias.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleSelectItem = (item: MediaLibraryItem) => {
    setSelectedItem(item);
    setTargetTitle(item.title);
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== "ALL" && item.type !== typeFilter) return false;
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        item.fileName.toLowerCase().includes(query) ||
        item.courseTitle.toLowerCase().includes(query)
      );
    });
  }, [items, typeFilter, searchQuery]);

  const handleConfirmReuse = async () => {
    if (!selectedItem) return;
    if (!targetTitle.trim()) {
      onError("Veuillez renseigner un titre pour ce média.");
      return;
    }

    setIsInserting(true);
    try {
      await api.reuseLessonAsset(currentCourseId, {
        fileKey: selectedItem.fileKey,
        url: selectedItem.url,
        fileName: selectedItem.fileName,
        mimeType: selectedItem.mimeType,
        size: selectedItem.size,
        contentType: selectedItem.type,
        title: targetTitle.trim(),
        sectionId: currentSectionId || null,
        published: publishImmediately,
        sourceContentId: selectedItem.contentId,
      });

      await refreshCourseContent(currentCourseId);
      onSuccess(`Le média « ${targetTitle.trim()} » a été inséré instantanément sans aucun téléversement !`);
      setSelectedItem(null);
      setTargetTitle("");
    } catch (err: any) {
      console.error("Failed to reuse media asset:", err);
      onError(err.message || "Échec de l'insertion du média.");
    } finally {
      setIsInserting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-teal-500/30 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-teal-200">
              Bibliothèque de cours existants
            </h4>
          </div>
          <p className="text-[11px] text-slate-400">
            Sélectionnez une vidéo, un PDF ou une image déjà téléversé(e) dans un autre cours pour l'insérer sans attendre.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLibrary}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          title="Rafraîchir la bibliothèque"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre, fichier ou cours (ex: Analyse 1)..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setTypeFilter("ALL")}
            className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
              typeFilter === "ALL"
                ? "bg-teal-500 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            Tous ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("VIDEO")}
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
              typeFilter === "VIDEO"
                ? "bg-emerald-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Video className="h-3 w-3" />
            Vidéos
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("PDF")}
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
              typeFilter === "PDF"
                ? "bg-rose-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <FileText className="h-3 w-3" />
            PDFs
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("IMAGE")}
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
              typeFilter === "IMAGE"
                ? "bg-sky-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <ImageIcon className="h-3 w-3" />
            Images
          </button>
        </div>
      </div>

      {/* Selected Item Insertion Action Bar */}
      {selectedItem && (
        <div className="rounded-xl border border-teal-500/50 bg-teal-950/40 p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between gap-2 border-b border-teal-500/20 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
              <span className="text-xs font-black text-white truncate">
                Média sélectionné : {selectedItem.title}
              </span>
              <span className="rounded bg-teal-900/80 px-1.5 py-0.5 text-[9px] font-bold text-teal-200 shrink-0">
                {formatBytes(selectedItem.size)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-200"
            >
              Annuler
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                Titre visible dans ce chapitre
              </span>
              <input
                type="text"
                value={targetTitle}
                onChange={(e) => setTargetTitle(e.target.value)}
                placeholder="ex: Leçon 1"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
              />
            </label>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={publishImmediately}
                  onChange={(e) => setPublishImmediately(e.target.checked)}
                  className="h-4 w-4 rounded accent-teal-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-300">Publier immédiatement le média</span>
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirmReuse}
            disabled={isInserting || !targetTitle.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-md hover:from-teal-600 hover:to-emerald-700 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInserting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Insertion instantanée en cours...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                Insérer dans {chapterTitle ? `« ${chapterTitle} »` : "ce chapitre"} (0s d'attente)
              </>
            )}
          </button>
        </div>
      )}

      {/* Library Grid / List */}
      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-teal-400 mb-2" />
            <p className="text-xs font-semibold">Chargement des médias disponibles...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-slate-400">
            <HardDrive className="h-8 w-8 mx-auto text-slate-600 mb-2" />
            <p className="text-xs font-bold text-slate-300">Aucun média trouvé</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {searchQuery
                ? "Aucun résultat ne correspond à votre recherche."
                : "Vous n'avez pas encore téléversé de médias dans vos autres cours."}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = selectedItem?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleSelectItem(item)}
                className={`group flex items-center justify-between gap-3 rounded-xl border p-2.5 cursor-pointer transition-all ${
                  isSelected
                    ? "border-teal-500 bg-teal-950/50 shadow-[0_0_12px_rgba(20,184,166,0.15)] ring-1 ring-teal-500"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                      item.type === "VIDEO"
                        ? "border-emerald-500/30 bg-emerald-950/60 text-emerald-400"
                        : item.type === "PDF"
                          ? "border-rose-500/30 bg-rose-950/60 text-rose-400"
                          : "border-sky-500/30 bg-sky-950/60 text-sky-400"
                    }`}
                  >
                    {item.type === "VIDEO" && <Video className="h-4 w-4" />}
                    {item.type === "PDF" && <FileText className="h-4 w-4" />}
                    {item.type === "IMAGE" && <ImageIcon className="h-4 w-4" />}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white truncate group-hover:text-teal-300 transition-colors">
                        {item.title}
                      </p>
                      <span className="shrink-0 rounded px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider bg-slate-800 text-slate-300">
                        {formatLessonContentTypeLabel(item.type)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                      <span className="text-teal-400 font-semibold truncate max-w-[140px]">
                        Cours : {item.courseTitle}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-slate-300">{formatBytes(item.size)}</span>
                      {item.createdAt && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Calendar className="h-2.5 w-2.5" />
                            {formatDate(item.createdAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  <span
                    className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-[10px] font-black transition-colors ${
                      isSelected
                        ? "bg-teal-500 text-white"
                        : "bg-slate-800 text-slate-300 group-hover:bg-teal-500 group-hover:text-white"
                    }`}
                  >
                    {isSelected ? "Sélectionné" : "Choisir"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
