import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BookOpen, FolderTree, Layers, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import type { AcademicDisciplineInput, AcademicDomainInput } from "../../hooks/useTeacherDashboard";
import type { Course, Discipline, FacultyDomain } from "../../types";

export interface AdminAcademicTaxonomyViewProps {
  domains: FacultyDomain[];
  courses: Course[];
  taxonomyStatusMsg: string;
  isSavingTaxonomy: boolean;
  refreshAcademicTaxonomy: () => void | Promise<void>;
  handleCreateAcademicDomain: (data: AcademicDomainInput) => void | Promise<void>;
  handleUpdateAcademicDomain: (domainId: number, data: AcademicDomainInput) => void | Promise<void>;
  handleDeleteAcademicDomain: (domainId: number, domainName: string) => void | Promise<void>;
  handleCreateAcademicDiscipline: (domainId: number, data: AcademicDisciplineInput) => void | Promise<void>;
  handleUpdateAcademicDiscipline: (disciplineId: number, data: AcademicDisciplineInput) => void | Promise<void>;
  handleDeleteAcademicDiscipline: (disciplineId: number, disciplineName: string) => void | Promise<void>;
}

const DEFAULT_DOMAIN_FORM: AcademicDomainInput = {
  name: "",
  description: "",
  iconName: "Layers",
  color: "from-violet-600 to-indigo-600",
  order: undefined,
};

function toOrderValue(value?: number) {
  return typeof value === "number" ? String(value) : "";
}

