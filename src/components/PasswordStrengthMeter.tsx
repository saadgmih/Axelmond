import React, { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthMeterProps {
  password?: string;
  isDark?: boolean;
}

export function validatePasswordRules(password: string = "") {
  return {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function isPasswordValid(password: string = "") {
  const rules = validatePasswordRules(password);
  return Object.values(rules).every(Boolean);
}

export default function PasswordStrengthMeter({ password = "", isDark = true }: PasswordStrengthMeterProps) {
  const rules = useMemo(() => validatePasswordRules(password), [password]);

  const rulesList = [
    { key: "length", label: "Au moins 12 caractères", met: rules.length },
    { key: "uppercase", label: "Au moins une lettre majuscule", met: rules.uppercase },
    { key: "lowercase", label: "Au moins une lettre minuscule", met: rules.lowercase },
    { key: "number", label: "Au moins un chiffre", met: rules.number },
    { key: "special", label: "Au moins un caractère spécial", met: rules.special },
  ];

  const metCount = Object.values(rules).filter(Boolean).length;

  let strengthLabel = "Très faible";
  let strengthColor = isDark ? "bg-slate-700" : "bg-slate-300";
  let textColor = isDark ? "text-slate-400" : "text-slate-500";
  let width = "0%";

  if (password.length > 0) {
    if (metCount <= 2) {
      strengthLabel = "Faible";
      strengthColor = "bg-emerald-500";
      textColor = "text-emerald-500";
      width = "25%";
    } else if (metCount === 3) {
      strengthLabel = "Moyen";
      strengthColor = "bg-lime-500";
      textColor = "text-lime-500";
      width = "50%";
    } else if (metCount === 4) {
      strengthLabel = "Fort";
      strengthColor = "bg-emerald-400";
      textColor = "text-emerald-500";
      width = "75%";
    } else if (metCount === 5) {
      strengthLabel = "Très fort";
      strengthColor = "bg-emerald-500";
      textColor = "text-emerald-600";
      width = "100%";
    }
  }

  return (
    <div className={`mt-3 space-y-3 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold uppercase tracking-wide">
          <span>Force du mot de passe</span>
          <span className={password.length > 0 ? textColor : isDark ? "text-slate-500" : "text-slate-400"}>
            {password.length > 0 ? strengthLabel : "—"}
          </span>
        </div>
        <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
          <div className={`h-full transition-all duration-300 ease-out ${strengthColor}`} style={{ width }} />
        </div>
      </div>

      <ul className="space-y-1.5 pt-1">
        {rulesList.map((rule) => (
          <li
            key={rule.key}
            className={`flex items-center gap-2 text-[10.5px] sm:text-xs font-medium transition-colors ${
              rule.met
                ? isDark
                  ? "text-emerald-400"
                  : "text-emerald-600"
                : isDark
                  ? "text-slate-400"
                  : "text-slate-500"
            }`}
          >
            {rule.met ? (
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
            )}
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
