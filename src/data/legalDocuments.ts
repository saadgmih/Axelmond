export type LegalDocumentKey = "privacy" | "cookies" | "support" | "contact";

export interface LegalDocumentDefinition {
  key: LegalDocumentKey;
  label: string;
  title: string;
  description: string;
  url: string;
  fileName: string;
  colorClass: string;
}

export const LEGAL_DOCUMENTS: LegalDocumentDefinition[] = [
  {
    key: "privacy",
    label: "Politique de confidentialité",
    title: "Politique de confidentialité",
    description: "Protection des données personnelles des utilisateurs.",
    url: "/legal-documents/privacy-policy.pdf",
    fileName: "performance-academique-politique-confidentialite.pdf",
    colorClass: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20",
  },
  {
    key: "cookies",
    label: "Politique des cookies",
    title: "Politique des cookies",
    description: "Cookies essentiels, préférences et fonctionnement du portail.",
    url: "/legal-documents/cookies-policy.pdf",
    fileName: "performance-academique-politique-cookies.pdf",
    colorClass: "text-violet-300 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20",
  },
  {
    key: "support",
    label: "Centre d'aide",
    title: "Centre d'aide",
    description: "Guide d'utilisation, assistance et problèmes fréquents.",
    url: "/legal-documents/help-center.pdf",
    fileName: "performance-academique-centre-aide.pdf",
    colorClass: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20",
  },
  {
    key: "contact",
    label: "Contact",
    title: "Contact",
    description: "Coordonnées officielles et canaux de support.",
    url: "/legal-documents/contact-sheet.pdf",
    fileName: "performance-academique-contact.pdf",
    colorClass: "text-sky-300 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20",
  },
];

export function getLegalDocument(key: LegalDocumentKey | null) {
  if (!key) return null;
  return LEGAL_DOCUMENTS.find((document) => document.key === key) ?? null;
}
