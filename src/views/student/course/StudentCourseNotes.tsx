import { memo, useEffect, useRef, useState } from "react";
import {
  BookMarked,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  FileText,
  Sparkles,
  Trash2,
} from "lucide-react";

interface StudentCourseNotesProps {
  courseId: number;
  moduleId: number;
  courseTitle: string;
  moduleTitle: string;
}

export const StudentCourseNotes = memo(function StudentCourseNotes({
  courseId,
  moduleId,
  courseTitle,
  moduleTitle,
}: StudentCourseNotesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const storageKey = `pa_student_notes_${courseId}_${moduleId}`;

  const [notes, setNotes] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(storageKey) || "";
    } catch {
      return "";
    }
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state when courseId or moduleId changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(storageKey) || "";
      setNotes(stored);
      setLastSaved(null);
    } catch {
      setNotes("");
    }
  }, [storageKey]);

  const handleNotesChange = (text: string) => {
    setNotes(text);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, text);
        setLastSaved(new Date());
      } catch (err) {
        console.warn("Impossible d'enregistrer les notes locales :", err);
      }
    }, 600);
  };

  const handleExport = () => {
    if (!notes.trim()) return;
    const blob = new Blob(
      [
        `# Notes d'étude : ${courseTitle}\n## Chapitre : ${moduleTitle}\nDate : ${new Date().toLocaleDateString("fr-FR")}\n\n${notes}`,
      ],
      { type: "text/markdown;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `notes-${courseTitle.slice(0, 20).replace(/\s+/g, "_")}-${moduleTitle.slice(0, 20).replace(/\s+/g, "_")}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (!notes.trim()) return;
    if (window.confirm("Êtes-vous sûr de vouloir effacer vos notes pour cette leçon ?")) {
      setNotes("");
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
      setLastSaved(null);
    }
  };

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-100/60 transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-800">
            <BookMarked className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-800">Mes notes de révision</h3>
              {notes.trim().length > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {wordCount} mot{wordCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Espace de synthèse personnel pour ce chapitre (sauvegardé automatiquement)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-[10px] text-emerald-600 font-bold hidden sm:inline-flex items-center gap-1">
              <Check className="w-3 h-3" /> Sauvegardé à{" "}
              {lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-slate-200/80 space-y-3.5 bg-white">
          <div className="relative">
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Écrivez vos théorèmes, formules mathématiques ($...$), synthèses et points importants à retenir pour ce chapitre…"
              rows={5}
              className="w-full text-xs text-slate-800 placeholder:text-slate-400 border border-slate-200 rounded-xl p-3.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-y font-sans leading-relaxed transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Astuce : vous pouvez exporter vos notes en Markdown pour vos révisions d'examens.</span>
            </div>

            <div className="flex items-center gap-2">
              {notes.trim().length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleExport}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    title="Télécharger mes notes en fichier Markdown"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Exporter</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    title="Effacer mes notes"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
