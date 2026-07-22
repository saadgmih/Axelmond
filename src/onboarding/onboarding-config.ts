import type { OnboardingFlow } from "./onboarding-types";

export type OnboardingPlacement = "top" | "right" | "bottom" | "left";

export interface OnboardingStep {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  targetSelectors: string[];
  placement?: OnboardingPlacement;
  requiresSidebar?: boolean;
  view?: string;
}

const studentSteps: OnboardingStep[] = [
  {
    id: "student-dashboard",
    eyebrow: "Votre point de départ",
    title: "Tableau de bord",
    description: "Retrouvez ici vos priorités, vos modules actifs et les informations utiles dès votre connexion.",
    targetSelectors: ["#nav-dashboard"],
    placement: "right",
    requiresSidebar: true,
    view: "dashboard",
  },
  {
    id: "student-catalog",
    eyebrow: "Découvrir",
    title: "Catalogue des cours",
    description: "Explorez les modules disponibles, recherchez une matière et inscrivez-vous à un nouveau cours.",
    targetSelectors: ["#nav-catalog"],
    placement: "right",
    requiresSidebar: true,
    view: "catalog",
  },
  {
    id: "student-courses",
    eyebrow: "Votre apprentissage",
    title: "Mes cours",
    description: "Vos modules en cours sont regroupés ici pour reprendre rapidement là où vous vous êtes arrêté.",
    targetSelectors: ['[data-onboarding="student-courses"]'],
    placement: "right",
    view: "dashboard",
  },
  {
    id: "student-progress",
    eyebrow: "Suivre vos résultats",
    title: "Progression",
    description: "Visualisez votre avancement global, les contenus terminés et vos prochaines étapes.",
    targetSelectors: ['[data-onboarding="student-progress"]'],
    placement: "bottom",
    view: "dashboard",
  },
  {
    id: "student-lives",
    eyebrow: "Apprendre en direct",
    title: "Lives",
    description: "Lorsqu'un enseignant lance un live, une invitation apparaît pour rejoindre immédiatement la classe.",
    targetSelectors: ['[data-onboarding="student-lives"]'],
    placement: "top",
    view: "dashboard",
  },
  {
    id: "student-messages",
    eyebrow: "Échanger",
    title: "Messagerie",
    description: "Contactez vos enseignants et suivez toutes vos conversations depuis cet espace.",
    targetSelectors: ['[data-onboarding="messages"]'],
    placement: "right",
    requiresSidebar: true,
    view: "messages",
  },
  {
    id: "student-notifications",
    eyebrow: "Rester informé",
    title: "Notifications",
    description:
      "Les nouveaux contenus, lives et changements importants apparaissent dans votre centre de notifications.",
    targetSelectors: ["#nav-notifications"],
    placement: "right",
    requiresSidebar: true,
    view: "notifications",
  },
  {
    id: "student-profile",
    eyebrow: "Votre compte",
    title: "Profil et paramètres",
    description:
      "Mettez à jour votre profil, votre photo et vos préférences. Le tutoriel reste relançable depuis Paramètres.",
    targetSelectors: ['[data-onboarding="profile-menu"]', "#nav-profile"],
    placement: "bottom",
    requiresSidebar: true,
    view: "profile",
  },
];

