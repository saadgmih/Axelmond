import type OpenAI from "openai";
import { logSecurity } from "./security-logger";
import { trimChatTutorHistory } from "./chat-tutor-limits";
import {
  assertChatTutorPromptAllowed,
  moderateChatTutorInput,
} from "./chat-tutor-moderation";

export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
export const OPENAI_REQUEST_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS) || 60_000;
export const OPENAI_MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS) || 2048;

export type ChatTutorHistoryMessage = {
  role: "user" | "model" | "assistant";
  text: string;
};

export const CHAT_TUTOR_CLIENT_MESSAGES: Record<ChatTutorServiceError["code"], string> = {
  NOT_CONFIGURED: "Assistant indisponible pour le moment.",
  TIMEOUT: "L'assistant met trop de temps à répondre. Réessayez.",
  RATE_LIMIT: "L'assistant est temporairement surchargé. Réessayez dans quelques instants.",
  QUOTA_EXCEEDED: "Assistant temporairement indisponible.",
  AUTH_ERROR: "Assistant temporairement indisponible.",
  API_ERROR: "L'assistant a rencontré une erreur.",
  EMPTY_RESPONSE: "L'assistant n'a pas pu répondre.",
};

export function toChatTutorClientResponse(err: ChatTutorServiceError) {
  return {
    error: CHAT_TUTOR_CLIENT_MESSAGES[err.code],
    code: err.code,
  };
}

export class ChatTutorServiceError extends Error {
  readonly code:
    | "NOT_CONFIGURED"
    | "TIMEOUT"
    | "RATE_LIMIT"
    | "QUOTA_EXCEEDED"
    | "AUTH_ERROR"
    | "API_ERROR"
    | "EMPTY_RESPONSE";
  readonly statusCode: number;
  readonly cause?: unknown;

