export interface DisciplineSeed {
  id: number;
  name: string;
  slug: string;
  order: number;
}

export interface AcademicDomainSeed {
  id: number;
  name: string;
  slug: string;
  iconName: string;
  color: string;
  description: string;
  order: number;
  disciplines: DisciplineSeed[];
}

export const DEFAULT_DISCIPLINE_ID = 601;

export const ACADEMIC_DOMAINS: AcademicDomainSeed[] = [
  {
    id: 1,
    name: "Mathématiques",
    slug: "mathematiques",
    iconName: "Calculator",
    color: "from-emerald-600 to-emerald-600",
    description: "Fondements théoriques, modélisation et méthodes quantitatives.",
    order: 1,
    disciplines: [
      { id: 101, name: "Algèbre", slug: "algebre", order: 1 },
      { id: 102, name: "Analyse", slug: "analyse", order: 2 },
      { id: 103, name: "Probabilités et Statistiques", slug: "probabilites-statistiques", order: 3 },
      { id: 104, name: "Géométrie", slug: "geometrie", order: 4 },
      { id: 105, name: "Mathématiques Appliquées", slug: "mathematiques-appliquees", order: 5 },
    ],
  },
  {
    id: 2,
    name: "Physique",
    slug: "physique",
    iconName: "Atom",
    color: "from-cyan-600 to-sky-600",
    description: "Matière, énergie, interactions et phénomènes fondamentaux.",
    order: 2,
    disciplines: [
      { id: 201, name: "Mécanique", slug: "mecanique", order: 1 },
      { id: 202, name: "Électromagnétisme", slug: "electromagnetisme", order: 2 },
      { id: 203, name: "Thermodynamique", slug: "thermodynamique", order: 3 },
      { id: 204, name: "Physique Quantique", slug: "physique-quantique", order: 4 },
      { id: 205, name: "Physique Nucléaire", slug: "physique-nucleaire", order: 5 },
    ],
  },
  {
    id: 3,
    name: "Chimie",
    slug: "chimie",
    iconName: "FlaskConical",
    color: "from-emerald-600 to-teal-600",
    description: "Structure, transformation et analyse de la matière.",
    order: 3,
    disciplines: [
      { id: 301, name: "Chimie Générale", slug: "chimie-generale", order: 1 },
      { id: 302, name: "Chimie Organique", slug: "chimie-organique", order: 2 },
      { id: 303, name: "Chimie Minérale", slug: "chimie-minerale", order: 3 },
      { id: 304, name: "Chimie Analytique", slug: "chimie-analytique", order: 4 },
      { id: 305, name: "Biochimie", slug: "biochimie", order: 5 },
    ],
  },
  {
    id: 4,
    name: "Sciences de la Vie",
    slug: "sciences-de-la-vie",
    iconName: "Dna",
    color: "from-green-600 to-lime-600",
    description: "Organismes vivants, génétique, écologie et biotechnologies.",
    order: 4,
    disciplines: [
      { id: 401, name: "Biologie Cellulaire", slug: "biologie-cellulaire", order: 1 },
      { id: 402, name: "Génétique", slug: "genetique", order: 2 },
      { id: 403, name: "Microbiologie", slug: "microbiologie", order: 3 },
      { id: 404, name: "Écologie", slug: "ecologie", order: 4 },
      { id: 405, name: "Biotechnologies", slug: "biotechnologies", order: 5 },
    ],
  },
  {
    id: 5,
    name: "Médecine et Pharmacie",
    slug: "medecine-pharmacie",
    iconName: "HeartPulse",
    color: "from-emerald-600 to-red-600",
    description: "Santé, corps humain, médicaments et pratiques cliniques.",
    order: 5,
    disciplines: [
      { id: 501, name: "Anatomie", slug: "anatomie", order: 1 },
      { id: 502, name: "Physiologie", slug: "physiologie", order: 2 },
      { id: 503, name: "Pharmacologie", slug: "pharmacologie", order: 3 },
      { id: 504, name: "Pathologie", slug: "pathologie", order: 4 },
      { id: 505, name: "Médecine Clinique", slug: "medecine-clinique", order: 5 },
    ],
  },
  {
    id: 6,
    name: "Informatique et Intelligence Artificielle",
    slug: "informatique-intelligence-artificielle",
    iconName: "BrainCircuit",
    color: "from-teal-600 to-teal-600",
    description: "Logiciel, données, sécurité, apprentissage automatique et IA.",
    order: 6,
    disciplines: [
      { id: 601, name: "Programmation", slug: "programmation", order: 1 },
      { id: 602, name: "Développement Web", slug: "developpement-web", order: 2 },
      { id: 603, name: "Bases de Données", slug: "bases-de-donnees", order: 3 },
      { id: 604, name: "Cybersécurité", slug: "cybersecurite", order: 4 },
      { id: 605, name: "Intelligence Artificielle", slug: "intelligence-artificielle", order: 5 },
      { id: 606, name: "Machine Learning", slug: "machine-learning", order: 6 },
      { id: 607, name: "Data Science", slug: "data-science", order: 7 },
    ],
  },
  {
    id: 7,
    name: "Architecture et Génie Civil",
    slug: "architecture-genie-civil",
    iconName: "Building2",
    color: "from-slate-700 to-zinc-600",
    description: "Espaces bâtis, urbanisme, construction et maquettes BIM.",
    order: 7,
    disciplines: [
      { id: 701, name: "Architecture", slug: "architecture", order: 1 },
      { id: 702, name: "Urbanisme", slug: "urbanisme", order: 2 },
      { id: 703, name: "Construction", slug: "construction", order: 3 },
      { id: 704, name: "Génie Civil", slug: "genie-civil", order: 4 },
      { id: 705, name: "BIM", slug: "bim", order: 5 },
    ],
  },
  {
    id: 8,
    name: "Économie et Management",
    slug: "economie-management",
    iconName: "BriefcaseBusiness",
    color: "from-lime-600 to-orange-600",
    description: "Organisation, finance, marchés, gestion et entrepreneuriat.",
    order: 8,
    disciplines: [
      { id: 801, name: "Économie", slug: "economie", order: 1 },
      { id: 802, name: "Comptabilité", slug: "comptabilite", order: 2 },
      { id: 803, name: "Finance", slug: "finance", order: 3 },
      { id: 804, name: "Marketing", slug: "marketing", order: 4 },
      { id: 805, name: "Management", slug: "management", order: 5 },
      { id: 806, name: "Entrepreneuriat", slug: "entrepreneuriat", order: 6 },
    ],
  },
  {
    id: 9,
    name: "Génie Électrique et Électronique",
    slug: "genie-electrique-electronique",
    iconName: "CircuitBoard",
    color: "from-emerald-700 to-emerald-700",
    description: "Électronique, contrôle, télécommunications et systèmes embarqués.",
    order: 9,
    disciplines: [
      { id: 901, name: "Électronique", slug: "electronique", order: 1 },
      { id: 902, name: "Automatique", slug: "automatique", order: 2 },
      { id: 903, name: "Télécommunications", slug: "telecommunications", order: 3 },
      { id: 904, name: "Systèmes Embarqués", slug: "systemes-embarques", order: 4 },
    ],
  },
  {
    id: 10,
    name: "Accompagnement et Réussite",
    slug: "accompagnement-reussite",
    iconName: "Lightbulb",
    color: "from-emerald-600 to-teal-600",
    description: "Méthodes d'apprentissage, tutorat, ateliers et progression.",
    order: 10,
    disciplines: [
      { id: 1001, name: "Méthodologie", slug: "methodologie", order: 1 },
      { id: 1002, name: "Projets Pédagogiques", slug: "projets-pedagogiques", order: 2 },
      { id: 1003, name: "Tutorat", slug: "tutorat", order: 3 },
      { id: 1004, name: "Ateliers", slug: "ateliers", order: 4 },
      { id: 1005, name: "Progression", slug: "progression", order: 5 },
    ],
  },
];

export function getDisciplineIdForCourse(course: { title: string; category: string }) {
  const title = course.title.toLowerCase();
  const category = course.category.toLowerCase();

  if (title.includes("base") || title.includes("sql") || category.includes("donnée")) return 603;
  if (title.includes("machine learning") || category === "ia") return 606;
  if (title.includes("intelligence artificielle")) return 605;
  if (title.includes("linux") || title.includes("système") || category.includes("système")) return 604;
  return DEFAULT_DISCIPLINE_ID;
}
