import { Keyboard, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface ShortcutGroup {
  title: string;
  items: { keys: string; label: string }[];
}

const GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation globale",
    items: [
      { keys: "Tab / Shift+Tab", label: "Parcourir les éléments focusables" },
      { keys: "↑ ↓ ← →", label: "Naviguer entre cartes et boutons (zones TV)" },
      { keys: "Enter", label: "Activer l'élément sélectionné" },
      { keys: "Esc", label: "Fermer modale / menu / plein écran" },
      { keys: "/", label: "Focus recherche catalogue" },
      { keys: "?", label: "Afficher cette aide" },
    ],
  },
  {
    title: "Live classroom",
    items: [
      { keys: "F", label: "Plein écran" },
      { keys: "M", label: "Micro on / off" },
      { keys: "Espace", label: "Pause / lecture vidéo locale" },
      { keys: "C", label: "Ouvrir / fermer le chat" },
      { keys: "P", label: "Ouvrir / fermer participants" },
      { keys: "L", label: "Quitter ou revenir au module" },
      { keys: "R", label: "Reconnecter le live" },
      { keys: "↑ / ↓", label: "Volume scène" },
      { keys: "← / →", label: "Changer d'onglet du panneau" },
    ],
  },
  {
    title: "Smart TV / télécommande",
    items: [
      { keys: "Flèches", label: "Déplacer le focus (contour visible)" },
      { keys: "OK / Enter", label: "Valider la sélection" },
      { keys: "Retour / Esc", label: "Revenir ou fermer" },
    ],
  },
];

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
      data-modal="keyboard-help"
    >
      <div className="w-full max-w-2xl max-h-[min(90vh,720px)] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 text-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-900/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h2 id="keyboard-shortcuts-title" className="text-lg font-black">
                Raccourcis clavier
              </h2>
              <p className="text-xs text-slate-400">PC, clavier et navigation Smart TV</p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="kbd-nav-focus touch-target rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
            aria-label="Fermer l'aide des raccourcis"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-indigo-300">
                {group.title}
              </h3>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li
                    key={`${group.title}-${item.keys}`}
                    className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-sm text-slate-200">{item.label}</span>
                    <kbd className="inline-flex w-fit rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 font-mono text-[11px] font-bold text-indigo-200">
                      {item.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
