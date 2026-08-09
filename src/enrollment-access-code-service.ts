import { prisma } from "./db";
import {
  generateUniquePromoCode,
  validatePromoCodeEligibility,
  PromoCodeError,
} from "./promo-code-service";

// ─── Error ───────────────────────────────────────────────────────────────────

export class AccessCodeError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AccessCodeError";
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GeneratedAccessCode {
  code: string;
  promoCodeId: string;
  courseId: number;
  courseTitle: string;
  expiresAt: Date;
  maxUses: number;
}

// ─── Admin: generate a single-use 100% access code ──────────────────────────

export async function generateEnrollmentAccessCode(
  adminId: string,
  courseId: number,
  options: { expiresInDays?: number; maxUses?: number; label?: string } = {},
): Promise<GeneratedAccessCode> {
  const { expiresInDays = 30, maxUses = 1, label } = options;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, published: true },
  });
  if (!course) {
    throw new AccessCodeError("COURSE_NOT_FOUND", 404, "Module introuvable");
  }
  if (!course.published) {
    throw new AccessCodeError("COURSE_NOT_PUBLISHED", 400, "Le module n'est pas publie");
  }

  const code = await generateUniquePromoCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

  const internalName = label
    ? "[Code acces] " + label
    : "[Code acces] " + course.title + " - " + now.toISOString().slice(0, 10);

  const publicDescription = "Code d'acces au module " + course.title;

  const promoCode = await prisma.$transaction(async (tx) => {
    const created = await tx.promoCode.create({
      data: {
        code,
        publicId: code.toLowerCase(),
        internalName,
        publicDescription,
        discountType: "PERCENTAGE",
        discountValue: 100,
        currency: "MAD",
        startsAt: now,
        endsAt: expiresAt,
        administrativeStatus: "ACTIVE",
        appliesToAllModules: false,
        eligibilityScope: "ALL_STUDENTS",
        firstPurchaseOnly: false,
        maxTotalUses: maxUses,
        maxUsesPerUser: 1,
        stackable: false,
        createdByUserId: adminId,
      },
    });

    await tx.promoCodeModule.create({ data: { promoCodeId: created.id, courseId } });
    return created;
  });

  return {
    code: promoCode.code,
    promoCodeId: promoCode.id,
    courseId,
    courseTitle: course.title,
    expiresAt,
    maxUses,
  };
}

// ─── Student: validate that a code grants 100% access ────────────────────────

export async function validateAccessCodeForRedemption(
  userId: string,
  courseId: number,
  code: string,
): Promise<{ code: string; finalAmount: number }> {
  const trimmedCode = code.trim().toUpperCase();
  if (!trimmedCode) {
    throw new AccessCodeError("CODE_REQUIRED", 400, "Veuillez saisir un code d'acces");
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, price: true, published: true },
  });
  if (!course || !course.published) {
    throw new AccessCodeError("COURSE_NOT_FOUND", 404, "Module introuvable");
  }

  let quote: Awaited<ReturnType<typeof validatePromoCodeEligibility>>;
  try {
    quote = await validatePromoCodeEligibility({
      code: trimmedCode,
      userId,
      courseId,
      originalAmount: course.price,
    });
  } catch (err) {
    if (err instanceof PromoCodeError) {
      if (err.code === "PROMO_EXPIRED") {
        throw new AccessCodeError("CODE_EXPIRED", 410, "Ce code d'acces a expire");
      }
      if (err.code === "PROMO_MAX_USES_REACHED" || err.code === "PROMO_USER_MAX_USES_REACHED") {
        throw new AccessCodeError("CODE_ALREADY_USED", 409, "Ce code d'acces a deja ete utilise");
      }
      if (err.code === "PROMO_COURSE_NOT_ELIGIBLE") {
        throw new AccessCodeError("CODE_WRONG_MODULE", 400, "Ce code ne s'applique pas a ce module");
      }
      throw new AccessCodeError("CODE_INVALID", 400, err.message);
    }
    throw err;
  }

  if (quote.finalAmount > 0) {
    throw new AccessCodeError(
      "CODE_NOT_FREE",
      400,
      "Ce code est un code promotionnel, pas un code d'acces. Utilisez le champ Code promo.",
    );
  }

  return { code: trimmedCode, finalAmount: quote.finalAmount };
}
