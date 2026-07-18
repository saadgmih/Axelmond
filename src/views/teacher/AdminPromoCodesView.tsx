import { cloneElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  BadgePercent,
  CalendarClock,
  Copy,
  Eye,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldOff,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../../api";
import { getClientErrorMessage } from "../../client-errors";
import type {
  PromoCalendarDuration,
  PromoCodeDetails,
  PromoCodeInput,
  PromoCodeView,
  PromoEligibilityScope,
  PromoStatus,
} from "../../promo-code-types";
import { formatMad } from "../../utils/morocco-locale";

type Options = Awaited<ReturnType<typeof api.getAdminPromoOptions>>;
type DateMode = "PRECISE" | "RELATIVE";

const statuses: Array<{ value: PromoStatus | ""; label: string }> = [
  { value: "", label: "Tous les statuts" },
  { value: "DRAFT", label: "Brouillon" },
  { value: "SCHEDULED", label: "Programmé" },
  { value: "ACTIVE", label: "Actif" },
  { value: "PAUSED", label: "Suspendu" },
  { value: "EXPIRED", label: "Expiré" },
  { value: "DISABLED", label: "Désactivé" },
  { value: "ARCHIVED", label: "Archivé" },
];

const statusLabels = Object.fromEntries(statuses.map((status) => [status.value, status.label]));
const durationFields: Array<[keyof PromoCalendarDuration, string]> = [
  ["years", "Années"],
  ["months", "Mois"],
  ["days", "Jours"],
  ["hours", "Heures"],
  ["minutes", "Minutes"],
  ["seconds", "Secondes"],
];

const eligibilityLabels: Record<PromoEligibilityScope, string> = {
  ALL_STUDENTS: "Tous les étudiants",
  NEW_STUDENTS: "Nouveaux étudiants",
  EXISTING_STUDENTS: "Étudiants existants",
  SELECTED_USERS: "Utilisateurs sélectionnés",
  SELECTED_FILIERES: "Filières sélectionnées",
};

function formatCalendarDuration(duration: PromoCalendarDuration | null) {
  if (!duration) return "Dates précises";
  const parts = durationFields
    .filter(([key]) => duration[key] > 0)
    .map(([key, label]) => `${duration[key]} ${label.toLocaleLowerCase("fr")}`);
  return parts.length ? parts.join(", ") : "0 seconde";
}

function toDateTimeLocal(value: string | Date) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "00";
  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}:${read("second")}`;
}

function defaultForm(): PromoCodeInput {
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + 7 * 86_400_000);
  return {
    code: "",
    internalName: "",
    publicDescription: "",
    internalDescription: "",
    discountType: "PERCENTAGE",
    discountValue: 20,
    maximumDiscountAmount: null,
    minimumPurchaseAmount: null,
    startsAt: toDateTimeLocal(startsAt),
    endsAt: toDateTimeLocal(endsAt),
    duration: { years: 0, months: 0, days: 7, hours: 0, minutes: 0, seconds: 0 },
    administrativeStatus: "DRAFT",
    appliesToAllModules: false,
    courseIds: [],
    eligibilityScope: "ALL_STUDENTS",
    eligibleUserIds: [],
    eligibleFilieres: [],
    firstPurchaseOnly: false,
    maxTotalUses: null,
    maxUsesPerUser: 1,
    priority: 0,
  };
}

function statusTone(status: PromoStatus) {
  if (status === "ACTIVE") return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
  if (status === "SCHEDULED") return "border-sky-400/30 bg-sky-500/15 text-sky-200";
  if (status === "PAUSED" || status === "DRAFT") return "border-amber-400/30 bg-amber-500/15 text-amber-100";
  return "border-slate-500/30 bg-slate-500/15 text-slate-300";
}

export default function AdminPromoCodesView() {
  const [items, setItems] = useState<PromoCodeView[]>([]);
  const [options, setOptions] = useState<Options | null>(null);
  const [selected, setSelected] = useState<PromoCodeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<PromoStatus | "">("");
  const [discountType, setDiscountType] = useState("");
  const [usage, setUsage] = useState("");
  const [courseId, setCourseId] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const [startsFrom, setStartsFrom] = useState("");
  const [endsBefore, setEndsBefore] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dateMode, setDateMode] = useState<DateMode>("PRECISE");
  const [form, setForm] = useState<PromoCodeInput>(() => defaultForm());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, adminOptions] = await Promise.all([
        api.getAdminPromoCodes({
          q,
          status,
          discountType,
          usage,
          courseId: courseId ? Number(courseId) : undefined,
          creatorId,
          startsFrom: startsFrom ? `${startsFrom}T00:00:00` : undefined,
          endsBefore: endsBefore ? `${endsBefore}T23:59:59` : undefined,
          includeArchived,
          page,
          pageSize: 25,
        }),
        options ? Promise.resolve(options) : api.getAdminPromoOptions(),
      ]);
      setItems(list.items);
      setTotalPages(list.totalPages);
      setOptions(adminOptions);
    } catch (loadError) {
      setError(getClientErrorMessage(loadError, "Impossible de charger les codes promotionnels."));
    } finally {
      setLoading(false);
    }
  }, [courseId, creatorId, discountType, endsBefore, includeArchived, options, page, q, startsFrom, status, usage]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selectedCourseIds = useMemo(() => new Set(form.courseIds), [form.courseIds]);
  const selectedUserIds = useMemo(() => new Set(form.eligibleUserIds || []), [form.eligibleUserIds]);
  const selectedFilieres = useMemo(() => new Set(form.eligibleFilieres || []), [form.eligibleFilieres]);

  const openCreate = () => {
    setEditingId(null);
    setDateMode("PRECISE");
    setForm(defaultForm());
    setEditorOpen(true);
    setError("");
  };

  const openEdit = (promo: PromoCodeView) => {
    setEditingId(promo.id);
    setDateMode(promo.relativeDuration ? "RELATIVE" : "PRECISE");
    setForm({
      code: promo.code,
      internalName: promo.internalName,
      publicDescription: promo.publicDescription || "",
      internalDescription: promo.internalDescription || "",
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      maximumDiscountAmount: promo.maximumDiscountAmount,
      minimumPurchaseAmount: promo.minimumPurchaseAmount,
      startsAt: toDateTimeLocal(promo.startsAt),
      endsAt: toDateTimeLocal(promo.endsAt),
      duration: promo.relativeDuration || { years: 0, months: 0, days: 1, hours: 0, minutes: 0, seconds: 0 },
      administrativeStatus: promo.administrativeStatus,
      appliesToAllModules: promo.appliesToAllModules,
      courseIds: promo.modules.map((course) => course.id),
      eligibilityScope: promo.eligibilityScope,
      eligibleUserIds: promo.eligibleUsers.map((user) => user.id),
      eligibleFilieres: promo.eligibleFilieres,
      firstPurchaseOnly: promo.firstPurchaseOnly,
      maxTotalUses: promo.maxTotalUses,
      maxUsesPerUser: promo.maxUsesPerUser,
      priority: promo.priority,
      version: promo.version,
    });
    setEditorOpen(true);
    setError("");
  };

  const generate = async () => {
    try {
      const result = await api.generatePromoCode();
      setForm((current) => ({ ...current, code: result.code }));
    } catch (generateError) {
      setError(getClientErrorMessage(generateError, "Impossible de générer un code."));
    }
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload: PromoCodeInput = {
        ...form,
        code: form.code.trim().toUpperCase(),
        startsAt: form.startsAt,
        ...(dateMode === "PRECISE"
          ? { endsAt: form.endsAt, duration: null }
          : { duration: form.duration, endsAt: undefined }),
      };
      if (editingId) {
        await api.updateAdminPromoCode(editingId, payload);
        setMessage("Code promotionnel modifié. Les paiements historiques conservent leurs snapshots.");
      } else {
        await api.createAdminPromoCode(payload);
        setMessage("Code promotionnel créé.");
      }
      setEditorOpen(false);
      await load();
    } catch (saveError) {
      setError(getClientErrorMessage(saveError, "Impossible d’enregistrer le code promotionnel."));
    } finally {
      setSaving(false);
    }
  };

  const viewDetails = async (id: string) => {
    setError("");
    try {
      setSelected(await api.getAdminPromoCode(id));
    } catch (detailError) {
      setError(getClientErrorMessage(detailError, "Impossible de charger le détail."));
    }
  };

  const changeStatus = async (promo: PromoCodeView, action: "activate" | "pause" | "disable" | "archive") => {
    const destructive = action === "disable" || action === "archive";
    if (
      destructive &&
      !window.confirm(
        action === "disable"
          ? "Ce code ne pourra plus être utilisé pour de nouveaux paiements. Les paiements déjà confirmés conserveront leur réduction."
          : "Archiver ce code ? Il restera consultable dans l’historique mais ne sera plus utilisable.",
      )
    ) {
      return;
    }
    try {
      await api.setAdminPromoStatus(promo.id, action);
      setMessage("Statut mis à jour immédiatement.");
      setSelected(null);
      await load();
    } catch (statusError) {
      setError(getClientErrorMessage(statusError, "Impossible de modifier le statut."));
    }
  };

  const remove = async (promo: PromoCodeView) => {
    if (!window.confirm("Supprimer définitivement ce code jamais utilisé ? Cette action est irréversible.")) return;
    try {
      await api.deleteAdminPromoCode(promo.id);
      setMessage("Code supprimé définitivement.");
      setSelected(null);
      await load();
    } catch (deleteError) {
      setError(
        getClientErrorMessage(deleteError, "Ce code ne peut pas être supprimé. Archivez-le s’il a été utilisé."),
      );
    }
  };

  const duplicate = async (promo: PromoCodeView) => {
    try {
      await api.duplicateAdminPromoCode(promo.id);
      setMessage("Une copie en brouillon a été créée avec un code sécurisé.");
      await load();
    } catch (duplicateError) {
      setError(getClientErrorMessage(duplicateError, "Impossible de dupliquer ce code."));
    }
  };

  return (
    <main aria-label="Codes promotionnels" className="min-h-screen bg-[#071b18] p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Administration</p>
            <h1 className="mt-2 flex items-center gap-3 text-2xl font-black sm:text-3xl">
              <BadgePercent className="h-8 w-8 text-emerald-300" /> Codes promotionnels
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Créez, programmez et suivez les remises utilisées par PayPal et les paiements au centre.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" /> Créer un code promotionnel
          </button>
        </header>

        {(message || error) && (
          <div
            role={error ? "alert" : "status"}
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${error ? "border-red-400/30 bg-red-500/10 text-red-200" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"}`}
          >
            {error || message}
          </div>
        )}

        <section
          aria-label="Filtres"
          className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4 sm:grid-cols-2 xl:grid-cols-5"
        >
          <label className="relative xl:col-span-2">
            <span className="sr-only">Rechercher</span>
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
              placeholder="Code, nom, module, description…"
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2.5 pl-10 pr-3 text-sm"
            />
          </label>
          <select
            aria-label="Filtrer par statut"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as PromoStatus | "");
              setPage(1);
            }}
            className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm"
          >
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrer par type de réduction"
            value={discountType}
            onChange={(event) => {
              setDiscountType(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm"
          >
            <option value="">Tous les types</option>
            <option value="PERCENTAGE">Pourcentage</option>
            <option value="FIXED">Montant fixe</option>
          </select>
          <select
            aria-label="Filtrer par utilisation"
            value={usage}
            onChange={(event) => {
              setUsage(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm"
          >
            <option value="">Utilisé ou non</option>
            <option value="USED">Déjà utilisé</option>
            <option value="UNUSED">Jamais utilisé</option>
          </select>
          <select
            aria-label="Filtrer par module"
            value={courseId}
            onChange={(event) => {
              setCourseId(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm"
          >
            <option value="">Tous les modules</option>
            {options?.courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrer par créateur"
            value={creatorId}
            onChange={(event) => {
              setCreatorId(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm"
          >
            <option value="">Tous les créateurs</option>
            {options?.creators.map((creator) => (
              <option key={creator.id} value={creator.id}>
                {creator.fullName}
              </option>
            ))}
          </select>
          <label className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
            Début à partir du
            <input
              type="date"
              value={startsFrom}
              onChange={(event) => {
                setStartsFrom(event.target.value);
                setPage(1);
              }}
              className="mt-1 block w-full bg-transparent text-sm text-slate-100"
            />
          </label>
          <label className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
            Fin au plus tard le
            <input
              type="date"
              value={endsBefore}
              onChange={(event) => {
                setEndsBefore(event.target.value);
                setPage(1);
              }}
              className="mt-1 block w-full bg-transparent text-sm text-slate-100"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => {
                setIncludeArchived(event.target.checked);
                setPage(1);
              }}
            />{" "}
            Archives
          </label>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/25">
          {loading ? (
            <div role="status" className="flex items-center justify-center gap-3 p-12 text-slate-400">
              <RefreshCw className="h-5 w-5 animate-spin" /> Chargement…
            </div>
          ) : items.length === 0 ? (
            <p className="p-12 text-center text-slate-400">Aucun code ne correspond aux filtres.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {items.map((promo) => (
                <article
                  key={promo.id}
                  className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[1.15fr_1fr_1fr_auto] xl:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-lg bg-emerald-500/15 px-2.5 py-1 font-black text-emerald-200">
                        {promo.code}
                      </code>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusTone(promo.effectiveStatus)}`}
                      >
                        {statusLabels[promo.effectiveStatus]}
                      </span>
                    </div>
                    <h2 className="mt-2 font-bold text-white">{promo.internalName}</h2>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                      {promo.publicDescription || "Aucune description publique"}
                    </p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="font-bold text-white">
                      {promo.discountType === "PERCENTAGE"
                        ? `${promo.discountValue} %`
                        : formatMad(promo.discountValue)}
                    </p>
                    {promo.maximumDiscountAmount && (
                      <p className="text-xs text-slate-400">Plafond {formatMad(promo.maximumDiscountAmount)}</p>
                    )}
                    <p className="text-xs text-slate-400">
                      {promo.appliesToAllModules
                        ? "Tous les modules"
                        : promo.modules.map((module) => module.title).join(", ")}
                    </p>
                  </div>
                  <div className="space-y-1 text-xs text-slate-400">
                    <p className="flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" /> {new Date(promo.startsAt).toLocaleString("fr-MA")}
                    </p>
                    <p>Fin : {new Date(promo.endsAt).toLocaleString("fr-MA")}</p>
                    <p className="font-semibold text-slate-200">Reste : {promo.remainingDuration}</p>
                    <p>
                      {promo.totalConfirmedUses} confirmée(s) · {promo.totalReservedUses} réservée(s) /{" "}
                      {promo.maxTotalUses ?? "∞"}
                    </p>
                    <p>
                      Créé le {new Date(promo.createdAt).toLocaleString("fr-MA")} par {promo.createdBy.fullName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:max-w-[260px] xl:justify-end">
                    <Action title="Consulter" onClick={() => void viewDetails(promo.id)} icon={Eye} />
                    <Action title="Modifier" onClick={() => openEdit(promo)} icon={Pencil} />
                    {promo.administrativeStatus === "ACTIVE" ? (
                      <Action title="Suspendre" onClick={() => void changeStatus(promo, "pause")} icon={Pause} />
                    ) : (
                      <Action title="Activer" onClick={() => void changeStatus(promo, "activate")} icon={Play} />
                    )}
                    <Action title="Dupliquer" onClick={() => void duplicate(promo)} icon={Copy} />
                    <Action
                      title="Désactiver maintenant"
                      onClick={() => void changeStatus(promo, "disable")}
                      icon={ShieldOff}
                      danger
                    />
                    <Action title="Archiver" onClick={() => void changeStatus(promo, "archive")} icon={Archive} />
                    <Action title="Supprimer" onClick={() => void remove(promo)} icon={Trash2} danger />
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-white/10 p-4 text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-40"
            >
              Précédent
            </button>
            <span>
              Page {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </section>
      </div>

      {editorOpen && options && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/85 backdrop-blur sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-editor-title"
        >
          <div className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0b1724] sm:rounded-3xl">
            <header className="flex items-start justify-between border-b border-white/10 p-5 sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Administration</p>
                <h2 id="promo-editor-title" className="mt-1 text-xl font-black">
                  {editingId ? "Modifier le code" : "Créer un code promotionnel"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                aria-label="Fermer"
                className="rounded-full p-2 hover:bg-white/10"
              >
                <X />
              </button>
            </header>
            <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
              {editingId && (
                <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-100">
                  Cette modification s’appliquera uniquement aux nouvelles utilisations. Les paiements déjà confirmés ne
                  seront pas modifiés.
                </p>
              )}
              <Fieldset legend="Informations générales">
                <Field label="Nom interne">
                  <input
                    value={form.internalName}
                    onChange={(event) => setForm({ ...form, internalName: event.target.value })}
                    required
                  />
                </Field>
                <Field label="Code promotionnel">
                  <div className="flex gap-2">
                    <input
                      value={form.code}
                      disabled={Boolean(editingId)}
                      onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                      className="font-mono uppercase"
                      required
                    />
                    <button
                      type="button"
                      disabled={Boolean(editingId)}
                      onClick={() => void generate()}
                      className="shrink-0 rounded-xl bg-emerald-600 px-3 text-xs font-black disabled:opacity-40"
                    >
                      <Sparkles className="inline h-4 w-4" /> Générer automatiquement
                    </button>
                  </div>
                </Field>
                <Field label="Description publique">
                  <textarea
                    value={form.publicDescription || ""}
                    onChange={(event) => setForm({ ...form, publicDescription: event.target.value })}
                    rows={2}
                  />
                </Field>
                <Field label="Description interne">
                  <textarea
                    value={form.internalDescription || ""}
                    onChange={(event) => setForm({ ...form, internalDescription: event.target.value })}
                    rows={2}
                  />
                </Field>
                <Field label="Statut initial">
                  <select
                    value={form.administrativeStatus}
                    onChange={(event) => setForm({ ...form, administrativeStatus: event.target.value as PromoStatus })}
                  >
                    {statuses
                      .filter((item) => item.value)
                      .map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Priorité">
                  <input
                    type="number"
                    value={form.priority || 0}
                    onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })}
                  />
                </Field>
              </Fieldset>

              <Fieldset legend="Réduction et montant">
                <Field label="Type de réduction">
                  <select
                    value={form.discountType}
                    onChange={(event) =>
                      setForm({ ...form, discountType: event.target.value as "PERCENTAGE" | "FIXED" })
                    }
                  >
                    <option value="PERCENTAGE">Pourcentage</option>
                    <option value="FIXED">Montant fixe en MAD</option>
                  </select>
                </Field>
                <Field label={form.discountType === "PERCENTAGE" ? "Réduction (%)" : "Réduction (MAD)"}>
                  <input
                    type="number"
                    min="0.01"
                    max={form.discountType === "PERCENTAGE" ? 100 : undefined}
                    step="0.01"
                    value={form.discountValue}
                    onChange={(event) => setForm({ ...form, discountValue: Number(event.target.value) })}
                  />
                </Field>
                {form.discountType === "PERCENTAGE" && (
                  <Field label="Réduction maximale (MAD, facultatif)">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.maximumDiscountAmount ?? ""}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          maximumDiscountAmount: event.target.value ? Number(event.target.value) : null,
                        })
                      }
                    />
                  </Field>
                )}
                <Field label="Montant minimum d’achat (MAD)">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.minimumPurchaseAmount ?? ""}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        minimumPurchaseAmount: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  />
                </Field>
              </Fieldset>

              <Fieldset legend="Période — fuseau Africa/Casablanca">
                <div className="sm:col-span-2 flex gap-2" role="radiogroup" aria-label="Méthode de durée">
                  <button
                    type="button"
                    onClick={() => setDateMode("PRECISE")}
                    className={`rounded-xl px-3 py-2 text-sm font-bold ${dateMode === "PRECISE" ? "bg-emerald-600" : "bg-white/5"}`}
                  >
                    Dates précises
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateMode("RELATIVE")}
                    className={`rounded-xl px-3 py-2 text-sm font-bold ${dateMode === "RELATIVE" ? "bg-emerald-600" : "bg-white/5"}`}
                  >
                    Durée relative
                  </button>
                </div>
                <Field label="Début">
                  <input
                    type="datetime-local"
                    step="1"
                    value={form.startsAt}
                    onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
                  />
                </Field>
                {dateMode === "PRECISE" ? (
                  <Field label="Fin">
                    <input
                      type="datetime-local"
                      step="1"
                      value={form.endsAt || ""}
                      onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
                    />
                  </Field>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:col-span-2 md:grid-cols-6">
                    {durationFields.map(([key, label]) => (
                      <Field key={key} label={label}>
                        <input
                          type="number"
                          min="0"
                          value={form.duration?.[key] || 0}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              duration: {
                                ...(form.duration || defaultForm().duration!),
                                [key]: Number(event.target.value),
                              },
                            })
                          }
                        />
                      </Field>
                    ))}
                  </div>
                )}
              </Fieldset>

              <Fieldset legend="Modules concernés">
                <label className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-white/10 p-3">
                  <input
                    type="checkbox"
                    checked={form.appliesToAllModules}
                    onChange={(event) => setForm({ ...form, appliesToAllModules: event.target.checked })}
                  />{" "}
                  Tous les modules
                </label>
                {!form.appliesToAllModules && (
                  <div className="grid max-h-48 gap-2 overflow-y-auto sm:col-span-2 sm:grid-cols-2">
                    {options.courses.map((course) => (
                      <label
                        key={course.id}
                        className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCourseIds.has(course.id)}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              courseIds: event.target.checked
                                ? [...form.courseIds, course.id]
                                : form.courseIds.filter((id) => id !== course.id),
                            })
                          }
                        />
                        <span>
                          {course.title} · {formatMad(course.price)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </Fieldset>

              <Fieldset legend="Éligibilité">
                <Field label="Utilisateurs concernés">
                  <select
                    value={form.eligibilityScope}
                    onChange={(event) =>
                      setForm({ ...form, eligibilityScope: event.target.value as PromoEligibilityScope })
                    }
                  >
                    <option value="ALL_STUDENTS">Tous les étudiants</option>
                    <option value="NEW_STUDENTS">Nouveaux étudiants</option>
                    <option value="EXISTING_STUDENTS">Étudiants existants</option>
                    <option value="SELECTED_USERS">Utilisateurs sélectionnés</option>
                    <option value="SELECTED_FILIERES">Filières sélectionnées</option>
                  </select>
                </Field>
                <label className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.firstPurchaseOnly}
                    onChange={(event) => setForm({ ...form, firstPurchaseOnly: event.target.checked })}
                  />{" "}
                  Première commande uniquement
                </label>
                {form.eligibilityScope === "SELECTED_USERS" && (
                  <div className="grid max-h-48 gap-2 overflow-y-auto sm:col-span-2 sm:grid-cols-2">
                    {options.students.map((student) => (
                      <label
                        key={student.id}
                        className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(student.id)}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              eligibleUserIds: event.target.checked
                                ? [...(form.eligibleUserIds || []), student.id]
                                : (form.eligibleUserIds || []).filter((id) => id !== student.id),
                            })
                          }
                        />{" "}
                        {student.fullName} · {student.email}
                      </label>
                    ))}
                  </div>
                )}
                {form.eligibilityScope === "SELECTED_FILIERES" && (
                  <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
                    {options.filieres.map((filiere) => {
                      const normalizedFiliere = filiere.trim().toLocaleLowerCase("fr");
                      return (
                        <label
                          key={normalizedFiliere}
                          className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFilieres.has(normalizedFiliere)}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                eligibleFilieres: event.target.checked
                                  ? [...(form.eligibleFilieres || []), normalizedFiliere]
                                  : (form.eligibleFilieres || []).filter(
                                      (value) => value.toLocaleLowerCase("fr") !== normalizedFiliere,
                                    ),
                              })
                            }
                          />{" "}
                          {filiere}
                        </label>
                      );
                    })}
                  </div>
                )}
              </Fieldset>

              <Fieldset legend="Limites d’utilisation">
                <Field label="Limite globale (vide = illimitée)">
                  <input
                    type="number"
                    min="1"
                    value={form.maxTotalUses ?? ""}
                    onChange={(event) =>
                      setForm({ ...form, maxTotalUses: event.target.value ? Number(event.target.value) : null })
                    }
                  />
                </Field>
                <Field label="Limite par étudiant (vide = illimitée)">
                  <input
                    type="number"
                    min="1"
                    value={form.maxUsesPerUser ?? ""}
                    onChange={(event) =>
                      setForm({ ...form, maxUsesPerUser: event.target.value ? Number(event.target.value) : null })
                    }
                  />
                </Field>
                <p className="sm:col-span-2 text-xs text-slate-400">
                  Un seul code peut être appliqué par paiement. Le cumul reste volontairement désactivé.
                </p>
              </Fieldset>
            </div>
            <footer className="flex flex-col-reverse gap-2 border-t border-white/10 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black disabled:opacity-60"
              >
                {saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Créer le code"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {selected && <PromoDetail detail={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}

function Action({
  title,
  onClick,
  icon: Icon,
  danger = false,
}: {
  title: string;
  onClick: () => void;
  icon: typeof Eye;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-lg border p-2 transition ${danger ? "border-red-400/20 text-red-300 hover:bg-red-500/10" : "border-white/10 text-slate-300 hover:bg-white/10"}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-2">
      <legend className="px-2 text-sm font-black text-emerald-200">{legend}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: React.ReactElement<{ className?: string }> }) {
  return (
    <label className="space-y-1.5 text-xs font-bold text-slate-300">
      <span>{label}</span>
      {cloneElement(children, {
        className: `w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-white outline-none focus:border-emerald-400/50 ${children.props.className || ""}`,
      })}
    </label>
  );
}

function PromoDetail({ detail, onClose }: { detail: PromoCodeDetails; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[125] flex items-end justify-center bg-slate-950/85 backdrop-blur sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-detail-title"
    >
      <div className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0b1724] sm:rounded-3xl">
        <header className="flex items-start justify-between border-b border-white/10 p-5">
          <div>
            <code className="text-emerald-300">{detail.code}</code>
            <h2 id="promo-detail-title" className="mt-1 text-xl font-black">
              {detail.internalName}
            </h2>
            <p className="text-xs text-slate-400">
              Statut administratif : {statusLabels[detail.administrativeStatus]} · effectif :{" "}
              {statusLabels[detail.effectiveStatus]}
            </p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-2 hover:bg-white/10">
            <X />
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Utilisations confirmées" value={detail.statistics.confirmedUses} />
            <Metric label="Réservations en cours" value={detail.statistics.activeReservations} />
            <Metric label="Montant avant réduction" value={formatMad(detail.statistics.totalOriginalAmount)} />
            <Metric label="Réductions totales" value={formatMad(detail.statistics.totalDiscountAmount)} />
            <Metric label="Montant payé" value={formatMad(detail.statistics.totalPaidAmount)} />
            <Metric label="PayPal" value={detail.statistics.paypalUses} />
            <Metric label="Paiement au centre" value={detail.statistics.centerUses} />
            <Metric label="Activation gratuite" value={detail.statistics.freeUses} />
            <Metric label="Annulées" value={detail.statistics.cancelledUses} />
            <Metric label="Libérées après expiration" value={detail.statistics.releasedUses} />
            <Metric label="Remboursées" value={detail.statistics.refundedUses} />
          </section>
          <section className="rounded-2xl border border-white/10 p-4">
            <h3 className="font-black text-emerald-200">Règles enregistrées</h3>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Description publique</dt>
                <dd>{detail.publicDescription || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Description interne</dt>
                <dd>{detail.internalDescription || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Réduction</dt>
                <dd>
                  {detail.discountType === "PERCENTAGE" ? `${detail.discountValue} %` : formatMad(detail.discountValue)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Plafond / minimum d’achat</dt>
                <dd>
                  {detail.maximumDiscountAmount == null ? "Aucun plafond" : formatMad(detail.maximumDiscountAmount)} ·{" "}
                  {detail.minimumPurchaseAmount == null
                    ? "Aucun minimum"
                    : `minimum ${formatMad(detail.minimumPurchaseAmount)}`}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Période</dt>
                <dd>
                  {new Date(detail.startsAt).toLocaleString("fr-MA")} →{" "}
                  {new Date(detail.endsAt).toLocaleString("fr-MA")}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Durée initiale / restante</dt>
                <dd>
                  {formatCalendarDuration(detail.relativeDuration)} · {detail.remainingDuration}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Modules</dt>
                <dd>{detail.appliesToAllModules ? "Tous" : detail.modules.map((module) => module.title).join(", ")}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Éligibilité</dt>
                <dd>
                  {eligibilityLabels[detail.eligibilityScope]}
                  {detail.eligibleUsers.length
                    ? ` : ${detail.eligibleUsers.map((user) => user.fullName).join(", ")}`
                    : ""}
                  {detail.eligibleFilieres.length ? ` : ${detail.eligibleFilieres.join(", ")}` : ""}
                  {detail.firstPurchaseOnly ? " · première commande uniquement" : ""}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Limites</dt>
                <dd>
                  {detail.maxTotalUses ?? "∞"} au total · {detail.maxUsesPerUser ?? "∞"} par étudiant
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Compteurs</dt>
                <dd>
                  {detail.totalConfirmedUses} confirmée(s) · {detail.totalReservedUses} réservée(s)
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Application</dt>
                <dd>
                  Priorité {detail.priority} · {detail.stackable ? "cumulable" : "non cumulable"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Création</dt>
                <dd>
                  {detail.createdBy.fullName} · {new Date(detail.createdAt).toLocaleString("fr-MA")}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Dernière modification</dt>
                <dd>{new Date(detail.updatedAt).toLocaleString("fr-MA")}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h3 className="font-black text-emerald-200">Modules les plus concernés</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {detail.statistics.topModules.length ? (
                detail.statistics.topModules.map((module) => (
                  <span key={module.id} className="rounded-full border border-white/10 px-3 py-1 text-xs">
                    {module.title} · {module.uses} utilisation(s)
                  </span>
                ))
              ) : (
                <p className="text-sm text-slate-500">Aucune utilisation confirmée.</p>
              )}
            </div>
          </section>
          <section>
            <h3 className="font-black text-emerald-200">Utilisations réelles</h3>
            <div className="mt-2 space-y-2">
              {detail.usages.length ? (
                detail.usages.map((usage) => (
                  <div
                    key={usage.id}
                    className="grid gap-2 rounded-xl border border-white/10 p-3 text-xs sm:grid-cols-4"
                  >
                    <span>
                      {usage.user.fullName}
                      <br />
                      <span className="text-slate-500">{usage.module.title}</span>
                    </span>
                    <span>
                      {usage.provider} · {usage.status}
                    </span>
                    <span>
                      {formatMad(usage.originalAmount)} − {formatMad(usage.discountAmount)}
                    </span>
                    <span className="font-bold text-emerald-200">{formatMad(usage.finalAmount)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Aucune utilisation.</p>
              )}
            </div>
          </section>
          <section>
            <h3 className="font-black text-emerald-200">Historique immuable</h3>
            <ol className="mt-2 space-y-2">
              {detail.auditLog.map((entry) => (
                <li key={entry.id} className="rounded-xl border border-white/10 p-3 text-xs">
                  <strong>{entry.action}</strong> · {new Date(entry.createdAt).toLocaleString("fr-MA")}
                  <br />
                  <span className="text-slate-500">
                    {entry.actor?.fullName || "Système"}
                    {entry.reason ? ` — ${entry.reason}` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
