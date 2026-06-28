import React from "react";
import { useInView } from "../hooks/useInView";
import {
  Shield,
  Lock,
  GraduationCap,
  AlertOctagon,
  Server,
  Ban,
  Copyright,
  Clock,
  RefreshCw,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Users,
  Eye,
  BookOpen,
  Activity,
  ExternalLink,
  Mail,
} from "lucide-react";
import {
  InstitutionalPageRoot,
  InstitutionalHero,
  InstitutionalSectionHeading,
  InstitutionalCheckList,
  InstitutionalForbidList,
  InstitutionalSectionBlock,
} from "./legal/InstitutionalPageShell";

// ─── Rule card (icon + title + desc) ─────────────────────────────────────────
const RuleCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  border: string;
  bg: string;
}> = ({ icon, title, description, border, bg }) => (
  <div
    className={`rounded-2xl border p-5 space-y-3 ${border} ${bg} hover:scale-[1.02] transition-transform duration-200`}
  >
    <div className="w-9 h-9 rounded-xl bg-slate-900/60 flex items-center justify-center">{icon}</div>
    <div className="text-white text-sm font-bold">{title}</div>
    <p className="text-[12px] text-slate-400 leading-relaxed">{description}</p>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TermsView() {
  const heroRef = useInView(0.1);
  const s1 = useInView();
  const s2 = useInView();
  const s3 = useInView();
  const s4 = useInView();
  const s5 = useInView();
  const s6 = useInView();
  const s7 = useInView();
  const s8 = useInView();
  const s9 = useInView();
  const s10 = useInView();

  return (
    <InstitutionalPageRoot>
      <InstitutionalHero
        heroRef={heroRef}
        gradientClass="via-violet-950/15"
        topBlobClass="top-0 right-0 w-[500px] h-[500px] bg-violet-600/6 rounded-full translate-x-60 -translate-y-60"
        bottomBlobClass="bottom-0 left-0 w-80 h-80 bg-indigo-600/6 rounded-full -translate-x-40 translate-y-40"
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          {/* Left */}
          <div className="space-y-5 max-w-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full inline-block">
              Document juridique — Portail académique
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Conditions{" "}
              <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-indigo-300 bg-clip-text text-transparent">
                d'utilisation
              </span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              En accédant à la plateforme <strong className="text-white">Performance Académique</strong>, vous acceptez
              les présentes conditions dans leur intégralité. Elles régissent l'ensemble de vos interactions avec la
              plateforme, ses services et sa communauté académique.
            </p>

            {/* Pill tags */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: "Droit marocain", color: "text-sky-300 border-sky-500/30 bg-sky-500/10" },
                { label: "Loi 09-08", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
                { label: "Acceptation implicite", color: "text-violet-300 border-violet-500/30 bg-violet-500/10" },
              ].map(({ label, color }) => (
                <span
                  key={label}
                  className={`text-[10px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-full ${color}`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right meta card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 flex-shrink-0 min-w-0 sm:min-w-[220px]">
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Dernière mise à jour</div>
              <div className="text-white font-black text-base">Juin 2026</div>
            </div>
            <div className="w-full h-px bg-slate-800" />
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Version</div>
              <div className="text-violet-300 font-black text-sm">v3.1.0</div>
            </div>
            <div className="w-full h-px bg-slate-800" />
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Entité</div>
              <div className="text-white text-sm font-bold">Performance Académique</div>
            </div>
          </div>
        </div>

        {/* Acceptance note */}
        <div className="mt-8 bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-slate-400 leading-relaxed">
            <strong className="text-violet-300">Acceptation :</strong> La création d'un compte ou la simple navigation
            sur les pages protégées de la plateforme vaut acceptation pleine et entière des présentes conditions
            d'utilisation. En cas de désaccord, veuillez cesser toute utilisation de la plateforme et contacter{" "}
            <strong className="text-white">contact@axelmond.com</strong>.
          </p>
        </div>
      </InstitutionalHero>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 space-y-8">
        {/* ── 1. Règles générales ─────────────────────────────────────────── */}
        <div ref={s1.ref}>
          <InstitutionalSectionBlock
            number="01"
            title="Règles générales"
            icon={<FileText className="w-5 h-5 text-indigo-300" />}
            accentClass="bg-indigo-500/15 border border-indigo-500/20"
            inView={s1.inView}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <RuleCard
                icon={<Users className="w-4 h-4 text-indigo-300" />}
                title="Accès réservé"
                description="L'utilisation de la plateforme est exclusivement réservée aux utilisateurs authentifiés disposant d'un rôle académique valide : étudiant, professeur, chercheur ou administrateur."
                border="border-indigo-800/30"
                bg="bg-indigo-950/20"
              />
              <RuleCard
                icon={<GraduationCap className="w-4 h-4 text-violet-300" />}
                title="Communauté académique"
                description="Chaque utilisateur s'engage à respecter la communauté académique — ses membres, ses contenus et son environnement d'apprentissage — avec courtoisie et professionnalisme."
                border="border-violet-800/30"
                bg="bg-violet-950/20"
              />
              <RuleCard
                icon={<Shield className="w-4 h-4 text-emerald-300" />}
                title="Respect des lois"
                description="Tout usage de la plateforme doit être conforme aux lois et réglementations applicables au Maroc, notamment la loi n° 09-08 et le Code de la propriété intellectuelle."
                border="border-emerald-800/30"
                bg="bg-emerald-950/20"
              />
            </div>
          </InstitutionalSectionBlock>
        </div>

        {/* ── 2. Responsabilité du compte ─────────────────────────────────── */}
        <div ref={s2.ref}>
          <InstitutionalSectionBlock
            number="02"
            title="Responsabilité du compte"
            icon={<Lock className="w-5 h-5 text-violet-300" />}
            accentClass="bg-violet-500/15 border border-violet-500/20"
            inView={s2.inView}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <InstitutionalCheckList
                  color="text-violet-400"
                  items={[
                    "Vous êtes entièrement responsable de la confidentialité de vos identifiants de connexion (email et mot de passe).",
                    "Le partage de votre compte avec un tiers est strictement interdit, quelle qu'en soit la raison.",
                    "Toute utilisation non autorisée de votre compte doit être signalée immédiatement à support@axelmond.com.",
                    "Vous êtes responsable de toutes les actions effectuées depuis votre compte, même si elles ont été réalisées à votre insu.",
                    "Choisissez un mot de passe fort (minimum 12 caractères, combinaison lettres, chiffres, caractères spéciaux).",
                    "Déconnectez-vous après chaque session sur un appareil partagé ou public.",
                  ]}
                />
              </div>
              <div className="bg-amber-950/20 border border-amber-800/30 rounded-2xl p-5 space-y-3 self-start">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300 text-xs font-black uppercase tracking-wide">
                    Avertissement important
                  </span>
                </div>
                <p className="text-[12px] text-slate-300 leading-relaxed">
                  Performance Académique ne vous demandera <strong className="text-white">jamais</strong> votre mot de
                  passe par e-mail, chat ou téléphone. Méfiez-vous de toute demande en ce sens. Tout incident de
                  sécurité doit être rapporté sans délai.
                </p>
                <div className="pt-1 border-t border-amber-800/30">
                  <div className="text-[10px] uppercase tracking-widest text-amber-600 font-bold mb-1">
                    Contact sécurité
                  </div>
                  <div className="text-white text-xs font-bold">support@axelmond.com</div>
                </div>
              </div>
            </div>
          </InstitutionalSectionBlock>
        </div>

        {/* ── 3. Intégrité académique ─────────────────────────────────────── */}
        <div ref={s3.ref}>
          <InstitutionalSectionBlock
            number="03"
            title="Intégrité académique"
            icon={<GraduationCap className="w-5 h-5 text-pink-300" />}
            accentClass="bg-pink-500/15 border border-pink-500/20"
            inView={s3.inView}
          >
            <p className="text-[13px] text-slate-400 leading-relaxed mb-5">
              La plateforme est un environnement académique exigeant. L'intégrité dans les évaluations, les travaux et
              les contenus académiques est une condition non négociable de l'accès aux services.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: <XCircle className="w-4 h-4 text-red-400" />,
                  title: "Plagiat interdit",
                  desc: "Toute soumission de travaux, réponses d'évaluation ou publications qui ne sont pas de votre propre production est formellement interdite.",
                  border: "border-red-900/30",
                  bg: "bg-red-950/15",
                },
                {
                  icon: <Copyright className="w-4 h-4 text-amber-400" />,
                  title: "Droits d'auteur respectés",
                  desc: "Vous vous engagez à citer correctement toutes les sources utilisées dans vos travaux, modules ou publications partagés sur la plateforme.",
                  border: "border-amber-900/30",
                  bg: "bg-amber-950/15",
                },
                {
                  icon: <XCircle className="w-4 h-4 text-red-400" />,
                  title: "Falsification interdite",
                  desc: "La falsification de résultats académiques, de données pédagogiques ou de toute production soumise sur la plateforme constitue une violation grave.",
                  border: "border-red-900/30",
                  bg: "bg-red-950/15",
                },
                {
                  icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
                  title: "Règles d'évaluation",
                  desc: "Chaque étudiant s'engage à respecter les règles propres à chaque évaluation, quiz ou examen, notamment l'interdiction d'utiliser des ressources non autorisées.",
                  border: "border-emerald-900/30",
                  bg: "bg-emerald-950/15",
                },
              ].map(({ icon, title, desc, border, bg }) => (
                <div
                  key={title}
                  className={`rounded-2xl border p-5 space-y-2.5 ${border} ${bg} hover:scale-[1.01] transition-transform duration-200`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-900/60 flex items-center justify-center">{icon}</div>
                    <span className="text-white text-sm font-bold">{title}</span>
                  </div>
                  <p className="text-[12px] text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </InstitutionalSectionBlock>
        </div>

        {/* ── 4. Utilisation acceptable ───────────────────────────────────── */}
        <div ref={s4.ref}>
          <InstitutionalSectionBlock
            number="04"
            title="Utilisation acceptable"
            icon={<AlertOctagon className="w-5 h-5 text-red-300" />}
            accentClass="bg-red-500/15 border border-red-500/20"
            inView={s4.inView}
          >
            <p className="text-[13px] text-slate-400 leading-relaxed mb-5">
              Les comportements suivants sont strictement interdits sur la plateforme et entraînent une suspension
              immédiate du compte.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="text-[10px] uppercase tracking-widest text-red-400 font-black mb-1">
                  Infrastructure & Sécurité
                </div>
                <InstitutionalForbidList
                  items={[
                    "Perturber intentionnellement le fonctionnement de la plateforme",
                    "Contourner les mécanismes d'authentification ou de contrôle d'accès",
                    "Utiliser des scripts automatisés, bots ou outils de scraping",
                    "Tenter d'exploiter des failles ou vulnérabilités techniques",
                    "Lancer des attaques de type DoS/DDoS contre l'infrastructure",
                  ]}
                />
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="text-[10px] uppercase tracking-widest text-red-400 font-black mb-1">
                  Contenu & Comportement
                </div>
                <InstitutionalForbidList
                  items={[
                    "Accéder à des données ou ressources non autorisées par votre rôle",
                    "Diffuser du contenu malveillant, diffamatoire ou illégal",
                    "Harceler, menacer ou intimider d'autres membres de la communauté",
                    "Partager des données personnelles d'autres utilisateurs sans consentement",
                    "Utiliser la plateforme à des fins commerciales non autorisées",
                  ]}
                />
              </div>
            </div>
          </InstitutionalSectionBlock>
        </div>

        {/* ── 5. Sécurité et protection ───────────────────────────────────── */}
        <div ref={s5.ref}>
          <InstitutionalSectionBlock
            number="05"
            title="Sécurité et protection"
            icon={<Shield className="w-5 h-5 text-emerald-300" />}
            accentClass="bg-emerald-500/15 border border-emerald-500/20"
            inView={s5.inView}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: <Lock className="w-4 h-4 text-indigo-300" />,
                  title: "Contrôle des accès",
                  desc: "RBAC strict sur toutes les routes. Chaque action est vérifiée selon votre rôle — étudiant, professeur, chercheur ou admin.",
                  border: "border-indigo-800/30",
                  bg: "bg-indigo-950/20",
                },
                {
                  icon: <Activity className="w-4 h-4 text-violet-300" />,
                  title: "Journalisation",
                  desc: "Toutes les actions sensibles (connexion, modification, suppression) sont enregistrées dans un journal d'audit sécurisé.",
                  border: "border-violet-800/30",
                  bg: "bg-violet-950/20",
                },
                {
                  icon: <Eye className="w-4 h-4 text-emerald-300" />,
                  title: "Protection des données",
                  desc: "Mots de passe hachés (Argon2/bcrypt), JWT signé, HTTPS/TLS obligatoire, aucun secret exposé dans le frontend.",
                  border: "border-emerald-800/30",
                  bg: "bg-emerald-950/20",
                },
                {
                  icon: <AlertTriangle className="w-4 h-4 text-amber-300" />,
                  title: "Surveillance active",
                  desc: "Détection en temps réel des activités suspectes, rate-limiting sur les routes d'auth, blocage automatique des abus.",
                  border: "border-amber-800/30",
                  bg: "bg-amber-950/20",
                },
              ].map(({ icon, title, desc, border, bg }) => (
                <div
                  key={title}
                  className={`rounded-2xl border p-4 space-y-2.5 ${border} ${bg} hover:-translate-y-0.5 transition-transform duration-200`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-900/60 flex items-center justify-center">{icon}</div>
                  <div className="text-white text-sm font-bold">{title}</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </InstitutionalSectionBlock>
        </div>

        {/* ── 6. Sanctions ────────────────────────────────────────────────── */}
        <div ref={s6.ref}>
          <div
            className="relative overflow-hidden rounded-3xl border border-red-900/50"
            style={{
              background: "linear-gradient(135deg, rgba(127,29,29,0.18) 0%, rgba(15,23,42,0.95) 60%)",
              opacity: s6.inView ? 1 : 0,
              transform: s6.inView ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 0.55s ease, transform 0.55s ease",
            }}
          >
            {/* Glow */}
            <div className="absolute top-0 left-1/2 w-64 h-32 bg-red-600/8 rounded-full -translate-x-1/2 -translate-y-16 blur-2xl pointer-events-none" />

            <div className="relative p-7 md:p-9">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                  <Ban className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-600 tabular-nums">06</span>
                  <h2 className="text-xl font-black text-white">Sanctions</h2>
                </div>
                <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-red-300 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                  Important
                </span>
              </div>

              <p className="text-[13px] text-slate-400 leading-relaxed mb-6">
                Le non-respect des présentes conditions expose l'utilisateur aux sanctions suivantes, appliquées
                progressivement selon la gravité et la récidive constatées.
              </p>

              {/* Sanction levels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {[
                  {
                    level: "Suspension temporaire",
                    icon: <Clock className="w-4 h-4 text-amber-400" />,
                    desc: "Blocage d'accès de 7 à 30 jours en cas de première violation significative ou de comportement inapproprié répété.",
                    color: "border-amber-800/40 bg-amber-950/20",
                    chip: "text-amber-300 border-amber-500/30 bg-amber-500/10",
                  },
                  {
                    level: "Suspension définitive",
                    icon: <Ban className="w-4 h-4 text-red-400" />,
                    desc: "Clôture permanente du compte sans remboursement en cas de violation grave : atteinte à la sécurité, fraude avérée ou activité illégale.",
                    color: "border-red-800/40 bg-red-950/20",
                    chip: "text-red-300 border-red-500/30 bg-red-500/10",
                  },
                  {
                    level: "Suppression d'accès aux ressources",
                    icon: <XCircle className="w-4 h-4 text-orange-400" />,
                    desc: "Retrait de l'accès à certains modules, sessions live ou fonctionnalités spécifiques suite à un usage abusif ciblé.",
                    color: "border-orange-800/40 bg-orange-950/20",
                    chip: "text-orange-300 border-orange-500/30 bg-orange-500/10",
                  },
                  {
                    level: "Annulation de résultats académiques",
                    icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
                    desc: "Annulation des notes, résultats de quiz et certifications obtenus en cas de fraude académique avérée (plagiat, triche, falsification).",
                    color: "border-rose-800/40 bg-rose-950/20",
                    chip: "text-rose-300 border-rose-500/30 bg-rose-500/10",
                  },
                ].map(({ level, icon, desc, color, chip }) => (
                  <div key={level} className={`rounded-2xl border p-4 space-y-2.5 ${color}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-900/60 flex items-center justify-center">{icon}</div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-full ${chip}`}
                      >
                        {level}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-300 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl px-5 py-4 flex items-start gap-3">
                <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-slate-400">
                  <strong className="text-white">Procédure de contestation :</strong> Tout utilisateur sanctionné peut
                  contester la décision dans un délai de <strong className="text-white">14 jours</strong> en écrivant à{" "}
                  <strong className="text-indigo-300">legal@axelmond.com</strong>. Une réponse motivée sera apportée
                  sous 10 jours ouvrables.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 7. Propriété intellectuelle ─────────────────────────────────── */}
        <div ref={s7.ref}>
          <InstitutionalSectionBlock
            number="07"
            title="Propriété intellectuelle"
            icon={<Copyright className="w-5 h-5 text-amber-300" />}
            accentClass="bg-amber-500/15 border border-amber-500/20"
            inView={s7.inView}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <p className="text-[13px] text-slate-300 leading-relaxed">
                  L'ensemble des contenus publiés sur la plateforme — modules, publications, vidéos, documents, supports
                  pédagogiques, interfaces et code source — est protégé par le droit de la propriété intellectuelle
                  applicable.
                </p>
                <InstitutionalCheckList
                  color="text-amber-400"
                  items={[
                    "Les modules et supports pédagogiques restent la propriété de leurs auteurs (professeurs/Performance Académique).",
                    "Les ressources pédagogiques restent la propriété intellectuelle de leurs auteurs.",
                    "Le logo, le nom et l'identité visuelle Performance Académique sont des marques protégées.",
                    "Le code source de la plateforme est la propriété exclusive de Performance Académique.",
                  ]}
                />
              </div>
              <div className="space-y-3">
                <div className="bg-red-950/20 border border-red-800/30 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-300 text-xs font-black uppercase tracking-wide">
                      Strictement interdits
                    </span>
                  </div>
                  <InstitutionalForbidList
                    items={[
                      "Copier ou reproduire les contenus pédagogiques sans autorisation écrite",
                      "Redistribuer ou republier des modules sur d'autres plateformes",
                      "Revendre ou monétiser les ressources de la plateforme",
                      "Supprimer les mentions de droits d'auteur des contenus",
                    ]}
                  />
                </div>
              </div>
            </div>
          </InstitutionalSectionBlock>
        </div>

        {/* ── 8. Disponibilité ────────────────────────────────────────────── */}
        <div ref={s8.ref}>
          <InstitutionalSectionBlock
            number="08"
            title="Disponibilité du service"
            icon={<Server className="w-5 h-5 text-sky-300" />}
            accentClass="bg-sky-500/15 border border-sky-500/20"
            inView={s8.inView}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              {[
                { metric: "99,9 %", label: "Objectif d'uptime annuel", color: "text-emerald-400" },
                { metric: "< 4 h/mois", label: "Maintenance planifiée max.", color: "text-sky-400" },
                { metric: "48 h", label: "Préavis avant maintenance", color: "text-violet-400" },
              ].map(({ metric, label, color }) => (
                <div key={label} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-center">
                  <div className={`text-2xl font-black tabular-nums ${color}`}>{metric}</div>
                  <div className="text-slate-500 text-[11px] mt-1 font-semibold">{label}</div>
                </div>
              ))}
            </div>
            <p className="text-[13px] text-slate-300 leading-relaxed mb-4">
              La plateforme peut être temporairement indisponible dans les cas suivants, sans que cela constitue un
              manquement contractuel :
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                "Maintenances planifiées (notifiées 48h à l'avance par email)",
                "Mises à jour de sécurité d'urgence (sans préavis si criticité haute)",
                "Pannes d'infrastructure cloud tierce indépendantes de notre volonté",
                "Cas de force majeure (cyberattaques massives, catastrophes naturelles, etc.)",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2.5 bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3"
                >
                  <Info className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
                  <span className="text-[12px] text-slate-400">{item}</span>
                </div>
              ))}
            </div>
          </InstitutionalSectionBlock>
        </div>

        {/* ── 9. Modifications ────────────────────────────────────────────── */}
        <div ref={s9.ref}>
          <InstitutionalSectionBlock
            number="09"
            title="Modifications des conditions"
            icon={<RefreshCw className="w-5 h-5 text-teal-300" />}
            accentClass="bg-teal-500/15 border border-teal-500/20"
            inView={s9.inView}
          >
            <p className="text-[13px] text-slate-300 leading-relaxed mb-5">
              Performance Académique se réserve le droit de modifier les présentes conditions à tout moment, afin de
              refléter les évolutions de la plateforme, les obligations légales ou les changements de pratiques du
              secteur académique numérique.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  step: "01",
                  title: "Notification",
                  desc: "Un e-mail est envoyé à tous les utilisateurs actifs résumant les modifications apportées.",
                  color: "text-teal-400",
                },
                {
                  step: "02",
                  title: "Délai de prise d'effet",
                  desc: "Les nouvelles conditions entrent en vigueur 15 jours calendaires après la notification initiale.",
                  color: "text-sky-400",
                },
                {
                  step: "03",
                  title: "Acceptation ou résiliation",
                  desc: "Continuer à utiliser la plateforme vaut acceptation. En cas de refus, le compte peut être clôturé à la demande.",
                  color: "text-violet-400",
                },
              ].map(({ step, title, desc, color }) => (
                <div key={step} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className={`text-[10px] font-black tabular-nums ${color} uppercase tracking-widest`}>
                    Étape {step}
                  </div>
                  <div className="text-white text-sm font-bold">{title}</div>
                  <p className="text-[12px] text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-slate-600 mt-4">
              La version en vigueur des conditions est toujours accessible depuis le pied de page du portail. En cas de
              contradiction entre une version antérieure et la version actuelle, la version actuelle prévaut.
            </p>
          </InstitutionalSectionBlock>
        </div>

        {/* ── 10. Informations légales ────────────────────────────────────── */}
        <div ref={s10.ref}>
          <div
            className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950"
            style={{
              opacity: s10.inView ? 1 : 0,
              transform: s10.inView ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 0.55s ease, transform 0.55s ease",
            }}
          >
            <div className="p-7 md:p-9">
              <InstitutionalSectionHeading
                number="10"
                title="Informations légales"
                icon={<BookOpen className="w-5 h-5 text-rose-300" />}
                accentClass="bg-rose-500/15 border border-rose-500/20"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {[
                  { label: "Entité responsable", value: "Performance Académique" },
                  { label: "Droit applicable", value: "Droit marocain · Loi n° 09-08" },
                  { label: "Dernière mise à jour", value: "Juin 2026 — Version v3.1.0" },
                  { label: "Juridiction", value: "Tribunaux compétents du ressort de Casablanca (Maroc)" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">{label}</div>
                    <div className="text-white text-sm font-semibold">{value}</div>
                  </div>
                ))}
              </div>

              {/* Related links */}
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Documents associés</div>
                <div className="flex flex-wrap gap-3">
                  {[
                    {
                      label: "Politique de confidentialité",
                      view: "privacy",
                      color: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20",
                    },
                    {
                      label: "Politique des cookies",
                      view: "cookies",
                      color: "text-violet-300 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20",
                    },
                    {
                      label: "Centre d'aide",
                      view: "support",
                      color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20",
                    },
                    {
                      label: "Contact",
                      view: "contact",
                      color: "text-sky-300 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20",
                    },
                  ].map(({ label, color }) => (
                    <span
                      key={label}
                      className={`inline-flex items-center gap-1.5 text-xs font-bold border px-3 py-1.5 rounded-full cursor-pointer transition-colors ${color}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 bg-slate-950/40 border border-slate-800/60 rounded-2xl px-5 py-4 flex items-start gap-3">
                <Mail className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  Pour toute question juridique relative à ces conditions ou pour exercer vos droits, écrivez à{" "}
                  <strong className="text-white">legal@axelmond.com</strong> avec pour objet{" "}
                  <em className="text-rose-300">«&nbsp;Question juridique — CGU&nbsp;»</em>. Délai de réponse : 10 jours
                  ouvrables.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </InstitutionalPageRoot>
  );
}
