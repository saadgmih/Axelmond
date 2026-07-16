export interface RouteMetadata {
  title: string;
  description: string;
  canonical: string;
  robots: "index, follow" | "noindex, nofollow";
}

const SITE_ORIGIN = "https://axelmond.com";
const DEFAULT_DESCRIPTION =
  "Performance Académique — plateforme académique intelligente de formation, modules universitaires, classes live et accompagnement pédagogique.";

export const PUBLIC_ROUTE_METADATA: Record<string, RouteMetadata> = {
  "/": {
    title: "Performance Académique | Plateforme académique de formation",
    description: DEFAULT_DESCRIPTION,
    canonical: `${SITE_ORIGIN}/`,
    robots: "index, follow",
  },
  "/about": {
    title: "À propos | Performance Académique",
    description: "Découvrez la mission, les valeurs et l’approche pédagogique de Performance Académique.",
    canonical: `${SITE_ORIGIN}/about`,
    robots: "index, follow",
  },
  "/contact": {
    title: "Contact | Performance Académique",
    description:
      "Contactez l’équipe Performance Académique pour toute question pédagogique, technique ou institutionnelle.",
    canonical: `${SITE_ORIGIN}/contact`,
    robots: "index, follow",
  },
  "/support": {
    title: "Centre d’aide | Performance Académique",
    description: "Consultez les réponses fréquentes et contactez le support de la plateforme Performance Académique.",
    canonical: `${SITE_ORIGIN}/support`,
    robots: "index, follow",
  },
  "/privacy": {
    title: "Politique de confidentialité | Performance Académique",
    description: "Consultez la politique de confidentialité et de protection des données de Performance Académique.",
    canonical: `${SITE_ORIGIN}/privacy`,
    robots: "index, follow",
  },
  "/terms": {
    title: "Conditions d’utilisation | Performance Académique",
    description: "Consultez les conditions d’utilisation de la plateforme Performance Académique.",
    canonical: `${SITE_ORIGIN}/terms`,
    robots: "index, follow",
  },
  "/cookies": {
    title: "Politique relative aux cookies | Performance Académique",
    description:
      "Découvrez comment Performance Académique utilise les cookies nécessaires au fonctionnement de la plateforme.",
    canonical: `${SITE_ORIGIN}/cookies`,
    robots: "index, follow",
  },
  "/legal": {
    title: "Mentions légales | Performance Académique",
    description: "Consultez les mentions légales de la plateforme Performance Académique.",
    canonical: `${SITE_ORIGIN}/legal`,
    robots: "index, follow",
  },
};

export function getRouteMetadata(pathname: string): RouteMetadata {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const publicMetadata = PUBLIC_ROUTE_METADATA[normalized];
  if (publicMetadata) return publicMetadata;
  return {
    title: /^\/(student|teacher|professor|admin)(?:\/|$)/.test(normalized)
      ? "Espace académique | Performance Académique"
      : "Page introuvable | Performance Académique",
    description: DEFAULT_DESCRIPTION,
    canonical: `${SITE_ORIGIN}${normalized}`,
    robots: "noindex, nofollow",
  };
}