const teacherSteps: OnboardingStep[] = [
  {
    id: "teacher-dashboard",
    eyebrow: "Vue d'ensemble",
    title: "Tableau de bord",
    description: "Pilotez vos activités pédagogiques, les inscriptions et les résultats récents depuis un seul écran.",
    targetSelectors: ["#nav-teacher-dashboard"],
    placement: "right",
    requiresSidebar: true,
    view: "dashboard",
  },
  {
    id: "teacher-courses",
    eyebrow: "Organiser",
    title: "Gestion des cours",
    description:
      "Créez vos modules, structurez le programme et contrôlez leur publication depuis la gestion des contenus.",
    targetSelectors: ["#nav-curriculum"],
    placement: "right",
    requiresSidebar: true,
    view: "curriculum",
  },
  {
    id: "teacher-students",
    eyebrow: "Accompagner",
    title: "Gestion des étudiants",
    description: "Consultez les étudiants inscrits, leurs notes et leur progression pour adapter votre accompagnement.",
    targetSelectors: ['[data-onboarding="teacher-students"]'],
    placement: "left",
    view: "dashboard",
  },
  {
    id: "teacher-content",
    eyebrow: "Publier",
    title: "Création de contenu",
    description: "Ajoutez des chapitres, médias, documents et quiz grâce au parcours guidé de création de contenu.",
    targetSelectors: ["#nav-curriculum"],
    placement: "right",
    requiresSidebar: true,
    view: "curriculum",
  },
  {
    id: "teacher-lives",
    eyebrow: "Enseigner en direct",
    title: "Lives",
    description: "Planifiez, lancez et contrôlez vos sessions live pour les étudiants inscrits à vos modules.",
    targetSelectors: ["#nav-live-control"],
    placement: "right",
    requiresSidebar: true,
    view: "live-control",
  },
  {
    id: "teacher-messages",
    eyebrow: "Communiquer",
    title: "Messagerie",
    description: "Répondez aux étudiants et centralisez vos échanges pédagogiques dans la messagerie sécurisée.",
    targetSelectors: ['[data-onboarding="messages"]'],
    placement: "right",
    requiresSidebar: true,
    view: "messages",
  },
  {
    id: "teacher-statistics",
    eyebrow: "Mesurer",
    title: "Statistiques",
    description: "Analysez la publication, la réussite, les notes moyennes et l'activité de vos modules.",
    targetSelectors: ['[data-onboarding="teacher-statistics"]'],
    placement: "bottom",
    view: "dashboard",
  },
  {
    id: "teacher-profile",
    eyebrow: "Votre identité académique",
    title: "Profil et paramètres",
    description:
      "Gérez votre profil, la sécurité du compte et vos préférences. Paramètres permet de relancer ce tutoriel.",
    targetSelectors: ['[data-onboarding="profile-menu"]', "#nav-academic-profile"],
    placement: "bottom",
    requiresSidebar: true,
    view: "academic-profile",
  },
];

const adminSteps: OnboardingStep[] = [
  {
    id: "admin-dashboard",
    eyebrow: "Vue d'ensemble",
    title: "Tableau de bord",
    description: "Surveillez les indicateurs essentiels et l'activité académique de la plateforme.",
    targetSelectors: ["#nav-teacher-dashboard"],
    placement: "right",
    requiresSidebar: true,
    view: "dashboard",
  },
  {
    id: "admin-users",
    eyebrow: "Administrer les accès",
    title: "Gestion des utilisateurs",
    description: "Gérez les accès enseignants et suivez les étudiants inscrits aux différents modules.",
    targetSelectors: ["#nav-professor-access-keys", '[data-onboarding="teacher-students"]'],
    placement: "right",
    requiresSidebar: true,
    view: "access-keys",
  },
  {
    id: "admin-courses",
    eyebrow: "Superviser",
    title: "Gestion des cours",
    description: "Créez, contrôlez et publiez les modules proposés sur la plateforme.",
    targetSelectors: ["#nav-curriculum"],
    placement: "right",
    requiresSidebar: true,
    view: "curriculum",
  },
  {
    id: "admin-settings",
    eyebrow: "Configurer",
    title: "Paramètres de la plateforme",
    description: "Adaptez l'accessibilité et les préférences d'affichage depuis les paramètres globaux.",
    targetSelectors: ['[data-onboarding="platform-settings"]'],
    placement: "bottom",
    requiresSidebar: true,
  },
  {
    id: "admin-statistics",
    eyebrow: "Décider avec les données",
    title: "Statistiques",
    description: "Suivez les inscriptions, la progression, les résultats et l'activité des modules.",
    targetSelectors: ['[data-onboarding="teacher-statistics"]'],
    placement: "bottom",
    view: "dashboard",
  },
  {
    id: "admin-profile",
    eyebrow: "Votre compte",
    title: "Profil et paramètres",
    description:
      "Mettez à jour votre profil administrateur, sécurisez le compte et relancez le tutoriel depuis Paramètres.",
    targetSelectors: ['[data-onboarding="profile-menu"]', "#nav-academic-profile"],
    placement: "bottom",
    requiresSidebar: true,
    view: "academic-profile",
  },
];

const onboardingSteps: Record<OnboardingFlow, OnboardingStep[]> = {
  STUDENT: studentSteps,
  TEACHER: teacherSteps,
  ADMIN: adminSteps,
};

export function getOnboardingSteps(flow: OnboardingFlow): OnboardingStep[] {
  return onboardingSteps[flow];
}
