/** Délai maximum après l'envoi pendant lequel l'auteur peut supprimer son message. */
export const MESSAGE_DELETE_MAX_AGE_MS = 4 * 24 * 60 * 60 * 1000;

export function canDeleteOwnMessage(
  message: { senderId: string; createdAt: string | Date },
  currentUserId: string,
  nowMs = Date.now(),
): boolean {
  if (message.senderId !== currentUserId) return false;
  const createdAtMs = message.createdAt instanceof Date ? message.createdAt.getTime() : new Date(message.createdAt).getTime();
  if (!Number.isFinite(createdAtMs)) return false;
  return nowMs - createdAtMs <= MESSAGE_DELETE_MAX_AGE_MS;
}
