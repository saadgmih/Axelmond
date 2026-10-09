import { prisma } from "./db";
import { generateUniquePromoCode, validatePromoCodeEligibility, PromoCodeError } from "./promo-code-service";

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
  courseIds: number[];
  courseTitles: string[];
  allModules: boolean;
  singleStudentOnly: boolean;
  expiresAt: Date;
  maxUses: number;
}

export interface AccessCodeTargetInput {
  courseId?: number;
  courseIds?: number[];
  allModules?: boolean;
}

// ─── Admin: generate an access code (single or multi-module, single-student) ──

export async function generateEnrollmentAccessCode(
  adminId: string,
  targetOrCourseId: number | AccessCodeTargetInput,
  options: {
    startsAt?: Date | string;
    endsAt?: Date | string;
    expiresInDays?: number;
    maxUses?: number;
    singleStudentOnly?: boolean;
    label?: string;
  } = {},
): Promise<GeneratedAccessCode> {
  const isTargetObject = typeof targetOrCourseId === "object" && targetOrCourseId !== null;
  const allModules = isTargetObject ? Boolean(targetOrCourseId.allModules) : false;
  let targetCourseIds: number[] = [];

  if (typeof targetOrCourseId === "number") {
    targetCourseIds = [targetOrCourseId];
  } else if (isTargetObject) {
    if (Array.isArray(targetOrCourseId.courseIds) && targetOrCourseId.courseIds.length > 0) {
      targetCourseIds = targetOrCourseId.courseIds.map(Number).filter(Number.isFinite);
    } else if (typeof targetOrCourseId.courseId === "number") {
      targetCourseIds = [targetOrCourseId.courseId];
    }
  }

  if (!allModules && targetCourseIds.length === 0) {
    throw new AccessCodeError("COURSES_REQUIRED", 400, "Veuillez sélectionner au moins un module.");
  }

  const now = new Date();
  const startsAtDate = options.startsAt
    ? options.startsAt instanceof Date
      ? options.startsAt
      : new Date(options.startsAt)
    : now;

  let endsAtDate: Date;
  if (options.endsAt) {
    endsAtDate = options.endsAt instanceof Date ? options.endsAt : new Date(options.endsAt);
  } else {
    const days = options.expiresInDays && options.expiresInDays > 0 ? options.expiresInDays : 30;
    endsAtDate = new Date(startsAtDate.getTime() + days * 24 * 60 * 60 * 1000);
  }

  let courses: Array<{ id: number; title: string }> = [];
  if (allModules) {
    courses = await prisma.course.findMany({
      where: { published: true },
      select: { id: true, title: true },
      orderBy: { id: "asc" },
    });
    if (courses.length === 0) {
      throw new AccessCodeError("NO_COURSES", 400, "Aucun module publié disponible.");
    }
  } else {
    courses = await prisma.course.findMany({
      where: { id: { in: targetCourseIds } },
      select: { id: true, title: true, published: true },
      orderBy: { id: "asc" },
    });
    if (courses.length === 0) {
      throw new AccessCodeError("COURSE_NOT_FOUND", 404, "Module(s) introuvable(s)");
    }
  }

  const singleStudentOnly = options.singleStudentOnly !== false; // Default: true (1 seul étudiant)
  const code = await generateUniquePromoCode();

  // If single student: allow that student to activate each covered module
  const maxUsesCount = singleStudentOnly ? (allModules ? 999 : courses.length) : Number(options.maxUses) || 1;

  const studentTag = singleStudentOnly ? " [1 etudiant]" : "";
  const internalName = options.label
    ? `[Code acces] ${options.label}${studentTag}`
    : allModules
      ? `[Code acces] Tous les modules (${courses.length})${studentTag} - ${startsAtDate.toISOString().slice(0, 10)}`
      : courses.length === 1
        ? `[Code acces] ${courses[0]!.title}${studentTag} - ${startsAtDate.toISOString().slice(0, 10)}`
        : `[Code acces] ${courses.length} modules${studentTag} - ${startsAtDate.toISOString().slice(0, 10)}`;

  const publicDescription = allModules
    ? "Code d'accès exclusif à tous les modules"
    : `Code d'accès aux modules : ${courses.map((c) => c.title).join(", ")}`;

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
        startsAt: startsAtDate,
        endsAt: endsAtDate,
        administrativeStatus: "ACTIVE",
        appliesToAllModules: allModules,
        eligibilityScope: "ALL_STUDENTS",
        firstPurchaseOnly: false,
        maxTotalUses: maxUsesCount,
        maxUsesPerUser: maxUsesCount,
        stackable: false,
        createdByUserId: adminId,
      },
    });

    if (!allModules) {
      await tx.promoCodeModule.createMany({
        data: courses.map((c) => ({
          promoCodeId: created.id,
          courseId: c.id,
        })),
        skipDuplicates: true,
      });
    }

    return created;
  });

  const primaryCourse = courses[0]!;
  return {
    code: promoCode.code,
    promoCodeId: promoCode.id,
    courseId: primaryCourse.id,
    courseTitle: primaryCourse.title,
    courseIds: courses.map((c) => c.id),
    courseTitles: courses.map((c) => c.title),
    allModules,
    singleStudentOnly,
    expiresAt: endsAtDate,
    maxUses: maxUsesCount,
  };
}

