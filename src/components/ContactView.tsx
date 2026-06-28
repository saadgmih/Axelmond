import React, { useState } from "react";
import {
  Mail,
  Phone,
  Globe,
  MapPin,
  Clock,
  ShieldCheck,
  Send,
  HelpCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "../api";

interface ContactViewProps {
  currentUser: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  navigateTo: (view: string) => void;
}

export default function ContactView({ currentUser, navigateTo }: ContactViewProps) {
  // Form state
  const [name, setName] = useState(currentUser?.fullName || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Support Technique");
  const [message, setMessage] = useState("");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // FAQ accordion state (index of open question, null if all closed)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqItems = [
    {
      question: "Comment s'abonner à un module ?",
      answer:
        "Rendez-vous dans le Catalogue des Modules, sélectionnez le module de votre choix, cliquez sur 'S'abonner' et suivez les instructions de paiement sécurisé. L'accès au contenu pédagogique est instantané pour une durée de 30 jours renouvelable.",
    },
    {
      question: "Comment participer aux sessions Live ?",
      answer:
        "Lorsqu'une session en direct est lancée par un enseignant, une notification « En direct » s'affiche sur votre tableau de bord et dans l'espace module. Cliquez sur « Rejoindre le live » pour accéder à la visioconférence sécurisée.",
    },
    {
      question: "Mes notes et progrès de quiz sont-ils enregistrés ?",
      answer:
        "Absolument. Chaque tentative de quiz, ainsi que la progression au sein des chapitres et des sections, sont calculées et enregistrées de manière persistante sur nos serveurs. Vous pouvez suivre vos moyennes cumulées et votre taux de complétion depuis votre espace étudiant.",
    },
    {
      question: "Je rencontre un problème technique ou de connexion, que faire ?",
      answer:
        "Assurez-vous que votre navigateur est à jour et que votre connexion internet est stable. Si vous rencontrez un dysfonctionnement (lecteur vidéo, chat en direct ou téléchargement de ressources), décrivez précisément l'action effectuée via ce formulaire afin que notre support technique puisse vous assister.",
    },
  ];

  const categories = [
    "Support Technique",
    "Questions Pédagogiques",
    "Facturation & Inscriptions",
    "Partenariats pédagogiques",
    "Autre Demande",
  ];

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Le nom est requis.";
    else if (name.trim().length < 2) errors.name = "Le nom doit contenir au moins 2 caractères.";

    if (!email.trim()) errors.email = "L'adresse email est requise.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Adresse email invalide.";

    if (!subject.trim()) errors.subject = "Le sujet est requis.";
    else if (subject.trim().length < 3) errors.subject = "Le sujet doit contenir au moins 3 caractères.";

    if (!category) errors.category = "Veuillez sélectionner une catégorie.";

    if (!message.trim()) errors.message = "Le message est requis.";
    else if (message.trim().length < 10) errors.message = "Le message doit contenir au moins 10 caractères.";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await api.submitContact({
        name,
        email,
        subject,
        category,
        message,
      });

      setSuccessMsg(response.message || "Votre message a été transmis avec succès.");
      setSubject("");
      setMessage("");
      setValidationErrors({});
    } catch (err: any) {
      console.error("Submission failed:", err);
      setErrorMsg(err.message || "Une erreur est survenue lors de l'envoi de votre message.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Title Header Card */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-indigo-950">
        <div className="relative z-10 max-w-3xl space-y-3">
          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block">
            Support & Relations
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Contacter Performance Académique
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Pour toute demande d'assistance technique, pédagogique, administrative ou pour des partenariats académiques,
            nos équipes sont à votre entière disposition.
          </p>
        </div>
      </div>

      {/* Main Grid: Form (Left) & Info / FAQ (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Security Box */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 text-white">
            <h2 className="text-xl font-bold text-white border-b border-slate-850 pb-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-400" />
              Formulaire d'Assistance
            </h2>

            {successMsg && (
              <div className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold">{successMsg}</p>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-950/30 border border-red-500/30 text-red-400 p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom Complet */}
                <div className="space-y-1.5">
                  <label htmlFor="contact-name" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Nom Complet
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre nom complet"
                    className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isLoading}
                  />
                  {validationErrors.name && (
                    <p className="text-red-400 text-xs mt-1 font-medium">{validationErrors.name}</p>
                  )}
                </div>

                {/* Adresse Email */}
                <div className="space-y-1.5">
                  <label htmlFor="contact-email" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Adresse Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="adresse@mail.com"
                    className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isLoading}
                  />
                  {validationErrors.email && (
                    <p className="text-red-400 text-xs mt-1 font-medium">{validationErrors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Catégorie */}
                <div className="space-y-1.5 md:col-span-1">
                  <label
                    htmlFor="contact-category"
                    className="text-xs font-bold text-slate-400 uppercase tracking-wider"
                  >
                    Catégorie
                  </label>
                  <select
                    id="contact-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-xl text-sm bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isLoading}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {validationErrors.category && (
                    <p className="text-red-400 text-xs mt-1 font-medium">{validationErrors.category}</p>
                  )}
                </div>

                {/* Sujet */}
                <div className="space-y-1.5 md:col-span-2">
                  <label
                    htmlFor="contact-subject"
                    className="text-xs font-bold text-slate-400 uppercase tracking-wider"
                  >
                    Sujet de la demande
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Sujet de votre message"
                    className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isLoading}
                  />
                  {validationErrors.subject && (
                    <p className="text-red-400 text-xs mt-1 font-medium">{validationErrors.subject}</p>
                  )}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label htmlFor="contact-message" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Votre Message
                </label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Décrivez votre demande en détail (minimum 10 caractères)..."
                  rows={6}
                  className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isLoading}
                />
                {validationErrors.message && (
                  <p className="text-red-400 text-xs mt-1 font-medium">{validationErrors.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md focus:outline-none cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Envoyer le Message
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Security & GDPR Info Box */}
          <div className="bg-slate-950/40 border border-slate-850 rounded-3xl p-5 flex items-start gap-4 text-white">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-indigo-300">
                Données Sécurisées & Protection des données (loi 09-08)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Les informations recueillies via ce formulaire sont cryptées de bout en bout et font l'objet d'un audit
                de sécurité. Elles sont utilisées exclusivement pour traiter votre demande par l'administration de
                Performance Académique et ne seront jamais partagées avec des tiers.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Contact Info & FAQ */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Contact coordinates */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 text-white">
            <h2 className="text-lg font-bold text-white border-b border-slate-850 pb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-400" />
              Informations Institutionnelles
            </h2>

            <div className="space-y-4 text-sm">
              {/* Adresse */}
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-bold text-slate-300">Adresse de l'Institut</p>
                  <p className="text-xs text-slate-400">Performance Académique</p>
                  <p className="text-xs text-slate-400">Casablanca, Maroc</p>
                  <p className="text-[10px] text-slate-500 italic mt-1">
                    Canal administratif principal : formulaire de contact ou adresse générale ci-dessous.
                  </p>
                </div>
              </div>

              {/* Téléphone */}
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-slate-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-slate-300">Secrétariat Général</p>
                  <p className="text-xs text-slate-400">+212 634772103</p>
                  <p className="font-bold text-slate-300 mt-2">Support & Assistance</p>
                  <p className="text-xs text-slate-400">+212 634772103</p>
                </div>
              </div>

              {/* Emails */}
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-slate-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-bold text-slate-300">Adresses Electroniques</p>
                  <p className="text-xs text-slate-450 hover:text-indigo-400 transition-colors">
                    <a href="mailto:contact@axelmond.com">contact@axelmond.com</a> (Contact général)
                  </p>
                  <p className="text-xs text-slate-450 hover:text-indigo-400 transition-colors mt-0.5">
                    <a href="mailto:support@axelmond.com">support@axelmond.com</a> (Support technique)
                  </p>
                  <p className="text-xs text-slate-450 hover:text-indigo-400 transition-colors mt-0.5">
                    <a href="mailto:admissions@axelmond.com">admissions@axelmond.com</a> (Inscriptions)
                  </p>
                  <p className="text-xs text-slate-450 hover:text-indigo-400 transition-colors mt-0.5">
                    <a href="mailto:billing@axelmond.com">billing@axelmond.com</a> (Facturation)
                  </p>
                  <p className="text-xs text-slate-450 hover:text-indigo-400 transition-colors mt-0.5">
                    <a href="mailto:privacy@axelmond.com">privacy@axelmond.com</a> (Données personnelles)
                  </p>
                  <p className="text-xs text-slate-450 hover:text-indigo-400 transition-colors mt-0.5">
                    <a href="mailto:legal@axelmond.com">legal@axelmond.com</a> (Juridique)
                  </p>
                </div>
              </div>

              {/* Site Web */}
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <div>
                  <p className="font-bold text-slate-300">Portail Universitaire</p>
                  <p className="text-xs text-slate-450 hover:text-indigo-400 transition-colors">
                    <a href="https://www.axelmond.com" target="_blank" rel="noopener noreferrer">
                      www.axelmond.com
                    </a>
                  </p>
                </div>
              </div>

              {/* Horaires */}
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-slate-300">Heures de Permanence</p>
                  <p className="text-xs text-slate-400">Lundi - Vendredi : 08:30 - 18:30</p>
                  <p className="text-xs text-slate-500 italic mt-0.5">
                    Fermé le week-end et les jours fériés académiques
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card: FAQ Accordion */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-white">
            <h2 className="text-lg font-bold text-white border-b border-slate-850 pb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-400" />
              FAQ & Centre d'aide
            </h2>

            <div className="space-y-3">
              {faqItems.map((item, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="border border-slate-850 rounded-xl overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(index)}
                      className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-850/50 transition-colors cursor-pointer"
                    >
                      <span>{item.question}</span>
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
              })}
            </div>

            {/* Quick Links Footer */}
            <div className="pt-2 border-t border-slate-850 flex flex-wrap gap-x-4 gap-y-2 justify-between text-xs text-slate-450">
              <button
                onClick={() => navigateTo("catalog")}
                className="hover:text-indigo-400 hover:underline cursor-pointer"
              >
                Catalogue
              </button>
              <button
                onClick={() => navigateTo("profile")}
                className="hover:text-indigo-400 hover:underline cursor-pointer"
              >
                Mon Profil
              </button>
              <button
                onClick={() => navigateTo("support")}
                className="hover:text-indigo-400 hover:underline cursor-pointer"
              >
                Support technique
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
