import jwt from "jsonwebtoken";
import { getAuthTokenSecret } from "./auth-token";

const LESSON_MEDIA_TICKET_AUDIENCE = "lesson-media";
const LESSON_MEDIA_TICKET_ISSUER = "axelmond";
export const LESSON_MEDIA_TICKET_TTL_SECONDS = 10 * 60;

type LessonMediaTicketPayload = {
  typ: "lesson_media";
  contentId: string;
  userId: string;
};

export function createLessonMediaTicket(
  input: { contentId: string; userId: string },
  secret = getAuthTokenSecret(),
): string {
  return jwt.sign(
    {
      typ: "lesson_media",
      contentId: input.contentId,
      userId: input.userId,
    } satisfies LessonMediaTicketPayload,
    secret,
    {
      algorithm: "HS256",
      audience: LESSON_MEDIA_TICKET_AUDIENCE,
      issuer: LESSON_MEDIA_TICKET_ISSUER,
      expiresIn: LESSON_MEDIA_TICKET_TTL_SECONDS,
    },
  );
}

export function verifyLessonMediaTicket(
  token: unknown,
  expectedContentId: string,
  secret = getAuthTokenSecret(),
): { userId: string } | null {
  if (typeof token !== "string" || !token || token.length > 4096) return null;

  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      audience: LESSON_MEDIA_TICKET_AUDIENCE,
      issuer: LESSON_MEDIA_TICKET_ISSUER,
    }) as Partial<LessonMediaTicketPayload>;

    if (payload.typ !== "lesson_media" || payload.contentId !== expectedContentId || !payload.userId) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
