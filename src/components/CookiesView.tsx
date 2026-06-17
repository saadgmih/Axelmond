import React from "react";
import { useInView } from "../hooks/useInView";
import {
  Cookie,
  Lock,
  Settings,
  BarChart2,
  Shield,
  Clock,
  Mail,
  Info,
  CheckCircle,
  XCircle,
  Sliders,
  Globe,
  Fingerprint,
  Eye,
  AlertTriangle,
  ExternalLink,
  Database,
  RefreshCw,
} from "lucide-react";
import {
  InstitutionalPageRoot,
  InstitutionalHero,
  InstitutionalFade,
  InstitutionalSectionHeading,
} from "./legal/InstitutionalPageShell";

const CookieTypeCard: React.FC<{
  icon: React.ReactNode;
  emoji: string;
  category: string;
  title: string;
  description: string;
  items: string[];
  border: string;
  bg: string;
  titleColor: string;
  chipColor: string;
  required?: boolean;
  delay: number;
  inView: boolean;
}> = ({
  icon: _icon,
  emoji,
  category,
  title,
  description,
  items,
  border,
  bg,
  titleColor,
  chipColor,
  required,
  delay,
  inView,
}) => (
  <InstitutionalFade inView={inView} delay={delay}>
    <div
      className={`h-full rounded-2xl border p-6 space-y-4 ${border} ${bg} hover:-translate-y-0.5 transition-transform duration-200`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900/70 flex items-center justify-center text-xl flex-shrink-0">
            {emoji}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{category}</div>
            <div className={`text-base font-black ${titleColor}`}>{title}</div>
          </div>
        </div>
        {required !== undefined && (
          <span
            className={`text-[9px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-full flex-shrink-0 ${chipColor}`}
          >
            {required ? "Nécessaire" : "Optionnel"}
          </span>
        )}
      </div>
      <p className="text-[12px] text-slate-400 leading-relaxed">{description}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-[12px] text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  </InstitutionalFade>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CookiesView() {
  const heroRef = useInView(0.1);
  const s1 = useInView();
  const s2 = useInView();
  const s3 = useInView();
  const s4 = useInView();
  const s5 = useInView();
  const s6 = useInView();
  const s7 = useInView();
  const s8 = useInView();

  const cookieTypes = [
    {
      emoji: "🔐",
      icon: <Lock className="w-4 h-4" />,
      category: "Cookies",
      title: "Essentiels",
      description:
        "Indispensables au fonctionnement sécurisé de la plateforme. Ils ne peuvent pas être désactivés sans compromettre votre accès aux services.",
      items: [
        "Authentification et maintien de session (JWT)",
        "Vérification de l'identité à chaque requête",
        "Sécurité des comptes (protection CSRF)",
        "Mémorisation de vos préférences essentielles",
      ],
      border: "border-indigo-800/40",
      bg: "bg-indigo-950/20",
      titleColor: "text-indigo-300",
      chipColor: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
      required: true,
    },
    {
      emoji: "⚙️",
      icon: <Settings className="w-4 h-4" />,
      category: "Cookies",
      title: "Fonctionnels",
      description:
        "Améliorent votre expérience en mémorisant vos choix personnels. Peuvent être désactivés, mais certaines fonctionnalités seront réduites.",
      items: [
        "Préférence de langue d'affichage",
        "Thème visuel (sombre / clair)",
        "Paramètres d'accessibilité personnalisés",
        "Dernière vue consultée pour reprise rapide",
      ],
      border: "border-violet-800/40",
      bg: "bg-violet-950/20",
      titleColor: "text-violet-300",
      chipColor: "text-amber-300 border-amber-500/30 bg-amber-500/10",
      required: false,
    },
    {
      emoji: "📊",
      icon: <BarChart2 className="w-4 h-4" />,
      category: "Cookies",
      title: "Analytiques",
      description:
        "Collectent des données agrégées et anonymisées pour comprendre l'usage de la plateforme et améliorer les performances pédagogiques.",
      items: [
        "Statistiques d'utilisation des modules (anonymisées)",
        "Analyse des temps de chargement et performances",
        "Mesure du taux de complétion des modules",
        "Identification des pages les plus consultées",
      ],
      border: "border-sky-800/40",
      bg: "bg-sky-950/20",
      titleColor: "text-sky-300",
      chipColor: "text-amber-300 border-amber-500/30 bg-amber-500/10",
      required: false,
    },
  ];

  const purposes = [
    {
      icon: <Fingerprint className="w-4 h-4 text-indigo-400" />,
      label: "Maintenir la connexion utilisateur",
      desc: "Votre session reste active entre les pages sans vous obliger à vous reconnecter à chaque navigation.",
      color: "border-indigo-800/30 bg-indigo-950/15",
    },
    {
      icon: <Lock className="w-4 h-4 text-emerald-400" />,
      label: "Sécuriser les accès",
      desc: "Vérification de l'identité côté serveur à chaque requête et protection contre les accès non autorisés.",
      color: "border-emerald-800/30 bg-emerald-950/15",
    },
    {
      icon: <Settings className="w-4 h-4 text-violet-400" />,
      label: "Mémoriser les préférences",
      desc: "Vos choix d'interface (thème, langue, paramètres) sont retenus pour les sessions suivantes.",
      color: "border-violet-800/30 bg-violet-950/15",
    },
    {
      icon: <BarChart2 className="w-4 h-4 text-sky-400" />,
      label: "Optimiser les performances",
      desc: "Réduction des temps de chargement et amélioration de la réactivité de la plateforme.",
      color: "border-sky-800/30 bg-sky-950/15",
    },
    {
      icon: <Eye className="w-4 h-4 text-pink-400" />,
      label: "Améliorer l'expérience utilisateur",
      desc: "Personnalisation de l'interface et adaptation du parcours pédagogique selon votre profil.",
      color: "border-pink-800/30 bg-pink-950/15",
    },
  ];

  const managementSteps = [
    {
      icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
      title: "Accepter ou refuser",
      desc: "Vous pouvez accepter ou refuser les cookies non essentiels (fonctionnels et analytiques) sans impacter votre accès aux fonctionnalités de base.",
      color: "border-emerald-800/30 bg-emerald-950/15",
    },
    {
      icon: <RefreshCw className="w-4 h-4 text-sky-400" />,
      title: "Supprimer les cookies",
      desc: "Depuis les paramètres de votre navigateur (Paramètres → Confidentialité → Cookies), vous pouvez supprimer tous les cookies stockés par la plateforme.",
      color: "border-sky-800/30 bg-sky-950/15",
    },
    {
      icon: <Sliders className="w-4 h-4 text-violet-400" />,
      title: "Modifier ses préférences",
      desc: "Vos préférences en matière de cookies peuvent être modifiées à tout moment via les paramètres de votre profil ou les réglages de votre navigateur.",
      color: "border-violet-800/30 bg-violet-950/15",
    },
  ];

  const browserGuide = [
    { browser: "Chrome", path: "Paramètres → Confidentialité → Cookies", icon: "🌐" },
    { browser: "Firefox", path: "Options → Vie privée → Cookies et données", icon: "🦊" },
    { browser: "Safari", path: "Préférences → Confidentialité → Cookies", icon: "🧭" },
    { browser: "Edge", path: "Paramètres → Confidentialité → Cookies", icon: "🔷" },
  ];

  const retentionData = [
    {
      name: "refresh_token",
      type: "Cookie HttpOnly",
      duration: "7 jours max ou jusqu'à déconnexion",
      category: "Essentiel",
    },
    {
      name: "csrf_token",
      type: "Cookie lisible",
      duration: "7 jours max ou jusqu'à déconnexion",
      category: "Essentiel",
    },
    {
      name: "access_token (session)",
      type: "Mémoire navigateur",
      duration: "15 min max, rechargé via cookie HttpOnly",
      category: "Essentiel",
    },
    {
      name: "user_preferences",
      type: "localStorage",
      duration: "Persistent (jusqu'à effacement manuel)",
      category: "Fonctionnel",
    },
    {
      name: "analytics_session",
      type: "sessionStorage",
      duration: "Durée de la session navigateur",
      category: "Analytique",
    },
    {
      name: "theme_preference",
      type: "localStorage",
      duration: "Persistent (jusqu'à modification)",
      category: "Fonctionnel",
    },
  ];

  return (
    <InstitutionalPageRoot>
      <InstitutionalHero
        heroRef={heroRef}
        gradientClass="via-orange-950/10"
        topBlobClass="top-0 right-0 w-[480px] h-[480px] bg-orange-600/5 rounded-full translate-x-60 -translate-y-60"
        bottomBlobClass="bottom-0 left-0 w-80 h-80 bg-amber-600/5 rounded-full -translate-x-40 translate-y-40"
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          {/* Left */}
          <div className="space-y-5 max-w-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full inline-block">
              Document juridique — Portail académique
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Politique des{" "}
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
                cookies
              </span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              <strong className="text-white">Axelmond Research Labs</strong> utilise des cookies et technologies
              similaires pour assurer le bon fonctionnement de la plateforme, améliorer votre expérience d'apprentissage
              et renforcer la sécurité de votre compte.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                {
                  label: "Sans tracking publicitaire",
                  color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
                },
                { label: "Loi 09-08", color: "text-sky-300 border-sky-500/30 bg-sky-500/10" },
                { label: "CNDP", color: "text-violet-300 border-violet-500/30 bg-violet-500/10" },
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
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 flex-shrink-0 min-w-0 sm:min-w-[210px]">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Dernière mise à jour</div>
              <div className="text-white font-black text-base mt-0.5">Juin 2026</div>
            </div>
            <div className="w-full h-px bg-slate-800" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                Cookies tiers publicitaires
              </div>
              <div className="flex items-center gap-2 mt-1">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-300 text-sm font-bold">Aucun</span>
              </div>
            </div>
            <div className="w-full h-px bg-slate-800" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Cookies essentiels</div>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 text-sm font-bold">Actifs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div className="mt-8 bg-amber-950/20 border border-amber-800/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Cookie className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-slate-400 leading-relaxed">
            <strong className="text-amber-300">Bon à savoir :</strong> La plateforme utilise des cookies
            <strong className="text-white"> strictement essentiels</strong> pour sécuriser la session, ainsi que du
            stockage local pour les préférences. Aucun pixel de tracking, aucune régie publicitaire, aucun réseau social
            n'est connecté à vos données de navigation sur Axelmond Research Labs.
          </p>
        </div>
      </InstitutionalHero>

      <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 space-y-10">
        {/* ── 1. Introduction ──────────────────────────────────────────────── */}
        <div ref={s1.ref}>
          <InstitutionalFade inView={s1.inView}>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 md:p-9">
              <InstitutionalSectionHeading
                number="01"
                title="Introduction"
                icon={<Info className="w-5 h-5 text-amber-300" />}
                accentClass="bg-amber-500/15 border border-amber-500/20"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    icon: <Globe className="w-5 h-5 text-indigo-400" />,
                    title: "Bon fonctionnement",
                    desc: "Les cookies permettent à la plateforme de fonctionner correctement — gestion des sessions, authentification sécurisée et navigation fluide entre les pages.",
                    border: "border-indigo-800/30 bg-indigo-950/15",
                  },
                  {
                    icon: <Eye className="w-5 h-5 text-violet-400" />,
                    title: "Expérience améliorée",
                    desc: "Ils mémorisent vos préférences d'affichage, votre langue et vos paramètres personnels pour vous offrir une expérience académique cohérente.",
                    border: "border-violet-800/30 bg-violet-950/15",
                  },
                  {
                    icon: <Shield className="w-5 h-5 text-emerald-400" />,
                    title: "Sécurité renforcée",
                    desc: "Certains cookies contribuent à la sécurité de votre compte en vérifiant votre identité à chaque requête et en protégeant contre les accès non autorisés.",
                    border: "border-emerald-800/30 bg-emerald-950/15",
                  },
                ].map(({ icon, title, desc, border }) => (
                  <div key={title} className={`rounded-2xl border p-5 space-y-2.5 ${border}`}>
                    <div className="w-9 h-9 rounded-xl bg-slate-900/60 flex items-center justify-center">{icon}</div>
                    <div className="text-white text-sm font-bold">{title}</div>
                    <p className="text-[12px] text-slate-400 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </InstitutionalFade>
        </div>

        {/* ── 2. Qu'est-ce qu'un cookie ? ──────────────────────────────────── */}
        <div ref={s2.ref}>
          <InstitutionalFade inView={s2.inView}>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 md:p-9">
              <InstitutionalSectionHeading
                number="02"
                title="Qu'est-ce qu'un cookie ?"
                icon={<Cookie className="w-5 h-5 text-orange-300" />}
                accentClass="bg-orange-500/15 border border-orange-500/20"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-4">
                  <p className="text-[13px] text-slate-300 leading-relaxed">
                    Un <strong className="text-white">cookie</strong> (ou témoin de connexion) est un petit fichier
                    texte stocké sur votre appareil — ordinateur, tablette ou smartphone — lorsque vous visitez un site
                    web ou utilisez une application.
                  </p>
                  <p className="text-[13px] text-slate-300 leading-relaxed">
                    Ce fichier contient des informations que la plateforme peut lire lors de votre prochaine visite, lui
                    permettant de vous reconnaître et d'adapter son comportement à vos préférences.
                  </p>
                  <p className="text-[13px] text-slate-300 leading-relaxed">
                    Dans le contexte d'Axelmond Research Labs, nous utilisons des{" "}
                    <strong className="text-white">cookies de sécurité</strong> pour la session et du{" "}
                    <strong className="text-white">stockage local</strong> pour les préférences non secrètes.
                  </p>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      label: "Stocké sur",
                      value: "Votre navigateur (cookies essentiels + stockage local)",
                      icon: <Database className="w-3.5 h-3.5 text-slate-500" />,
                    },
                    {
                      label: "Accessible par",
                      value: "Uniquement axelmond.com (domaine propriétaire)",
                      icon: <Lock className="w-3.5 h-3.5 text-slate-500" />,
                    },
                    {
                      label: "Contient",
                      value: "Cookie de session HttpOnly, jeton CSRF, préférences UI",
                      icon: <Info className="w-3.5 h-3.5 text-slate-500" />,
                    },
                    {
                      label: "Ne contient pas",
                      value: "Mot de passe, données bancaires, clés secrètes",
                      icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
                    },
                  ].map(({ label, value, icon }) => (
                    <div
                      key={label}
                      className="bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 mt-0.5">{icon}</span>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
                        <div className="text-slate-200 text-[12px] font-semibold mt-0.5">{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </InstitutionalFade>
        </div>

        {/* ── 3. Types de cookies ───────────────────────────────────────────── */}
        <div ref={s3.ref}>
          <InstitutionalFade inView={s3.inView}>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 md:p-9">
              <InstitutionalSectionHeading
                number="03"
                title="Types de cookies utilisés"
                icon={<Settings className="w-5 h-5 text-violet-300" />}
                accentClass="bg-violet-500/15 border border-violet-500/20"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {cookieTypes.map((ct, i) => (
                  <CookieTypeCard key={ct.title} {...ct} delay={i * 80} inView={s3.inView} />
                ))}
              </div>
            </div>
          </InstitutionalFade>
        </div>

        {/* ── 4. Finalités ─────────────────────────────────────────────────── */}
        <div ref={s4.ref}>
          <InstitutionalFade inView={s4.inView}>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 md:p-9">
              <InstitutionalSectionHeading
                number="04"
                title="Finalités des cookies"
                icon={<Globe className="w-5 h-5 text-sky-300" />}
                accentClass="bg-sky-500/15 border border-sky-500/20"
              />
              <p className="text-[13px] text-slate-400 leading-relaxed mb-5">
                Les cookies et technologies de stockage local utilisés par Axelmond Research Labs répondent
                exclusivement aux finalités académiques et techniques suivantes.
              </p>
              <div className="space-y-3">
                {purposes.map(({ icon, label, desc, color }) => (
                  <div key={label} className={`flex items-start gap-4 rounded-2xl border p-4 ${color}`}>
                    <div className="w-8 h-8 rounded-xl bg-slate-900/60 flex items-center justify-center flex-shrink-0">
                      {icon}
                    </div>
                    <div>
                      <div className="text-white text-sm font-bold">{label}</div>
                      <p className="text-[12px] text-slate-400 leading-relaxed mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </InstitutionalFade>
        </div>

        {/* ── 5. Gestion ───────────────────────────────────────────────────── */}
        <div ref={s5.ref}>
          <InstitutionalFade inView={s5.inView}>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 md:p-9">
              <InstitutionalSectionHeading
                number="05"
                title="Gestion des cookies"
                icon={<Sliders className="w-5 h-5 text-teal-300" />}
                accentClass="bg-teal-500/15 border border-teal-500/20"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {managementSteps.map(({ icon, title, desc, color }) => (
                  <div
                    key={title}
                    className={`rounded-2xl border p-5 space-y-3 ${color} hover:scale-[1.02] transition-transform duration-200`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-900/60 flex items-center justify-center">{icon}</div>
                      <span className="text-white text-sm font-bold">{title}</span>
                    </div>
                    <p className="text-[12px] text-slate-400 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>

              {/* Browser guide */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3">
                  Accès aux paramètres par navigateur
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {browserGuide.map(({ browser, path, icon }) => (
                    <div
                      key={browser}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5 text-center"
                    >
                      <div className="text-xl">{icon}</div>
                      <div className="text-white text-xs font-bold">{browser}</div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">{path}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 bg-amber-950/15 border border-amber-800/25 rounded-xl px-4 py-3 flex items-start gap-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-400">
                  <strong className="text-amber-300">Attention :</strong> La désactivation des cookies
                  <strong className="text-white"> essentiels</strong> empêchera votre connexion à la plateforme. Seuls
                  les cookies fonctionnels et analytiques peuvent être refusés sans impacter l'accès aux services de
                  base.
                </p>
              </div>
            </div>
          </InstitutionalFade>
        </div>

        {/* ── 6. Protection des données ────────────────────────────────────── */}
        <div ref={s6.ref}>
          <InstitutionalFade inView={s6.inView}>
            <div className="relative overflow-hidden bg-slate-900 border border-emerald-900/40 rounded-3xl p-7 md:p-9">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/4 rounded-full translate-x-32 -translate-y-32 blur-2xl pointer-events-none" />
              <div className="relative">
                <InstitutionalSectionHeading
                  number="06"
                  title="Protection des données"
                  icon={<Shield className="w-5 h-5 text-emerald-300" />}
                  accentClass="bg-emerald-500/15 border border-emerald-500/20"
                />

                {/* 3 security guarantees */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {[
                    {
                      icon: <XCircle className="w-5 h-5 text-red-400" />,
                      title: "Jamais de mot de passe",
                      desc: "Aucun mot de passe, même chiffré, n'est jamais stocké dans un cookie ou dans le localStorage. Le refresh token est protégé par un cookie HttpOnly et le jeton d'accès reste en mémoire.",
                      border: "border-red-800/25 bg-red-950/10",
                    },
                    {
                      icon: <Lock className="w-5 h-5 text-amber-400" />,
                      title: "Secrets serveur protégés",
                      desc: "Aucune clé secrète de serveur, clé API ou credential d'intégration n'est jamais transmise ni stockée côté client.",
                      border: "border-amber-800/25 bg-amber-950/10",
                    },
                    {
                      icon: <Shield className="w-5 h-5 text-emerald-400" />,
                      title: "Données sécurisées",
                      desc: "Toutes les données sensibles restent sur les serveurs sécurisés d'Axelmond Research Labs et ne transitent jamais en clair.",
                      border: "border-emerald-800/25 bg-emerald-950/10",
                    },
                  ].map(({ icon, title, desc, border }) => (
                    <div key={title} className={`rounded-2xl border p-5 space-y-3 ${border}`}>
                      <div className="w-9 h-9 rounded-xl bg-slate-900/60 flex items-center justify-center">{icon}</div>
                      <div className="text-white text-sm font-bold">{title}</div>
                      <p className="text-[12px] text-slate-400 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>

                {/* Security stack */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
                  <div className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mb-3">
                    Mesures de sécurité complémentaires
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      "JWT signé côté serveur avec expiration courte (24h max)",
                      "Hachage Argon2/bcrypt — aucun mot de passe en clair stocké",
                      "HTTPS/TLS obligatoire — toutes les communications chiffrées",
                      "Rate-limiting sur les routes d'authentification (anti-brute-force)",
                      "RBAC strict : chaque requête vérifiée selon le rôle de l'utilisateur",
                      "Audit trail : toutes les actions sensibles sont journalisées",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2 text-[12px] text-slate-300">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </InstitutionalFade>
        </div>

        {/* ── 7. Durée de conservation ──────────────────────────────────────── */}
        <div ref={s7.ref}>
          <InstitutionalFade inView={s7.inView}>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 md:p-9">
              <InstitutionalSectionHeading
                number="07"
                title="Durée de conservation"
                icon={<Clock className="w-5 h-5 text-pink-300" />}
                accentClass="bg-pink-500/15 border border-pink-500/20"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400" />
                    <span className="text-white text-sm font-bold">Cookies de session</span>
                    <span className="ml-auto text-[10px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-full text-sky-300 border-sky-500/30 bg-sky-500/10">
                      Temporaire
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-400 leading-relaxed">
                    Ces cookies expirent automatiquement à la fermeture du navigateur ou lors de la déconnexion
                    explicite. Ils ne laissent aucune trace après votre session.
                  </p>
                  <div className="text-[11px] text-slate-500">
                    Exemple : jeton de session, état de navigation temporaire
                  </div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-violet-400" />
                    <span className="text-white text-sm font-bold">Cookies persistants</span>
                    <span className="ml-auto text-[10px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-full text-violet-300 border-violet-500/30 bg-violet-500/10">
                      Persistant
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-400 leading-relaxed">
                    Certains cookies restent jusqu'à leur expiration programmée ou leur suppression manuelle, afin de
                    mémoriser vos préférences entre les sessions.
                  </p>
                  <div className="text-[11px] text-slate-500">Exemple : préférence de thème, langue d'affichage</div>
                </div>
              </div>

              {/* Retention table */}
              <div className="overflow-hidden rounded-2xl border border-slate-800">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-800/60">
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-black">Nom</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-black hidden sm:table-cell">
                        Type
                      </th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                        Durée
                      </th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-slate-400 font-black hidden md:table-cell">
                        Catégorie
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {retentionData.map(({ name, type, duration, category }) => (
                      <tr key={name} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3">
                          <code className="text-[11px] text-amber-300 bg-amber-900/20 border border-amber-800/30 px-2 py-0.5 rounded-md font-mono">
                            {name}
                          </code>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-[11px] text-slate-400 font-mono">{type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] text-slate-300">{duration}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-full ${
                              category === "Essentiel"
                                ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                                : category === "Fonctionnel"
                                  ? "text-violet-300 border-violet-500/30 bg-violet-500/10"
                                  : "text-sky-300 border-sky-500/30 bg-sky-500/10"
                            }`}
                          >
                            {category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </InstitutionalFade>
        </div>

        {/* ── 8. Contact ────────────────────────────────────────────────────── */}
        <div ref={s8.ref}>
          <InstitutionalFade inView={s8.inView}>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 md:p-9">
              <InstitutionalSectionHeading
                number="08"
                title="Contact"
                icon={<Mail className="w-5 h-5 text-rose-300" />}
                accentClass="bg-rose-500/15 border border-rose-500/20"
              />
              <p className="text-[13px] text-slate-400 leading-relaxed mb-6">
                Pour toute question relative à notre politique de cookies, à l'exercice de vos droits ou à la protection
                de vos données personnelles, plusieurs canaux sont à votre disposition.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-indigo-950/20 border border-indigo-800/30 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-900/60 flex items-center justify-center">
                      <ExternalLink className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="text-white text-sm font-bold">Politique de confidentialité</span>
                  </div>
                  <p className="text-[12px] text-slate-400 leading-relaxed">
                    Consultez notre politique de confidentialité complète pour comprendre comment nous collectons,
                    utilisons et protégeons vos données personnelles.
                  </p>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 rounded-full inline-block">
                    → Politique de confidentialité
                  </span>
                </div>
                <div className="bg-rose-950/20 border border-rose-800/30 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-900/60 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-rose-400" />
                    </div>
                    <span className="text-white text-sm font-bold">Nous contacter</span>
                  </div>
                  <p className="text-[12px] text-slate-400 leading-relaxed">
                    Pour toute question relative aux cookies, à vos préférences ou à l'exercice de vos droits prévus par
                    la loi n° 09-08, notre équipe vous répond dans un délai de 10 jours ouvrables.
                  </p>
                  <span className="text-[10px] font-black text-rose-300">verification@axelmond.com</span>
                </div>
              </div>

              {/* Footer meta */}
              <div className="bg-slate-950/50 border border-slate-800/60 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-white text-sm font-bold">Axelmond Research Labs — Politique des cookies</div>
                  <div className="text-slate-500 text-[11px]">
                    Dernière mise à jour : Juin 2026 · Droit marocain · Loi n° 09-08
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-full text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                    Loi 09-08
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-full text-sky-300 border-sky-500/30 bg-sky-500/10">
                    ePrivacy
                  </span>
                </div>
              </div>
            </div>
          </InstitutionalFade>
        </div>
      </div>
    </InstitutionalPageRoot>
  );
}
