import React from "react";
import { CheckCircle, XCircle } from "lucide-react";
import type { useInView } from "../../hooks/useInView";

type InViewRef = ReturnType<typeof useInView<HTMLDivElement>>;

export const InstitutionalPageRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-full bg-slate-950 text-white">{children}</div>
);

export const InstitutionalFade: React.FC<{
  inView: boolean;
  delay?: number;
  children: React.ReactNode;
  className?: string;
}> = ({ inView, delay = 0, children, className = "" }) => (
  <div
    className={className}
    style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(22px)",
      transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
    }}
  >
    {children}
  </div>
);

export const InstitutionalCard: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = "",
  children,
}) => <div className={`bg-slate-900 border border-slate-800 rounded-3xl ${className}`}>{children}</div>;

export const InstitutionalSectionHeader: React.FC<{
  number: string;
  emoji: string;
  icon: React.ReactNode;
  title: string;
  accentClass: string;
}> = ({ number, emoji, icon: _icon, title, accentClass }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl ${accentClass}`}>
      {emoji}
    </div>
    <span className="text-[10px] font-black text-slate-600 tabular-nums">{number}</span>
    <h2 className="text-xl font-black text-white">{title}</h2>
  </div>
);

export const InstitutionalSectionHeading: React.FC<{
  number: string;
  icon: React.ReactNode;
  title: string;
  accentClass: string;
}> = ({ number, icon, title, accentClass }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${accentClass}`}>{icon}</div>
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-black text-slate-600 tabular-nums">{number}</span>
      <h2 className="text-xl font-black text-white">{title}</h2>
    </div>
  </div>
);

export const InstitutionalInfoRow: React.FC<{
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}> = ({ label, value, icon, mono }) => (
  <div className="flex items-start gap-3 bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3">
    {icon && <span className="text-slate-500 flex-shrink-0 mt-0.5">{icon}</span>}
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div
        className={`text-slate-200 text-sm font-semibold mt-0.5 break-all ${mono ? "font-mono text-indigo-300" : ""}`}
      >
        {value}
      </div>
    </div>
  </div>
);

export const InstitutionalCheckList: React.FC<{ items: string[]; color?: string }> = ({
  items,
  color = "text-indigo-400",
}) => (
  <ul className="space-y-2.5">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-2.5">
        <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${color}`} />
        <span className="text-[13px] text-slate-300 leading-relaxed">{item}</span>
      </li>
    ))}
  </ul>
);

export const InstitutionalBulletList: React.FC<{ items: string[]; color?: string }> = ({
  items,
  color = "text-indigo-400",
}) => (
  <ul className="space-y-2">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-2.5">
        <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${color}`} />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

export const InstitutionalForbidList: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="space-y-2.5">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-2.5">
        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
        <span className="text-[13px] text-slate-300">{item}</span>
      </li>
    ))}
  </ul>
);

export const InstitutionalChip: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span
    className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-full ${color}`}
  >
    {label}
  </span>
);

export const InstitutionalSection: React.FC<{
  id: string;
  number: string;
  icon: React.ReactNode;
  title: string;
  accent: string;
  bgAccent: string;
  children: React.ReactNode;
  delay?: number;
  inView: boolean;
}> = ({ id, number, icon, title, accent, bgAccent, children, delay = 0, inView }) => (
  <div
    id={id}
    className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden"
    style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
    }}
  >
    <div className={`flex items-center gap-4 px-7 py-5 border-b border-slate-800 ${bgAccent}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accent} bg-slate-900/60`}>
        {icon}
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[10px] font-black text-slate-500 tabular-nums flex-shrink-0">{number}</span>
        <h2 className="text-base font-black text-white">{title}</h2>
      </div>
    </div>
    <div className="px-7 py-6 space-y-4 text-sm text-slate-300 leading-relaxed">{children}</div>
  </div>
);

export const InstitutionalSectionBlock: React.FC<{
  number: string;
  icon: React.ReactNode;
  title: string;
  accentClass: string;
  children: React.ReactNode;
  delay?: number;
  inView: boolean;
}> = ({ number, icon, title, accentClass, children, delay = 0, inView }) => (
  <div
    className="bg-slate-900 border border-slate-800 rounded-3xl p-7 md:p-9"
    style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
    }}
  >
    <InstitutionalSectionHeading number={number} icon={icon} title={title} accentClass={accentClass} />
    {children}
  </div>
);

export const InstitutionalHero: React.FC<{
  heroRef: InViewRef;
  gradientClass: string;
  topBlobClass?: string;
  bottomBlobClass?: string;
  extraBlobs?: React.ReactNode;
  maxWidthClass?: string;
  contentClassName?: string;
  translateY?: string;
  transition?: string;
  children: React.ReactNode;
}> = ({
  heroRef,
  gradientClass,
  topBlobClass,
  bottomBlobClass,
  extraBlobs,
  maxWidthClass = "max-w-5xl",
  contentClassName = "px-6 md:px-10 py-12 md:py-16",
  translateY = "24px",
  transition = "opacity 0.7s ease, transform 0.7s ease",
  children,
}) => (
  <div
    ref={heroRef.ref}
    className={`relative overflow-hidden bg-gradient-to-br from-slate-950 ${gradientClass} to-slate-950 border-b border-slate-800/50`}
  >
    {topBlobClass && <div className={`absolute pointer-events-none blur-3xl ${topBlobClass}`} aria-hidden />}
    {bottomBlobClass && <div className={`absolute pointer-events-none blur-3xl ${bottomBlobClass}`} aria-hidden />}
    {extraBlobs}
    <div
      className={`relative ${maxWidthClass} mx-auto ${contentClassName}`}
      style={{
        opacity: heroRef.inView ? 1 : 0,
        transform: heroRef.inView ? "translateY(0)" : `translateY(${translateY})`,
        transition,
      }}
    >
      {children}
    </div>
  </div>
);
