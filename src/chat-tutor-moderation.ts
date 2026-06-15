import OpenAI from "openai";
import { logSecurity } from "./security-logger";
import { ChatTutorServiceError } from "./openai-service";

const BLOCKED_PROMPT_PATTERNS = [
  /\bignore\s+(all\s+)?(previous|prior)\s+instructions\b/i,
  /\bdisregard\s+(the\s+)?(system|above)\b/i,
  /\b(jailbreak|dan\s+mode|developer\s+mode)\b/i,
  /\bpretend\s+you\s+are\s+not\b/i,
  /\breveal\s+(the\s+)?(system\s+)?prompt\b/i,
  /\bshow\s+(me\s+)?(your\s+)?(system\s+)?instructions\b/i,
];

export function hasBlockedChatTutorPattern(text: string): boolean {
  const value = String(text || "").trim();
  if (!value) return false;
  return BLOCKED_PROMPT_PATTERNS.some((pattern) => pattern.test(value));
}

export function assertChatTutorPromptAllowed(prompt: string, history: Array<{ text?: string }> = []): void {
  if (hasBlockedChatTutorPattern(prompt)) {
    logSecurity("WARN", "Chat tutor prompt blocked by local policy", { reason: "blocked_pattern" });
    throw new ChatTutorServiceError(
      "Votre message ne peut pas être traité. Reformulez votre question pédagogique.",
      "API_ERROR",
      400,
    );
  }

  for (const entry of history) {
    if (hasBlockedChatTutorPattern(String(entry.text || ""))) {
      logSecurity("WARN", "Chat tutor history blocked by local policy", { reason: "blocked_pattern_history" });
      throw new ChatTutorServiceError(
        "L'historique de conversation contient un message non autorisé.",
        "API_ERROR",
        400,
      );
    }
  }
}

export async function moderateChatTutorInput(
  openai: OpenAI,
  texts: string[],
): Promise<void> {
  const input = texts.map((text) => String(text || "").trim()).filter(Boolean);
  if (input.length === 0) return;

  const moderation = await openai.moderations.create({
    model: "omni-moderation-latest",
    input,
  });

  const flagged = moderation.results?.some((result) => result.flagged);
  if (flagged) {
    logSecurity("WARN", "Chat tutor input flagged by OpenAI moderation", {
      categories: moderation.results?.filter((r) => r.flagged).map((r) => r.categories),
    });
    throw new ChatTutorServiceError(
      "Votre message ne peut pas être traité. Reformulez votre question pédagogique.",
      "API_ERROR",
      400,
    );
  }
}
