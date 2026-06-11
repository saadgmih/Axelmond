import React, { useEffect, useRef, useState } from "react";
import {
  Shield,
  Database,
  Lock,
  Share2,
  Clock,
  UserCheck,
  Cookie,
  Mail,
  AlertTriangle,
  CheckCircle,
  FileText,
  Globe,
  Eye,
  Trash2,
  Download,
  RefreshCw,
  Server,
  Key,
} from "lucide-react";

// ─── Intersection observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
interface SectionProps {
  id: string;
  number: string;
  icon: React.ReactNode;
  title: string;
  accent: string;         // Tailwind border/icon colour classes
  bgAccent: string;       // Tailwind bg tint class
  children: React.ReactNode;
  delay?: number;
  inView: boolean;
}
const Section: React.FC<SectionProps> = ({
  id, number, icon, title, accent, bgAccent, children, delay = 0, inView,
}) => (
  <div
    id={id}
    className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden"
    style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
    }}
  >
    {/* Section header */}
    <div className={`flex items-center gap-4 px-7 py-5 border-b border-slate-800 ${bgAccent}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accent} bg-slate-900/60`}>
        {icon}
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[10px] font-black text-slate-500 tabular-nums flex-shrink-0">{number}</span>
        <h2 className="text-base font-black text-white">{title}</h2>
      </div>
    </div>
    {/* Section body */}
    <div className="px-7 py-6 space-y-4 text-sm text-slate-300 leading-relaxed">
      {children}
    </div>
  </div>
);

// ─── Info row (label + value) ─────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex items-start gap-3 bg-slate-950/50 border border-slate-800/60 rounded-xl px-4 py-3">
    {icon && <span className="text-slate-500 flex-shrink-0 mt-0.5">{icon}</span>}
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className="text-slate-200 text-sm font-semibold mt-0.5">{value}</div>
    </div>
  </div>
);

