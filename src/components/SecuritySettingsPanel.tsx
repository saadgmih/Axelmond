import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  KeyRound,
  Lock,
  Mail,
  Monitor,
  Plus,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { getClientErrorMessage } from "../client-errors";
import { api } from "../api";

type PasskeyRow = {
  id: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
};

interface SecuritySettingsPanelProps {
  layout?: "compact" | "wide";
  emailVerified?: boolean;
}

function computeSecurityScore(emailVerified: boolean, totpEnabled: boolean, passkeyCount: number) {
  let score = 25;
  if (emailVerified) score += 25;
  if (totpEnabled) score += 25;
  if (passkeyCount > 0) score += 25;
  return score;
}

function scoreLabel(score: number) {
  if (score >= 100) return "Excellent";
  if (score >= 75) return "Bon";
  if (score >= 50) return "Moyen";
  return "Faible";
}

function formatPasskeyAddedAt(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Ajoutée aujourd'hui à ${time}`;
  return `Ajoutée le ${date.toLocaleDateString("fr-FR")} à ${time}`;
}

function SecurityScoreRing({ score, label }: { score: number; label: string }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Score de sécurité</p>
        <p className="text-sm font-black text-emerald-400">{label}</p>
      </div>
      <div className="relative h-14 w-14">
        <svg className="h-14 w-14 -rotate-90" viewBox="0 0 64 64" aria-hidden>
          <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="#34d399"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-emerald-300">
          {score}%
        </span>
      </div>
    </div>
  );
}

