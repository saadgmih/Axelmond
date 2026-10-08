import { useState, useEffect, useMemo } from "react";
import { api } from "../api";
import { getClientErrorMessage } from "../client-errors";
import {
  Calendar,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  Layers,
  Search,
  BookOpen,
  Sparkles,
  CheckSquare,
  Square,
  UserCheck,
  ShieldCheck,
  Filter,
  Trash2,
} from "lucide-react";

interface CourseOption {
  id: number;
  title: string;
  price?: number;
}

interface AccessCodeUsage {
  id: string;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
  course?: {
    id: number;
    title: string;
  };
}

interface AccessCode {
  id: string;
  code: string;
  internalName: string;
  administrativeStatus: string;
  startsAt: string;
  endsAt: string;
  maxTotalUses: number | null;
  totalConfirmedUses: number;
  totalReservedUses: number;
  appliesToAllModules?: boolean;
  createdAt: string;
  modules?: Array<{
    course: {
      id: number;
      title: string;
    };
  }>;
  usages?: AccessCodeUsage[];
}

interface AdminAccessCodesProps {
  courses?: CourseOption[];
  loadingCourses?: boolean;
  courseId?: number;
  courseTitle?: string;
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "text-emerald-300 bg-emerald-500/10 border-emerald-400/20",
  EXPIRED: "text-slate-400 bg-slate-500/10 border-slate-400/20",
  ARCHIVED: "text-slate-500 bg-slate-500/10 border-slate-400/20",
  DISABLED: "text-red-400 bg-red-500/10 border-red-400/20",
  PAUSED: "text-amber-300 bg-amber-500/10 border-amber-400/20",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Actif",
  EXPIRED: "Expiré",
  ARCHIVED: "Archivé",
  DISABLED: "Désactivé",
  PAUSED: "En pause",
};