// ─── Bullet list ──────────────────────────────────────────────────────────────
const BulletList: React.FC<{ items: string[]; color?: string }> = ({ items, color = "text-indigo-400" }) => (
  <ul className="space-y-2">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-2.5">
        <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${color}`} />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

// ─── Right chip ───────────────────────────────────────────────────────────────
const Chip: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-full ${color}`}>
    {label}
  </span>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PrivacyView() {
  const heroRef    = useInView(0.1);
  const tocRef     = useInView(0.1);
  const s1Ref      = useInView(0.08);
  const s2Ref      = useInView(0.08);
  const s3Ref      = useInView(0.08);
  const s4Ref      = useInView(0.08);
  const s5Ref      = useInView(0.08);
  const s6Ref      = useInView(0.08);
  const s7Ref      = useInView(0.08);
  const s8Ref      = useInView(0.08);

  const lastUpdate = "1er juin 2026";
  const version    = "v2.1.0";

  const toc = [
    { num: "01", label: "Données collectées",       href: "#s1", color: "text-indigo-400" },
    { num: "02", label: "Utilisation des données",  href: "#s2", color: "text-violet-400" },
    { num: "03", label: "Protection des données",   href: "#s3", color: "text-emerald-400" },
    { num: "04", label: "Partage des informations", href: "#s4", color: "text-amber-400" },
    { num: "05", label: "Conservation",             href: "#s5", color: "text-sky-400" },
    { num: "06", label: "Droits des utilisateurs",  href: "#s6", color: "text-pink-400" },
    { num: "07", label: "Cookies",                  href: "#s7", color: "text-orange-400" },
    { num: "08", label: "Contact & DPO",            href: "#s8", color: "text-rose-400" },
  ];

  return (
    <div className="min-h-full bg-slate-950 text-white">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div
        ref={heroRef.ref}
        className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 border-b border-slate-800/50"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/8 rounded-full translate-x-48 -translate-y-48 pointer-events-none blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600/8 rounded-full -translate-x-32 translate-y-32 pointer-events-none blur-3xl" />

        <div
          className="relative max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-16"
          style={{
            opacity: heroRef.inView ? 1 : 0,
            transform: heroRef.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.65s ease, transform 0.65s ease",
          }}
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full inline-block">
                Document juridique
              </span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Politique de{" "}
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  confidentialité
                </span>
              </h1>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-2xl">
                Ce document décrit la manière dont <strong className="text-white">Axelmond Research Labs</strong> collecte,
                utilise, protège et partage vos informations personnelles. Votre vie privée est une priorité absolue.
              </p>
            </div>
            {/* Meta badges */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl px-5 py-3 space-y-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Mise à jour</span>
                </div>
                <div className="text-white font-black text-sm">{lastUpdate}</div>
                <div className="flex items-center justify-end gap-2">
                  <Chip label={version} color="text-indigo-300 border-indigo-500/30 bg-indigo-500/10" />
                  <Chip label="Loi 09-08" color="text-emerald-300 border-emerald-500/30 bg-emerald-500/10" />
                </div>
              </div>
            </div>
          </div>

          {/* Conformité loi 09-08 */}
          <div className="mt-8 flex flex-wrap items-center gap-4 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-emerald-300 text-xs font-black uppercase tracking-wide">Conforme à la loi 09-08</div>
                <div className="text-emerald-700 text-[11px]">Loi relative à la protection des personnes physiques (Maroc)</div>
              </div>
            </div>
            <div className="hidden md:block h-8 w-px bg-emerald-800/40 mx-2" />
            <div className="text-[11px] text-emerald-600 leading-relaxed max-w-lg">
              Axelmond Research Labs s'engage à respecter les obligations légales de la loi n° 09-08 et les bonnes pratiques
              en matière de protection des données personnelles des utilisateurs de la plateforme.
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 space-y-8">

        {/* ── TABLE OF CONTENTS ──────────────────────────────────────────── */}
        <div
          ref={tocRef.ref}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8"
          style={{
            opacity: tocRef.inView ? 1 : 0,
            transform: tocRef.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Table des matières</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {toc.map(({ num, label, href, color }) => (
              <a
                key={num}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-800/60 transition-colors group cursor-pointer"
              >
                <span className={`text-[10px] font-black tabular-nums flex-shrink-0 ${color}`}>{num}</span>
                <span className="text-slate-400 group-hover:text-white text-sm font-medium transition-colors">{label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* ── SECTION 1 — Données collectées ─────────────────────────────── */}
        <div ref={s1Ref.ref}>
          <Section
            id="s1" number="01" title="Données collectées"
            icon={<Database className="w-4 h-4" />}
            accent="text-indigo-400" bgAccent="bg-indigo-950/20"
            inView={s1Ref.inView}
          >
            <p>
              Dans le cadre de la gestion de votre compte et de la fourniture de nos services académiques,
              Axelmond Research Labs collecte uniquement les données strictement nécessaires.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {[
                {
                  category: "Données d'identité",
                  items: ["Nom complet", "Adresse e-mail universitaire", "Rôle académique (étudiant, professeur, chercheur)"],
                  color: "border-indigo-800/40 bg-indigo-950/20",
                  badge: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10",
                },
                {
                  category: "Données pédagogiques",
                  items: ["Modules inscrits et progression", "Résultats de quiz et évaluations", "Modules complétés"],
                  color: "border-violet-800/40 bg-violet-950/20",
                  badge: "text-violet-300 border-violet-500/30 bg-violet-500/10",
                },
                {
                  category: "Données de profil",
                  items: ["Photo de profil (facultatif)", "Filière, niveau et biographie", "Domaines de recherche (chercheurs)"],
                  color: "border-emerald-800/40 bg-emerald-950/20",
                  badge: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
                },
                {
                  category: "Données techniques",
                  items: ["Jeton de session (JWT, côté client)", "Adresse IP (logs serveur sécurisés)", "Type de navigateur/appareil (anonymisé)"],
                  color: "border-amber-800/40 bg-amber-950/20",
                  badge: "text-amber-300 border-amber-500/30 bg-amber-500/10",
                },
              ].map(({ category, items, color, badge }) => (
                <div key={category} className={`rounded-2xl border p-4 space-y-2.5 ${color}`}>
                  <Chip label={category} color={badge} />
                  <ul className="space-y-1.5">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[12px] text-slate-400">
                        <span className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0 mt-1.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3 bg-amber-950/20 border border-amber-800/30 rounded-xl px-4 py-3 mt-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-200/80">
                <strong className="text-amber-300">Aucune donnée sensible</strong> (numéro de carte bancaire, données de santé, données biométriques)
                n'est stockée directement sur les serveurs d'Axelmond Research Labs. Les paiements sont traités exclusivement par PayPal.
              </p>
            </div>
          </Section>
        </div>

        {/* ── SECTION 2 — Utilisation ─────────────────────────────────────── */}
        <div ref={s2Ref.ref}>
          <Section
            id="s2" number="02" title="Utilisation des données"
            icon={<Eye className="w-4 h-4" />}
            accent="text-violet-400" bgAccent="bg-violet-950/20"
            inView={s2Ref.inView} delay={50}
          >
            <p>
              Les données personnelles collectées sont utilisées exclusivement dans les finalités suivantes,
              conformément au principe de limitation des finalités prévu par la loi n° 09-08.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {[
                {
                  icon: <UserCheck className="w-4 h-4 text-violet-400" />,
                  title: "Gestion du compte",
                  desc: "Authentification, vérification de l'email, gestion des rôles et des autorisations d'accès.",
                },
                {
                  icon: <Globe className="w-4 h-4 text-indigo-400" />,
                  title: "Fourniture des services",
                  desc: "Accès aux modules, sessions live, quiz, tuteur IA, profils académiques et paiements.",
                },
                {
                  icon: <RefreshCw className="w-4 h-4 text-emerald-400" />,
                  title: "Amélioration continue",
                  desc: "Analyse agrégée et anonymisée de l'usage pour améliorer les fonctionnalités de la plateforme.",
                },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center">{icon}</div>
                  <div className="text-white text-sm font-bold">{title}</div>
                  <p className="text-[12px] text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <BulletList
              color="text-violet-400"
              items={[
                "Envoi d'e-mails de vérification et de notifications de service (aucun e-mail marketing sans consentement explicite)",
                "Génération des factures et reçus PayPal associés à vos inscriptions aux modules",
                "Audit log interne à des fins de sécurité et de conformité (non partagé avec des tiers)",
                "Personnalisation de l'expérience pédagogique (recommandations de modules basées sur votre filière)",
              ]}
            />
          </Section>
        </div>

        {/* ── SECTION 3 — Protection ─────────────────────────────────────── */}
        <div ref={s3Ref.ref}>
          <Section
            id="s3" number="03" title="Protection des données"
            icon={<Lock className="w-4 h-4" />}
            accent="text-emerald-400" bgAccent="bg-emerald-950/20"
            inView={s3Ref.inView} delay={50}
          >
            <p>
              La sécurité de vos données est au cœur de notre architecture technique. Nous appliquons
              les mesures de protection suivantes à tous les niveaux de la plateforme.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  icon: <Key className="w-4 h-4 text-emerald-400" />,
                  title: "Hachage des mots de passe",
                  desc: "Tous les mots de passe sont hachés avec bcrypt/Argon2. Le mot de passe en clair n'est jamais stocké ni transmis.",
                  badge: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
                  badgeLabel: "Argon2 / bcrypt",
                },
                {
                  icon: <Shield className="w-4 h-4 text-indigo-400" />,
                  title: "Authentification JWT sécurisée",
                  desc: "Sessions signées avec durée d'expiration courte. Les jetons sont vérifiés côté serveur à chaque requête.",
                  badge: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10",
                  badgeLabel: "JWT + expiration",
                },
                {
                  icon: <Server className="w-4 h-4 text-violet-400" />,
                  title: "RBAC strict (contrôle d'accès)",
                  desc: "Chaque route est protégée par un contrôle de rôle. Un étudiant ne peut jamais accéder aux données d'un autre utilisateur.",
                  badge: "text-violet-300 border-violet-500/30 bg-violet-500/10",
                  badgeLabel: "RBAC",
                },
                {
                  icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
                  title: "Protection brute-force",
                  desc: "Rate-limiting sur toutes les routes d'authentification (20 tentatives / 1 min). Blocage automatique en cas d'abus.",
                  badge: "text-amber-300 border-amber-500/30 bg-amber-500/10",
                  badgeLabel: "Rate Limit",
                },
                {
                  icon: <Lock className="w-4 h-4 text-sky-400" />,
                  title: "Chiffrement en transit (HTTPS)",
                  desc: "Toutes les communications entre le client et le serveur transitent exclusivement via HTTPS/TLS.",
                  badge: "text-sky-300 border-sky-500/30 bg-sky-500/10",
                  badgeLabel: "HTTPS/TLS",
                },
                {
                  icon: <FileText className="w-4 h-4 text-rose-400" />,
                  title: "Audit log complet",
                  desc: "Chaque action sensible (connexion, modification, suppression) est enregistrée dans un journal d'audit sécurisé.",
                  badge: "text-rose-300 border-rose-500/30 bg-rose-500/10",
                  badgeLabel: "Audit Trail",
                },
              ].map(({ icon, title, desc, badge, badgeLabel }) => (
                <div key={title} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">{icon}</div>
                      <span className="text-white text-sm font-bold">{title}</span>
                    </div>
                    <Chip label={badgeLabel} color={badge} />
                  </div>
                  <p className="text-[12px] text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* ── SECTION 4 — Partage ────────────────────────────────────────── */}
        <div ref={s4Ref.ref}>
          <Section
            id="s4" number="04" title="Partage des informations"
            icon={<Share2 className="w-4 h-4" />}
            accent="text-amber-400" bgAccent="bg-amber-950/20"
            inView={s4Ref.inView} delay={50}
          >
            <div className="flex items-start gap-3 bg-emerald-950/20 border border-emerald-800/30 rounded-2xl px-5 py-4">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300">
                <strong className="text-white">Axelmond Research Labs ne vend jamais vos données personnelles</strong> à des
                tiers, partenaires commerciaux ou régies publicitaires. Le partage de données est limité aux seuls
                sous-traitants techniques nécessaires à la fourniture du service.
              </p>
            </div>
            <p>Les seuls tiers qui peuvent recevoir des données limitées vous concernant sont :</p>
            <div className="space-y-3">
              {[
                {
                  name: "PayPal",
                  role: "Traitement sécurisé des paiements",
                  data: "Adresse e-mail, montant de la transaction (aucune donnée bancaire stockée par ARL)",
                  url: "paypal.com/fr/webapps/mpp/ua/privacy-full",
                  color: "border-indigo-800/40 bg-indigo-950/20",
                  chip: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10",
                },
                {
                  name: "LiveKit",
                  role: "Infrastructure de visioconférence",
                  data: "Identifiant de session anonymisé pour la connexion aux sessions live",
                  url: "livekit.io/privacy",
                  color: "border-violet-800/40 bg-violet-950/20",
                  chip: "text-violet-300 border-violet-500/30 bg-violet-500/10",
                },
                {
                  name: "UploadThing / CDN",
                  role: "Hébergement des fichiers et captures d'écran",
                  data: "Fichiers uploadés volontairement (avatars, supports de module, captures d'écran de support)",
                  url: "uploadthing.com/privacy",
                  color: "border-emerald-800/40 bg-emerald-950/20",
                  chip: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
                },
                {
                  name: "Google Gemini AI",
                  role: "Tuteur IA pédagogique",
                  data: "Questions posées au tuteur IA (aucune donnée d'identité transmise, contenu du module uniquement)",
                  url: "policies.google.com/privacy",
                  color: "border-amber-800/40 bg-amber-950/20",
                  chip: "text-amber-300 border-amber-500/30 bg-amber-500/10",
                },
              ].map(({ name, role, data, url, color, chip }) => (
                <div key={name} className={`rounded-2xl border p-4 ${color}`}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-white font-bold text-sm">{name}</span>
                    <Chip label={role} color={chip} />
                  </div>
                  <p className="text-[12px] text-slate-400 leading-relaxed">{data}</p>
                  <p className="text-[10px] text-slate-600 mt-1.5">Politique de confidentialité : {url}</p>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-slate-500">
              En cas d'obligation légale (décision judiciaire, réquisition administrative), Axelmond Research Labs peut
              être tenu de communiquer certaines données aux autorités compétentes. Nous notifions les utilisateurs
              concernés dans les limites permises par la loi.
            </p>
          </Section>
        </div>

        {/* ── SECTION 5 — Conservation ───────────────────────────────────── */}
        <div ref={s5Ref.ref}>
          <Section
            id="s5" number="05" title="Conservation des données"
            icon={<Clock className="w-4 h-4" />}
            accent="text-sky-400" bgAccent="bg-sky-950/20"
            inView={s5Ref.inView} delay={50}
          >
            <p>
              Les données personnelles sont conservées uniquement le temps nécessaire aux finalités pour
              lesquelles elles ont été collectées, conformément au principe de minimisation des données de la loi n° 09-08.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { type: "Données de compte actif", duration: "Durée de vie du compte", detail: "Supprimées dans les 30 jours suivant la clôture du compte sur demande." },
                { type: "Données pédagogiques", duration: "3 ans après le dernier module", detail: "Notes, progressions et résultats conservés à des fins de certification." },
                { type: "Logs de sécurité (audit)", duration: "12 mois glissants", detail: "Journaux d'accès et d'actions sensibles pour détecter les abus." },
                { type: "Données de paiement", duration: "10 ans (légal)", detail: "Factures et reçus conservés conformément aux obligations comptables françaises." },
                { type: "E-mails transactionnels", duration: "6 mois", detail: "Historique des envois de codes de vérification et de notifications de service." },
                { type: "Données de session JWT", duration: "Jusqu'à expiration du token", detail: "Expiration courte (15 min à 24h selon le type). Révocation immédiate à la déconnexion." },
              ].map(({ type, duration, detail }) => (
                <InfoRow
                  key={type}
                  label={type}
                  value={duration}
                  icon={<Clock className="w-3.5 h-3.5" />}
                />
              ))}
            </div>
            <p className="text-[12px] text-slate-500">
              À l'issue de la période de conservation, les données sont soit supprimées de manière sécurisée,
              soit anonymisées pour des fins statistiques agrégées.
            </p>
          </Section>
        </div>

        {/* ── SECTION 6 — Droits ─────────────────────────────────────────── */}
        <div ref={s6Ref.ref}>
          <Section
            id="s6" number="06" title="Droits des utilisateurs"
            icon={<UserCheck className="w-4 h-4" />}
            accent="text-pink-400" bgAccent="bg-pink-950/20"
            inView={s6Ref.inView} delay={50}
          >
            <p>
              Conformément à la loi n° 09-08 relative à la protection des personnes physiques,
              vous disposez des droits suivants sur vos données personnelles.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { icon: <Eye className="w-4 h-4 text-indigo-400" />,   right: "Droit d'accès",         desc: "Obtenir une copie de toutes vos données personnelles détenues par ARL.", color: "border-indigo-800/30 bg-indigo-950/20" },
                { icon: <RefreshCw className="w-4 h-4 text-violet-400" />, right: "Droit de rectification", desc: "Corriger ou mettre à jour vos informations personnelles inexactes ou incomplètes.", color: "border-violet-800/30 bg-violet-950/20" },
                { icon: <Trash2 className="w-4 h-4 text-rose-400" />,  right: "Droit à l'effacement",  desc: "Demander la suppression de vos données (\"droit à l'oubli\") sous conditions légales.", color: "border-rose-800/30 bg-rose-950/20" },
                { icon: <Lock className="w-4 h-4 text-amber-400" />,   right: "Droit à la limitation",  desc: "Restreindre le traitement de vos données dans certains cas prévus par la loi 09-08.", color: "border-amber-800/30 bg-amber-950/20" },
                { icon: <Download className="w-4 h-4 text-emerald-400" />, right: "Droit à la portabilité", desc: "Recevoir vos données dans un format structuré et lisible par machine (JSON/CSV).", color: "border-emerald-800/30 bg-emerald-950/20" },
                { icon: <AlertTriangle className="w-4 h-4 text-sky-400" />, right: "Droit d'opposition",  desc: "Vous opposer au traitement de vos données à des fins spécifiques.", color: "border-sky-800/30 bg-sky-950/20" },
              ].map(({ icon, right, desc, color }) => (
                <div key={right} className={`rounded-2xl border p-4 space-y-2 ${color}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">{icon}</div>
                    <span className="text-white text-xs font-bold">{right}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl px-5 py-4 space-y-2">
              <div className="text-white text-sm font-bold">Comment exercer vos droits ?</div>
              <p className="text-[12px] text-slate-400 leading-relaxed">
                Envoyez votre demande par e-mail à{" "}
                <strong className="text-indigo-300">verification@axelmond.com</strong> avec pour objet
                «&nbsp;Exercice de droits — loi 09-08 — [Votre nom]&nbsp;». Nous nous engageons à vous répondre
                dans un délai de <strong className="text-white">30 jours calendaires</strong> conformément à la loi n° 09-08.
                Une pièce d'identité peut être demandée pour vérifier votre identité avant traitement.
              </p>
              <p className="text-[11px] text-slate-500">
                Vous avez également le droit d'introduire une réclamation auprès de la CNDP (Commission Nationale de
                contrôle de la protection des Données à caractère Personnel) — cndp.ma.
              </p>
            </div>
          </Section>
        </div>

        {/* ── SECTION 7 — Cookies ────────────────────────────────────────── */}
        <div ref={s7Ref.ref}>
          <Section
            id="s7" number="07" title="Cookies &amp; Stockage local"
            icon={<Cookie className="w-4 h-4" />}
            accent="text-orange-400" bgAccent="bg-orange-950/20"
            inView={s7Ref.inView} delay={50}
          >
            <p>
              La plateforme Axelmond Research Labs utilise des cookies essentiels de sécurité et un stockage local
              minimal pour les préférences et l'affichage. Aucun cookie de traçage ou de publicité n'est utilisé.
            </p>
            <div className="space-y-3">
              {[
                {
                  name: "refresh_token",
                  type: "Cookie HttpOnly",
                  purpose: "Jeton de renouvellement de session protégé contre la lecture JavaScript.",
                  duration: "7 jours maximum ou jusqu'à déconnexion",
                  necessary: true,
                  color: "border-indigo-800/30 bg-indigo-950/20",
                },
                {
                  name: "csrf_token",
                  type: "Cookie lisible",
                  purpose: "Protection des requêtes sensibles contre les attaques CSRF.",
                  duration: "7 jours maximum ou jusqu'à déconnexion",
                  necessary: true,
                  color: "border-sky-800/30 bg-sky-950/20",
                },
                {
                  name: "axelmond_session_user",
                  type: "localStorage",
                  purpose: "Données d'affichage non secrètes du profil connecté; les anciens jetons localStorage sont purgés.",
                  duration: "Jusqu'à déconnexion",
                  necessary: true,
                  color: "border-indigo-800/30 bg-indigo-950/20",
                },
                {
                  name: "Données de progression des modules",
                  type: "API serveur",
                  purpose: "Progression dans les modules, scores de quiz et statuts de complétion stockés en base de données.",
                  duration: "Durée de vie du compte (voir §05)",
                  necessary: true,
                  color: "border-violet-800/30 bg-violet-950/20",
                },
              ].map(({ name, type, purpose, duration, necessary, color }) => (
                <div key={name} className={`rounded-2xl border p-4 space-y-3 ${color}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-xs text-orange-300 bg-orange-900/20 border border-orange-800/30 px-2.5 py-0.5 rounded-lg font-mono">{name}</code>
                    <Chip label={type} color="text-slate-400 border-slate-700 bg-slate-800/50" />
                    {necessary && <Chip label="Nécessaire" color="text-emerald-300 border-emerald-500/30 bg-emerald-500/10" />}
                  </div>
                  <p className="text-[12px] text-slate-400 leading-relaxed">{purpose}</p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    Durée : {duration}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-3 bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 mt-1">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-slate-400">
                <strong className="text-white">Aucun cookie tiers ni pixel de tracking</strong> n'est déposé sur votre navigateur.
                Les seuls éléments de stockage sont strictement nécessaires au fonctionnement sécurisé du portail
                académique et ne nécessitent pas de consentement préalable selon la directive ePrivacy.
              </p>
            </div>
          </Section>
        </div>

        {/* ── SECTION 8 — Contact DPO ────────────────────────────────────── */}
        <div ref={s8Ref.ref}>
          <Section
            id="s8" number="08" title="Contact &amp; DPO"
            icon={<Mail className="w-4 h-4" />}
            accent="text-rose-400" bgAccent="bg-rose-950/20"
            inView={s8Ref.inView} delay={50}
          >
            <p>
              Pour toute question relative à cette politique de confidentialité ou pour exercer vos droits,
              vous pouvez contacter notre équipe à l'adresse suivante.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Responsable du traitement" value="Axelmond Research Labs" icon={<Shield className="w-3.5 h-3.5" />} />
              <InfoRow label="Contact DPO / Confidentialité" value="verification@axelmond.com" icon={<Mail className="w-3.5 h-3.5" />} />
              <InfoRow label="Domaine officiel" value="axelmond.com" icon={<Globe className="w-3.5 h-3.5" />} />
              <InfoRow label="Délai de réponse" value="30 jours calendaires maximum" icon={<Clock className="w-3.5 h-3.5" />} />
            </div>
            <p>
              Si vous estimez que le traitement de vos données personnelles constitue une violation de la loi n° 09-08,
              vous avez le droit d'introduire une réclamation auprès d'une autorité de contrôle compétente :
            </p>
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl px-5 py-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">CNDP — Commission Nationale de contrôle de la protection des Données à caractère Personnel</div>
                <div className="text-slate-500 text-[11px] mt-1">Avenue Allal Ben Abdellah, Rabat · cndp.ma</div>
                <div className="text-slate-500 text-[11px]">Délai de traitement d'une réclamation : environ 3 mois</div>
              </div>
            </div>
          </Section>
        </div>

        {/* ── FOOTER NOTE ────────────────────────────────────────────────── */}
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="text-white text-sm font-bold">Axelmond Research Labs — Politique de confidentialité</div>
            <div className="text-slate-500 text-[11px]">
              Dernière mise à jour : {lastUpdate} · Version {version} · Soumis au droit marocain et à la loi n° 09-08
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip label="Loi 09-08" color="text-emerald-300 border-emerald-500/30 bg-emerald-500/10" />
            <Chip label={version} color="text-indigo-300 border-indigo-500/30 bg-indigo-500/10" />
          </div>
        </div>

      </div>
    </div>
  );
}
