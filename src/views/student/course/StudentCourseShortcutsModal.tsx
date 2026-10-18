import { memo } from "react";
import { Keyboard, X } from "lucide-react";

interface StudentCourseShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: "←", description: "Aller au chapitre / leçon précédente" },
  { key: "→", description: "Aller au chapitre / leçon suivante" },
  { key: "M", description: "Ouvrir ou fermer le plan du cours" },
  { key: "C", description: "Ouvrir ou fermer le coach de réussite" },
  { key: "V", description: "Valider / Marquer le chapitre comme terminé" },
  { key: "?", description: "Afficher cette fenêtre de raccourcis" },
  { key: "Échap", description: "Fermer les fenêtres ouvertes et tiroirs" },
];

export const StudentCourseShortcutsModal = memo(function StudentCourseShortcutsModal({
  isOpen,
  onClose,
}: StudentCourseShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="shortcuts-dialog-title" className="text-sm font-black text-slate-800">
                Raccourcis clavier du lecteur
              </h2>
              <p className="text-[11px] text-slate-400">Naviguez rapidement dans vos cours</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
            >
              <span className="text-slate-600 font-medium">{shortcut.description}</span>
              <kbd className="px-2.5 py-1 text-[11px] font-mono font-black text-slate-700 bg-white border border-slate-300 rounded-lg shadow-2xs">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
});