function parseOrderValue(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function DomainInputGrid({
  value,
  onChange,
}: {
  value: AcademicDomainInput;
  onChange: (next: AcademicDomainInput) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
      <input
        required
        value={value.name}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
        placeholder="Nom du domaine"
        className="min-h-11 rounded-lg border border-slate-700 bg-slate-950/80 px-3 text-sm font-bold text-white outline-none focus:border-violet-400 lg:col-span-2"
      />
      <input
        value={value.description || ""}
        onChange={(event) => onChange({ ...value, description: event.target.value })}
        placeholder="Description"
        className="min-h-11 rounded-lg border border-slate-700 bg-slate-950/80 px-3 text-sm font-semibold text-slate-100 outline-none focus:border-violet-400 lg:col-span-2"
      />
      <input
        value={value.iconName || ""}
        onChange={(event) => onChange({ ...value, iconName: event.target.value })}
        placeholder="Icône"
        className="min-h-11 rounded-lg border border-slate-700 bg-slate-950/80 px-3 text-sm font-semibold text-slate-100 outline-none focus:border-violet-400"
      />
      <input
        type="number"
        min={0}
        value={toOrderValue(value.order)}
        onChange={(event) => onChange({ ...value, order: parseOrderValue(event.target.value) })}
        placeholder="Ordre"
        className="min-h-11 rounded-lg border border-slate-700 bg-slate-950/80 px-3 text-sm font-semibold text-slate-100 outline-none focus:border-violet-400"
      />
    </div>
  );
}

function DisciplineInputGrid({
  value,
  domains,
  showDomainSelect,
  onChange,
}: {
  value: AcademicDisciplineInput;
  domains: FacultyDomain[];
  showDomainSelect?: boolean;
  onChange: (next: AcademicDisciplineInput) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
      {showDomainSelect && (
        <select
          value={value.domainId || domains[0]?.id || ""}
          onChange={(event) => onChange({ ...value, domainId: Number(event.target.value) })}
          className="min-h-11 rounded-lg border border-slate-700 bg-slate-950/80 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
        >
          {domains.map((domain) => (
            <option key={domain.id} value={domain.id}>
              {domain.name}
            </option>
          ))}
        </select>
      )}
      <input
        required
        value={value.name}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
        placeholder="Nom du sous-domaine"
        className={`min-h-11 rounded-lg border border-slate-700 bg-slate-950/80 px-3 text-sm font-bold text-white outline-none focus:border-violet-400 ${
          showDomainSelect ? "lg:col-span-2" : "lg:col-span-3"
        }`}
      />
      <input
        value={value.slug || ""}
        onChange={(event) => onChange({ ...value, slug: event.target.value })}
        placeholder="Slug optionnel"
        className="min-h-11 rounded-lg border border-slate-700 bg-slate-950/80 px-3 text-sm font-semibold text-slate-100 outline-none focus:border-violet-400"
      />
      <input
        type="number"
        min={0}
        value={toOrderValue(value.order)}
        onChange={(event) => onChange({ ...value, order: parseOrderValue(event.target.value) })}
        placeholder="Ordre"
        className="min-h-11 rounded-lg border border-slate-700 bg-slate-950/80 px-3 text-sm font-semibold text-slate-100 outline-none focus:border-violet-400"
      />
    </div>
  );
}

export default function AdminAcademicTaxonomyView({
  domains,
  courses,
  taxonomyStatusMsg,
  isSavingTaxonomy,
  refreshAcademicTaxonomy,
  handleCreateAcademicDomain,
  handleUpdateAcademicDomain,
  handleDeleteAcademicDomain,
  handleCreateAcademicDiscipline,
  handleUpdateAcademicDiscipline,
  handleDeleteAcademicDiscipline,
}: AdminAcademicTaxonomyViewProps) {
  const [domainForm, setDomainForm] = useState<AcademicDomainInput>(DEFAULT_DOMAIN_FORM);
  const [newDisciplineDomainId, setNewDisciplineDomainId] = useState<number>(domains[0]?.id || 0);
  const [disciplineForm, setDisciplineForm] = useState<AcademicDisciplineInput>({ name: "" });
  const [editingDomainId, setEditingDomainId] = useState<number | null>(null);
  const [editingDomainForm, setEditingDomainForm] = useState<AcademicDomainInput>(DEFAULT_DOMAIN_FORM);
  const [editingDisciplineId, setEditingDisciplineId] = useState<number | null>(null);
  const [editingDisciplineForm, setEditingDisciplineForm] = useState<AcademicDisciplineInput>({ name: "" });

  const coursesByDiscipline = useMemo(() => {
    const grouped = new Map<number, Course[]>();
    courses.forEach((course) => {
      const current = grouped.get(course.disciplineId) || [];
      current.push(course);
      grouped.set(course.disciplineId, current);
    });
    return grouped;
  }, [courses]);

  const stats = useMemo(() => {
    const disciplineCount = domains.reduce((sum, domain) => sum + domain.disciplines.length, 0);
    return [
      { label: "Domaines", value: domains.length, icon: FolderTree, tone: "text-violet-300 bg-violet-500/10" },
      { label: "Sous-domaines", value: disciplineCount, icon: Layers, tone: "text-indigo-300 bg-indigo-500/10" },
      { label: "Modules", value: courses.length, icon: BookOpen, tone: "text-emerald-300 bg-emerald-500/10" },
    ];
  }, [courses.length, domains]);

  useEffect(() => {
    if (!domains.length) {
      setNewDisciplineDomainId(0);
      return;
    }
    setNewDisciplineDomainId((current) => (domains.some((domain) => domain.id === current) ? current : domains[0].id));
  }, [domains]);

  const beginEditDomain = (domain: FacultyDomain) => {
    setEditingDomainId(domain.id);
    setEditingDomainForm({
      name: domain.name,
      slug: domain.slug,
      iconName: domain.iconName,
      color: domain.color,
      description: domain.description,
      order: domain.order,
    });
  };

  const beginEditDiscipline = (discipline: Discipline) => {
    setEditingDisciplineId(discipline.id);
    setEditingDisciplineForm({
      domainId: discipline.domainId,
      name: discipline.name,
      slug: discipline.slug,
      order: discipline.order,
    });
  };

  const submitDomain = async (event: FormEvent) => {
    event.preventDefault();
    await handleCreateAcademicDomain(domainForm);
    setDomainForm(DEFAULT_DOMAIN_FORM);
  };

  const submitDiscipline = async (event: FormEvent) => {
    event.preventDefault();
    if (!newDisciplineDomainId) return;
    await handleCreateAcademicDiscipline(newDisciplineDomainId, disciplineForm);
    setDisciplineForm({ name: "" });
  };

  const submitDomainEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingDomainId) return;
    await handleUpdateAcademicDomain(editingDomainId, editingDomainForm);
    setEditingDomainId(null);
  };

  const submitDisciplineEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingDisciplineId) return;
    await handleUpdateAcademicDiscipline(editingDisciplineId, editingDisciplineForm);
    setEditingDisciplineId(null);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-slate-700/60 bg-[#07101f] p-4 text-slate-100 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-6 lg:p-8">
      <header className="flex flex-col gap-5 border-b border-slate-800/80 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-800 text-white">
            <FolderTree className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">Administration</p>
            <h1 className="text-2xl font-black text-white sm:text-3xl">Domaines & sous-domaines</h1>
            <p className="mt-1 text-sm text-slate-400">Domaine → Sous-domaine → Modules</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refreshAcademicTaxonomy()}
          disabled={isSavingTaxonomy}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-900/70 px-4 text-sm font-bold text-slate-100 transition-colors hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isSavingTaxonomy ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-slate-700/60 bg-[#0b1528] p-5">
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${stat.tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm font-semibold text-slate-400">{stat.label}</p>
              <p className="mt-1 text-3xl font-black tabular-nums text-white">{stat.value}</p>
            </div>
          );
        })}
      </section>

      {taxonomyStatusMsg && (
        <p className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-200">
          {taxonomyStatusMsg}
        </p>
      )}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <form onSubmit={submitDomain} className="rounded-xl border border-slate-700/60 bg-[#0b1528] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-violet-300" />
            <h2 className="text-sm font-black text-white">Créer un domaine</h2>
          </div>
          <DomainInputGrid value={domainForm} onChange={setDomainForm} />
          <button
            type="submit"
            disabled={isSavingTaxonomy}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-black text-white transition-colors hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Enregistrer le domaine
          </button>
        </form>

        <form onSubmit={submitDiscipline} className="rounded-xl border border-slate-700/60 bg-[#0b1528] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-300" />
            <h2 className="text-sm font-black text-white">Créer un sous-domaine</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <select
              required
              value={newDisciplineDomainId || ""}
              onChange={(event) => setNewDisciplineDomainId(Number(event.target.value))}
              className="min-h-11 rounded-lg border border-slate-700 bg-slate-950/80 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
            >
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </select>
            <DisciplineInputGrid value={disciplineForm} domains={domains} onChange={setDisciplineForm} />
          </div>
          <button
            type="submit"
            disabled={isSavingTaxonomy || !domains.length}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition-colors hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Enregistrer le sous-domaine
          </button>
        </form>
      </section>

      <section className="space-y-4">
        {domains.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center">
            <FolderTree className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-bold text-slate-300">Aucun domaine enregistré</p>
          </div>
        ) : (
          domains.map((domain) => {
            const canDeleteDomain = domain.disciplines.length === 0;
            return (
              <article key={domain.id} className="overflow-hidden rounded-xl border border-slate-700/60 bg-[#0b1528]">
                <div className="flex flex-col gap-4 border-b border-slate-700/60 p-5 lg:flex-row lg:items-start lg:justify-between">
                  {editingDomainId === domain.id ? (
                    <form onSubmit={submitDomainEdit} className="flex-1 space-y-3">
                      <DomainInputGrid value={editingDomainForm} onChange={setEditingDomainForm} />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={isSavingTaxonomy}
                          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-violet-600 px-3 text-xs font-black text-white hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
                        >
                          <Save className="h-4 w-4" />
                          Sauvegarder
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDomainId(null)}
                          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-600 px-3 text-xs font-bold text-slate-200 hover:bg-slate-800"
                        >
                          <X className="h-4 w-4" />
                          Annuler
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-white">{domain.name}</h3>
                        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-200">
                          {domain.disciplines.length} sous-domaine{domain.disciplines.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="mt-1 max-w-3xl text-sm text-slate-400">{domain.description}</p>
                      <p className="mt-2 text-[11px] font-semibold text-slate-500">
                        {domain.courseCount || 0} module{(domain.courseCount || 0) !== 1 ? "s" : ""} · ordre{" "}
                        {domain.order}
                      </p>
                    </div>
                  )}

                  {editingDomainId !== domain.id && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => beginEditDomain(domain)}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-600 px-3 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-800"
                      >
                        <Pencil className="h-4 w-4" />
                        Modifier
                      </button>
                      <button
                        type="button"
                        disabled={!canDeleteDomain || isSavingTaxonomy}
                        onClick={() => void handleDeleteAcademicDomain(domain.id, domain.name)}
                        title={!canDeleteDomain ? "Supprimez d'abord les sous-domaines" : "Supprimer le domaine"}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-500/60 bg-rose-500/10 px-3 text-xs font-bold text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>

                <div className="divide-y divide-slate-700/60">
                  {domain.disciplines.length === 0 ? (
                    <p className="px-5 py-5 text-sm font-semibold text-slate-500">Aucun sous-domaine.</p>
                  ) : (
                    domain.disciplines.map((discipline) => {
                      const modules = coursesByDiscipline.get(discipline.id) || [];
                      const canDeleteDiscipline = modules.length === 0;
                      return (
                        <div key={discipline.id} className="p-5">
                          {editingDisciplineId === discipline.id ? (
                            <form onSubmit={submitDisciplineEdit} className="space-y-3">
                              <DisciplineInputGrid
                                value={editingDisciplineForm}
                                domains={domains}
                                showDomainSelect
                                onChange={setEditingDisciplineForm}
                              />
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="submit"
                                  disabled={isSavingTaxonomy}
                                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-xs font-black text-white hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60"
                                >
                                  <Save className="h-4 w-4" />
                                  Sauvegarder
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingDisciplineId(null)}
                                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-600 px-3 text-xs font-bold text-slate-200 hover:bg-slate-800"
                                >
                                  <X className="h-4 w-4" />
                                  Annuler
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-black text-white">{discipline.name}</p>
                                  <span className="rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold text-slate-400">
                                    {modules.length} module{modules.length !== 1 ? "s" : ""}
                                  </span>
                                </div>
                                {modules.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {modules.slice(0, 5).map((course) => (
                                      <span
                                        key={course.id}
                                        className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[11px] font-semibold text-slate-300"
                                      >
                                        {course.title}
                                      </span>
                                    ))}
                                    {modules.length > 5 && (
                                      <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[11px] font-semibold text-slate-500">
                                        +{modules.length - 5}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs font-semibold text-slate-500">Aucun module rattaché.</p>
                                )}
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => beginEditDiscipline(discipline)}
                                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-600 px-3 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-800"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Modifier
                                </button>
                                <button
                                  type="button"
                                  disabled={!canDeleteDiscipline || isSavingTaxonomy}
                                  onClick={() => void handleDeleteAcademicDiscipline(discipline.id, discipline.name)}
                                  title={
                                    !canDeleteDiscipline
                                      ? "Déplacez d'abord les modules attachés"
                                      : "Supprimer le sous-domaine"
                                  }
                                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-500/60 bg-rose-500/10 px-3 text-xs font-bold text-rose-200 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