  constructor(message: string, code: ChatTutorServiceError["code"], statusCode = 500, cause?: unknown) {
    super(message);
    this.name = "ChatTutorServiceError";
    this.code = code;
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

let OpenAIConstructor: typeof import("openai").default | null = null;
let openAIClient: OpenAI | null = null;

async function loadOpenAIModule() {
  if (!OpenAIConstructor) {
    const mod = await import("openai");
    OpenAIConstructor = mod.default;
  }
  return OpenAIConstructor;
}

async function getOpenAIClient(): Promise<OpenAI> {
  if (openAIClient) return openAIClient;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new ChatTutorServiceError("Assistant indisponible pour le moment.", "NOT_CONFIGURED", 503);
  }

  const OpenAI = await loadOpenAIModule();
  openAIClient = new OpenAI({
    apiKey,
    timeout: OPENAI_REQUEST_TIMEOUT_MS,
    maxRetries: 2,
  });
  return openAIClient;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAIModelName(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export function buildChatTutorSystemInstruction(courseName: string, moduleName: string): string {
  return `Tu es l'éminent tuteur IA de l'université Axelmond Research Labs.
L'étudiant étudie actuellement le module : "${courseName}" et plus particulièrement le chapitre ou l'activité : "${moduleName}".
Fournis des explications scientifiques et informatiques claires, extrêmement précises et pédagogiques.
Si l'étudiant pose une question de programmation, donne des exemples de code structurés (en C, Python, SQL, ou Bash selon le contexte) avec des explications.
Reste bienveillant, universitaire et s'il s'agit d'un exemple pratique, aide l'étudiant à comprendre la logique étape par étape.
Réponds dans la langue utilisée par l'étudiant (français, arabe ou anglais). Si la langue n'est pas claire, réponds en français.
Pour les réponses longues, structure-les avec des titres, listes et exemples clairs.`;
}

export const OPENAI_FALLBACK_NOTICE =
  "\n\n---\n*Service IA cloud momentanément indisponible — réponse pédagogique locale Axelmond.*";

export function shouldUseLocalChatTutorFallback(err: unknown): boolean {
  if (isOpenAIConfigured()) return false;
  if (!(err instanceof ChatTutorServiceError)) return false;
  return ["API_ERROR", "RATE_LIMIT", "TIMEOUT", "QUOTA_EXCEEDED", "AUTH_ERROR", "EMPTY_RESPONSE"].includes(err.code);
}

export function getLocalChatTutorFallback(prompt: string, courseName: string, moduleName: string): string {
  const localAnswers: { [key: string]: string } = {
    default: `Bonjour ! Je suis votre assistant personnel Axelmond Research Labs.\n\nC'est un plaisir de vous aider sur le module **${courseName}** (*${moduleName}*).\n\nVoici quelques conseils fondamentaux sur votre sujet actuel :\n1. **Comprenez la structure** : Avant de coder, dessinez les structures de données (listes, arbres) ou écrivez le pseudo-code.\n2. **Complexité** : N'oubliez pas d'évaluer la complexité O(n) de vos solutions.\n3. **Tests** : Testez toujours les cas limites (pointeur NULL, tableau vide, division par zéro).\n\nAvez-vous une question spécifique concernant le code ou la théorie de ce chapitre ?`,
  };

  let reply = localAnswers.default;
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes("complexit") || lowerPrompt.includes("o(")) {
    reply = `### Analyse de la Complexité Temporelle O(n)\n\nEn Algorithmique, la complexité mesure l'évolution des ressources nécessaires (temps, mémoire) en fonction de la taille $n$ des données.\n\n- **$O(1)$ (Temps Constant)** : L'accès à un élément de tableau par son index \`A[i]\`.\n- **$O(\\log n)$ (Logarithmique)** : Recherche dichotomique dans un tableau trié.\n- **$O(n)$ (Linéaire)** : Recherche séquentielle dans un tableau non trié.\n- **$O(n^2)$ (Quadratique)** : Double boucle imbriquée.\n\nAvez-vous besoin que nous analysions un algorithme particulier ensemble ?`;
  } else if (lowerPrompt.includes("sql") || lowerPrompt.includes("base de donn")) {
    reply = `### Modélisation et Requêtes SQL\n\nPour concevoir une excellente structure relationnelle, voici les principes clés :\n\n1. **Clé Primaire (Primary Key)** : Identifie de manière unique chaque tuple de la table.\n2. **Clé Étrangère (Foreign Key)** : Établit un lien de référence avec une autre table.\n3. **Jointures** : Permettent de relier plusieurs tables.\n\nQue souhaitez-vous interroger ou modéliser aujourd'hui ?`;
  } else if (lowerPrompt.includes("linux") || lowerPrompt.includes("processus")) {
    reply = `### L'architecture Linux et la gestion de Processus\n\nDans un système d'exploitation conforme aux normes POSIX (comme Linux) :\n\n- **Processus** : Une instance de programme en cours d'exécution.\n- **Thread** : L'unité d'exécution de base d'un processus.\n- **fork()** : Appel système permettant de cloner un processus parent.\n\nAvez-vous une question concernant les sémaphores, le scheduling, ou la gestion des signaux ?`;
  } else if (
    lowerPrompt.includes("ia") ||
    lowerPrompt.includes("machine learning") ||
    lowerPrompt.includes("neurone")
  ) {
    reply = `### Fondations de l'Intelligence Artificielle\n\nL'apprentissage statistique (Machine Learning) repose sur l'ajustement de paramètres mathématiques pour minimiser une fonction d'erreur.\n\n- **Supervisé** : Vous donnez des entrées $X$ et les étiquettes cibles $Y$.\n- **Non supervisé** : Regroupement automatique sans étiquettes.\n- **Réseau de Neurones** : Un modèle composé de couches de neurones artificiels.\n\nQuelle partie du Machine Learning vous intéresse en ce moment ?`;
  }

  return reply;
}

function toOpenAIMessages(history: ChatTutorHistoryMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return history.map((msg) => ({
    role: msg.role === "user" ? "user" : "assistant",
    content: msg.text,
  }));
}

function mapOpenAIError(err: unknown, model: string): ChatTutorServiceError {
  const apiError = err as {
    status?: number;
    code?: string;
    message?: string;
    error?: { type?: string; code?: string; message?: string };
  };

  const message = apiError?.message || apiError?.error?.message || "";
  const status = apiError?.status;
  const errorCode = apiError?.code || apiError?.error?.code || apiError?.error?.type;

  if (errorCode === "ETIMEDOUT" || errorCode === "timeout" || /timed out/i.test(message)) {
    logSecurity("ERROR", "OpenAI chat-tutor timeout", { model });
    return new ChatTutorServiceError("L'assistant met trop de temps à répondre. Réessayez.", "TIMEOUT", 504, err);
  }

  if (
    status === 429 &&
    (errorCode === "insufficient_quota" || /insufficient_quota|exceeded your current quota/i.test(message))
  ) {
    logSecurity("ERROR", "OpenAI chat-tutor quota exceeded", { model });
    return new ChatTutorServiceError("Assistant temporairement indisponible.", "QUOTA_EXCEEDED", 503, err);
  }

  if (status === 429 || errorCode === "rate_limit_exceeded") {
    logSecurity("WARN", "OpenAI chat-tutor rate limit", { model });
    return new ChatTutorServiceError(
      "L'assistant est temporairement surchargé. Réessayez dans quelques instants.",
      "RATE_LIMIT",
      429,
      err,
    );
  }

  if (status === 401 || errorCode === "invalid_api_key" || /invalid api key|incorrect api key/i.test(message)) {
    logSecurity("ERROR", "OpenAI chat-tutor auth error", { model, status, code: errorCode });
    return new ChatTutorServiceError("Assistant temporairement indisponible.", "AUTH_ERROR", 503, err);
  }

  logSecurity("ERROR", "OpenAI chat-tutor error", {
    model,
    status,
    code: errorCode,
  });
  return new ChatTutorServiceError("L'assistant a rencontré une erreur.", "API_ERROR", 500, err);
}

export async function generateChatTutorResponse(options: {
  courseName: string;
  moduleName: string;
  prompt: string;
  chatHistory?: ChatTutorHistoryMessage[];
}): Promise<string> {
  const { courseName, moduleName, prompt, chatHistory = [] } = options;
  const trimmedHistory = trimChatTutorHistory(chatHistory) as ChatTutorHistoryMessage[];

  assertChatTutorPromptAllowed(prompt, trimmedHistory);

  if (!isOpenAIConfigured()) {
    return getLocalChatTutorFallback(prompt, courseName, moduleName);
  }

  const model = getOpenAIModelName();
  const systemInstruction = buildChatTutorSystemInstruction(courseName, moduleName);

  try {
    const openai = await getOpenAIClient();
    await moderateChatTutorInput(openai, [prompt, ...trimmedHistory.map((entry) => entry.text)]);
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemInstruction },
      ...toOpenAIMessages(trimmedHistory),
      { role: "user", content: prompt },
    ];

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: OPENAI_MAX_OUTPUT_TOKENS,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new ChatTutorServiceError("Réponse vide de l'assistant.", "EMPTY_RESPONSE");
    }

    return text;
  } catch (err) {
    const mapped = err instanceof ChatTutorServiceError ? err : mapOpenAIError(err, model);
    if (shouldUseLocalChatTutorFallback(mapped)) {
      logSecurity("WARN", "OpenAI chat-tutor degraded to local fallback", {
        model,
        code: mapped.code,
      });
      return `${getLocalChatTutorFallback(prompt, courseName, moduleName)}${OPENAI_FALLBACK_NOTICE}`;
    }
    throw mapped;
  }
}

export function initializeOpenAIService(): void {
  if (isOpenAIConfigured()) {
    const verbose = process.env.NODE_ENV !== "production" || process.env.STARTUP_VERBOSE === "true";
    logSecurity(
      "INFO",
      verbose ? "OpenAI chat-tutor service configured" : "Chat-tutor service configured",
      verbose ? { model: getOpenAIModelName() } : undefined,
    );
  } else {
    console.log("Assistant IA: service externe non configuré, réponses pédagogiques locales activées.");
  }
}
