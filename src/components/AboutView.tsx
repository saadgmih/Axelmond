import React, { useEffect, useState } from "react";
import { useInView } from "../hooks/useInView";
import {
  GraduationCap,
  FlaskConical,
  Lightbulb,
  Shield,
  BookOpen,
  Users,
  Video,
  Brain,
  Award,
  Globe,
  Cpu,
  Activity,
  CheckCircle,
  Atom,
  Star,
  BrainCircuit,
  Lock,
  Layers,
  TrendingUp,
  BarChart,
} from "lucide-react";
import { InstitutionalPageRoot, InstitutionalHero } from "./legal/InstitutionalPageShell";

// ─── Animated Counter hook ───────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let frame: number;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, start]);
  return value;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  value: number;
  suffix: string;
  label: string;
  sublabel?: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  start: boolean;
}> = ({ value, suffix, label, sublabel, color, bgColor, borderColor, icon, start }) => {
  const count = useCountUp(value, 1800, start);
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${borderColor} ${bgColor} p-5 flex flex-col gap-3 group transition-all duration-300 hover:scale-[1.03] hover:shadow-lg`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.replace("text-", "bg-").replace("400", "900/40").replace("300", "900/40")} border border-current/10`}
      >
        <span className={color}>{icon}</span>
      </div>
      <div>
        <div className={`text-3xl font-black tabular-nums ${color}`}>
          {count.toLocaleString("fr-FR")}
          {suffix}
        </div>
        <div className="text-white text-sm font-bold mt-0.5">{label}</div>
        {sublabel && <div className="text-slate-500 text-[11px] mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
};