export function AdminAccessCodes({
  courses: initialCourses,
  loadingCourses = false,
  courseId: initialCourseId,
}: AdminAccessCodesProps) {
  // Course list
  const [courses, setCourses] = useState<CourseOption[]>(initialCourses || []);
  const [loadingCoursesList, setLoadingCoursesList] = useState(loadingCourses);

  // Scope mode: "single" | "multiple" | "all"
  const [scopeType, setScopeType] = useState<"single" | "multiple" | "all">("multiple");
  const [singleCourseId, setSingleCourseId] = useState<number | null>(initialCourseId || null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [moduleSearch, setModuleSearch] = useState("");

  // Options
  const todayDate = new Date().toISOString().slice(0, 10);
  const in30DaysDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [startsAt, setStartsAt] = useState(todayDate);
  const [endsAt, setEndsAt] = useState(in30DaysDate);
  const [singleStudentOnly, setSingleStudentOnly] = useState(true);
  const [label, setLabel] = useState("");

  // Existing codes
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [filterCourseId, setFilterCourseId] = useState<number | "all">("all");

  // State
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [lastGenerated, setLastGenerated] = useState<{
    code: string;
    scopeText: string;
    singleStudentOnly: boolean;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingCodeId, setDeletingCodeId] = useState<string | null>(null);

  // Load courses if not provided
  useEffect(() => {
    if (initialCourses && initialCourses.length > 0) {
      setCourses(initialCourses);
      if (!singleCourseId && initialCourses[0]) {
        setSingleCourseId(initialCourses[0].id);
      }
      return;
    }
    setLoadingCoursesList(true);
    api
      .getAdminPromoOptions()
      .then((opts) => {
        setCourses(opts.courses);
        if (opts.courses.length > 0 && opts.courses[0] && !singleCourseId) {
          setSingleCourseId(opts.courses[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load courses:", err);
      })
      .finally(() => setLoadingCoursesList(false));
  }, [initialCourses]);

  // Load codes
  const loadCodes = async () => {
    setLoadingCodes(true);
    setError("");
    try {
      const result = await api.listAccessCodes(filterCourseId === "all" ? null : filterCourseId);
      setCodes(result as AccessCode[]);
    } catch (err) {
      setError(getClientErrorMessage(err, "Impossible de charger les codes existants."));
    } finally {
      setLoadingCodes(false);
    }
  };

  useEffect(() => {
    void loadCodes();
  }, [filterCourseId]);

  const applyPreset = (days: number) => {
    const start = startsAt ? new Date(startsAt) : new Date();
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    setEndsAt(end.toISOString().slice(0, 10));
  };

  // Filtered courses for multi-select
  const filteredCourses = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => c.title.toLowerCase().includes(q));
  }, [courses, moduleSearch]);

  const toggleCourseSelection = (id: number) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectAllCourses = () => {
    setSelectedCourseIds(courses.map((c) => c.id));
  };

  const clearSelectedCourses = () => {
    setSelectedCourseIds([]);
  };

  // Handle generation
  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    setLastGenerated(null);

    try {
      let target: { courseIds?: number[]; allModules?: boolean; courseId?: number };
      let scopeDescription = "";

      if (scopeType === "all") {
        target = { allModules: true };
        scopeDescription = `Tous les modules (${courses.length} modules)`;
      } else if (scopeType === "multiple") {
        if (selectedCourseIds.length === 0) {
          throw new Error("Veuillez sélectionner au moins un module dans la liste.");
        }
        target = { courseIds: selectedCourseIds };
        const selectedTitles = courses
          .filter((c) => selectedCourseIds.includes(c.id))
          .map((c) => c.title);
        scopeDescription = `${selectedCourseIds.length} modules (${selectedTitles.join(", ")})`;
      } else {
        if (!singleCourseId) {
          throw new Error("Veuillez choisir un module.");
        }
        target = { courseId: singleCourseId, courseIds: [singleCourseId] };
        const c = courses.find((item) => item.id === singleCourseId);
        scopeDescription = c ? c.title : `Module #${singleCourseId}`;
      }

      const result = await api.generateAccessCode(target, {
        startsAt: startsAt ? new Date(`${startsAt}T00:00:00`).toISOString() : undefined,
        endsAt: endsAt ? new Date(`${endsAt}T23:59:59`).toISOString() : undefined,
        singleStudentOnly,
        label: label.trim() || undefined,
      });

      setLastGenerated({
        code: result.code,
        scopeText: scopeDescription,
        singleStudentOnly: result.singleStudentOnly ?? singleStudentOnly,
      });

      await loadCodes();
    } catch (err) {
      setError(getClientErrorMessage(err, "Impossible de générer le code d'accès."));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleDeleteCode = async (codeId: string, codeStr: string) => {
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer définitivement le code d'accès "${codeStr}" ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    setDeletingCodeId(codeId);
    setError("");
    try {
      await api.deleteAccessCode(codeId);
      setCodes((prev) => prev.filter((c) => c.id !== codeId));
    } catch (err) {
      setError(getClientErrorMessage(err, "Impossible de supprimer le code d'accès."));
    } finally {
      setDeletingCodeId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ───────────────────────────────────────────────────────────
          CONFIGURATION & GENERATE CARD
         ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-slate-900/60 to-slate-950/80 p-5 md:p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">Générer un code d&apos;accès</h2>
              <p className="text-xs text-slate-400">
                Créez un code utilisable sur un ou plusieurs modules pour <strong>un seul étudiant</strong>.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
            <ShieldCheck className="h-3 w-3" /> 100% Offert
          </span>
        </div>

        {/* ── SCOPE TYPE SELECTOR TABS ── */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Périmètre d&apos;application du code
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setScopeType("multiple")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
                scopeType === "multiple"
                  ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200 shadow-md shadow-emerald-950/40"
                  : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Plusieurs modules</span>
              {selectedCourseIds.length > 0 && scopeType === "multiple" && (
                <span className="rounded-full bg-emerald-500/30 px-1.5 py-0.2 text-[10px] text-emerald-200">
                  {selectedCourseIds.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setScopeType("all")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
                scopeType === "all"
                  ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200 shadow-md shadow-emerald-950/40"
                  : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Tous les modules</span>
            </button>

            <button
              type="button"
              onClick={() => setScopeType("single")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
                scopeType === "single"
                  ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200 shadow-md shadow-emerald-950/40"
                  : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Module unique</span>
            </button>
          </div>
        </div>

        {/* ── SCOPE CONTENT ── */}
        {scopeType === "single" && (
          <div className="space-y-1.5 rounded-xl border border-white/10 bg-slate-950/50 p-3.5">
            <label htmlFor="select-single-course" className="text-xs font-semibold text-slate-300">
              Module concerné :
            </label>
            <select
              id="select-single-course"
              value={singleCourseId ?? ""}
              onChange={(e) => setSingleCourseId(Number(e.target.value) || null)}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
            >
              <option value="">-- Sélectionner un module --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {scopeType === "all" && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3.5 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-emerald-200">
                Périmètre global : Catalogue complet ({courses.length} modules)
              </p>
              <p className="text-slate-300 leading-relaxed">
                Ce code donnera à l&apos;étudiant accès à la totalité des modules actuels et futurs de la plateforme
                pendant la durée définie.
              </p>
            </div>
          </div>
        )}

        {scopeType === "multiple" && (
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300">
                Sélectionnez les modules inclus ({selectedCourseIds.length}/{courses.length} sélectionnés) :
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllCourses}
                  className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <CheckSquare className="h-3 w-3 text-emerald-400" /> Tout cocher
                </button>
                <button
                  type="button"
                  onClick={clearSelectedCourses}
                  className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <Square className="h-3 w-3" /> Tout décocher
                </button>
              </div>
            </div>

            {/* Filter search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={moduleSearch}
                onChange={(e) => setModuleSearch(e.target.value)}
                placeholder="Filtrer un module par titre..."
                className="w-full rounded-lg border border-white/10 bg-slate-900/80 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-400/50"
              />
            </div>

            {/* Courses list */}
            {loadingCoursesList ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            ) : filteredCourses.length === 0 ? (
              <p className="text-center py-3 text-xs text-slate-500">Aucun module correspondant.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 pr-2">
                {filteredCourses.map((c) => {
                  const isSelected = selectedCourseIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2.5 rounded-lg border p-2 text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                          : "border-white/5 bg-slate-900/40 text-slate-300 hover:border-white/15 hover:bg-slate-900/80"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCourseSelection(c.id)}
                        className="h-3.5 w-3.5 rounded border-white/20 bg-slate-800 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="truncate font-medium">{c.title}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── EXCLUSIVITY BANNER: STRICTEMENT 1 SEUL ÉTUDIANT ── */}
        <div className="rounded-xl border border-sky-400/25 bg-gradient-to-r from-sky-500/10 via-emerald-500/10 to-transparent p-3.5 flex items-start gap-3">
          <UserCheck className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-sky-200">
                👤 Règle d&apos;usage exclusif : 1 seul étudiant
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-300">
                <input
                  type="checkbox"
                  checked={singleStudentOnly}
                  onChange={(e) => setSingleStudentOnly(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-white/20 bg-slate-800 text-emerald-500"
                />
                <span>Verrouillé strictement à 1 seul étudiant</span>
              </label>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Ce code peut couvrir plusieurs modules, mais il est réservé à <strong>un unique étudiant</strong>.
              Dès sa première saisie par l&apos;étudiant, le code est définitivement lié à son compte :{" "}
              <strong>aucun autre compte ne pourra l&apos;activer</strong>, et tous les modules sélectionnés lui
              seront immédiatement débloqués.
            </p>
          </div>
        </div>

        {/* ── DATES SECTION ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label className="block text-xs text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300 mb-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-300" /> Date de début d&apos;accès
            </span>
            <input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
            />
          </label>

          <label className="block text-xs text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300 mb-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-300" /> Date de fin d&apos;accès
            </span>
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
            />
          </label>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-500">Raccourcis durée :</span>
          <button
            type="button"
            onClick={() => applyPreset(30)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white"
          >
            +30 jours
          </button>
          <button
            type="button"
            onClick={() => applyPreset(60)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white"
          >
            +60 jours
          </button>
          <button
            type="button"
            onClick={() => applyPreset(90)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white"
          >
            +90 jours (3 mois)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(180)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white"
          >
            +180 jours (Semestre)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(365)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white"
          >
            +1 an (Année complète)
          </button>
        </div>

        {/* Note / Libellé */}
        <label className="block text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Note / Nom de l&apos;étudiant (Optionnel)</span>
          <input
            type="text"
            placeholder="Ex: Étudiant Yassine B. - Semestre 1"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
          />
        </label>

        {/* Generate Button */}
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={generating}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 transition-colors hover:bg-emerald-500 disabled:opacity-60"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {generating
            ? "Génération du code en cours…"
            : scopeType === "all"
              ? "Générer le code pour TOUS les modules"
              : scopeType === "multiple"
                ? `Générer le code pour ${selectedCourseIds.length} module(s) (1 seul étudiant)`
                : "Générer le code d'accès (1 seul étudiant)"}
        </button>

        {/* Last generated result */}
        {lastGenerated && (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-1">
              <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                ✓ Code d&apos;accès généré avec succès
              </p>
              <p className="font-mono text-2xl font-black tracking-widest text-white">
                {lastGenerated.code}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-emerald-200">
                <span className="rounded-md bg-emerald-950/60 px-2 py-0.5 font-medium border border-emerald-400/30">
                  {lastGenerated.scopeText}
                </span>
                <span className="rounded-md bg-sky-950/60 px-2 py-0.5 font-medium border border-sky-400/30 text-sky-200">
                  👤 Réservé à 1 seul étudiant
                </span>
                <span className="text-[11px] text-emerald-300/80">
                  Valide du {startsAt} au {endsAt}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleCopy(lastGenerated.code)}
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500/30 transition-colors"
            >
              {copiedCode === lastGenerated.code ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copier le code</span>
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────
          EXISTING CODES LIST
         ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Codes existants ({codes.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter by course */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="h-3.5 w-3.5" />
              <select
                value={filterCourseId}
                onChange={(e) =>
                  setFilterCourseId(e.target.value === "all" ? "all" : Number(e.target.value))
                }
                className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white outline-none focus:border-emerald-400/50"
              >
                <option value="all">Tous les modules (Tout afficher)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => void loadCodes()}
              disabled={loadingCodes}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
              title="Actualiser la liste"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingCodes ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {loadingCodes ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : codes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">
            Aucun code d&apos;accès trouvé pour ce filtre.
          </div>
        ) : (
          <div className="space-y-2.5">
            {codes.map((c) => {
              const used = c.totalConfirmedUses;
              const maxTotal = c.maxTotalUses ?? 1;
              const isExhausted = used >= maxTotal;
              const colorClass = STATUS_COLOR[c.administrativeStatus] ?? "text-slate-400";
              const labelText = STATUS_LABEL[c.administrativeStatus] ?? c.administrativeStatus;

              // Modules covered
              const modulesList = c.modules?.map((m) => m.course.title) || [];
              const isAllModules = Boolean(c.appliesToAllModules);
              const isSingleStudent = c.internalName?.includes("[1 etudiant]") || maxTotal <= (modulesList.length || 1);

              // Usage / student info
              const primaryUsage = c.usages && c.usages.length > 0 ? c.usages[0] : null;

              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-white/[0.08] bg-slate-950/40 p-3.5 transition-all hover:border-emerald-500/30 hover:bg-slate-950/60 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Code & Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-base font-black text-white tracking-wider">
                        {c.code}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${colorClass}`}>
                        {labelText}
                      </span>
                      {isExhausted && (
                        <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                          Utilisé
                        </span>
                      )}
                      {isSingleStudent && (
                        <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                          👤 1 étudiant
                        </span>
                      )}
                      {isAllModules ? (
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                          ✨ Tous les modules
                        </span>
                      ) : modulesList.length > 1 ? (
                        <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-200">
                          📚 {modulesList.length} modules
                        </span>
                      ) : modulesList.length === 1 ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                          🎯 {modulesList[0]}
                        </span>
                      ) : null}
                    </div>

                    {/* Actions: Copy & Delete */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => void handleCopy(c.code)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:border-white/20 hover:text-white transition-colors"
                        title="Copier le code"
                      >
                        {copiedCode === c.code ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                            <span className="text-emerald-300 text-[11px]">Copié</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span className="text-[11px]">Copier</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDeleteCode(c.id, c.code)}
                        disabled={deletingCodeId === c.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/20 hover:border-red-400/40 hover:text-red-200 transition-colors disabled:opacity-50"
                        title="Supprimer définitivement ce code d'accès"
                      >
                        {deletingCodeId === c.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-red-300" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        <span className="text-[11px]">Supprimer</span>
                      </button>
                    </div>
                  </div>

                  {/* Modules detail if multi-module */}
                  {!isAllModules && modulesList.length > 1 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {modulesList.map((title, idx) => (
                        <span
                          key={idx}
                          className="rounded-md border border-white/5 bg-slate-900/60 px-2 py-0.5 text-[10px] text-slate-400"
                        >
                          {title}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Activation info & dates */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400 pt-1 border-t border-white/[0.04]">
                    <div>
                      {primaryUsage ? (
                        <span className="text-emerald-300 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Activé par {primaryUsage.user.fullName || primaryUsage.user.email} (
                          {new Date(primaryUsage.createdAt).toLocaleDateString("fr-MA")})
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          ⏳ Non encore activé (en attente de l&apos;étudiant)
                        </span>
                      )}
                    </div>
                    <div>
                      Période : {new Date(c.startsAt).toLocaleDateString("fr-MA")} ➔{" "}
                      {new Date(c.endsAt).toLocaleDateString("fr-MA")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
