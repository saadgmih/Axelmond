export interface RouteMetadata {
  title: string;
  description: string;
  canonical: string;
  robots: "index, follow" | "noindex, nofollow";
  /**
   * Objets schema.org sérialisés en <script type="application/ld+json">
   * (données, jamais exécutables). Voir renderPlatformHtml.
   */
  jsonLd?: ReadonlyArray<Record<string, unknown>>;
}

const SITE_ORIGIN = "https://axelmond.com";
const SITE_NAME = "Performance Académique";
const SITE_LOGO = `${SITE_ORIGIN}/performance-logo-e6657b8a.png`;
const DEFAULT_DESCRIPTION =
  "Performance Académique — plateforme académique intelligente de formation, modules universitaires, classes live et accompagnement pédagogique.";

/** Entité Organization partagée (rich results, knowledge graph). */
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: `${SITE_ORIGIN}/`,
  logo: SITE_LOGO,
  description: DEFAULT_DESCRIPTION,
} as const;

/** WebPage + fil d'Ariane Home › page pour chaque route institutionnelle. */
function webPageJsonLd(path: string, title: string, description: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: `${SITE_ORIGIN}${path}`,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: `${SITE_ORIGIN}/` },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE_ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: title, item: `${SITE_ORIGIN}${path}` },
      ],
    },
  };
}

export const PUBLIC_ROUTE_METADATA: Record<string, RouteMetadata> = {
  "/": {
    title: "Performance Académique | Plateforme académique de formation",
    description: DEFAULT_DESCRIPTION,
    canonical: `${SITE_ORIGIN}/`,
    robots: "index, follow",
    jsonLd: [
      organizationJsonLd,
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: `${SITE_ORIGIN}/`,
        publisher: { "@type": "Organization", name: SITE_NAME, logo: SITE_LOGO },
      },
    ],
  },
  "/about": {
    title: "À propos | Performance Académique",
    description: "Découvrez la mission, les valeurs et l’approche pédagogique de Performance Académique.",
    canonical: `${SITE_ORIGIN}/about`,
    robots: "index, follow",
    jsonLd: [
      webPageJsonLd("/about", "À propos", "Mission, valeurs et approche pédagogique de Performance Académique."),
    ],
  },
  "/contact": {
    title: "Contact | Performance Académique",
    description:
      "Contactez l’équipe Performance Académique pour toute question pédagogique, technique ou institutionnelle.",
    canonical: `${SITE_ORIGIN}/contact`,
    robots: "index, follow",

    jsonLd: [webPageJsonLd("/contact", "Contact", "Contact et accompagnement de Performance Académique.")],
  },
  "/support": {
    title: "Centre d’aide | Performance Académique",
    description: "Consultez les réponses fréquentes et contactez le support de la plateforme Performance Académique.",
    canonical: `${SITE_ORIGIN}/support`,
    robots: "index, follow",

    jsonLd: [webPageJsonLd("/support", "Centre d'aide", "Aide et support de Performance Académique.")],
  },
  "/privacy": {
    title: "Politique de confidentialité | Performance Académique",
    description: "Consultez la politique de confidentialité et de protection des données de Performance Académique.",
    canonical: `${SITE_ORIGIN}/privacy`,
    robots: "index, follow",

    jsonLd: [webPageJsonLd("/privacy", "Politique de confidentialité", "Protection des données et confidentialité.")],
  },
  "/terms": {
    title: "Conditions d’utilisation | Performance Académique",
    description: "Consultez les conditions d’utilisation de la plateforme Performance Académique.",
    canonical: `${SITE_ORIGIN}/terms`,
    robots: "index, follow",

    jsonLd: [webPageJsonLd("/terms", "Conditions d'utilisation", "Conditions d'utilisation de la plateforme.")],
  },
  "/cookies": {
    title: "Politique relative aux cookies | Performance Académique",
    description:
      "Découvrez comment Performance Académique utilise les cookies nécessaires au fonctionnement de la plateforme.",
    canonical: `${SITE_ORIGIN}/cookies`,
    robots: "index, follow",

    jsonLd: [webPageJsonLd("/cookies", "Politique relative aux cookies", "Utilisation des cookies sur la plateforme.")],
  },
  "/legal": {
    title: "Mentions légales | Performance Académique",
    description: "Consultez les mentions légales de la plateforme Performance Académique.",
    canonical: `${SITE_ORIGIN}/legal`,
    robots: "index, follow",

    jsonLd: [webPageJsonLd("/legal", "Mentions légales", "Mentions légales de la plateforme.")],
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
