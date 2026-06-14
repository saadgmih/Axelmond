export const CHAT_TUTOR_MAX_PROMPT_CHARS = 4000;
export const CHAT_TUTOR_MAX_HISTORY_MESSAGES = 20;
export const CHAT_TUTOR_MAX_HISTORY_CHARS = 12_000;

export function trimChatTutorHistory(
  history: Array<{ role: string; text: string }>,
  maxMessages = CHAT_TUTOR_MAX_HISTORY_MESSAGES,
  maxChars = CHAT_TUTOR_MAX_HISTORY_CHARS,
) {
  const recent = history.slice(-maxMessages);
  let totalChars = 0;
  const trimmed: typeof recent = [];
  for (let index = recent.length - 1; index >= 0; index -= 1) {
    const entry = recent[index];
    const textLength = String(entry.text || "").length;
    if (trimmed.length > 0 && totalChars + textLength > maxChars) break;
    trimmed.unshift(entry);
    totalChars += textLength;
  }
  return trimmed;
}
