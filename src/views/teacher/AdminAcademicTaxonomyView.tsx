import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BookOpen, FolderTree, Layers, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { AcademicDisciplineInput, AcademicDomainInput } from "../../hooks/useTeacherDashboard";
import type { Course, Discipline, FacultyDomain } from "../../types";
import { curriculumUi, getAdminStepTheme } from "./curriculum-theme";

type AcademicTaxonomyViewMode = "all" | "domains" | "disciplines";

export interface AdminAcademicTaxonomyViewProps {
  mode?: AcademicTaxonomyViewMode;
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
  color: "from-emerald-600 to-green-600",
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
  inputClassName,
}: {
  value: AcademicDomainInput;
  onChange: (next: AcademicDomainInput) => void;
  inputClassName: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
      <input
        required
        value={value.name}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
        placeholder="Nom du domaine"
        className={`${inputClassName} lg:col-span-2`}
      />
      <input
        value={value.description || ""}
        onChange={(event) => onChange({ ...value, description: event.target.value })}
        placeholder="Description"
        className={`${inputClassName} lg:col-span-2`}
      />
      <input
        value={value.iconName || ""}
        onChange={(event) => onChange({ ...value, iconName: event.target.value })}
        placeholder="Icône"
        className={inputClassName}
      />
      <input
        type="number"
        min={0}
        value={toOrderValue(value.order)}
        onChange={(event) => onChange({ ...value, order: parseOrderValue(event.target.value) })}
        placeholder="Ordre"
        className={inputClassName}
      />
    </div>
  );
}

