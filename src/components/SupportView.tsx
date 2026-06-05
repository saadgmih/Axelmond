import React, { useState, useMemo, useRef } from "react";
import { 
  Search, 
  HelpCircle, 
  Send, 
  Image as ImageIcon, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  User,
  CreditCard,
  ShieldAlert,
  Wrench,
  Activity,
  ArrowRight
} from "lucide-react";
import { api } from "../api";
import { getFreshSessionToken } from "../api";
import { getUploadedFileUrl, getUploadErrorMessage, uploadFiles, validateUploadFile } from "../uploadthing-client";

interface SupportViewProps {
  currentUser: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  navigateTo: (view: string) => void;
}

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

export default function SupportView({ currentUser, navigateTo }: SupportViewProps) {
  // Form states
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Support Technique");
  const [description, setDescription] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  // File Upload states
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFaqCategory, setSelectedFaqCategory] = useState("Toutes");

  // Accordion state (FAQ item index)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // API states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [createdTicket, setCreatedTicket] = useState<{ id: string; subject: string; category: string; status: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const faqCategories = ["Toutes", "Modules", "Compte", "Paiements", "Sécurité", "Support Technique"];

  const faqItems: FaqItem[] = [
    // Modules
    {
      category: "Modules",
      question: "Comment s'inscrire à un module ?",
      answer: "Rendez-vous dans le Catalogue des Modules, sélectionnez le module de votre choix, cliquez sur 'S'abonner' et procédez au paiement. L'accès est validé instantanément pour 30 jours."
    },
    {
      category: "Modules",
      question: "Où trouver mes notes de quiz ?",
      answer: "Vos notes de quiz sont sauvegardées automatiquement et affichées dans l'espace notes ou progrès de chaque module. Vous pouvez y consulter vos scores détaillés."
    },
    {
      category: "Modules",
      question: "Puis-je télécharger les vidéos de module ?",
      answer: "Pour des raisons de droits d'auteur, les vidéos sont disponibles uniquement en streaming. Cependant, vous pouvez télécharger tous les supports de module au format PDF."
    },
    // Compte
    {
      category: "Compte",
      question: "Comment changer mon mot de passe ?",
      answer: "Les professeurs et chercheurs peuvent changer leur mot de passe directement depuis leur espace de profil académique. Si vous êtes étudiant, contactez l'administration."
    },
    {
      category: "Compte",
      question: "Je n'ai pas reçu mon code de vérification d'email",
      answer: "Vérifiez votre dossier de courriers indésirables (Spams). Si le code n'arrive toujours pas après quelques minutes, cliquez sur le bouton 'Renvoyer le code' sur la page de connexion."
    },
    {
      category: "Compte",
      question: "Puis-je modifier mon adresse email ou mon rôle ?",
      answer: "Les adresses emails et les rôles académiques sont vérifiés lors de l'inscription et ne peuvent pas être modifiés par l'utilisateur. Pour toute correction, veuillez contacter le secrétariat."
    },
    // Paiements
    {
      category: "Paiements",
      question: "Quels sont les modes de paiement acceptés ?",
      answer: "Nous acceptons les paiements sécurisés par carte bancaire (Visa, MasterCard, Amex) gérés par notre partenaire Stripe. Toutes les transactions sont cryptées."
    },
    {
      category: "Paiements",
      question: "Où puis-je télécharger mes factures ?",
      answer: "Toutes vos factures et reçus Stripe sont archivés et accessibles en téléchargement dans la section facturation de votre profil utilisateur."
    },
    {
      category: "Paiements",
      question: "Comment annuler le renouvellement automatique ?",
      answer: "Les abonnements aux modules d'Axelmond Research Labs n'ont pas de renouvellement automatique. L'accès expire naturellement après 30 jours si vous ne vous réabonnez pas."
    },
    // Sécurité
    {
      category: "Sécurité",
      question: "Mes données personnelles sont-elles protégées ?",
      answer: "Oui. Toutes vos données sont stockées conformément aux exigences du RGPD. Nous n'exposons aucun secret de base de données ni identifiant sensible dans le code client."
    },
    {
      category: "Sécurité",
      question: "Qu'est-ce que le système de lockout temporaire ?",
      answer: "Pour vous protéger contre les attaques de brute-force, le serveur bloque automatiquement l'accès au compte pendant 1 minute après 20 échecs consécutifs de mot de passe."
    },
    {
      category: "Sécurité",
      question: "Comment signaler une faille ou anomalie de sécurité ?",
      answer: "Créez un ticket dans la catégorie 'Sécurité' de cette page avec les détails de l'anomalie constatée. Notre responsable de la sécurité informatique (RSSI) la traitera en priorité."
    },
    // Support Technique
    {
      category: "Support Technique",
      question: "La visioconférence (Live) ne fonctionne pas, que faire ?",
      answer: "Assurez-vous que votre navigateur autorise l'accès à votre caméra et votre micro. Vérifiez également que vous disposez d'un débit montant/descendant d'au moins 2 Mbps."
    },
    {
      category: "Support Technique",
      question: "L'upload d'un document ou d'une capture d'écran échoue",
      answer: "Vérifiez que le fichier ne dépasse pas la taille maximale autorisée (8 Mo pour les images, 32 Mo pour les PDF) et qu'il ne s'agit pas d'un type de fichier banni (.exe, .js, .bat)."
    },
    {
      category: "Support Technique",
      question: "La plateforme affiche une erreur réseau récurrente",
      answer: "Videz le cache de votre navigateur (Ctrl + F5) ou essayez de vous connecter depuis une fenêtre de navigation privée pour éliminer tout conflit de stockage local."
    }
  ];

  // Category Icon helper
  const getCategoryIcon = (catName: string) => {
    switch (catName) {
      case "Modules": return <BookOpen className="w-4 h-4" />;
      case "Compte": return <User className="w-4 h-4" />;
      case "Paiements": return <CreditCard className="w-4 h-4" />;
      case "Sécurité": return <ShieldAlert className="w-4 h-4" />;
      case "Support Technique": return <Wrench className="w-4 h-4" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
  };

  // Filter FAQ based on search input & category tab
  const filteredFaq = useMemo(() => {
    return faqItems.filter((item) => {
      const matchesCategory = selectedFaqCategory === "Toutes" || item.category === selectedFaqCategory;
      const matchesSearch = 
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedFaqCategory]);

  // File selection & upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateUploadFile(file, "SUPPORT_IMAGE");
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError("");
    setSelectedFile(file);
    setUploadProgress(0);

    const token = await getFreshSessionToken();
    if (!token) {
      setUploadError("Authentification expirée. Veuillez vous reconnecter.");
      setUploadProgress(null);
      return;
    }

    try {
      const response = await (uploadFiles as any)("supportScreenshot", {
        files: [file],
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: ({ progress }: { progress: number }) => {
          setUploadProgress(progress);
        }
      });

      const url = getUploadedFileUrl(response?.[0]);
      if (!url) throw new Error("URL de l'image introuvable.");

      setScreenshotUrl(url);
      setUploadProgress(null);
    } catch (err: any) {
      console.error("Screenshot upload failed:", err);
      setUploadError(getUploadErrorMessage(err));
      setUploadProgress(null);
      setSelectedFile(null);
    }
  };

  const removeScreenshot = () => {
    setScreenshotUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Form submit handler
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!subject.trim()) errors.subject = "Le sujet est requis.";
    else if (subject.trim().length < 3) errors.subject = "Le sujet doit contenir au moins 3 caractères.";

    if (!description.trim()) errors.description = "La description est requise.";
    else if (description.trim().length < 10) errors.description = "La description doit contenir au moins 10 caractères.";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setCreatedTicket(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await api.createSupportTicket({
        subject,
        category,
        description,
        screenshotUrl
      });

      setSuccessMsg(response.message);
      setCreatedTicket(response.ticket);
      setSubject("");
      setDescription("");
      setScreenshotUrl(null);
      setSelectedFile(null);
      setValidationErrors({});
    } catch (err: any) {
      console.error("Failed to create support ticket:", err);
      setErrorMsg(err.message || "Une erreur est survenue lors de la création de votre ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Action triggered category selection
  const handleQuickBugReport = () => {
    setCategory("Support Technique");
    const formElement = document.getElementById("support-ticket-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Top Support Status Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block">
            Centre d'Aide & Support
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Comment pouvons-nous vous aider ?
          </h1>
          <p className="text-slate-300 text-sm">
            Consultez notre base de connaissances filtrable ou créez un ticket d'assistance technique pour obtenir une réponse rapide de nos ingénieurs.
          </p>
        </div>

        {/* Live Support Indicator */}
        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5 flex-shrink-0">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Support Opérationnel</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Temps de réponse moyen : &lt; 15 min</p>
          </div>
        </div>
      </div>

      {/* Quick Access Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button 
          onClick={() => navigateTo("catalog")}
          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl text-left text-white transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-200">Catalogue des modules</p>
            <p className="text-[10px] text-slate-450">S'inscrire ou accéder à mes modules</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors transform group-hover:translate-x-1" />
        </button>

        <button 
          onClick={() => navigateTo("profile")}
          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl text-left text-white transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-200">Vérifier mon Profil</p>
            <p className="text-[10px] text-slate-450">Factures, accès et informations personnelles</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors transform group-hover:translate-x-1" />
        </button>

        <button 
          onClick={() => navigateTo("contact")}
          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl text-left text-white transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-200">Secrétariat Général</p>
            <p className="text-[10px] text-slate-450">Pour toute demande non-technique</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors transform group-hover:translate-x-1" />
        </button>

        <button 
          onClick={handleQuickBugReport}
          className="bg-indigo-950/40 hover:bg-indigo-950/60 border border-indigo-900/40 hover:border-indigo-900/60 p-4 rounded-2xl text-left text-white transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-indigo-305">Signaler un Bug Technique</p>
            <p className="text-[10px] text-indigo-400">Ouvrir directement un ticket d'anomalie</p>
          </div>
          <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors transform group-hover:translate-x-1" />
        </button>
      </div>

      {/* Main Grid: FAQ (Left) & Ticket Form (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Dynamic Searchable FAQ */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 text-white">
            
            {/* Header with search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 flex-shrink-0">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                Base de Connaissances
              </h2>

              {/* Intelligent Search Input */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher une question..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-800 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-2">
              {faqCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedFaqCategory(cat);
                    setOpenFaqIndex(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                    selectedFaqCategory === cat
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-850"
                  }`}
                >
                  {cat !== "Toutes" && getCategoryIcon(cat)}
                  {cat}
                </button>
              ))}
            </div>

            {/* FAQ List */}
            <div className="space-y-3">
              {filteredFaq.length > 0 ? (
                filteredFaq.map((item, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div 
                      key={index}
                      className="border border-slate-850 rounded-xl overflow-hidden transition-all duration-200"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-850/50 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-slate-500">{getCategoryIcon(item.category)}</span>
                          {item.question}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0 ml-2" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0 ml-2" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="p-3.5 bg-slate-950/30 text-xs text-slate-400 border-t border-slate-850/50 leading-relaxed animate-in slide-in-from-top-1 duration-150">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <AlertCircle className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">Aucune question ne correspond à votre recherche.</p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right: Ticket Creation Form */}
        <div id="support-ticket-form" className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 text-white">
            <h2 className="text-lg font-bold text-white border-b border-slate-850 pb-3 flex items-center gap-2">
              <Send className="w-5 h-5 text-indigo-400" />
              Ouvrir un Ticket d'Assistance
            </h2>

            {successMsg && createdTicket && (
              <div className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold">{successMsg}</p>
                </div>
                <div className="bg-slate-950/80 border border-slate-850 p-3 rounded-xl space-y-1.5 text-slate-350">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Récapitulatif du ticket</p>
                  <p className="text-xs"><span className="text-slate-500">ID Ticket:</span> <span className="font-mono font-bold text-indigo-300">{createdTicket.id}</span></p>
                  <p className="text-xs"><span className="text-slate-500">Sujet:</span> <span className="font-bold text-white">{createdTicket.subject}</span></p>
                  <p className="text-xs"><span className="text-slate-500">Catégorie:</span> <span>{createdTicket.category}</span></p>
                  <p className="text-xs flex items-center gap-1.5"><span className="text-slate-500">Statut:</span> <span className="bg-indigo-550/20 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold">{createdTicket.status}</span></p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-950/30 border border-red-500/30 text-red-400 p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              
              {/* Category */}
              <div className="space-y-1.5">
                <label htmlFor="ticket-category" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Catégorie de demande
                </label>
                <select
                  id="ticket-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl text-xs bg-slate-950 border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isSubmitting}
                >
                  <option value="Modules">Modules & Contenus</option>
                  <option value="Compte">Compte Utilisateur</option>
                  <option value="Paiements">Paiements & Inscriptions</option>
                  <option value="Sécurité">Sécurité & Filles</option>
                  <option value="Support Technique">Support Technique & Bug</option>
                </select>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label htmlFor="ticket-subject" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Sujet du problème
                </label>
                <input
                  id="ticket-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="En quelques mots (ex: Accès vidéo bloqué)"
                  className="w-full px-4 py-2.5 border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isSubmitting}
                />
                {validationErrors.subject && (
                  <p className="text-red-405 text-xs font-medium">{validationErrors.subject}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="ticket-description" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Description détaillée
                </label>
                <textarea
                  id="ticket-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Expliquez précisément votre problème, les étapes pour le reproduire et les messages d'erreur affichés..."
                  rows={5}
                  className="w-full px-4 py-2.5 border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isSubmitting}
                />
                {validationErrors.description && (
                  <p className="text-red-405 text-xs font-medium">{validationErrors.description}</p>
                )}
              </div>

              {/* Screenshot Upload Section */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Capture d'écran (facultatif)
                </span>
                
                {screenshotUrl ? (
                  /* Screenshot Preview */
                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                      <img 
                        src={screenshotUrl} 
                        alt="Capture d'écran support" 
                        className="w-12 h-12 rounded-lg object-cover border border-slate-800"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-350 truncate max-w-[150px]">
                          {selectedFile ? selectedFile.name : "Capture d'écran"}
                        </p>
                        <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Téléversé
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      className="p-1.5 text-slate-450 hover:text-red-400 hover:bg-slate-850 rounded-xl transition-all cursor-pointer"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* Upload Area */
                  <div className="space-y-2">
                    <input
                      type="file"
                      id="ticket-screenshot"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                      disabled={isSubmitting || uploadProgress !== null}
                    />
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting || uploadProgress !== null}
                      className="w-full border border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 p-4 rounded-xl flex flex-col items-center justify-center gap-2 group cursor-pointer transition-all disabled:opacity-50"
                    >
                      {uploadProgress !== null ? (
                        <>
                          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                          <span className="text-xs text-slate-400">Téléversement : {uploadProgress}%</span>
                          <div className="w-2/3 bg-slate-900 rounded-full h-1 mt-1 overflow-hidden">
                            <div 
                              className="bg-indigo-500 h-full transition-all duration-150"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                          <span className="text-xs text-slate-450 group-hover:text-slate-300">Ajouter une capture d'écran (max 4 Mo)</span>
                        </>
                      )}
                    </button>
                    
                    {uploadError && (
                      <p className="text-red-405 text-[10px] font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {uploadError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting || uploadProgress !== null}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-md focus:outline-none cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Créer le Ticket d'Assistance
                  </>
                )}
              </button>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
