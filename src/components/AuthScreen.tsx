import React, { useState } from "react";
import { getClientErrorMessage } from "../client-errors";
import { User, ShieldAlert, Mail, Lock, LogIn, UserPlus, KeyRound } from "lucide-react";
import { api, setSessionToken } from "../api";
import AuthMfaStep from "./AuthMfaStep";
import PasswordStrengthMeter, { isPasswordValid } from "./PasswordStrengthMeter";
import { getTeacherLoginSectorLabel, getTeacherLoginTabLabel } from "../rbac";
import type { AppUser } from "../shared/app-user";

export type { AppUser };
import LogoSymbol from "./LogoSymbol";
import SkipLink from "./SkipLink";
import { useAccessibilityPreferences } from "../hooks/useAccessibilityPreferences";
import AccessibilityControls from "./AccessibilityControls";

interface AuthScreenProps {
  onLoginSuccess: (user: AppUser) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const { preferences } = useAccessibilityPreferences();
  const [activeSector, setActiveSector] = useState<"student" | "teacher">("student");
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot" | "reset">("register");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [filiere, setFiliere] = useState("");
  const [professorInviteCode, setProfessorInviteCode] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mfaPending, setMfaPending] = useState<{
    mfaToken: string;
    email: string;
    passkeysAvailable?: boolean;
  } | null>(null);

  const finishAuthSuccess = (user: AppUser) => {
    setSessionToken(user.token, user.csrfToken);
    setSuccessMsg("Connexion réussie ! Chargement de votre espace...");
    setTimeout(() => onLoginSuccess(user), 800);
  };

  const getLoginRole = () => (activeSector === "student" ? "STUDENT" : "PROFESSOR");

  const handleMfaChallenge = (payload: any, fallbackEmail: string) => {
    if (payload?.mfaRequired && payload?.mfaToken) {
      setMfaPending({
        mfaToken: payload.mfaToken,
        email: payload.email || fallbackEmail,
        passkeysAvailable: Boolean(payload.passkeysAvailable),
      });
      setIsLoading(false);
      return true;
    }
    return false;
  };

  const handlePasskeyLogin = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const { options, challengeId } = await api.beginPasskeyLogin(normalizedEmail || undefined);
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const response = await startAuthentication({ optionsJSON: options });
      const user = await api.completePasskeyLogin(challengeId, response, getLoginRole());
      finishAuthSuccess(user);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(getClientErrorMessage(err, "Connexion Passkey impossible."));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email || !password) {
      setErrorMsg("Veuillez remplir tous les champs requis.");
      return;
    }

    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const user = await api.login(normalizedEmail, password, getLoginRole());
      if (handleMfaChallenge(user, normalizedEmail)) return;
      finishAuthSuccess(user);
    } catch (err: any) {
      setIsLoading(false);
      if (err.verificationRequired) {
        setVerificationEmail(err.email || email.trim().toLowerCase());
        setVerificationCode("");
        setSuccessMsg("Saisissez le code reçu par e-mail.");
        return;
      }
      setErrorMsg(getClientErrorMessage(err, "Email ou mot de passe incorrect."));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email || !password || !fullName) {
      setErrorMsg("Veuillez renseigner un nom, un email et un mot de passe.");
      return;
    }

    if (!isPasswordValid(password)) {
      setErrorMsg("Le mot de passe ne respecte pas tous les critères de sécurité.");
      return;
    }

    if (activeSector === "teacher" && !professorInviteCode.trim()) {
      setErrorMsg("Veuillez renseigner la clé d'accès fournie par l'administrateur.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.register({
        email,
        password,
        fullName,
        role: activeSector === "student" ? "STUDENT" : "PROFESSOR",
        filiere: activeSector === "student" ? filiere.trim() || undefined : undefined,
        professorInviteCode: activeSector === "teacher" ? professorInviteCode.trim() : undefined,
      });
      setErrorMsg("");
      setVerificationEmail(response.email || email.trim().toLowerCase());
      setVerificationCode("");
      setSuccessMsg(response.message || "Code envoyé");
      setIsLoading(false);
    } catch (err: any) {
      setErrorMsg(getClientErrorMessage(err, "Erreur lors de la création du compte."));
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!verificationEmail || verificationCode.trim().length < 6) {
      setErrorMsg("Veuillez saisir le code à 6 chiffres reçu par e-mail.");
      return;
    }

    setIsLoading(true);
    try {
      const user = await api.verifyEmail(verificationEmail, verificationCode);
      if (handleMfaChallenge(user, verificationEmail)) return;
      setSessionToken(user.token, user.csrfToken);
      setSuccessMsg(user.message || "E-mail vérifié avec succès");
      setTimeout(() => onLoginSuccess(user), 800);
    } catch (err: any) {
      setErrorMsg(getClientErrorMessage(err, "Code incorrect"));
      setIsLoading(false);
    }
  };

  const handleResendVerificationCode = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);
    try {
      const response = await api.resendVerificationCode(verificationEmail || email);
      setSuccessMsg(response.message || "Code envoyé");
      setVerificationCode("");
      setIsLoading(false);
    } catch (err: any) {
      setErrorMsg(getClientErrorMessage(err, "Renvoi du code impossible."));
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email) {
      setErrorMsg("Veuillez saisir votre adresse e-mail.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.forgotPassword(email);
      setSuccessMsg(response.message || "Code envoyé");
      setVerificationCode("");
      setAuthMode("reset");
      setIsLoading(false);
    } catch (err: any) {
      setErrorMsg(getClientErrorMessage(err, "Impossible de traiter la demande."));
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email || !verificationCode || !password) {
      setErrorMsg("Veuillez remplir tous les champs.");
      return;
    }

    if (!isPasswordValid(password)) {
      setErrorMsg("Le nouveau mot de passe ne respecte pas tous les critères de sécurité.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.resetPassword(email, verificationCode, password);
      setSuccessMsg(response.message || "Mot de passe réinitialisé.");
      setPassword("");
      setVerificationCode("");
      setAuthMode("login");
      setIsLoading(false);
    } catch (err: any) {
      setErrorMsg(getClientErrorMessage(err, "Erreur de réinitialisation."));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 py-8 md:py-12 relative overflow-y-auto font-sans">
      <SkipLink href="#auth-main" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-xl relative flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center pb-2">
          {/* Logo icône seule - Centré, net et sans cadre blanc */}
          <LogoSymbol className="w-24 h-24 text-emerald-400 flex-shrink-0 animate-in zoom-in duration-300" />
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight select-none">
              Performance <span className="text-emerald-400">Académique</span>
            </h1>
            <p className="text-slate-400 text-xs font-semibold max-w-sm mt-1">
              Plateforme académique de formation et réussite
            </p>
          </div>
        </div>

        <div
          className={`bg-slate-950/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl ${
            preferences.reduceMotion ? "" : "animate-in fade-in slide-in-from-bottom-4 duration-300"
          }`}
        >
          <main id="auth-main" tabIndex={-1} className="outline-none">
            <div className="grid grid-cols-2 bg-slate-900 border-b border-slate-800 p-2 gap-2">
              <button
                type="button"
                aria-pressed={activeSector === "student"}
                onClick={() => {
                  setActiveSector("student");
                  setVerificationEmail("");
                  setErrorMsg("");
                  setSuccessMsg("");
                  setMfaPending(null);
                }}
                className={`kbd-nav-focus flex items-center justify-center gap-1.5 py-3.5 px-2 sm:px-4 rounded-2xl text-[10px] sm:text-xs font-extrabold tracking-wide uppercase transition-all ${
                  activeSector === "student"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <User className="w-4 h-4" aria-hidden="true" />
                Espace Étudiant
              </button>
              <button
                type="button"
                aria-pressed={activeSector === "teacher"}
                onClick={() => {
                  setActiveSector("teacher");
                  setVerificationEmail("");
                  setErrorMsg("");
                  setSuccessMsg("");
                  setMfaPending(null);
                }}
                className={`kbd-nav-focus flex items-center justify-center gap-1.5 py-3.5 px-2 sm:px-4 rounded-2xl text-[10px] sm:text-xs font-extrabold tracking-wide uppercase transition-all ${
                  activeSector === "teacher"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                {getTeacherLoginTabLabel()}
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <div className="text-center space-y-1">
                <span
                  className={`text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full inline-block ${
                    activeSector === "student"
                      ? "bg-emerald-900/40 text-emerald-300 border border-emerald-500/10"
                      : "bg-emerald-900/40 text-emerald-300 border border-emerald-500/10"
                  }`}
                >
                  {activeSector === "student" ? "Secteur d'Études" : getTeacherLoginSectorLabel()}
                </span>
                <h2 className="text-xl font-extrabold text-white mt-2">
                  {verificationEmail
                    ? "Vérifiez votre e-mail"
                    : authMode === "forgot"
                      ? "Mot de passe oublié"
                      : authMode === "reset"
                        ? "Réinitialiser le mot de passe"
                        : authMode === "login"
                          ? "Connexion à votre espace académique"
                          : "Créer un compte universitaire Performance Académique"}
                </h2>
                <p className="text-xs text-slate-400">
                  {verificationEmail
                    ? `Code envoyé à ${verificationEmail}`
                    : authMode === "forgot"
                      ? "Saisissez votre e-mail pour recevoir un code de vérification"
                      : authMode === "reset"
                        ? "Saisissez le code reçu et votre nouveau mot de passe"
                        : authMode === "login"
                          ? "Saisissez vos identifiants d'accès"
                          : "Inscrivez-vous pour accéder aux modules"}
                </p>
              </div>

              {/* 401 / validation error */}
              {errorMsg && (
                <div
                  id="auth-error-msg"
                  role="alert"
                  aria-live="assertive"
                  className="p-3 bg-red-900/30 border border-red-800/50 text-red-300 text-xs font-semibold rounded-xl text-center"
                >
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div
                  id="auth-success-msg"
                  role="status"
                  aria-live="polite"
                  className="p-3 bg-emerald-900/30 border border-emerald-800/50 text-emerald-300 text-xs font-semibold rounded-xl text-center"
                >
                  {successMsg}
                </div>
              )}

              {mfaPending ? (
                <AuthMfaStep
                  mfaToken={mfaPending.mfaToken}
                  email={mfaPending.email}
                  role={activeSector === "student" ? "STUDENT" : "PROFESSOR"}
                  passkeysAvailable={mfaPending.passkeysAvailable}
                  onSuccess={(user) => finishAuthSuccess(user)}
                  onBack={() => {
                    setMfaPending(null);
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                />
              ) : verificationEmail ? (
                <form onSubmit={handleVerifyEmail} className="space-y-4">
                  <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                    <label
                      htmlFor="auth-verification-code"
                      className="text-[10px] uppercase font-black tracking-widest text-slate-400 block"
                    >
                      Code de vérification e-mail
                    </label>
                    <div className="relative">
                      <input
                        id="auth-verification-code"
                        name="emailVerificationCode"
                        type="text"
                        autoComplete="one-time-code"
                        aria-invalid={Boolean(errorMsg)}
                        aria-describedby={errorMsg ? "auth-error-msg" : undefined}
                        inputMode="numeric"
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-slate-700 px-4 py-3 pl-11 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all tracking-[0.35em] font-bold kbd-nav-focus"
                      />
                      <Mail
                        className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeSector === "student"
                        ? "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-900/30"
                        : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-900/30"
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    Vérifier mon e-mail
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleResendVerificationCode}
                    className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider text-slate-300 border border-slate-800 hover:bg-slate-900 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Renvoyer le code
                  </button>
                </form>
              ) : authMode === "forgot" ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                    <label
                      htmlFor="auth-email"
                      className="text-[10px] uppercase font-black tracking-widest text-slate-400 block"
                    >
                      Adresse e-mail universitaire
                    </label>
                    <div className="relative">
                      <input
                        id="auth-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        aria-invalid={Boolean(errorMsg)}
                        aria-describedby={errorMsg ? "auth-error-msg" : undefined}
                        required
                        placeholder={activeSector === "student" ? "ex: etudiant@example.fr" : "ex: prof@example.fr"}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-slate-700 px-4 py-3 pl-11 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all"
                      />
                      <Mail className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeSector === "student"
                        ? "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-900/30"
                        : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-900/30"
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    Envoyer le code
                  </button>
                </form>
              ) : authMode === "reset" ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                    <label
                      htmlFor="auth-reset-email"
                      className="text-[10px] uppercase font-black tracking-widest text-slate-400 block"
                    >
                      Adresse e-mail universitaire
                    </label>
                    <div className="relative">
                      <input
                        id="auth-reset-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        disabled
                        value={email}
                        className="w-full bg-slate-950 border border-slate-800 px-4 py-3 pl-11 rounded-xl text-xs text-slate-450 focus:outline-none cursor-not-allowed"
                      />
                      <Mail className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                    <label
                      htmlFor="auth-reset-code"
                      className="text-[10px] uppercase font-black tracking-widest text-slate-400 block"
                    >
                      Code de réinitialisation (6 chiffres)
                    </label>
                    <div className="relative">
                      <input
                        id="auth-reset-code"
                        name="resetCode"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        aria-invalid={Boolean(errorMsg)}
                        aria-describedby={errorMsg ? "auth-error-msg" : undefined}
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-slate-700 px-4 py-3 pl-11 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all tracking-[0.35em] font-bold"
                      />
                      <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                    <label
                      htmlFor="auth-new-password"
                      className="text-[10px] uppercase font-black tracking-widest text-slate-400 block"
                    >
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="auth-new-password"
                        name="newPassword"
                        type="password"
                        autoComplete="new-password"
                        aria-invalid={Boolean(errorMsg)}
                        aria-describedby={errorMsg ? "auth-error-msg" : undefined}
                        required
                        placeholder="Saisir votre nouveau mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-slate-700 px-4 py-3 pl-11 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all"
                      />
                      <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                    <PasswordStrengthMeter password={password} isDark={true} />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeSector === "student"
                        ? "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-900/30"
                        : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-900/30"
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    Réinitialiser le mot de passe
                  </button>
                </form>
              ) : (
                <form onSubmit={authMode === "login" ? handleLogin : handleRegister} className="space-y-4">
                  {authMode === "register" && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                      <label
                        htmlFor="auth-full-name"
                        className="text-[10px] uppercase font-black tracking-widest text-slate-400 block"
                      >
                        Nom complet (Prénom Nom)
                      </label>
                      <div className="relative">
                        <input
                          id="auth-full-name"
                          name="fullName"
                          type="text"
                          autoComplete="name"
                          aria-invalid={Boolean(errorMsg)}
                          aria-describedby={errorMsg ? "auth-error-msg" : undefined}
                          required
                          placeholder={activeSector === "student" ? "ex: Étudiant Académique" : "ex: Pr. Louise Vitet"}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 focus:border-slate-700 px-4 py-3 pl-11 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all"
                        />
                        <User className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label
                      htmlFor="auth-email-login"
                      className="text-[10px] uppercase font-black tracking-widest text-slate-400 block"
                    >
                      Adresse e-mail universitaire
                    </label>
                    <div className="relative">
                      <input
                        id="auth-email-login"
                        name="email"
                        type="email"
                        autoComplete="username"
                        aria-invalid={Boolean(errorMsg)}
                        aria-describedby={errorMsg ? "auth-error-msg" : undefined}
                        required
                        placeholder={activeSector === "student" ? "ex: etudiant@example.fr" : "ex: prof@example.fr"}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-slate-700 px-4 py-3 pl-11 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all"
                      />
                      <Mail className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label
                        htmlFor="auth-password"
                        className="text-[10px] uppercase font-black tracking-widest text-slate-400"
                      >
                        Mot de passe de sécurité
                      </label>
                      {authMode === "login" && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("forgot");
                            setErrorMsg("");
                            setSuccessMsg("");
                          }}
                          className={`text-[10px] font-bold hover:underline cursor-pointer ${
                            activeSector === "student" ? "text-emerald-400" : "text-emerald-400"
                          }`}
                        >
                          Mot de passe oublié ?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="auth-password"
                        name="password"
                        type="password"
                        autoComplete={authMode === "register" ? "new-password" : "current-password"}
                        aria-invalid={Boolean(errorMsg)}
                        aria-describedby={errorMsg ? "auth-error-msg" : undefined}
                        required
                        placeholder="Saisir votre mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-slate-700 px-4 py-3 pl-11 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all"
                      />
                      <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                    {authMode === "register" && <PasswordStrengthMeter password={password} isDark={true} />}
                  </div>

                  {authMode === "register" && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                      <label
                        htmlFor={activeSector === "student" ? "auth-filiere" : "auth-access-key"}
                        className="text-[10px] uppercase font-black tracking-widest text-slate-400 block"
                      >
                        {activeSector === "student" ? "Filière" : "Clé d'accès"}
                      </label>
                      <input
                        id={activeSector === "student" ? "auth-filiere" : "auth-access-key"}
                        name={activeSector === "student" ? "filiere" : "professorInviteCode"}
                        type="text"
                        autoComplete={activeSector === "student" ? "organization-title" : "off"}
                        aria-invalid={Boolean(errorMsg)}
                        aria-describedby={errorMsg ? "auth-error-msg" : undefined}
                        required={activeSector === "teacher"}
                        placeholder={
                          activeSector === "student"
                            ? "ex: Informatique, Mathématiques, Physique..."
                            : "Clé fournie par l'administrateur"
                        }
                        value={activeSector === "student" ? filiere : professorInviteCode}
                        onChange={(e) => {
                          if (activeSector === "student") setFiliere(e.target.value);
                          else setProfessorInviteCode(e.target.value);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-slate-700 px-4 py-3 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all"
                      />
                      {activeSector === "student" && (
                        <p className="text-[9px] text-slate-500 italic">
                          Facultatif. Indique votre filière si vous souhaitez personnaliser votre profil.
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeSector === "student"
                        ? "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-900/30"
                        : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-900/30"
                    }`}
                  >
                    {authMode === "login" ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {authMode === "login"
                      ? activeSector === "student"
                        ? "Se connecter"
                        : "Se connecter"
                      : "Créer mon Compte Académique"}
                  </button>

                  {authMode === "login" && (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => void handlePasskeyLogin()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 py-3 text-xs font-bold text-slate-200 transition-all hover:border-emerald-500/40"
                    >
                      <KeyRound className="h-4 w-4" />
                      Se connecter avec une Passkey
                    </button>
                  )}
                </form>
              )}

              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    setVerificationEmail("");
                    setVerificationCode("");
                    if (authMode === "forgot" || authMode === "reset") {
                      setAuthMode("login");
                    } else {
                      setAuthMode(authMode === "login" ? "register" : "login");
                    }
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className={`text-xs font-bold underline transition-colors ${
                    activeSector === "student"
                      ? "text-emerald-400 hover:text-emerald-300"
                      : "text-emerald-400 hover:text-emerald-300"
                  }`}
                >
                  {verificationEmail
                    ? "Utiliser une autre adresse e-mail"
                    : authMode === "forgot" || authMode === "reset"
                      ? "Retour à la connexion"
                      : authMode === "login"
                        ? "Pas de compte ? S'inscrire maintenant"
                        : "Déjà membre ? Se connecter à l'espace"}
                </button>
              </div>
            </div>
          </main>
        </div>

        <div className="flex justify-center">
          <AccessibilityControls />
        </div>

        <div className="text-center text-slate-500 text-[10px] font-medium leading-relaxed">
          <span>Plateforme numérique conçue pour l'écosystème académique marocain.</span>
          <br />
          <span>Paiements sécurisés, contenus pédagogiques et services académiques connectés.</span>
        </div>
      </div>
    </div>
  );
}
