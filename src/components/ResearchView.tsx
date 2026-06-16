import React, { useEffect, useState } from "react";
import { useInView } from "../hooks/useInView";
import {
  Brain,
  Database,
  Shield,
  Network,
  Lightbulb,
  BookOpen,
  Users,
  FileText,
  FlaskConical,
  Globe,
  Award,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  Activity,
  Microscope,
  GraduationCap,
  ExternalLink,
  BarChart2,
  Layers,
  BookMarked,
  FolderOpen,
  Server,
  Atom,
} from "lucide-react";

// ─── useCountUp ───────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1600, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let frame: number;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, start]);
  return value;
}

// ─── Fade ─────────────────────────────────────────────────────────────────────
const Fade: React.FC<{ inView: boolean; delay?: number; children: React.ReactNode; className?: string }> = ({
  inView,
  delay = 0,
  children,
  className = "",
}) => (
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

// ─── Chip ─────────────────────────────────────────────────────────────────────
const Chip: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span
    className={`inline-flex items-center text-[10px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-full ${color}`}
  >
    {label}
  </span>
);

// ─── StatusBadge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: "Actif" | "En préparation" | "Terminé" }> = ({ status }) => {
  const styles = {
    Actif: { chip: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10", dot: "bg-emerald-400 animate-pulse" },
    "En préparation": { chip: "text-amber-300 border-amber-500/30 bg-amber-500/10", dot: "bg-amber-400" },
    Terminé: { chip: "text-slate-400 border-slate-600 bg-slate-800/50", dot: "bg-slate-500" },
  }[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-full ${styles.chip}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${styles.dot}`} />
      {status}
    </span>
  );
};

// ─── StatCard ─────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  value: number;
  suffix?: string;
  label: string;
  sublabel?: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  start: boolean;
}> = ({ value, suffix = "", label, sublabel, color, bgColor, borderColor, icon, start }) => {
  const count = useCountUp(value, 1600, start);
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${borderColor} ${bgColor} p-5 flex flex-col gap-3 hover:scale-[1.03] transition-transform duration-300`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900/60`}>
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

// ─── DATA ─────────────────────────────────────────────────────────────────────
const domains = [
  {
    icon: <Brain className="w-5 h-5 text-indigo-300" />,
    title: "Intelligence Artificielle",
    desc: "Apprentissage automatique, deep learning, NLP, vision par ordinateur et systèmes intelligents.",
    researchers: 12,
    projects: 8,
    accent: "bg-indigo-500/15 border-indigo-500/20",
    chip: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10",
  },
  {
    icon: <Database className="w-5 h-5 text-violet-300" />,
    title: "Science des Données",
    desc: "Analyse de données massives, fouille de données, visualisation et ingénierie des données.",
    researchers: 9,
    projects: 6,
    accent: "bg-violet-500/15 border-violet-500/20",
    chip: "text-violet-300 border-violet-500/30 bg-violet-500/10",
  },
  {
    icon: <Shield className="w-5 h-5 text-rose-300" />,
    title: "Cybersécurité",
    desc: "Sécurité des systèmes, cryptographie, réponse aux incidents, forensique et sécurité applicative.",
    researchers: 7,
    projects: 5,
    accent: "bg-rose-500/15 border-rose-500/20",
    chip: "text-rose-300 border-rose-500/30 bg-rose-500/10",
  },
  {
    icon: <Atom className="w-5 h-5 text-cyan-300" />,
    title: "Informatique Théorique",
    desc: "Algorithmique avancée, complexité computationnelle, logique formelle et théorie des langages.",
    researchers: 5,
    projects: 4,
    accent: "bg-cyan-500/15 border-cyan-500/20",
    chip: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10",
  },
  {
    icon: <Network className="w-5 h-5 text-sky-300" />,
    title: "Systèmes Distribués",
    desc: "Architectures cloud, computing de périphérie, tolérance aux pannes et protocoles distribués.",
    researchers: 6,
    projects: 5,
    accent: "bg-sky-500/15 border-sky-500/20",
    chip: "text-sky-300 border-sky-500/30 bg-sky-500/10",
  },
  {
    icon: <Lightbulb className="w-5 h-5 text-amber-300" />,
    title: "Innovation Numérique",
    desc: "Transformation digitale, entrepreneuriat technologique, open innovation et prospective numérique.",
    researchers: 8,
    projects: 7,
    accent: "bg-amber-500/15 border-amber-500/20",
    chip: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  },
  {
    icon: <GraduationCap className="w-5 h-5 text-pink-300" />,
    title: "Technologies Éducatives",
    desc: "EdTech, e-learning adaptatif, gamification, intelligence artificielle pédagogique et MOOC.",
    researchers: 6,
    projects: 4,
    accent: "bg-pink-500/15 border-pink-500/20",
    chip: "text-pink-300 border-pink-500/30 bg-pink-500/10",
  },
];

const projects = [
  {
    title: "AXIA — Tuteur IA Adaptatif",
    lead: "Dr. Karim Benali",
    domain: "IA & EdTech",
    start: "Janv. 2025",
    status: "Actif" as const,
    color: "text-emerald-300",
  },
  {
    title: "SecureARL — Infrastructure Zero-Trust",
    lead: "Prof. Amina Douiri",
    domain: "Cybersécurité",
    start: "Mars 2025",
    status: "Actif" as const,
    color: "text-indigo-300",
  },
  {
    title: "DataVis 4.0 — Visualisation Scientifique",
    lead: "Dr. Youssef Chraibi",
    domain: "Science des Données",
    start: "Juin 2024",
    status: "Actif" as const,
    color: "text-violet-300",
  },
  {
    title: "PolyCloud — Orchestration Multi-cloud",
    lead: "Prof. Sara Hamidi",
    domain: "Systèmes Distribués",
    start: "Sept. 2024",
    status: "Actif" as const,
    color: "text-sky-300",
  },
  {
    title: "CryptoFormal — Vérification Cryptographique",
    lead: "Dr. Mehdi Lahlou",
    domain: "Informatique Théor.",
    start: "Oct. 2025",
    status: "En préparation" as const,
    color: "text-amber-300",
  },
  {
    title: "OpenEdu — Plateforme Open Source MOOC",
    lead: "Prof. Latifa Nassiri",
    domain: "EdTech",
    start: "Avr. 2024",
    status: "Terminé" as const,
    color: "text-slate-400",
  },
];

const publications = [
  {
    title: "Adaptive Learning with LLMs in Academic Platforms",
    authors: "Benali K., Douiri A.",
    year: "2025",
    type: "Article",
    domain: "IA / EdTech",
    color: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10",
  },
  {
    title: "Zero-Trust Architecture for Educational Cloud Systems",
    authors: "Douiri A., Lahlou M.",
    year: "2025",
    type: "Conférence",
    domain: "Cybersécurité",
    color: "text-rose-300 border-rose-500/30 bg-rose-500/10",
  },
  {
    title: "Federated Data Analytics for MOOC Performance Prediction",
    authors: "Chraibi Y., Hamidi S.",
    year: "2024",
    type: "Revue",
    domain: "Data Science",
    color: "text-violet-300 border-violet-500/30 bg-violet-500/10",
  },
  {
    title: "Formal Verification of Cryptographic Protocols via Coq",
    authors: "Lahlou M.",
    year: "2024",
    type: "Travaux",
    domain: "Informatique Th.",
    color: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10",
  },
  {
    title: "Gamification Patterns in Distance Learning Environments",
    authors: "Nassiri L., Benali K.",
    year: "2025",
    type: "Article",
    domain: "EdTech",
    color: "text-pink-300 border-pink-500/30 bg-pink-500/10",
  },
  {
    title: "Multi-Cloud Orchestration with Fault-Tolerant Scheduling",
    authors: "Hamidi S., Chraibi Y.",
    year: "2024",
    type: "Conférence",
    domain: "Syst. Distribués",
    color: "text-sky-300 border-sky-500/30 bg-sky-500/10",
  },
];

const labs = [
  {
    name: "Lab. IA & Apprentissage Automatique",
    lead: "Dr. Karim Benali",
    specialty: "Deep Learning, NLP, Vision",
    members: 12,
    accent: "border-indigo-800/40 bg-indigo-950/15",
  },
  {
    name: "Lab. Sécurité et Réseaux",
    lead: "Prof. Amina Douiri",
    specialty: "Crypto, Forensique, Cloud Security",
    members: 9,
    accent: "border-rose-800/40 bg-rose-950/15",
  },
  {
    name: "Lab. Data & Knowledge Engineering",
    lead: "Dr. Youssef Chraibi",
    specialty: "Big Data, Fouille, Visualisation",
    members: 8,
    accent: "border-violet-800/40 bg-violet-950/15",
  },
  {
    name: "Lab. Innovation Pédagogique",
    lead: "Prof. Latifa Nassiri",
    specialty: "EdTech, MOOC, Gamification",
    members: 6,
    accent: "border-pink-800/40 bg-pink-950/15",
  },
];

const collabs = [
  {
    type: "Universités partenaires",
    icon: <GraduationCap className="w-4 h-4 text-indigo-400" />,
    items: [
      "Université Mohammed V — Rabat",
      "Université Hassan II — Casablanca",
      "Université Cadi Ayyad — Marrakech",
      "Université de Montréal — Canada",
    ],
    color: "border-indigo-800/30 bg-indigo-950/15",
  },
  {
    type: "Centres de recherche",
    icon: <Microscope className="w-4 h-4 text-violet-400" />,
    items: [
      "CNRST — Centre National pour la Recherche Scientifique et Technique",
      "ENSIAS Research Center — Rabat",
      "UM6P — Mohammed VI Polytechnic",
      "Alan Turing Institute — UK",
    ],
    color: "border-violet-800/30 bg-violet-950/15",
  },
  {
    type: "Programmes de coopération",
    icon: <Globe className="w-4 h-4 text-sky-400" />,
    items: [
      "Programme national de recherche et innovation",
      "PHC Toubkal Franco-Marocain",
      "Accord bilateral ARL–UM6P 2025",
      "Programme de coopération académique Afrique du Nord",
    ],
    color: "border-sky-800/30 bg-sky-950/15",
  },
  {
    type: "Réseaux scientifiques",
    icon: <Network className="w-4 h-4 text-emerald-400" />,
    items: [
      "IEEE Computer Society — Member Lab",
      "ACM SIGAI — Affiliated Research Group",
      "Programme de partenariat académique en IA",
      "African AI Alliance — Founding Member",
    ],
    color: "border-emerald-800/30 bg-emerald-950/15",
  },
];

const calls = [
  {
    title: "CNRST Appel à Projets 2026 — IA & Société",
    deadline: "30 juil. 2026",
    funding: "150 000 – 500 000 DH",
    domain: "IA / Sciences humaines",
    status: "Ouvert",
    statusColor: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  },
  {
    title: "Programme national — Innovation numérique 2026",
    deadline: "15 sept. 2026",
    funding: "500 000 – 2 000 000 DH",
    domain: "Technologies numériques",
    status: "Ouvert",
    statusColor: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  },
  {
    title: "PHC Toubkal — Coopération Scientifique FR-MA",
    deadline: "1er oct. 2026",
    funding: "100 000 – 300 000 DH",
    domain: "Tous domaines",
    status: "Bientôt",
    statusColor: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  },
  {
    title: "Appel à Projets Interne ARL — Recherche Émergente",
    deadline: "20 juil. 2026",
    funding: "50 000 – 200 000 DH",
    domain: "Interdisciplinaire",
    status: "Ouvert",
    statusColor: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  },
];

const resources = [
  {
    icon: <BookMarked className="w-5 h-5 text-indigo-400" />,
    title: "Bibliothèque scientifique",
    desc: "Accès aux revues, articles et ouvrages de référence via nos abonnements institutionnels.",
    badge: "IEEE · Springer · Elsevier",
    border: "border-indigo-800/30 bg-indigo-950/15",
  },
  {
    icon: <FolderOpen className="w-5 h-5 text-violet-400" />,
    title: "Dépôt de publications",
    desc: "Déposez et consultez les publications soumises par les membres d'Axelmond Research Labs.",
    badge: "Open Access · Archivage",
    border: "border-violet-800/30 bg-violet-950/15",
  },
  {
    icon: <Database className="w-5 h-5 text-sky-400" />,
    title: "Données de recherche",
    desc: "Jeux de données annotés et ouverts mis à disposition par les laboratoires de la plateforme.",
    badge: "FAIR · Reproductibilité",
    border: "border-sky-800/30 bg-sky-950/15",
  },
  {
    icon: <FileText className="w-5 h-5 text-emerald-400" />,
    title: "Documentation méthodologique",
    desc: "Guides de rédaction scientifique, modèles de publication et protocoles de recherche.",
    badge: "APA 7 · LaTeX · IMRAD",
    border: "border-emerald-800/30 bg-emerald-950/15",
  },
  {
    icon: <Server className="w-5 h-5 text-amber-400" />,
    title: "Calcul intensif & GPU",
    desc: "Accès aux ressources de calcul haute performance pour les projets d'apprentissage profond.",
    badge: "CUDA · HPC · Jupyter",
    border: "border-amber-800/30 bg-amber-950/15",
  },
  {
    icon: <Layers className="w-5 h-5 text-pink-400" />,
    title: "Outils de collaboration",
    desc: "Espaces de travail partagés, gestion de projets et outils de rédaction collaborative.",
    badge: "Git · Zotero · Overleaf",
    border: "border-pink-800/30 bg-pink-950/15",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ResearchView() {
  const heroRef = useInView(0.1);
  const statsRef = useInView(0.15);
  const domRef = useInView(0.05);
  const projRef = useInView(0.05);
  const pubRef = useInView(0.05);
  const labRef = useInView(0.05);
  const collabRef = useInView(0.05);
  const callsRef = useInView(0.05);
  const resRef = useInView(0.05);

  const stats = [
    {
      value: 48,
      suffix: "",
      label: "Chercheurs",
      sublabel: "Doctorants inclus",
      color: "text-indigo-400",
      bgColor: "bg-indigo-950/30",
      borderColor: "border-indigo-900/40",
      icon: <Users className="w-5 h-5" />,
    },
    {
      value: 124,
      suffix: "+",
      label: "Publications",
      sublabel: "Depuis 2022",
      color: "text-violet-400",
      bgColor: "bg-violet-950/30",
      borderColor: "border-violet-900/40",
      icon: <FileText className="w-5 h-5" />,
    },
    {
      value: 28,
      suffix: "",
      label: "Projets actifs",
      sublabel: "Financés & internes",
      color: "text-emerald-400",
      bgColor: "bg-emerald-950/30",
      borderColor: "border-emerald-900/40",
      icon: <Activity className="w-5 h-5" />,
    },
    {
      value: 4,
      suffix: "",
      label: "Laboratoires",
      sublabel: "Équipes spécialisées",
      color: "text-sky-400",
      bgColor: "bg-sky-950/30",
      borderColor: "border-sky-900/40",
      icon: <FlaskConical className="w-5 h-5" />,
    },
    {
      value: 15,
      suffix: "+",
      label: "Collaborations",
      sublabel: "Partenaires internationaux",
      color: "text-pink-400",
      bgColor: "bg-pink-950/30",
      borderColor: "border-pink-900/40",
      icon: <Globe className="w-5 h-5" />,
    },
    {
      value: 7,
      suffix: "",
      label: "Domaines",
      sublabel: "Disciplines couvertes",
      color: "text-amber-400",
      bgColor: "bg-amber-950/30",
      borderColor: "border-amber-900/40",
      icon: <Atom className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-full bg-slate-950 text-white">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div
        ref={heroRef.ref}
        className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 border-b border-slate-800/50"
      >
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/6 rounded-full translate-x-60 -translate-y-60 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-600/6 rounded-full -translate-x-40 translate-y-40 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-sky-600/4 rounded-full blur-3xl pointer-events-none" />

        <div
          className="relative max-w-6xl mx-auto px-6 md:px-10 py-12 md:py-16"
          style={{
            opacity: heroRef.inView ? 1 : 0,
            transform: heroRef.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
            {/* Left */}
            <div className="space-y-5 max-w-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                <Microscope className="w-3 h-3" />
                Portail de recherche académique
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                Recherche{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400 bg-clip-text text-transparent">
                  académique
                </span>
              </h1>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                Cet espace centralise toutes les activités scientifiques d'
                <strong className="text-white">Axelmond Research Labs</strong> : laboratoires, projets actifs,
                publications, collaborations internationales et appels à projets. Dédié aux{" "}
                <span className="text-indigo-300 font-semibold">professeurs</span>,{" "}
                <span className="text-violet-300 font-semibold">chercheurs</span> et{" "}
                <span className="text-sky-300 font-semibold">doctorants</span>.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { label: "7 domaines", color: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10" },
                  { label: "4 laboratoires", color: "text-violet-300 border-violet-500/30 bg-violet-500/10" },
                  { label: "15+ partenaires", color: "text-sky-300 border-sky-500/30 bg-sky-500/10" },
                  { label: "124+ publications", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
                ].map(({ label, color }) => (
                  <Chip key={label} label={label} color={color} />
                ))}
              </div>
            </div>

            {/* Right — live activity card */}
            <div className="hidden lg:block">
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm space-y-4 min-w-0 sm:min-w-[280px]">
                <div className="flex items-center justify-between">
                  <div className="text-white font-black text-sm">Activité de recherche</div>
                  <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    En temps réel
                  </span>
                </div>
                {[
                  { label: "Projets actifs", val: 28, color: "bg-indigo-500" },
                  { label: "Publications 2025", val: 42, max: 60, color: "bg-violet-500" },
                  { label: "Taux de collaboration", val: 78, color: "bg-sky-500" },
                ].map(({ label, val, max = 100, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>{label}</span>
                      <span className="text-white font-bold">
                        {val}
                        {max === 100 ? "%" : `/${max}`}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full`}
                        style={{ width: `${(val / max) * 100}%`, transition: "width 1.5s ease" }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-1 border-t border-slate-800 grid grid-cols-2 gap-3">
                  {[
                    { label: "Chercheurs", val: "48" },
                    { label: "Labs", val: "4" },
                  ].map(({ label, val }) => (
                    <div key={label} className="text-center bg-slate-950/60 rounded-xl p-2">
                      <div className="text-white font-black text-lg">{val}</div>
                      <div className="text-slate-500 text-[10px]">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-14">
        {/* ── STATS ─────────────────────────────────────────────────────────── */}
        <div ref={statsRef.ref}>
          <Fade inView={statsRef.inView}>
            <div className="flex items-center gap-2 mb-6">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              <h2 className="text-lg font-black text-white">Tableau de bord de la recherche</h2>
            </div>
          </Fade>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((s, i) => (
              <Fade key={s.label} inView={statsRef.inView} delay={i * 60}>
                <StatCard {...s} start={statsRef.inView} />
              </Fade>
            ))}
          </div>
        </div>

        {/* ── DOMAINES ──────────────────────────────────────────────────────── */}
        <div ref={domRef.ref}>
          <Fade inView={domRef.inView}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Atom className="w-4 h-4 text-violet-400" />
                <h2 className="text-lg font-black text-white">Domaines de recherche</h2>
              </div>
              <Chip
                label={`${domains.length} domaines`}
                color="text-violet-300 border-violet-500/30 bg-violet-500/10"
              />
            </div>
          </Fade>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {domains.map((d, i) => (
              <Fade key={d.title} inView={domRef.inView} delay={i * 50}>
                <div
                  className={`h-full rounded-2xl border p-5 space-y-4 ${d.accent} hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-900/60`}>
                    {d.icon}
                  </div>
                  <div>
                    <div className="text-white text-sm font-black leading-tight">{d.title}</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-1.5">{d.desc}</p>
                  </div>
                  <div className="flex items-center gap-3 pt-1 border-t border-slate-800/60">
                    <div className="text-center">
                      <div className="text-white text-base font-black">{d.researchers}</div>
                      <div className="text-slate-500 text-[10px]">Chercheurs</div>
                    </div>
                    <div className="h-6 w-px bg-slate-800" />
                    <div className="text-center">
                      <div className="text-white text-base font-black">{d.projects}</div>
                      <div className="text-slate-500 text-[10px]">Projets</div>
                    </div>
                  </div>
                </div>
              </Fade>
            ))}
            {/* 7th card spans differently */}
          </div>
        </div>

        {/* ── PROJETS ───────────────────────────────────────────────────────── */}
        <div ref={projRef.ref}>
          <Fade inView={projRef.inView}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h2 className="text-lg font-black text-white">Projets de recherche actifs</h2>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                {projects.filter((p) => p.status === "Actif").length} actifs
              </span>
            </div>
          </Fade>
          <div className="space-y-3">
            {projects.map((p, i) => (
              <Fade key={p.title} inView={projRef.inView} delay={i * 50}>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-slate-700 transition-colors duration-200">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-sm">{p.title}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {p.lead}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Atom className="w-3 h-3" />
                        {p.domain}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Depuis {p.start}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              </Fade>
            ))}
          </div>
        </div>

        {/* ── PUBLICATIONS ──────────────────────────────────────────────────── */}
        <div ref={pubRef.ref}>
          <Fade inView={pubRef.inView}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-violet-400" />
                <h2 className="text-lg font-black text-white">Publications scientifiques</h2>
              </div>
              <Chip label="124+ au total" color="text-violet-300 border-violet-500/30 bg-violet-500/10" />
            </div>
          </Fade>
          {/* Type legend */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { label: "Article", color: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10" },
              { label: "Conférence", color: "text-rose-300 border-rose-500/30 bg-rose-500/10" },
              { label: "Revue", color: "text-violet-300 border-violet-500/30 bg-violet-500/10" },
              { label: "Travaux", color: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10" },
            ].map(({ label, color }) => (
              <Chip key={label} label={label} color={color} />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {publications.map((pub, i) => (
              <Fade key={pub.title} inView={pubRef.inView} delay={i * 50}>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition-colors duration-200 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-white text-sm font-bold leading-snug group-hover:text-indigo-200 transition-colors">
                      {pub.title}
                    </div>
                    <Chip label={pub.type} color={pub.color} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {pub.authors}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {pub.year}
                    </span>
                    <span className="text-[11px] text-slate-500">{pub.domain}</span>
                  </div>
                </div>
              </Fade>
            ))}
          </div>
        </div>

        {/* ── LABORATOIRES ──────────────────────────────────────────────────── */}
        <div ref={labRef.ref}>
          <Fade inView={labRef.inView}>
            <div className="flex items-center gap-2 mb-6">
              <FlaskConical className="w-4 h-4 text-sky-400" />
              <h2 className="text-lg font-black text-white">Laboratoires et équipes</h2>
            </div>
          </Fade>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {labs.map((lab, i) => (
              <Fade key={lab.name} inView={labRef.inView} delay={i * 70}>
                <div
                  className={`rounded-2xl border p-5 space-y-3 ${lab.accent} hover:scale-[1.01] transition-transform duration-200`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-white font-black text-sm leading-snug">{lab.name}</div>
                    <div className="text-center flex-shrink-0">
                      <div className="text-white font-black text-lg">{lab.members}</div>
                      <div className="text-slate-500 text-[10px]">membres</div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <GraduationCap className="w-3 h-3" />
                      Responsable : <strong className="text-slate-200">{lab.lead}</strong>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-start gap-1.5">
                      <Atom className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      {lab.specialty}
                    </div>
                  </div>
                </div>
              </Fade>
            ))}
          </div>
        </div>

        {/* ── COLLABORATIONS ────────────────────────────────────────────────── */}
        <div ref={collabRef.ref}>
          <Fade inView={collabRef.inView}>
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-4 h-4 text-emerald-400" />
              <h2 className="text-lg font-black text-white">Collaborations académiques</h2>
            </div>
          </Fade>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {collabs.map((c, i) => (
              <Fade key={c.type} inView={collabRef.inView} delay={i * 60}>
                <div className={`h-full rounded-2xl border p-5 space-y-3 ${c.color}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-900/60 flex items-center justify-center">{c.icon}</div>
                    <div className="text-white text-xs font-black">{c.type}</div>
                  </div>
                  <ul className="space-y-1.5">
                    {c.items.map((item) => (
                      <li key={item} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                        <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Fade>
            ))}
          </div>
        </div>

        {/* ── APPELS À PROJETS ──────────────────────────────────────────────── */}
        <div ref={callsRef.ref}>
          <Fade inView={callsRef.inView}>
            <div className="flex items-center gap-2 mb-6">
              <Award className="w-4 h-4 text-amber-400" />
              <h2 className="text-lg font-black text-white">Appels à projets</h2>
            </div>
          </Fade>
          <div className="space-y-3">
            {calls.map((c, i) => (
              <Fade key={c.title} inView={callsRef.inView} delay={i * 60}>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-slate-700 transition-colors">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="text-white font-bold text-sm">{c.title}</div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-[11px] text-amber-400 flex items-center gap-1 font-bold">
                        <Calendar className="w-3 h-3" />
                        Date limite : {c.deadline}
                      </span>
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {c.funding}
                      </span>
                      <span className="text-[11px] text-slate-500">{c.domain}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest border px-2.5 py-1 rounded-full flex-shrink-0 ${c.statusColor}`}
                  >
                    {c.status}
                  </span>
                </div>
              </Fade>
            ))}
          </div>
        </div>

        {/* ── RESSOURCES ────────────────────────────────────────────────────── */}
        <div ref={resRef.ref}>
          <Fade inView={resRef.inView}>
            <div className="flex items-center gap-2 mb-6">
              <Layers className="w-4 h-4 text-pink-400" />
              <h2 className="text-lg font-black text-white">Ressources de recherche</h2>
            </div>
          </Fade>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((r, i) => (
              <Fade key={r.title} inView={resRef.inView} delay={i * 60}>
                <div
                  className={`h-full rounded-2xl border p-5 space-y-3 ${r.border} hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer group`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-slate-900/70 flex items-center justify-center">
                      {r.icon}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                  <div>
                    <div className="text-white text-sm font-bold">{r.title}</div>
                    <p className="text-[12px] text-slate-400 leading-relaxed mt-1">{r.desc}</p>
                  </div>
                  <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{r.badge}</div>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