// ─── Student: validate that a code grants 100% access ────────────────────────

export async function validateAccessCodeForRedemption(
  userId: string,
  courseId: number,
  code: string,
): Promise<{
  code: string;
  finalAmount: number;
  promoCodeId: string;
  modules: Array<{ id: number; title: string }>;
  isMultiModule: boolean;
  appliesToAllModules: boolean;
  singleStudentOnly: boolean;
}> {
  const trimmedCode = code.trim().toUpperCase();
  if (!trimmedCode) {
    throw new AccessCodeError("CODE_REQUIRED", 400, "Veuillez saisir un code d'accès");
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, price: true, published: true, title: true },
  });
  if (!course || !course.published) {
    throw new AccessCodeError("COURSE_NOT_FOUND", 404, "Module introuvable");
  }

  const promo = await prisma.promoCode.findUnique({
    where: { code: trimmedCode },
    include: {
      modules: { include: { course: { select: { id: true, title: true } } } },
      usages: {
        where: { status: { in: ["RESERVED", "CONFIRMED"] } },
        select: { userId: true, status: true, courseId: true },
      },
    },
  });

  if (!promo) {
    throw new AccessCodeError("CODE_NOT_FOUND", 404, "Code d'accès introuvable");
  }

  // ── Règle "Un seul étudiant" : Si le code a déjà été utilisé par un autre étudiant, le rejeter
  const isAccessCode = promo.internalName.startsWith("[Code acces]");
  const otherUsersUsages = promo.usages.filter((u) => u.userId !== userId);
  if (isAccessCode && otherUsersUsages.length > 0) {
    throw new AccessCodeError(
      "CODE_ALREADY_USED",
      409,
      "Ce code d'accès est strictement réservé à un seul étudiant et a déjà été activé par un autre compte.",
    );
  }

  // Vérifier si le module fait partie des modules autorisés
  const isEligibleCourse = promo.appliesToAllModules || promo.modules.some((m) => m.courseId === courseId);
  if (!isEligibleCourse) {
    throw new AccessCodeError("CODE_WRONG_MODULE", 400, "Ce code ne s'applique pas à ce module.");
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
        throw new AccessCodeError("CODE_EXPIRED", 410, "Ce code d'accès a expiré");
      }
      if (err.code === "PROMO_MAX_USES_REACHED" || err.code === "PROMO_USER_MAX_USES_REACHED") {
        throw new AccessCodeError("CODE_ALREADY_USED", 409, "Ce code d'accès a déjà été utilisé");
      }
      if (err.code === "PROMO_COURSE_NOT_ELIGIBLE" || err.code === "PROMO_NOT_APPLICABLE") {
        throw new AccessCodeError("CODE_WRONG_MODULE", 400, "Ce code ne s'applique pas à ce module");
      }
      throw new AccessCodeError("CODE_INVALID", 400, err.message);
    }
    throw err;
  }

  if (quote.finalAmount > 0) {
    throw new AccessCodeError(
      "CODE_NOT_FREE",
      400,
      "Ce code est un code promotionnel, pas un code d'accès. Utilisez le champ Code promo.",
    );
  }

  const moduleList = promo.appliesToAllModules
    ? []
    : promo.modules.map((m) => ({ id: m.course.id, title: m.course.title }));

  return {
    code: trimmedCode,
    finalAmount: quote.finalAmount,
    promoCodeId: promo.id,
    modules: moduleList,
    isMultiModule: promo.appliesToAllModules || moduleList.length > 1,
    appliesToAllModules: promo.appliesToAllModules,
    singleStudentOnly: isAccessCode,
  };
}