function DarkInput({
  icon: Icon,
  trailing,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ComponentType<{ className?: string }>;
  trailing?: React.ReactNode;
}) {
  return (
    <div className={`relative ${className}`}>
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        {...props}
        className="w-full rounded-xl border border-white/10 bg-[#0c0d18] py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
      />
      {trailing ? <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div> : null}
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
  value,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400/90"
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-[10px] font-bold uppercase leading-snug tracking-wider text-slate-400">{label}</p>
        <p
          className={`mt-1 break-words text-xs font-bold leading-snug ${active ? "text-emerald-400" : "text-amber-400"}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default function SecuritySettingsPanel({
  layout = "compact",
  emailVerified = false,
}: SecuritySettingsPanelProps) {
  const [status, setStatus] = useState<{ totpEnabled: boolean; passkeyCount: number; passkeys: PasskeyRow[] } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [totpSetup, setTotpSetup] = useState<{ challengeId: string; qrDataUrl: string; manualEntryKey: string } | null>(
    null,
  );
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [passkeyDeviceName, setPasskeyDeviceName] = useState("Mon appareil");
  const [deletePassword, setDeletePassword] = useState("");
  const [showLearnMore, setShowLearnMore] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await api.getMfaStatus();
      setStatus({
        totpEnabled: Boolean(data.totpEnabled),
        passkeyCount: Number(data.passkeyCount || 0),
        passkeys: Array.isArray(data.passkeys) ? data.passkeys : [],
      });
    } catch (err: unknown) {
      setError(getClientErrorMessage(err, "Impossible de charger la sécurité du compte."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const securityScore = useMemo(
    () => computeSecurityScore(emailVerified, Boolean(status?.totpEnabled), status?.passkeyCount || 0),
    [emailVerified, status?.totpEnabled, status?.passkeyCount],
  );
  const securityLabel = scoreLabel(securityScore);
  const passkeyCount = status?.passkeyCount || 0;
  const totpEnabled = Boolean(status?.totpEnabled);
  const accountProtected = securityScore >= 75;

  const handleSetupTotp = async () => {
    setError("");
    setMessage("");
    try {
      const data = await api.setupTotp();
      setTotpSetup({
        challengeId: data.challengeId,
        qrDataUrl: data.qrDataUrl,
        manualEntryKey: data.manualEntryKey,
      });
    } catch (err: unknown) {
      setError(getClientErrorMessage(err, "Activation TOTP impossible."));
    }
  };

  const handleEnableTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpSetup) return;
    setError("");
    try {
      const data = await api.enableTotp(totpSetup.challengeId, totpCode.replace(/\s+/g, ""));
      setRecoveryCodes(Array.isArray(data.recoveryCodes) ? data.recoveryCodes : []);
      setTotpSetup(null);
      setTotpCode("");
      setMessage("Authentification TOTP activée.");
      await refresh();
    } catch (err: unknown) {
      setError(getClientErrorMessage(err, "Code TOTP invalide."));
    }
  };

  const handleDisableTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.disableTotp(disablePassword, disableCode.replace(/\s+/g, ""));
      setDisablePassword("");
      setDisableCode("");
      setMessage("TOTP désactivé.");
      await refresh();
    } catch (err: unknown) {
      setError(getClientErrorMessage(err, "Désactivation TOTP refusée."));
    }
  };

  const handleRegisterPasskey = async () => {
    setError("");
    setMessage("");
    try {
      if (!window.PublicKeyCredential) {
        setError("Les Passkeys ne sont pas supportées sur ce navigateur.");
        return;
      }
      const { options, challengeId } = await api.beginPasskeyRegister(passkeyDeviceName.trim() || undefined);
      const response = await startRegistration({ optionsJSON: options });
      await api.completePasskeyRegister(challengeId, response, passkeyDeviceName.trim() || undefined);
      setMessage("Passkey enregistrée.");
      await refresh();
    } catch (err: unknown) {
      setError(getClientErrorMessage(err, "Enregistrement Passkey refusé."));
    }
  };

  const handleDeletePasskey = async (id: string) => {
    if (!deletePassword) {
      setError("Saisissez votre mot de passe pour supprimer une Passkey.");
      return;
    }
    setError("");
    try {
      await api.deletePasskey(id, deletePassword);
      setMessage("Passkey supprimée.");
      await refresh();
    } catch (err: unknown) {
      setError(getClientErrorMessage(err, "Suppression Passkey refusée."));
    }
  };

  if (loading) {
    return (
      <p className={`text-sm ${layout === "wide" ? "py-8 text-center text-slate-400" : "text-slate-500"}`}>
        Chargement des options de sécurité…
      </p>
    );
  }

  if (layout === "wide") {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-800/80 bg-[#05050a] text-white shadow-2xl">
        <div className="border-b border-white/5 px-6 py-6 md:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-900/40">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">Sécurité avancée</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Protégez votre compte avec l&apos;authentification à deux facteurs.
                </p>
              </div>
            </div>
            <SecurityScoreRing score={securityScore} label={securityLabel} />
          </div>
        </div>

        <div className="border-b border-white/5 px-6 py-4 md:px-8">
          <div className="rounded-2xl border border-emerald-500/20 border-l-4 border-l-emerald-500 bg-emerald-500/[0.06] p-4 md:p-5 lg:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between xl:gap-8 2xl:gap-10">
              <div className="flex min-w-0 items-start gap-3 xl:max-w-md xl:shrink-0">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">
                    {accountProtected ? "Votre compte est bien protégé" : "Renforcez la protection de votre compte"}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    {accountProtected
                      ? "Toutes les protections essentielles sont activées."
                      : "Activez TOTP et une Passkey pour atteindre le score maximal."}
                  </p>
                </div>
              </div>
              <ul
                className="grid w-full min-w-0 flex-1 grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-4 xl:gap-x-8 2xl:gap-x-10"
                role="list"
                aria-label="Statut des protections du compte"
              >
                <li className="min-w-0">
                  <StatusPill
                    icon={Mail}
                    label="Email vérifié"
                    value={emailVerified ? "Activé" : "En attente"}
                    active={emailVerified}
                  />
                </li>
                <li className="min-w-0">
                  <StatusPill
                    icon={Shield}
                    label="TOTP"
                    value={totpEnabled ? "Activé" : "Inactif"}
                    active={totpEnabled}
                  />
                </li>
                <li className="min-w-0">
                  <StatusPill
                    icon={KeyRound}
                    label="Passkeys"
                    value={passkeyCount > 0 ? `${passkeyCount} enregistrée${passkeyCount > 1 ? "s" : ""}` : "Aucune"}
                    active={passkeyCount > 0}
                  />
                </li>
                <li className="min-w-0">
                  <StatusPill icon={Lock} label="Mot de passe" value="Fort" active />
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 md:px-8">
          {(message || error) && (
            <div
              role="alert"
              className={`mb-6 rounded-xl px-4 py-3 text-xs ${error ? "border border-rose-500/30 bg-rose-500/10 text-rose-300" : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}
            >
              {error || message}
            </div>
          )}

          {recoveryCodes && (
            <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100">
              <p className="font-bold">Codes de secours — enregistrez-les maintenant :</p>
              <ul className="mt-2 grid grid-cols-2 gap-1 font-mono sm:grid-cols-4">
                {recoveryCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
            <section className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#0a0b14] p-5 md:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Authenticator (TOTP)</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Compatible Google Authenticator, Microsoft Authenticator et Authy. Aucun service externe.
                  </p>
                </div>
              </div>

              {totpEnabled && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">TOTP activé</span>
                </div>
              )}

              <div className="flex flex-1 flex-col">
                {!totpEnabled && !totpSetup && (
                  <button
                    type="button"
                    onClick={() => void handleSetupTotp()}
                    className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-900/30"
                  >
                    Activer l&apos;authenticator
                  </button>
                )}

                {totpSetup && (
                  <form
                    onSubmit={handleEnableTotp}
                    className="space-y-3 rounded-xl border border-white/10 bg-[#0c0d18] p-4"
                  >
                    <img
                      src={totpSetup.qrDataUrl}
                      alt="QR code TOTP"
                      className="mx-auto h-44 w-44 rounded-lg bg-white p-2"
                    />
                    <p className="break-all text-center font-mono text-[10px] text-slate-500">
                      {totpSetup.manualEntryKey}
                    </p>
                    <DarkInput
                      icon={Shield}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      placeholder="Code à 6 chiffres"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-xs font-bold text-white"
                    >
                      Confirmer l&apos;activation
                    </button>
                  </form>
                )}

                {totpEnabled && (
                  <form onSubmit={handleDisableTotp} className="flex flex-1 flex-col space-y-3">
                    <DarkInput
                      icon={Lock}
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      placeholder="Mot de passe actuel"
                    />
                    <DarkInput
                      icon={Shield}
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value)}
                      placeholder="Code TOTP ou code de secours"
                      trailing={<Smartphone className="h-4 w-4 text-slate-500" />}
                    />
                    <button
                      type="submit"
                      className="mt-auto inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/15"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Désactiver TOTP
                    </button>
                  </form>
                )}
              </div>
            </section>

            <section className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#0a0b14] p-5 md:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Passkeys (WebAuthn)</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Chrome, Edge et Safari. Connexion sans mot de passe avec authentification biométrique.
                  </p>
                </div>
              </div>

              {passkeyCount > 0 && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">
                    {passkeyCount} passkey enregistrée{passkeyCount > 1 ? "s" : ""}
                  </span>
                </div>
              )}

              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-bold text-slate-300">Mon appareil</p>
                <button
                  type="button"
                  onClick={() => void handleRegisterPasskey()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-violet-900/30"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter une Passkey
                </button>
              </div>

              <DarkInput
                icon={Monitor}
                type="text"
                value={passkeyDeviceName}
                onChange={(e) => setPasskeyDeviceName(e.target.value)}
                placeholder="Nom de l'appareil"
                className="mb-3"
              />

              <DarkInput
                icon={Lock}
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Mot de passe (requis pour supprimer une Passkey)"
                className="mb-4"
              />

              <ul className="flex flex-1 flex-col space-y-2">
                {(status?.passkeys || []).map((passkey) => (
                  <li
                    key={passkey.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0c0d18] px-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                        <Monitor className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-white">{passkey.deviceName}</p>
                          <span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-300">
                            Actif
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">Navigateur • Appareil</p>
                        <p className="text-[11px] text-slate-500">{formatPasskeyAddedAt(passkey.createdAt)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeletePasskey(passkey.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 transition hover:bg-rose-500/15"
                      aria-label={`Supprimer ${passkey.deviceName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
                {(status?.passkeys || []).length === 0 && (
                  <li className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-slate-500">
                    Aucune Passkey enregistrée.
                  </li>
                )}
              </ul>
            </section>

            <div className="rounded-2xl border border-white/10 bg-[#0a0b14] p-5 md:p-6 lg:col-span-2">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Données sécurisées</h3>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
                      Secrets TOTP chiffrés et clés publiques WebAuthn stockés de façon sécurisée sur nos serveurs —
                      sans API externe ni abonnement.
                    </p>
                    {showLearnMore && (
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">
                        Vos codes TOTP restent chiffrés sur nos serveurs. Les Passkeys utilisent le standard WebAuthn :
                        seules les clés publiques sont conservées côté serveur.
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLearnMore((value) => !value)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/[0.06]"
                >
                  En savoir plus
                  <ChevronRight className={`h-4 w-4 transition ${showLearnMore ? "rotate-90" : ""}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div
          role="alert"
          className={`rounded-xl px-4 py-3 text-xs ${error ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}
        >
          {error || message}
        </div>
      )}

      {recoveryCodes && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <p className="font-bold">Codes de secours — enregistrez-les maintenant :</p>
          <ul className="mt-2 grid grid-cols-2 gap-1 font-mono">
            {recoveryCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-indigo-600" />
          <h4 className="text-sm font-black text-slate-900">Authenticator (TOTP)</h4>
        </div>
        <p className="text-xs text-slate-500">
          Compatible Google Authenticator, Microsoft Authenticator et Authy. Aucun service externe.
        </p>

        {!totpEnabled && !totpSetup && (
          <button
            type="button"
            onClick={() => void handleSetupTotp()}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
          >
            Activer l&apos;authenticator
          </button>
        )}

        {totpSetup && (
          <form onSubmit={handleEnableTotp} className="space-y-3 rounded-xl border border-slate-200 p-4">
            <img src={totpSetup.qrDataUrl} alt="QR code TOTP" className="mx-auto h-44 w-44 rounded-lg bg-white p-2" />
            <p className="break-all text-center font-mono text-[10px] text-slate-500">{totpSetup.manualEntryKey}</p>
            <input
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="Code à 6 chiffres"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">
              Confirmer l&apos;activation
            </button>
          </form>
        )}

        {totpEnabled && (
          <form onSubmit={handleDisableTotp} className="space-y-2 rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-emerald-700">TOTP activé</p>
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Mot de passe actuel"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              placeholder="Code TOTP ou code de secours"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700"
            >
              Désactiver TOTP
            </button>
          </form>
        )}
      </section>

      <section className="space-y-3 border-t border-slate-100 pt-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-indigo-600" />
          <h4 className="text-sm font-black text-slate-900">Passkeys (WebAuthn)</h4>
        </div>
        <p className="text-xs text-slate-500">
          Chrome, Edge et Safari. Connexion sans mot de passe avec repli email + mot de passe.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={passkeyDeviceName}
            onChange={(e) => setPasskeyDeviceName(e.target.value)}
            placeholder="Nom de l'appareil"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleRegisterPasskey()}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
          >
            Ajouter une Passkey
          </button>
        </div>
        <input
          type="password"
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
          placeholder="Mot de passe (requis pour supprimer une Passkey)"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <ul className="space-y-2">
          {(status?.passkeys || []).map((passkey) => (
            <li
              key={passkey.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
            >
              <div>
                <p className="font-bold text-slate-800">{passkey.deviceName}</p>
                <p className="text-slate-500">Ajoutée le {new Date(passkey.createdAt).toLocaleDateString("fr-FR")}</p>
              </div>
              <button type="button" onClick={() => void handleDeletePasskey(passkey.id)} className="text-rose-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {(status?.passkeys || []).length === 0 && (
            <li className="text-xs text-slate-400">Aucune Passkey enregistrée.</li>
          )}
        </ul>
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
        Secrets TOTP chiffrés et clés publiques WebAuthn stockés de façon sécurisée sur nos serveurs — sans API externe
        ni abonnement.
      </div>
    </div>
  );
}
