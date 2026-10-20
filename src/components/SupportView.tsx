import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  User,
  CreditCard,
  ShieldAlert,
  Wrench,
  Activity,
  ArrowRight,
  Send,
  Ticket,
  RefreshCw,
  Clock,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { api } from "../api";
import { scrollToSupportReportForm } from "../utils/support-navigation";
import SupportTicketForm from "./SupportTicketForm";

interface SupportViewProps {
  navigateTo: (view: string) => void;
}

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

export default function SupportView({ navigateTo }: SupportViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFaqCategory, setSelectedFaqCategory] = useState("Toutes");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"faq" | "tickets">("faq");
  const [userTickets, setUserTickets] = useState<
    Array<{
      id: string;
      subject: string;
      category: string;
      description: string;
      screenshotUrl: string | null;
      status: string;
      createdAt: string;
    }>
  >([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketsError, setTicketsError] = useState("");

  const loadUserTickets = useCallback(async () => {
    setLoadingTickets(true);
    setTicketsError("");
    try {
      const res = await api.getSupportTickets();
      setUserTickets(Array.isArray(res?.tickets) ? res.tickets : []);
    } catch {
      setTicketsError("Impossible de récupérer vos tickets.");
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    loadUserTickets();
  }, [loadUserTickets]);

  const faqCategories = ["Toutes", "Modules", "Compte", "Paiements", "Sécurité", "Support Technique"];

  const faqItems: FaqItem[] = [
    {
      category: "Modules",
      question: "Comment s'inscrire à un module ?",
      answer:
        "Rendez-vous dans le Catalogue des Modules, sélectionnez le module de votre choix, cliquez sur 'S'abonner' et procédez au paiement. L'accès est validé instantanément pour 30 jours.",
    },
    {
      category: "Modules",
      question: "Où trouver mes notes de quiz ?",
      answer:
        "Vos notes de quiz sont sauvegardées automatiquement et affichées dans l'espace notes ou progrès de chaque module.",
    },
    {
      category: "Modules",
      question: "Puis-je télécharger les vidéos de module ?",
      answer:
        "Les vidéos sont disponibles en streaming uniquement. Les supports PDF peuvent être téléchargés depuis chaque module.",
    },
    {
      category: "Compte",
      question: "Comment changer mon mot de passe ?",
      answer:
        "Tous les utilisateurs peuvent changer leur mot de passe depuis Sécurité du compte avec leur mot de passe actuel. Si vous n'avez plus accès à votre mot de passe, utilisez « Mot de passe oublié ? » sur la page de connexion.",
    },
    {
      category: "Compte",
      question: "Je n'ai pas reçu mon code de vérification d'email",
      answer: "Vérifiez vos spams. Si le code n'arrive pas, cliquez sur 'Renvoyer le code' sur la page de connexion.",
    },
    {
      category: "Paiements",
      question: "Quels sont les modes de paiement acceptés ?",
      answer: "Paiement en ligne sécurisé par carte ou portefeuille numérique.",
    },
    {
      category: "Paiements",
      question: "Où télécharger mes factures ?",
      answer: "Dans la section facturation de votre profil utilisateur.",
    },
    {
      category: "Sécurité",
      question: "Mes données sont-elles protégées ?",
      answer: "Oui, conformément à la loi n° 09-08 sur la protection des données personnelles au Maroc.",
    },
    {
      category: "Support Technique",
      question: "La visioconférence (Live) ne fonctionne pas",
      answer: "Autorisez caméra/micro dans le navigateur et vérifiez une connexion d'au moins 2 Mbps.",
    },
    {
      category: "Support Technique",
      question: "L'upload d'un fichier échoue",
      answer: "Vérifiez la taille (max 8 Mo images, 32 Mo PDF) et le type de fichier.",
    },
    {
      category: "Support Technique",
      question: "Erreur réseau récurrente",
      answer: "Videz le cache (Ctrl+F5) ou essayez une fenêtre de navigation privée.",
    },
  ];

  useEffect(() => {
    if (window.location.hash === "#report") {
      requestAnimationFrame(() => scrollToSupportReportForm("smooth"));
    }
  }, []);

  const getCategoryIcon = (catName: string) => {
    switch (catName) {
      case "Modules":
        return <BookOpen className="w-4 h-4" />;
      case "Compte":
        return <User className="w-4 h-4" />;
      case "Paiements":
        return <CreditCard className="w-4 h-4" />;
      case "Sécurité":
        return <ShieldAlert className="w-4 h-4" />;
      case "Support Technique":
        return <Wrench className="w-4 h-4" />;
      default:
        return <HelpCircle className="w-4 h-4" />;
    }
  };

  const filteredFaq = useMemo(
    () =>
      faqItems.filter((item) => {
        const matchesCategory = selectedFaqCategory === "Toutes" || item.category === selectedFaqCategory;
        const q = searchQuery.toLowerCase();
        return matchesCategory && (item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q));
      }),
    [searchQuery, selectedFaqCategory],
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 rounded-3xl p-6 md:p-8 text-white border border-slate-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block">
            Centre d&apos;aide &amp; support
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Comment pouvons-nous vous aider ?</h1>
          <p className="text-slate-300 text-sm">
            Consultez la base de connaissances ou signalez un problème technique directement sur cette page.
          </p>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5 flex-shrink-0">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Support opérationnel</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Réponse moyenne &lt; 15 min</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => navigateTo("catalog")}
          className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-left text-white hover:border-slate-600 flex items-center justify-between"
        >
          <span className="text-xs font-bold">Catalogue des modules</span>
          <ArrowRight className="w-4 h-4 text-slate-500" />
        </button>
        <button
          type="button"
          onClick={() => navigateTo("contact")}
          className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-left text-white hover:border-slate-600 flex items-center justify-between"
        >
          <span className="text-xs font-bold">Contacter l'équipe</span>
          <ArrowRight className="w-4 h-4 text-slate-500" />
        </button>
        <button
          type="button"
          onClick={() => scrollToSupportReportForm()}
          className="bg-lime-950/30 border border-lime-800/40 p-4 rounded-2xl text-left text-lime-100 hover:border-lime-600/50 flex items-center justify-between"
        >
          <span className="text-xs font-bold">Signaler un problème</span>
          <ArrowRight className="w-4 h-4 text-lime-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("faq")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === "faq"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                    : "text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Base de connaissances</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tickets")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === "tickets"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                    : "text-slate-400 hover:text-white bg-slate-950/60 border border-slate-800"
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span>Mes tickets ({userTickets.length})</span>
              </button>
            </div>
            {activeTab === "faq" ? (
              <div className="relative w-full sm:max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher une question..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={loadUserTickets}
                disabled={loadingTickets}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-300 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingTickets ? "animate-spin" : ""}`} />
                <span>Actualiser</span>
              </button>
            )}
          </div>

          {activeTab === "faq" ? (
            <>
              <div className="flex flex-wrap gap-2">
                {faqCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedFaqCategory(cat);
                      setOpenFaqIndex(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${selectedFaqCategory === cat ? "bg-emerald-600 text-white" : "bg-slate-950 text-slate-400 hover:text-white"}`}
                  >
                    {cat !== "Toutes" && getCategoryIcon(cat)}
                    {cat}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {filteredFaq.length > 0 ? (
                  filteredFaq.map((item, index) => {
                    const isOpen = openFaqIndex === index;
                    return (
                      <div key={item.question} className="border border-slate-800 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                          className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-slate-300 hover:bg-slate-800/50"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-slate-500">{getCategoryIcon(item.category)}</span>
                            {item.question}
                          </span>
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {isOpen && (
                          <div className="p-3.5 bg-slate-950/30 text-xs text-slate-400 border-t border-slate-800 leading-relaxed">
                            {item.answer}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-xs">Aucune question ne correspond à votre recherche.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {loadingTickets ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                </div>
              ) : ticketsError ? (
                <div className="p-6 text-center text-rose-400 text-xs">{ticketsError}</div>
              ) : userTickets.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-2xl">
                  <Ticket className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-sm font-bold text-slate-300">Aucun ticket envoyé</p>
                  <p className="text-xs text-slate-400">
                    Utilisez le formulaire ci-contre pour signaler un problème technique ou poser une question.
                  </p>
                </div>
              ) : (
                userTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 rounded-2xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition-all space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-bold text-emerald-300">
                          {ticket.id}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {ticket.category}
                        </span>
                      </div>
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                        {ticket.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{ticket.subject}</h4>
                      {ticket.description && (
                        <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {ticket.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(ticket.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {ticket.screenshotUrl && (
                        <a
                          href={ticket.screenshotUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Capture</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div id="support-report-form" className="lg:col-span-5 space-y-4 scroll-mt-24">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 px-1">
            <Send className="w-5 h-5 text-lime-400" />
            Signaler un problème
          </h2>
          <SupportTicketForm
            defaultCategory="Support Technique"
            submitLabel="Créer le ticket d'assistance"
            onTicketCreated={loadUserTickets}
          />
        </div>
      </div>
    </div>
  );
}
