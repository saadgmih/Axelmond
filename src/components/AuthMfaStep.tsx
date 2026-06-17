import React, { useState } from "react";
import { KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { getClientErrorMessage } from "../client-errors";
import { api, setSessionToken } from "../api";
import type { AppUser } from "./AuthScreen";

interface AuthMfaStepProps {
  mfaToken: string;
  email: string;
  role: "STUDENT" | "PROFESSOR";
  passkeysAvailable?: boolean;
  onSuccess: (user: AppUser) => void;
  onBack: () => void;
}

export default function AuthMfaStep({ mfaToken, email, role, passkeysAvailable, onSuccess, onBack }: AuthMfaStepProps) {
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const completeSession = (user: AppUser) => {
    setSessionToken(user.token, user.csrfToken);
    onSuccess(user);
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);
    try {
      const user = await api.verifyMfaTotp(mfaToken, code.replace(/\s+/g, ""));
      completeSession(user);
    } catch (err: unknown) {
      setErrorMsg(getClientErrorMessage(err, "Code authenticator invalide."));
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setErrorMsg("");
    setIsLoading(true);
    try {
      const { options, challengeId } = await api.beginPasskeyLogin(email);
      const response = await startAuthentication({ optionsJSON: options });
      const user = await api.completePasskeyLogin(challengeId, response, role);
      completeSession(user);
    } catch (err: unknown) {
      setErrorMsg(getClientErrorMessage(err, "Connexion Passkey impossible."));
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-2xl">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15">
          <ShieldCheck className="h-6 w-6 text-indigo-400" />
        </div>
        <h2 className="text-lg font-black text-white">Vérification en deux étapes</h2>
        <p className="text-xs text-slate-400">
          Saisissez le code à 6 chiffres de Google Authenticator, Microsoft Authenticator ou Authy.
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-xs text-rose-200"
        >
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleTotpSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Code TOTP</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={16}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center font-mono text-lg tracking-[0.3em] text-white outline-none focus:border-indigo-500"
          />
        </label>
        <button
          type="submit"
          disabled={isLoading || code.trim().length < 6}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          <Smartphone className="h-4 w-4" />
          Valider le code
        </button>
      </form>

      {passkeysAvailable && (
        <button
          type="button"
          disabled={isLoading}
          onClick={() => void handlePasskeyLogin()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-100 hover:border-indigo-500/50"
        >
          <KeyRound className="h-4 w-4" />
          Utiliser une Passkey
        </button>
      )}

      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-300"
      >
        Retour à la connexion
      </button>
    </div>
  );
}
