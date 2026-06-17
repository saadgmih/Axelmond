import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { api } from "../api";
import { getClientErrorMessage } from "../client-errors";
import PasswordStrengthMeter, { isPasswordValid } from "./PasswordStrengthMeter";

interface AccountPasswordChangeFormProps {
  variant?: "light" | "dark";
}

export default function AccountPasswordChangeForm({ variant = "light" }: AccountPasswordChangeFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isDark = variant === "dark";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!isPasswordValid(newPassword)) {
      setError("Le nouveau mot de passe ne respecte pas tous les critères de sécurité.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = await api.changeAcademicPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage(payload.message || "Mot de passe mis à jour.");
    } catch (err: unknown) {
      setError(getClientErrorMessage(err, "Changement de mot de passe impossible."));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = isDark
    ? "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
    : "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

  return (
    <section
      className={
        isDark
          ? "overflow-hidden rounded-3xl border border-slate-800/80 bg-[#05050a] text-white shadow-2xl"
          : "rounded-2xl border border-slate-200 bg-white shadow-sm"
      }
    >
      <div className={`border-b ${isDark ? "border-white/5" : "border-slate-100"} px-6 py-5 md:px-8`}>
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              isDark ? "bg-violet-500/15 text-violet-400" : "bg-indigo-50 text-indigo-600"
            }`}
          >
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className={`text-lg font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              Mot de passe
            </h2>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Utilisez un mot de passe fort et unique pour protéger votre compte.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6 md:px-8">
        {(message || error) && (
          <div
            role="alert"
            className={`rounded-xl px-4 py-3 text-xs ${
              error
                ? isDark
                  ? "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : "border border-rose-200 bg-rose-50 text-rose-700"
                : isDark
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || message}
          </div>
        )}

        <input
          type="password"
          autoComplete="current-password"
          placeholder="Mot de passe actuel"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
          required
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Nouveau mot de passe"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
          required
        />
        <PasswordStrengthMeter password={newPassword} isDark={isDark} />
        <button
          type="submit"
          disabled={submitting}
          className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition ${
            isDark
              ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60"
              : "bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60"
          }`}
        >
          {submitting ? "Mise à jour…" : "Mettre à jour le mot de passe"}
        </button>
      </form>
    </section>
  );
}
