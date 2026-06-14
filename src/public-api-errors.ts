export const PUBLIC_API_ERRORS = {
  courseNotFound: "Module introuvable",
  courseModuleNotFound: "Sous-module introuvable",
  chapterNotFound: "Chapitre introuvable",
  parentSectionNotFound: "Section parente introuvable",
  sectionNotFound: "Section introuvable",
  contentNotFound: "Contenu introuvable",
  quizNotFound: "Quiz introuvable",
  quizModuleNotFound: "Module quiz introuvable",
  questionNotFound: "Question introuvable",
  enrollmentRequiredContent: "Inscription requise pour consulter ce contenu",
  enrollmentRequiredLive: "Inscription requise pour rejoindre ce live",
  accessDeniedCourse: "Accès refusé pour consulter ce module",
  accessDeniedLive: "Accès refusé pour ce live",
  titleTypeDurationRequired: "Le titre, le type et la durée sont requis.",
  titleBodyRequired: "Le titre et le contenu sont requis.",
  answersObjectRequired: "Les réponses du quiz sont requises.",
} as const;

export const LIVE_ACCESS_ERRORS = {
  notFound: PUBLIC_API_ERRORS.courseNotFound,
  enrollmentRequired: PUBLIC_API_ERRORS.enrollmentRequiredLive,
  accessDenied: PUBLIC_API_ERRORS.accessDeniedLive,
} as const;

export const PUSH_SUBSCRIBE_CLIENT_MESSAGES = {
  invalid: "Abonnement push invalide.",
  endpointInvalid: "Endpoint push invalide.",
  endpointForbidden: "Endpoint push non autorisé.",
  keysInvalid: "Clés push invalides.",
  limit: "Nombre maximal d'appareils push atteint.",
} as const;

const ALLOWED_PUSH_VALIDATION_MESSAGES = new Set<string>(Object.values(PUSH_SUBSCRIBE_CLIENT_MESSAGES));

export function toPushSubscribeClientResponse(err: { message: string; name?: string }) {
  if (err.name === "PushSubscriptionLimitError") {
    return { error: PUSH_SUBSCRIBE_CLIENT_MESSAGES.limit, code: "PUSH_SUBSCRIPTION_LIMIT" };
  }
  const message = err.message.trim();
  return {
    error: ALLOWED_PUSH_VALIDATION_MESSAGES.has(message)
      ? message
      : PUSH_SUBSCRIBE_CLIENT_MESSAGES.invalid,
    code: "PUSH_SUBSCRIPTION_INVALID",
  };
}
