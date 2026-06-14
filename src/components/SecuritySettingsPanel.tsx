import React, { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { getClientErrorMessage } from "../client-errors";
import { api } from "../api";

type PasskeyRow = {
  id: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export default function SecuritySettingsPanel() {
  const [status, setStatus] = useState<{ totpEnabled: boolean; passkeyCount: number; passkeys: PasskeyRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [totpSetup, setTotpSetup] = useState<{ challengeId: string; qrDataUrl: string; manualEntryKey: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [passkeyDeviceName, setPasskeyDeviceName] = useState("Mon appareil");
  const [deletePassword, setDeletePassword] = useState("");

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
    return <p className="text-sm text-slate-500">Chargement des options de sécurité…</p>;
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div role="alert" className={`rounded-xl px-4 py-3 text-xs ${error ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error || message}
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

        {!status?.totpEnabled && !totpSetup && (
          <button type="button" onClick={() => void handleSetupTotp()} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">
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

        {status?.totpEnabled && (
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
            <button type="submit" className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700">
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
          <button type="button" onClick={() => void handleRegisterPasskey()} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">
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
            <li key={passkey.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
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
        Secrets TOTP chiffrés et clés publiques WebAuthn stockés uniquement dans PostgreSQL — sans API externe ni abonnement.
      </div>
    </div>
  );
}