// ─── Feature Card ─────────────────────────────────────────────────────────────
const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  accent: string;
  delay?: number;
  inView: boolean;
}> = ({ icon, title, description, badge, accent, delay = 0, inView }) => {
  return (
    <div
      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 group hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms, box-shadow 0.3s ease, border-color 0.3s ease`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>{icon}</div>
        {badge && (
          <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
            {badge}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="text-[12px] text-slate-400 leading-relaxed mt-1">{description}</p>
      </div>
    </div>
  );
};

// ─── Value Card ───────────────────────────────────────────────────────────────
const ValueCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  delay?: number;
  inView: boolean;
}> = ({ icon, title, description, gradient, delay = 0, inView }) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 space-y-3 border border-slate-800 group hover:scale-[1.02] transition-all duration-300`}
      style={{
        background: gradient,
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms, transform 0.3s ease`,
      }}
    >
      <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-white font-black text-base">{title}</h3>
      <p className="text-white/70 text-[12px] leading-relaxed">{description}</p>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AboutView() {
  const heroRef = useInView(0.1);
  const missionRef = useInView(0.1);
  const valuesRef = useInView(0.1);
  const featuresRef = useInView(0.1);
  const statsRef = useInView(0.2);
  const visionRef = useInView(0.1);

  const features = [
    {
      icon: <BookOpen className="w-5 h-5 text-indigo-300" />,
      accent: "bg-indigo-500/15 border border-indigo-500/20",
      title: "Modules Structurés Multi-niveaux",
      description:
        "Catalogue organisé par domaines, disciplines et niveaux académiques avec chapitres, sections et contenus riches (texte, vidéo, quiz).",
    },
    {
      icon: <Video className="w-5 h-5 text-pink-300" />,
      accent: "bg-pink-500/15 border border-pink-500/20",
      title: "Sessions en direct",
      description:
        "Visioconférences académiques intégrées avec partage d'écran, chat en direct et gestion des participants.",
      badge: "Live",
    },
    {
      icon: <Brain className="w-5 h-5 text-violet-300" />,
      accent: "bg-violet-500/15 border border-violet-500/20",
      title: "Tuteur IA Personnalisé",
      description:
        "Assistant pédagogique intelligent, disponible dans les modules pour répondre aux questions et approfondir les concepts.",
      badge: "IA",
    },
    {
      icon: <Award className="w-5 h-5 text-amber-300" />,
      accent: "bg-amber-500/15 border border-amber-500/20",
      title: "Évaluations & Quizzes",
      description:
        "Système d'examens intégré avec correction automatique, feedback détaillé et suivi de progression par module.",
    },
    {
      icon: <Shield className="w-5 h-5 text-emerald-300" />,
      accent: "bg-emerald-500/15 border border-emerald-500/20",
      title: "Sécurité Niveau Production",
      description:
        "RBAC strict, JWT avec expiration, protection brute-force, vérification email obligatoire, rate-limiting et audit complet.",
      badge: "Sécurisé",
    },
    {
      icon: <Layers className="w-5 h-5 text-cyan-300" />,
      accent: "bg-cyan-500/15 border border-cyan-500/20",
      title: "Profils Académiques Complets",
      description:
        "Espaces personnalisés pour étudiants, professeurs et chercheurs avec biographies, publications et domaines de spécialité.",
    },
    {
      icon: <Lock className="w-5 h-5 text-orange-300" />,
      accent: "bg-orange-500/15 border border-orange-500/20",
      title: "Paiements sécurisés",
      description:
        "Abonnements à l'accès aux modules avec facturation automatique, reçus archivés et traitement chiffré des transactions.",
    },
    {
      icon: <Activity className="w-5 h-5 text-rose-300" />,
      accent: "bg-rose-500/15 border border-rose-500/20",
      title: "Tableau de Bord Analytique",
      description:
        "Statistiques de progression, taux de complétion, scores de quiz et métriques pédagogiques pour l'enseignant.",
    },
  ];

  const values = [
    {
      icon: <FlaskConical className="w-6 h-6 text-indigo-300" />,
      title: "Excellence Académique",
      description:
        "Nous nous engageons à proposer des contenus de niveau universitaire et à maintenir les plus hauts standards pédagogiques et scientifiques.",
      gradient: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(79,70,229,0.05) 100%)",
      delay: 0,
    },
    {
      icon: <Lightbulb className="w-6 h-6 text-amber-300" />,
      title: "Innovation Continue",
      description:
        "La plateforme intègre les dernières avancées technologiques — IA générative, visioconférence temps réel, analyses avancées — au service de la pédagogie.",
      gradient: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(217,119,6,0.05) 100%)",
      delay: 100,
    },
    {
      icon: <Shield className="w-6 h-6 text-emerald-300" />,
      title: "Sécurité & Confiance",
      description:
        "Chaque donnée, chaque session et chaque transaction est protégée par une infrastructure sécurisée conforme aux bonnes pratiques de l'industrie.",
      gradient: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.05) 100%)",
      delay: 200,
    },
    {
      icon: <Globe className="w-6 h-6 text-sky-300" />,
      title: "Accessibilité Universelle",
      description:
        "Accessible sur tous les appareils, responsive et conçue pour s'adapter à chaque profil d'utilisateur, qu'il soit étudiant, enseignant ou chercheur.",
      gradient: "linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(2,132,199,0.05) 100%)",
      delay: 300,
    },
  ];

  const stats = [
    {
      value: 500,
      suffix: "+",
      label: "Étudiants Inscrits",
      sublabel: "Toutes filières confondues",
      color: "text-indigo-400",
      bgColor: "bg-indigo-950/30",
      borderColor: "border-indigo-900/40",
      icon: <Users className="w-5 h-5" />,
    },
    {
      value: 120,
      suffix: "+",
      label: "Modules Disponibles",
      sublabel: "Classés par domaine & niveau",
      color: "text-violet-400",
      bgColor: "bg-violet-950/30",
      borderColor: "border-violet-900/40",
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      value: 40,
      suffix: "+",
      label: "Enseignants & Chercheurs",
      sublabel: "Profils académiques validés",
      color: "text-pink-400",
      bgColor: "bg-pink-950/30",
      borderColor: "border-pink-900/40",
      icon: <GraduationCap className="w-5 h-5" />,
    },
    {
      value: 98,
      suffix: "%",
      label: "Taux de Satisfaction",
      sublabel: "Basé sur les évaluations de modules",
      color: "text-emerald-400",
      bgColor: "bg-emerald-950/30",
      borderColor: "border-emerald-900/40",
      icon: <Star className="w-5 h-5" />,
    },
    {
      value: 15,
      suffix: "+",
      label: "Domaines Scientifiques",
      sublabel: "Sciences, Droit, Tech, Arts...",
      color: "text-amber-400",
      bgColor: "bg-amber-950/30",
      borderColor: "border-amber-900/40",
      icon: <Atom className="w-5 h-5" />,
    },
    {
      value: 5000,
      suffix: "+",
      label: "Modules Complétés",
      sublabel: "Par les étudiants inscrits",
      color: "text-cyan-400",
      bgColor: "bg-cyan-950/30",
      borderColor: "border-cyan-900/40",
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ];

  return (
    <InstitutionalPageRoot>
      <InstitutionalHero
        heroRef={heroRef}
        gradientClass="via-indigo-950/30"
        maxWidthClass="max-w-6xl"
        contentClassName="px-6 md:px-10 py-16 md:py-24"
        translateY="30px"
        extraBlobs={
          <div className="absolute top-1/2 left-0 w-64 h-64 bg-pink-600/5 rounded-full blur-3xl pointer-events-none" aria-hidden />
        }
        topBlobClass="top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full"
        bottomBlobClass="bottom-0 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full"
      >
          <div
            style={{
              opacity: heroRef.inView ? 1 : 0,
              transform: heroRef.inView ? "translateY(0)" : "translateY(30px)",
              transition: "opacity 0.7s ease, transform 0.7s ease",
            }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full inline-block mb-6">
              À propos d'Axelmond Research Labs
            </span>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                  Axelmond{" "}
                  <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                    Research Labs
                  </span>
                </h1>
                <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-xl">
                  Plateforme académique de nouvelle génération dédiée à la{" "}
                  <span className="text-indigo-300 font-semibold">recherche</span>,{" "}
                  <span className="text-violet-300 font-semibold">la formation</span> et{" "}
                  <span className="text-pink-300 font-semibold">l'innovation</span>. Conçue pour les étudiants, les
                  enseignants et les chercheurs.
                </p>

                {/* Pillars row */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {[
                    {
                      label: "Research",
                      icon: <Atom className="w-3.5 h-3.5" />,
                      color: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10",
                    },
                    {
                      label: "Innovation",
                      icon: <Lightbulb className="w-3.5 h-3.5" />,
                      color: "text-amber-300 border-amber-500/30 bg-amber-500/10",
                    },
                    {
                      label: "Education",
                      icon: <GraduationCap className="w-3.5 h-3.5" />,
                      color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
                    },
                  ].map(({ label, icon, color }) => (
                    <span
                      key={label}
                      className={`flex items-center gap-1.5 text-xs font-bold border px-3 py-1.5 rounded-full ${color}`}
                    >
                      {icon}
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hero visual card */}
              <div className="hidden lg:flex flex-col gap-4">
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                      <BrainCircuit className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-white font-black text-sm">Portail Académique Unifié</div>
                      <div className="text-slate-500 text-[11px]">Modules · Live · IA · Recherche</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Étudiants", val: "500+", color: "text-indigo-300" },
                      { label: "Modules", val: "120+", color: "text-violet-300" },
                      { label: "Chercheurs", val: "40+", color: "text-pink-300" },
                      { label: "Satisfaction", val: "98%", color: "text-emerald-300" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                        <div className={`text-xl font-black ${color}`}>{val}</div>
                        <div className="text-slate-500 text-[10px] font-semibold">{label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Fake activity bar */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                        Activité plateforme
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                        En ligne
                      </span>
                    </div>
                    {[
                      ["Modules complétés", 78],
                      ["Taux de réussite quiz", 85],
                      ["Uptime serveur", 99],
                    ].map(([label, val]) => (
                      <div key={label as string}>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>{label}</span>
                          <span className="text-white font-bold">{val}%</span>
                        </div>
                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                            style={{ width: `${val}%`, transition: "width 1.5s ease" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
      </InstitutionalHero>

      <div className="max-w-6xl mx-auto px-6 md:px-10 py-12 space-y-20">
        {/* ── MISSION & VISION ─────────────────────────────────────────────── */}
        <div ref={missionRef.ref} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Mission */}
          <div
            className="relative overflow-hidden rounded-3xl border border-indigo-900/40 p-8 space-y-4"
            style={{
              background: "linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(30,27,75,0.3) 100%)",
              opacity: missionRef.inView ? 1 : 0,
              transform: missionRef.inView ? "translateX(0)" : "translateX(-30px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -translate-y-16 translate-x-16 pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Notre Mission</span>
              <h2 className="text-2xl font-black text-white mt-1">Former. Innover. Rechercher.</h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Axelmond Research Labs a pour mission de rendre l'enseignement supérieur accessible, moderne et connecté.
              Nous fournissons aux institutions académiques les outils numériques nécessaires pour offrir une expérience
              d'apprentissage de niveau mondial — des modules interactifs jusqu'aux sessions live et aux profils de
              chercheurs.
            </p>
            <ul className="space-y-2 pt-1">
              {[
                "Égalité d'accès à l'éducation de qualité",
                "Outils pédagogiques de pointe",
                "Collaboration université-entreprise-recherche",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Vision */}
          <div
            className="relative overflow-hidden rounded-3xl border border-violet-900/40 p-8 space-y-4"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(30,27,75,0.3) 100%)",
              opacity: missionRef.inView ? 1 : 0,
              transform: missionRef.inView ? "translateX(0)" : "translateX(30px)",
              transition: "opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s",
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full -translate-y-16 translate-x-16 pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Notre Vision</span>
              <h2 className="text-2xl font-black text-white mt-1">L'université du futur, maintenant.</h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Nous imaginons un avenir où chaque étudiant, professeur et chercheur dispose d'une plateforme unifiée et
              intelligente pour apprendre, enseigner et publier. Un hub académique mondial, connecté, sécurisé et
              enrichi par l'intelligence artificielle.
            </p>
            <ul className="space-y-2 pt-1">
              {[
                "Plateforme académique de référence internationale",
                "Intégration IA pour la personnalisation pédagogique",
                "Écosystème ouvert de publications et de recherches",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── CHIFFRES CLÉS ────────────────────────────────────────────────── */}
        <div ref={statsRef.ref}>
          <div
            className="text-center mb-10 space-y-2"
            style={{
              opacity: statsRef.inView ? 1 : 0,
              transform: statsRef.inView ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full inline-block">
              Chiffres Clés
            </span>
            <h2 className="text-3xl font-black text-white">La plateforme en chiffres</h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">
              Des données qui témoignent de l'engagement d'Axelmond Research Labs envers l'excellence académique.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <StatCard
                key={i}
                value={stat.value}
                suffix={stat.suffix}
                label={stat.label}
                sublabel={stat.sublabel}
                color={stat.color}
                bgColor={stat.bgColor}
                borderColor={stat.borderColor}
                icon={stat.icon}
                start={statsRef.inView}
              />
            ))}
          </div>
        </div>

        {/* ── VALEURS ──────────────────────────────────────────────────────── */}
        <div ref={valuesRef.ref}>
          <div
            className="text-center mb-10 space-y-2"
            style={{
              opacity: valuesRef.inView ? 1 : 0,
              transform: valuesRef.inView ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full inline-block">
              Nos Valeurs
            </span>
            <h2 className="text-3xl font-black text-white">Ce qui nous guide</h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">
              Nos quatre valeurs fondamentales orientent chaque décision, chaque fonctionnalité et chaque interaction.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {values.map((val, i) => (
              <ValueCard
                key={i}
                icon={val.icon}
                title={val.title}
                description={val.description}
                gradient={val.gradient}
                delay={val.delay}
                inView={valuesRef.inView}
              />
            ))}
          </div>
        </div>

        {/* ── FONCTIONNALITÉS ──────────────────────────────────────────────── */}
        <div ref={featuresRef.ref}>
          <div
            className="text-center mb-10 space-y-2"
            style={{
              opacity: featuresRef.inView ? 1 : 0,
              transform: featuresRef.inView ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full inline-block">
              Fonctionnalités
            </span>
            <h2 className="text-3xl font-black text-white">Une plateforme complète</h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">
              Chaque fonctionnalité a été conçue pour répondre aux besoins réels des acteurs du monde académique.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feat, i) => (
              <FeatureCard
                key={i}
                icon={feat.icon}
                title={feat.title}
                description={feat.description}
                badge={feat.badge}
                accent={feat.accent}
                delay={i * 60}
                inView={featuresRef.inView}
              />
            ))}
          </div>
        </div>

        {/* ── PRÉSENTATION GÉNÉRALE ─────────────────────────────────────── */}
        <div ref={visionRef.ref}>
          <div
            className="relative overflow-hidden rounded-3xl border border-slate-800"
            style={{
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,27,75,0.4) 50%, rgba(15,23,42,0.95) 100%)",
              opacity: visionRef.inView ? 1 : 0,
              transform: visionRef.inView ? "translateY(0)" : "translateY(30px)",
              transition: "opacity 0.7s ease, transform 0.7s ease",
            }}
          >
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full -translate-y-32 translate-x-32 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600/5 rounded-full translate-y-32 -translate-x-32 pointer-events-none" />

            <div className="relative p-8 md:p-12 grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
              {/* Left: Main text */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full inline-block mb-4">
                    Présentation Générale
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
                    Un écosystème académique conçu pour l'excellence
                  </h2>
                </div>
                <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                  <p>
                    <strong className="text-white">Axelmond Research Labs</strong> est une plateforme numérique
                    académique de nouvelle génération, conçue pour réunir en un seul endroit tous les acteurs de
                    l'éducation supérieure et de la recherche scientifique. Elle s'adresse aux{" "}
                    <span className="text-indigo-300">étudiants</span>, aux{" "}
                    <span className="text-pink-300">enseignants</span> et aux{" "}
                    <span className="text-violet-300">chercheurs</span>.
                  </p>
                  <p>
                    La plateforme propose un catalogue de modules structurés par domaines et disciplines académiques, un
                    système de sessions en direct intégré, un tuteur IA, des évaluations automatisées et des profils
                    académiques complets avec publications et spécialités de recherche.
                  </p>
                  <p>
                    Toute l'infrastructure repose sur une{" "}
                    <strong className="text-white">architecture sécurisée de niveau production</strong> : RBAC strict,
                    authentification JWT, vérification email, rate-limiting, audit trail et chiffrement des données
                    sensibles. Les paiements sont traités par des prestataires certifiés, conformément aux standards de
                    sécurité en vigueur.
                  </p>
                </div>

                {/* Technology stack badges */}
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Piliers de la plateforme</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Interface moderne", color: "text-cyan-300 bg-cyan-900/20 border-cyan-800/40" },
                      { label: "API sécurisée", color: "text-emerald-300 bg-emerald-900/20 border-emerald-800/40" },
                      { label: "Données protégées", color: "text-indigo-300 bg-indigo-900/20 border-indigo-800/40" },
                      { label: "Sessions en direct", color: "text-pink-300 bg-pink-900/20 border-pink-800/40" },
                      { label: "Tuteur IA", color: "text-violet-300 bg-violet-900/20 border-violet-800/40" },
                      { label: "Paiement en ligne", color: "text-amber-300 bg-amber-900/20 border-amber-800/40" },
                      { label: "Médias pédagogiques", color: "text-orange-300 bg-orange-900/20 border-orange-800/40" },
                      { label: "Authentification renforcée", color: "text-rose-300 bg-rose-900/20 border-rose-800/40" },
                    ].map(({ label, color }) => (
                      <span key={label} className={`text-[10px] font-bold border px-2.5 py-1 rounded-lg ${color}`}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Info cards */}
              <div className="space-y-4">
                {[
                  {
                    icon: <Cpu className="w-4 h-4 text-indigo-400" />,
                    title: "Architecture",
                    value: "Full-stack TypeScript",
                    sub: "Monorepo React + Express",
                  },
                  {
                    icon: <Shield className="w-4 h-4 text-emerald-400" />,
                    title: "Sécurité",
                    value: "Niveau Production",
                    sub: "RBAC · JWT · Argon2 · Rate Limit",
                  },
                  {
                    icon: <Globe className="w-4 h-4 text-sky-400" />,
                    title: "Disponibilité",
                    value: "99.9% Uptime",
                    sub: "Monitoring continu + alertes",
                  },
                  {
                    icon: <BarChart className="w-4 h-4 text-violet-400" />,
                    title: "Conformité",
                    value: "Loi 09-08",
                    sub: "Données protégées · Audit trail",
                  },
                ].map(({ icon, title, value, sub }) => (
                  <div
                    key={title}
                    className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-center gap-4"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{title}</div>
                      <div className="text-white text-sm font-black">{value}</div>
                      <div className="text-slate-500 text-[10px]">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── CTA FOOTER ───────────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-3xl border border-indigo-900/40 p-8 md:p-10 text-center space-y-5"
          style={{
            background:
              "linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(139,92,246,0.10) 50%, rgba(236,72,153,0.10) 100%)",
          }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-violet-500/5 rounded-full blur-2xl" />
          </div>
          <div className="relative">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full inline-block mb-4">
              Rejoindre la communauté
            </span>
            <h2 className="text-3xl font-black text-white">Prêt à explorer la plateforme ?</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto mt-3">
              Accédez à des centaines de modules académiques, participez aux sessions live et rejoignez une communauté
              de chercheurs et d'étudiants passionnés.
            </p>
          </div>
        </div>
      </div>
    </InstitutionalPageRoot>
  );
}