function DisciplineInputGrid({
  value,
  domains,
  showDomainSelect,
  onChange,
  inputClassName,
  selectClassName,
}: {
  value: AcademicDisciplineInput;
  domains: FacultyDomain[];
  showDomainSelect?: boolean;
  onChange: (next: AcademicDisciplineInput) => void;
  inputClassName: string;
  selectClassName: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
      {showDomainSelect && (
        <select
          value={value.domainId || domains[0]?.id || ""}
          onChange={(event) => onChange({ ...value, domainId: Number(event.target.value) })}
          className={selectClassName}
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
        className={`${inputClassName} ${showDomainSelect ? "lg:col-span-2" : "lg:col-span-3"}`}
      />
      <input
        value={value.slug || ""}
        onChange={(event) => onChange({ ...value, slug: event.target.value })}
        placeholder="Slug optionnel"
        className={inputClassName}
      />
      <input
        type="number"
        min={0}
        value={toOrderValue(value.order)}
        onChange={(event) => onChange({ ...value, order: parseOrderValue(event.target.value) })}
        placeholder="Ordre"
        className={inputClassName}
      />
    </div>
  );
}

export default function AdminAcademicTaxonomyView({
  mode = "all",
  domains,
  courses,
  taxonomyStatusMsg,
  isSavingTaxonomy,
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

  const stepTheme = getAdminStepTheme(mode === "disciplines" ? 2 : 1);
  const inputClassName = `${curriculumUi.input} ${stepTheme.focus}`;
  const selectClassName = `${curriculumUi.input} ${stepTheme.focus} text-slate-100`;

  const stats = useMemo(() => {
    const disciplineCount = domains.reduce((sum, domain) => sum + domain.disciplines.length, 0);
    const statTone = "bg-slate-800/90 text-emerald-300 border border-emerald-800/50";
    return [
      { label: "Domaines", value: domains.length, icon: FolderTree, tone: statTone },
      { label: "Sous-domaines", value: disciplineCount, icon: Layers, tone: statTone },
      { label: "Modules", value: courses.length, icon: BookOpen, tone: statTone },
    ];
  }, [courses.length, domains]);
  const showDomainManagement = mode !== "disciplines";
  const showDisciplineManagement = mode !== "domains";
  const headerCopy =
    mode === "domains"
      ? {
          eyebrow: "Étape 1",
          title: "Domaines académiques",
          description: "Créez et organisez les grandes familles avant les sous-domaines.",
        }
      : mode === "disciplines"
        ? {
            eyebrow: "Étape 2",
            title: "Sous-domaines",
            description: "Rattachez chaque sous-domaine à son domaine avant de créer les modules.",
          }
        : {
            eyebrow: "Administration",
            title: "Domaines & sous-domaines",
            description: "Domaine → Sous-domaine → Modules",
          };

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
    <div
      className={`${curriculumUi.panel} ${stepTheme.panel} space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300`}
    >
      <header className={`${curriculumUi.divider} pb-6`}>
        <div className="flex min-w-0 items-center gap-4">
          <span
            className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${stepTheme.chip}`}
          >
            <FolderTree className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400/90">{headerCopy.eyebrow}</p>
            <h1 className={curriculumUi.panelTitle}>{headerCopy.title}</h1>
            <p className={curriculumUi.panelSubtitle}>{headerCopy.description}</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${curriculumUi.card} p-5`}>
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${stat.tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm font-semibold text-slate-400">{stat.label}</p>
              <p className="mt-1 text-3xl font-black tabular-nums text-white">{stat.value}</p>
            </div>
          );
        })}
      </section>

      {taxonomyStatusMsg && <p className={curriculumUi.alertSuccess}>{taxonomyStatusMsg}</p>}

      <section
        className={`grid grid-cols-1 gap-4 ${showDomainManagement && showDisciplineManagement ? "xl:grid-cols-2" : ""}`}
      >
        {showDomainManagement && (
          <form onSubmit={submitDomain} className={`${curriculumUi.card} space-y-4 p-5`}>
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-400" />
              <h2 className={curriculumUi.sectionTitle}>Créer un domaine</h2>
            </div>
            <DomainInputGrid value={domainForm} onChange={setDomainForm} inputClassName={inputClassName} />
            <button
              type="submit"
              disabled={isSavingTaxonomy}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition-colors disabled:cursor-wait disabled:opacity-60 ${stepTheme.button}`}
            >
              <Save className="h-4 w-4" />
              Enregistrer le domaine
            </button>
          </form>
        )}

        {showDisciplineManagement && (
          <form onSubmit={submitDiscipline} className={`${curriculumUi.card} space-y-4 p-5`}>
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-400" />
              <h2 className={curriculumUi.sectionTitle}>Créer un sous-domaine</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <select
                required
                value={newDisciplineDomainId || ""}
                onChange={(event) => setNewDisciplineDomainId(Number(event.target.value))}
                className={selectClassName}
              >
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.name}
                  </option>
                ))}
              </select>
              <DisciplineInputGrid
                value={disciplineForm}
                domains={domains}
                onChange={setDisciplineForm}
                inputClassName={inputClassName}
                selectClassName={selectClassName}
              />
            </div>
            <button
              type="submit"
              disabled={isSavingTaxonomy || !domains.length}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition-colors disabled:cursor-wait disabled:opacity-60 ${stepTheme.button}`}
            >
              <Save className="h-4 w-4" />
              Enregistrer le sous-domaine
            </button>
          </form>
        )}
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
              <article key={domain.id} className={`overflow-hidden ${curriculumUi.card}`}>
                <div className="flex flex-col gap-4 border-b border-slate-700/60 p-5 lg:flex-row lg:items-start lg:justify-between">
                  {showDomainManagement && editingDomainId === domain.id ? (
                    <form onSubmit={submitDomainEdit} className="flex-1 space-y-3">
                      <DomainInputGrid
                        value={editingDomainForm}
                        onChange={setEditingDomainForm}
                        inputClassName={inputClassName}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={isSavingTaxonomy}
                          className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-black disabled:cursor-wait disabled:opacity-60 ${stepTheme.button}`}
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
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${stepTheme.chip}`}>
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

                  {showDomainManagement && editingDomainId !== domain.id && (
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
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>

                {showDisciplineManagement && (
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
                                  inputClassName={inputClassName}
                                  selectClassName={selectClassName}
                                />
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="submit"
                                    disabled={isSavingTaxonomy}
                                    className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-black disabled:cursor-wait disabled:opacity-60 ${stepTheme.button}`}
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
                                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
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
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
