import React, { useEffect, useState, useMemo } from "react";
import { useInView } from "../hooks/useInView";
import {
  BookOpen,
  Users,
  FileText,
  TrendingUp,
  Star,
  Search,
  Filter,
  Plus,
  Download,
  Share2,
  Copy,
  Calendar,
  Building2,
  Quote,
  BarChart2,
  Brain,
  Database,
  Shield,
  Atom,
  GraduationCap,
  Lightbulb,
  Microscope,
  Calculator,
  X,
  ChevronDown,
  CheckCircle,
  BookMarked,
  Activity,
  Globe,
  Eye,
  Hash,
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
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
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
      transform: inView ? "translateY(0)" : "translateY(20px)",
      transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
    }}
  >
    {children}
  </div>
);

// ─── Types ────────────────────────────────────────────────────────────────────
type PubStatus = "Publié" | "En révision" | "Accepté" | "Refusé";
type PubType = "Article" | "Conférence" | "Ouvrage" | "Chapitre" | "Prépublication";

interface Publication {
  id: number;
  title: string;
  abstract: string;
  authors: string[];
  lab: string;
  date: string;
  year: number;
  domain: string;
  keywords: string[];
  doi?: string;
  status: PubStatus;
  type: PubType;
  views: number;
  citations: number;
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const PUBLICATIONS: Publication[] = [
  {
    id: 1,
    title: "Adaptive Learning with Large Language Models in Academic Platforms",
    abstract:
      "We propose a novel framework integrating LLMs for adaptive learning in higher education. Our approach dynamically adjusts content difficulty based on learner profiles and real-time performance analytics.",
    authors: ["Karim Benali", "Amina Douiri"],
    lab: "Lab. IA & Apprentissage",
    date: "15 mai 2025",
    year: 2025,
    domain: "Intelligence Artificielle",
    keywords: ["LLM", "Adaptive Learning", "EdTech", "NLP"],
    doi: "10.1145/3587891.3598421",
    status: "Publié",
    type: "Article",
    views: 847,
    citations: 14,
  },
  {
    id: 2,
    title: "Zero-Trust Architecture for Distributed Educational Cloud Systems",
    abstract:
      "This paper presents a comprehensive zero-trust security model tailored for cloud-based educational environments, addressing identity verification, micro-segmentation and continuous monitoring.",
    authors: ["Amina Douiri", "Mehdi Lahlou"],
    lab: "Lab. Sécurité et Réseaux",
    date: "3 avr. 2025",
    year: 2025,
    domain: "Cybersécurité",
    keywords: ["Zero-Trust", "Cloud Security", "RBAC", "Education"],
    doi: "10.1109/CLOUD.2025.00142",
    status: "Publié",
    type: "Conférence",
    views: 612,
    citations: 8,
  },
  {
    id: 3,
    title: "Federated Data Analytics for MOOC Performance Prediction",
    abstract:
      "We introduce a federated learning approach for predicting student performance in MOOCs while preserving data privacy. Results show 91.3% accuracy without centralizing sensitive learner data.",
    authors: ["Youssef Chraibi", "Sara Hamidi"],
    lab: "Lab. Data & Knowledge Eng.",
    date: "20 janv. 2025",
    year: 2025,
    domain: "Science des Données",
    keywords: ["Federated Learning", "MOOC", "Privacy", "Prediction"],
    doi: "10.1016/j.dss.2025.01.008",
    status: "Publié",
    type: "Article",
    views: 1204,
    citations: 21,
  },
  {
    id: 4,
    title: "Formal Verification of Cryptographic Protocols via Coq Proof Assistant",
    abstract:
      "We demonstrate the mechanical verification of the TLS 1.3 handshake protocol using the Coq proof assistant, uncovering two previously undocumented edge cases in the key exchange mechanism.",
    authors: ["Mehdi Lahlou"],
    lab: "Lab. Sécurité et Réseaux",
    date: "8 déc. 2024",
    year: 2024,
    domain: "Cybersécurité",
    keywords: ["Cryptographie", "Coq", "Vérification formelle", "TLS"],
    doi: "10.1007/978-3-031-45234-9_12",
    status: "Publié",
    type: "Chapitre",
    views: 389,
    citations: 5,
  },
  {
    id: 5,
    title: "Gamification Patterns in Distance Learning: A Systematic Review",
    abstract:
      "Systematic review of 87 studies on gamification in e-learning contexts, identifying 12 recurring engagement patterns and their measured impact on learner retention and academic outcomes.",
    authors: ["Latifa Nassiri", "Karim Benali"],
    lab: "Lab. Innovation Pédagogique",
    date: "2 oct. 2025",
    year: 2025,
    domain: "Technologies Éducatives",
    keywords: ["Gamification", "E-learning", "Engagement", "Revue"],
    status: "En révision",
    type: "Article",
    views: 156,
    citations: 0,
  },
  {
    id: 6,
    title: "Multi-Cloud Orchestration with Fault-Tolerant Task Scheduling",
    abstract:
      "We propose CloudFlex, a fault-tolerant scheduler for heterogeneous multi-cloud environments achieving 34% latency reduction and 99.97% task completion under simulated node failures.",
    authors: ["Sara Hamidi", "Youssef Chraibi"],
    lab: "Lab. Data & Knowledge Eng.",
    date: "18 sept. 2024",
    year: 2024,
    domain: "Systèmes Distribués",
    keywords: ["Cloud", "Scheduling", "Fault Tolerance", "Multi-cloud"],
    doi: "10.1145/3620678.3624789",
    status: "Accepté",
    type: "Conférence",
    views: 498,
    citations: 7,
  },
  {
    id: 7,
    title: "Intelligence Artificielle Générative pour la Recherche Documentaire",
    abstract:
      "Étude de l'intégration des modèles génératifs dans les systèmes de recherche documentaire académique, avec évaluation sur un corpus de 50 000 publications francophones.",
    authors: ["Karim Benali"],
    lab: "Lab. IA & Apprentissage",
    date: "12 nov. 2025",
    year: 2025,
    domain: "Intelligence Artificielle",
    keywords: ["IA générative", "RAG", "Recherche documentaire"],
    status: "En révision",
    type: "Prépublication",
    views: 78,
    citations: 0,
  },
  {
    id: 8,
    title: "Introduction aux Méthodes de Vérification Formelle",
    abstract:
      "Ouvrage pédagogique couvrant les fondements de la vérification formelle : logiques de Hoare, model-checking, assistants de preuve et applications à la cybersécurité.",
    authors: ["Mehdi Lahlou", "Amina Douiri"],
    lab: "Lab. Sécurité et Réseaux",
    date: "Juin 2024",
    year: 2024,
    domain: "Informatique Théorique",
    keywords: ["Vérification formelle", "Logique", "Sécurité"],
    status: "Publié",
    type: "Ouvrage",
    views: 2341,
    citations: 33,
  },
];

const TOP_RESEARCHERS = [
  {
    name: "Youssef Chraibi",
    pubs: 18,
    citations: 97,
    domain: "Science des Données",
    lab: "Lab. Data & KE",
    avatar: "YC",
    color: "bg-violet-600",
  },
  {
    name: "Karim Benali",
    pubs: 16,
    citations: 84,
    domain: "IA & EdTech",
    lab: "Lab. IA & Apprentissage",
    avatar: "KB",
    color: "bg-indigo-600",
  },
  {
    name: "Amina Douiri",
    pubs: 14,
    citations: 71,
    domain: "Cybersécurité",
    lab: "Lab. Sécurité & Réseaux",
    avatar: "AD",
    color: "bg-rose-600",
  },
  {
    name: "Mehdi Lahlou",
    pubs: 11,
    citations: 59,
    domain: "Informatique Théorique",
    lab: "Lab. Sécurité & Réseaux",
    avatar: "ML",
    color: "bg-cyan-600",
  },
  {
    name: "Sara Hamidi",
    pubs: 9,
    citations: 42,
    domain: "Systèmes Distribués",
    lab: "Lab. Data & KE",
    avatar: "SH",
    color: "bg-sky-600",
  },
  {
    name: "Latifa Nassiri",
    pubs: 7,
    citations: 28,
    domain: "Technologies Éducatives",
    lab: "Lab. Innovation Pédag.",
    avatar: "LN",
    color: "bg-pink-600",
  },
];

const DOMAINS = [
  {
    label: "Intelligence Artificielle",
    icon: <Brain className="w-4 h-4" />,
    color: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20",
  },
  {
    label: "Science des Données",
    icon: <Database className="w-4 h-4" />,
    color: "text-violet-300 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20",
  },
  {
    label: "Cybersécurité",
    icon: <Shield className="w-4 h-4" />,
    color: "text-rose-300 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20",
  },
  {
    label: "Informatique Théorique",
    icon: <Atom className="w-4 h-4" />,
    color: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20",
  },
  {
    label: "Systèmes Distribués",
    icon: <Globe className="w-4 h-4" />,
    color: "text-sky-300 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20",
  },
  {
    label: "Technologies Éducatives",
    icon: <GraduationCap className="w-4 h-4" />,
    color: "text-pink-300 border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20",
  },
  {
    label: "Mathématiques",
    icon: <Calculator className="w-4 h-4" />,
    color: "text-amber-300 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20",
  },
  {
    label: "Innovation Numérique",
    icon: <Lightbulb className="w-4 h-4" />,
    color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20",
  },
];

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: PubStatus }> = ({ status }) => {
  const s = {
    Publié: { color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10", dot: "bg-emerald-400" },
    "En révision": { color: "text-amber-300 border-amber-500/30 bg-amber-500/10", dot: "bg-amber-400 animate-pulse" },
    Accepté: { color: "text-sky-300 border-sky-500/30 bg-sky-500/10", dot: "bg-sky-400" },
    Refusé: { color: "text-red-300 border-red-500/30 bg-red-500/10", dot: "bg-red-400" },
  }[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-full ${s.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {status}
    </span>
  );
};

// ─── Type chip ────────────────────────────────────────────────────────────────
const TypeChip: React.FC<{ type: PubType }> = ({ type }) => {
  const colors: Record<PubType, string> = {
    Article: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10",
    Conférence: "text-violet-300 border-violet-500/30 bg-violet-500/10",
    Ouvrage: "text-amber-300 border-amber-500/30 bg-amber-500/10",
    Chapitre: "text-sky-300 border-sky-500/30 bg-sky-500/10",
    Prépublication: "text-pink-300 border-pink-500/30 bg-pink-500/10",
  };
  return (
    <span
      className={`text-[10px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-full ${colors[type]}`}
    >
      {type}
    </span>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  value: number;
  suffix?: string;
  label: string;
  sublabel?: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  start: boolean;
}> = ({ value, suffix = "", label, sublabel, color, bg, border, icon, start }) => {
  const count = useCountUp(value, 1500, start);
  return (
    <div
      className={`rounded-2xl border ${border} ${bg} p-4 flex flex-col gap-2.5 hover:scale-[1.03] transition-transform duration-200`}
    >
      <div className="w-9 h-9 rounded-xl bg-slate-900/60 flex items-center justify-center">
        <span className={color}>{icon}</span>
      </div>
      <div>
        <div className={`text-2xl font-black tabular-nums ${color}`}>
          {count.toLocaleString("fr-FR")}
          {suffix}
        </div>
        <div className="text-white text-xs font-bold mt-0.5">{label}</div>
        {sublabel && <div className="text-slate-600 text-[10px]">{sublabel}</div>}
      </div>
    </div>
  );
};

// ─── Publication card ─────────────────────────────────────────────────────────
const PubCard: React.FC<{
  pub: Publication;
  expanded: boolean;
  onToggle: () => void;
  onCopy: (text: string) => void;
  copied: string;
}> = ({ pub, expanded, onToggle, onCopy, copied }) => {
  const bibtex = `@article{${pub.authors[0].split(" ")[1].toLowerCase()}${pub.year},\n  title={${pub.title}},\n  author={${pub.authors.join(" and ")}},\n  year={${pub.year}},\n  ${pub.doi ? `doi={${pub.doi}}` : "note={Performance Académique}"}\n}`;
  const apa = `${pub.authors.join(", ")} (${pub.year}). ${pub.title}. ${pub.lab}.${pub.doi ? ` https://doi.org/${pub.doi}` : ""}`;

  return (
    <div
      className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-200 ${expanded ? "border-indigo-700/50 shadow-lg shadow-indigo-900/20" : "border-slate-800 hover:border-slate-700"}`}
    >
      {/* Top strip */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <TypeChip type={pub.type} />
          <StatusBadge status={pub.status} />
          <span className="text-[10px] text-slate-500 ml-auto flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {pub.views.toLocaleString("fr-FR")}
          </span>
          {pub.citations > 0 && (
            <span className="text-[10px] text-amber-400 flex items-center gap-1">
              <Quote className="w-3 h-3" />
              {pub.citations} cit.
            </span>
          )}
        </div>

        <h3
          className="text-white font-black text-sm leading-snug mb-2 hover:text-indigo-200 transition-colors cursor-pointer"
          onClick={onToggle}
        >
          {pub.title}
        </h3>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {pub.authors.join(", ")}
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {pub.lab}
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {pub.date}
          </span>
        </div>

        {/* Keywords */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {pub.keywords.map((kw) => (
            <span
              key={kw}
              className="text-[9px] font-bold uppercase tracking-widest border border-slate-700 bg-slate-800/50 text-slate-400 px-2 py-0.5 rounded-md"
            >
              {kw}
            </span>
          ))}
        </div>

        {/* DOI */}
        {pub.doi && (
          <div className="flex items-center gap-1.5 text-[10px] text-indigo-400">
            <Hash className="w-3 h-3" />
            <span className="font-mono">{pub.doi}</span>
          </div>
        )}
      </div>

      {/* Expandable body */}
      {expanded && (
        <div className="border-t border-slate-800 px-5 py-4 space-y-4 bg-slate-950/30">
          {/* Abstract */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">Résumé</div>
            <p className="text-[12px] text-slate-300 leading-relaxed">{pub.abstract}</p>
          </div>

          {/* Domain + Lab */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Domaine</div>
              <div className="text-slate-200 text-xs font-semibold">{pub.domain}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Laboratoire</div>
              <div className="text-slate-200 text-xs font-semibold">{pub.lab}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-colors">
              <Download className="w-3 h-3" /> Télécharger PDF
            </button>
            <button
              onClick={() => onCopy(bibtex)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Copy className="w-3 h-3" />
              {copied === "bibtex-" + pub.id ? "Copié ✓" : "BibTeX"}
            </button>
            <button
              onClick={() => onCopy(apa)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Copy className="w-3 h-3" />
              {copied === "apa-" + pub.id ? "Copié ✓" : "APA 7"}
            </button>
            {pub.doi && (
              <button
                onClick={() => onCopy(pub.doi!)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Hash className="w-3 h-3" />
                {copied === "doi-" + pub.id ? "Copié ✓" : "Copier DOI"}
              </button>
            )}
            <button className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors">
              <Share2 className="w-3 h-3" /> Partager
            </button>
          </div>
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-center gap-1 py-2 text-[10px] text-slate-600 hover:text-slate-400 transition-colors border-t border-slate-800/50"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        {expanded ? "Réduire" : "Voir le résumé et les options"}
      </button>
    </div>
  );
};

// ─── New publication modal ─────────────────────────────────────────────────────
const NewPubModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
      <div className="flex items-center justify-between px-7 py-5 border-b border-slate-800">
        <div>
          <div className="text-white font-black text-lg">Nouvelle publication</div>
          <div className="text-slate-500 text-[11px]">Déposez votre travail académique</div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
      <div className="px-7 py-6 space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">
            Titre de la publication *
          </label>
          <input
            className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="Titre complet de votre publication..."
          />
        </div>

        {/* Type & Domain */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Type *</label>
            <select className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
              {["Article", "Conférence", "Ouvrage", "Chapitre", "Prépublication"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Domaine *</label>
            <select className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
              {DOMAINS.map((d) => (
                <option key={d.label}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Authors */}
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">
            Auteurs * <span className="text-slate-600 normal-case tracking-normal">(séparés par des virgules)</span>
          </label>
          <input
            className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="Ex : Jean Dupont, Marie Martin..."
          />
        </div>

        {/* Abstract */}
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Résumé *</label>
          <textarea
            rows={4}
            className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            placeholder="Résumé de la publication (150–250 mots recommandés)..."
          />
        </div>

        {/* Keywords */}
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">
            Mots-clés <span className="text-slate-600 normal-case tracking-normal">(séparés par des virgules)</span>
          </label>
          <input
            className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="Ex : Machine Learning, NLP, Education..."
          />
        </div>

        {/* DOI & Lab */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">DOI</label>
            <input
              className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="10.xxxx/xxxxx"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Laboratoire</label>
            <select className="w-full bg-slate-950/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
              {[
                "Lab. IA & Apprentissage",
                "Lab. Sécurité et Réseaux",
                "Lab. Data & Knowledge Eng.",
                "Lab. Innovation Pédagogique",
              ].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* PDF upload */}
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">Fichier PDF</label>
          <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-indigo-500/50 transition-colors cursor-pointer">
            <Download className="w-6 h-6 text-slate-500 mx-auto mb-2" />
            <div className="text-slate-400 text-xs font-semibold">Glissez votre PDF ici ou cliquez pour parcourir</div>
            <div className="text-slate-600 text-[10px] mt-1">PDF · Max 50 MB</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="text-sm font-bold text-slate-400 hover:text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            Annuler
          </button>
          <button className="flex items-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 rounded-xl transition-colors">
            <CheckCircle className="w-4 h-4" />
            Soumettre la publication
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PublicationsView() {
  const heroRef = useInView(0.1);
  const statsRef = useInView(0.1);
  const domsRef = useInView(0.05);
  const listRef = useInView(0.03);
  const recentRef = useInView(0.05);
  const topRef = useInView(0.05);

  const [search, setSearch] = useState("");
  const [filterDomain, setFilterDomain] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState("");

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const filtered = useMemo(() => {
    return PUBLICATIONS.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.authors.join(" ").toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q) ||
        p.lab.toLowerCase().includes(q);
      const matchDomain = !filterDomain || p.domain === filterDomain;
      const matchType = !filterType || p.type === filterType;
      const matchStatus = !filterStatus || p.status === filterStatus;
      return matchSearch && matchDomain && matchType && matchStatus;
    });
  }, [search, filterDomain, filterType, filterStatus]);

  const recentPubs = [...PUBLICATIONS].sort((a, b) => b.year - a.year).slice(0, 4);

  const stats = [
    {
      value: 124,
      suffix: "",
      label: "Publications totales",
      sublabel: "Depuis 2022",
      color: "text-indigo-400",
      bg: "bg-indigo-950/30",
      border: "border-indigo-900/40",
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      value: 68,
      suffix: "",
      label: "Articles scientifiques",
      sublabel: "Journaux à comité",
      color: "text-violet-400",
      bg: "bg-violet-950/30",
      border: "border-violet-900/40",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      value: 31,
      suffix: "",
      label: "Conférences",
      sublabel: "Communications orales",
      color: "text-sky-400",
      bg: "bg-sky-950/30",
      border: "border-sky-900/40",
      icon: <Microscope className="w-4 h-4" />,
    },
    {
      value: 8,
      suffix: "",
      label: "Ouvrages",
      sublabel: "Livres & chapitres",
      color: "text-amber-400",
      bg: "bg-amber-950/30",
      border: "border-amber-900/40",
      icon: <BookMarked className="w-4 h-4" />,
    },
    {
      value: 11,
      suffix: "",
      label: "Prépublications",
      sublabel: "Preprints & en cours",
      color: "text-pink-400",
      bg: "bg-pink-950/30",
      border: "border-pink-900/40",
      icon: <Activity className="w-4 h-4" />,
    },
    {
      value: 891,
      suffix: "+",
      label: "Citations reçues",
      sublabel: "Google Scholar & Scopus",
      color: "text-emerald-400",
      bg: "bg-emerald-950/30",
      border: "border-emerald-900/40",
      icon: <Quote className="w-4 h-4" />,
    },
    {
      value: 48,
      suffix: "",
      label: "Chercheurs",
      sublabel: "Auteurs actifs",
      color: "text-rose-400",
      bg: "bg-rose-950/30",
      border: "border-rose-900/40",
      icon: <Users className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-full bg-slate-950 text-white">
      {showModal && <NewPubModal onClose={() => setShowModal(false)} />}

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div
        ref={heroRef.ref}
        className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950/15 to-slate-950 border-b border-slate-800/50"
      >
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 rounded-full translate-x-60 -translate-y-60 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/5 rounded-full -translate-x-40 translate-y-40 blur-3xl pointer-events-none" />

        <div
          className="relative max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-14"
          style={{
            opacity: heroRef.inView ? 1 : 0,
            transform: heroRef.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.65s ease, transform 0.65s ease",
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                <BookOpen className="w-3 h-3" />
                Bibliothèque scientifique — Performance Académique
              </span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Publications{" "}
                <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">
                  scientifiques
                </span>
              </h1>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-xl">
                Explorez, déposez et gérez les travaux académiques de Performance Académique. Articles, conférences,
                ouvrages, prépublications et chapitres — consultables par domaine, auteur, laboratoire et statut
                éditorial.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex-shrink-0 flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-xl transition-colors shadow-lg shadow-indigo-900/40"
            >
              <Plus className="w-4 h-4" />
              Nouvelle publication
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-14">
        {/* ── STATS ─────────────────────────────────────────────────────────── */}
        <div ref={statsRef.ref}>
          <Fade inView={statsRef.inView}>
            <div className="flex items-center gap-2 mb-5">
              <BarChart2 className="w-4 h-4 text-violet-400" />
              <h2 className="text-base font-black text-white">Tableau de bord des publications</h2>
            </div>
          </Fade>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
            {stats.map((s, i) => (
              <Fade key={s.label} inView={statsRef.inView} delay={i * 55}>
                <StatCard {...s} start={statsRef.inView} />
              </Fade>
            ))}
          </div>
        </div>

        {/* ── DOMAINES ──────────────────────────────────────────────────────── */}
        <div ref={domsRef.ref}>
          <Fade inView={domsRef.inView}>
            <div className="flex items-center gap-2 mb-4">
              <Atom className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-black text-white">Domaines scientifiques</h2>
            </div>
          </Fade>
          <div className="flex flex-wrap gap-2">
            {DOMAINS.map((d, i) => (
              <Fade key={d.label} inView={domsRef.inView} delay={i * 40}>
                <button
                  onClick={() => setFilterDomain(filterDomain === d.label ? "" : d.label)}
                  className={`flex items-center gap-1.5 text-[11px] font-bold border px-3 py-1.5 rounded-full transition-all duration-150 ${d.color} ${filterDomain === d.label ? "ring-2 ring-indigo-400/40 scale-105" : ""}`}
                >
                  {d.icon}
                  {d.label}
                </button>
              </Fade>
            ))}
          </div>
        </div>

        {/* ── SEARCH & FILTERS ──────────────────────────────────────────────── */}
        <div ref={listRef.ref}>
          <Fade inView={listRef.inView}>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <h2 className="text-base font-black text-white">Recherche avancée</h2>
                {(search || filterDomain || filterType || filterStatus) && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilterDomain("");
                      setFilterType("");
                      setFilterStatus("");
                    }}
                    className="ml-auto flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-300 border border-red-500/30 bg-red-500/10 px-2 py-1 rounded-lg transition-colors"
                  >
                    <X className="w-3 h-3" /> Réinitialiser
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="Rechercher par titre, auteur, domaine, laboratoire..."
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Tous types</option>
                  {["Article", "Conférence", "Ouvrage", "Chapitre", "Prépublication"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-950/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Tous statuts</option>
                  {["Publié", "En révision", "Accepté", "Refusé"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="text-[11px] text-slate-500">
                {filtered.length} publication{filtered.length !== 1 ? "s" : ""} trouvée
                {filtered.length !== 1 ? "s" : ""}
                {(search || filterDomain || filterType || filterStatus) &&
                  " (filtrée" + (filtered.length !== 1 ? "s" : "") + ")"}
              </div>
            </div>
          </Fade>

          {/* Publication list */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <Fade inView={listRef.inView}>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
                  <BookOpen className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <div className="text-slate-500 text-sm font-semibold">
                    Aucune publication ne correspond à vos critères.
                  </div>
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilterDomain("");
                      setFilterType("");
                      setFilterStatus("");
                    }}
                    className="mt-3 text-indigo-400 hover:text-indigo-300 text-[11px] font-bold underline"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              </Fade>
            ) : (
              filtered.map((pub, i) => (
                <Fade key={pub.id} inView={listRef.inView} delay={i * 40}>
                  <PubCard
                    pub={pub}
                    expanded={expandedId === pub.id}
                    onToggle={() => setExpandedId(expandedId === pub.id ? null : pub.id)}
                    onCopy={(text) =>
                      handleCopy(
                        (text.startsWith("@") ? "bibtex-" : text.startsWith("10.") ? "doi-" : "apa-") + pub.id,
                        text,
                      )
                    }
                    copied={copied}
                  />
                </Fade>
              ))
            )}
          </div>
        </div>

        {/* ── RECENT ────────────────────────────────────────────────────────── */}
        <div ref={recentRef.ref}>
          <Fade inView={recentRef.inView}>
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-black text-white">Publications récentes</h2>
            </div>
          </Fade>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentPubs.map((pub, i) => (
              <Fade key={pub.id} inView={recentRef.inView} delay={i * 60}>
                <div
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 hover:-translate-y-0.5 hover:border-slate-700 transition-all duration-200 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === pub.id ? null : pub.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <TypeChip type={pub.type} />
                    <StatusBadge status={pub.status} />
                  </div>
                  <div className="text-white text-xs font-bold leading-snug line-clamp-2">{pub.title}</div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {pub.authors[0]}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {pub.date}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {pub.views.toLocaleString("fr-FR")} vues
                    </div>
                  </div>
                </div>
              </Fade>
            ))}
          </div>
        </div>

        {/* ── TOP CHERCHEURS ────────────────────────────────────────────────── */}
        <div ref={topRef.ref}>
          <Fade inView={topRef.inView}>
            <div className="flex items-center gap-2 mb-5">
              <Star className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-black text-white">Top chercheurs</h2>
            </div>
          </Fade>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOP_RESEARCHERS.map((r, i) => (
              <Fade key={r.name} inView={topRef.inView} delay={i * 60}>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-200">
                  {/* Rank */}
                  <div className="text-[10px] font-black text-slate-600 tabular-nums w-5 flex-shrink-0">#{i + 1}</div>
                  {/* Avatar */}
                  <div
                    className={`w-9 h-9 rounded-xl ${r.color} flex items-center justify-center text-white font-black text-xs flex-shrink-0`}
                  >
                    {r.avatar}
                  </div>
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-sm font-bold truncate">{r.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{r.lab}</div>
                    <div className="text-[10px] text-slate-500 truncate">{r.domain}</div>
                  </div>
                  {/* Stats */}
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    <div className="text-white text-sm font-black">{r.pubs}</div>
                    <div className="text-slate-600 text-[9px]">publications</div>
                    <div className="text-amber-400 text-[10px] font-bold flex items-center justify-end gap-0.5">
                      <Quote className="w-2.5 h-2.5" />
                      {r.citations}
                    </div>
                  </div>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
