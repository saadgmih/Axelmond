import { Prisma, type PromoAdministrativeStatus, type PromoUsageProvider } from "@prisma/client";
import { prisma } from "./db";
import {
  addCalendarDurationInTimeZone,
  assertValidPromoCodeFormat,
  calculatePromoDiscount,
  formatRemainingDuration,
  generatePromoPublicId,
  generatePromoUsageReference,
  generateSecurePromoCode,
  normalizeCalendarDuration,
  normalizePromoCodeInput,
  parseDateTimeInTimeZone,
  PROMO_CURRENCY,
  resolvePromoEffectiveStatus,
  type CalendarDuration,
} from "./promo-code-domain";

type Tx = Prisma.TransactionClient;

export class PromoCodeError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "PromoCodeError";
  }
}

export const PROMO_PUBLIC_ERRORS: Record<string, string> = {
  PROMO_NOT_FOUND: "Ce code promotionnel n’existe pas.",
  PROMO_NOT_STARTED: "Ce code n’est pas encore actif.",
  PROMO_EXPIRED: "Ce code a expiré.",
  PROMO_DISABLED: "Ce code a été désactivé.",
  PROMO_NOT_APPLICABLE: "Ce code ne s’applique pas à ce module.",
  PROMO_ALREADY_USED: "Vous avez déjà utilisé ce code.",
  PROMO_TOTAL_LIMIT_REACHED: "La limite d’utilisation de ce code a été atteinte.",
  PROMO_MINIMUM_NOT_REACHED: "Le montant minimum requis n’est pas atteint.",
  PROMO_USER_NOT_ELIGIBLE: "Ce code est réservé à certains utilisateurs.",
};

const promoInclude = {
  createdBy: { select: { id: true, fullName: true, email: true } },
  modules: { include: { course: { select: { id: true, title: true, price: true } } } },
  eligibleUsers: { include: { user: { select: { id: true, fullName: true, email: true, filiere: true } } } },
  eligibleFilieres: true,
} as const;

type PromoRecord = Prisma.PromoCodeGetPayload<{ include: typeof promoInclude }>;

function cleanText(value: unknown, maxLength: number): string | null {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, maxLength) : null;
}

function positiveOptionalInt(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0 || number > 1_000_000) {
    throw new PromoCodeError("PROMO_INPUT_INVALID", 400, `${field} doit être un entier strictement positif.`);
  }
  return number;
}

function optionalMoney(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 100_000_000) {
    throw new PromoCodeError("PROMO_INPUT_INVALID", 400, `${field} doit être strictement positif.`);
  }
  return Math.round(number * 100) / 100;
}

function parseDate(value: unknown, field: string): Date {
  try {
    const raw = String(value ?? "").trim();
    const date =
      value instanceof Date
        ? new Date(value)
        : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(raw)
          ? parseDateTimeInTimeZone(raw)
          : new Date(raw);
    if (!Number.isFinite(date.getTime())) throw new Error("PROMO_DATE_INVALID");
    return date;
  } catch {
    throw new PromoCodeError("PROMO_INPUT_INVALID", 400, `${field} invalide.`);
  }
}

export function resolvePromoDates(input: {
  startsAt: unknown;
  endsAt?: unknown;
  duration?: Partial<CalendarDuration> | null;
}) {
  const startsAt = parseDate(input.startsAt, "Date de début");
  let endsAt: Date;
  let relativeDuration: CalendarDuration | null = null;
  if (input.duration) {
    try {
      relativeDuration = normalizeCalendarDuration(input.duration);
      endsAt = addCalendarDurationInTimeZone(startsAt, relativeDuration);
    } catch {
      throw new PromoCodeError("PROMO_DURATION_INVALID", 400, "La durée relative est invalide.");
    }
  } else {
    endsAt = parseDate(input.endsAt, "Date de fin");
  }
  if (!Number.isFinite(endsAt.getTime())) {
    throw new PromoCodeError("PROMO_DURATION_INVALID", 400, "La durée relative dépasse les limites autorisées.");
  }
  if (endsAt <= startsAt) {
    throw new PromoCodeError("PROMO_DATES_INVALID", 400, "La date de fin doit être postérieure à la date de début.");
  }
  return { startsAt, endsAt, relativeDuration };
}

function normalizeDiscount(input: { discountType: unknown; discountValue: unknown; maximumDiscountAmount?: unknown }) {
  const discountType = String(input.discountType || "").toUpperCase();
  if (discountType !== "PERCENTAGE" && discountType !== "FIXED") {
    throw new PromoCodeError("PROMO_DISCOUNT_INVALID", 400, "Type de réduction invalide.");
  }
  const discountValue = Number(input.discountValue);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw new PromoCodeError("PROMO_DISCOUNT_INVALID", 400, "La réduction doit être strictement positive.");
  }
  if (discountType === "PERCENTAGE" && discountValue > 100) {
    throw new PromoCodeError(
      "PROMO_PERCENTAGE_TOO_HIGH",
      400,
      "La réduction en pourcentage ne peut pas dépasser 100 %.",
    );
  }
  const maximumDiscountAmount = optionalMoney(input.maximumDiscountAmount, "La réduction maximale");
  return {
    discountType: discountType as "PERCENTAGE" | "FIXED",
    discountValue: Math.round(discountValue * 100) / 100,
    maximumDiscountAmount: discountType === "PERCENTAGE" ? maximumDiscountAmount : null,
  };
}

function normalizeStatus(value: unknown): PromoAdministrativeStatus {
  const status = String(value || "DRAFT").toUpperCase() as PromoAdministrativeStatus;
  if (!["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "EXPIRED", "DISABLED", "ARCHIVED"].includes(status)) {
    throw new PromoCodeError("PROMO_STATUS_INVALID", 400, "Statut promotionnel invalide.");
  }
  return status;
}

function normalizeEligibilityScope(value: unknown) {
  const scope = String(value || "ALL_STUDENTS").toUpperCase();
  if (!["ALL_STUDENTS", "NEW_STUDENTS", "EXISTING_STUDENTS", "SELECTED_USERS", "SELECTED_FILIERES"].includes(scope)) {
    throw new PromoCodeError("PROMO_ELIGIBILITY_INVALID", 400, "Critère d’éligibilité invalide.");
  }
  return scope as "ALL_STUDENTS" | "NEW_STUDENTS" | "EXISTING_STUDENTS" | "SELECTED_USERS" | "SELECTED_FILIERES";
}

function normalizeIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))].slice(0, 1000);
}

function normalizeCourseIds(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(Number).filter((value) => Number.isInteger(value) && value > 0))].slice(0, 1000);
}

function normalizeFilieres(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => String(value).trim().toLocaleLowerCase("fr")).filter(Boolean))].slice(
    0,
    500,
  );
}

function serializeMoney(value: Prisma.Decimal | number | null | undefined) {
  return value == null ? null : Number(value);
}

function serializePromo(record: PromoRecord) {
  const effectiveStatus = resolvePromoEffectiveStatus({
    administrativeStatus: record.administrativeStatus,
    startsAt: record.startsAt,
    endsAt: record.endsAt,
    maxTotalUses: record.maxTotalUses,
    totalConfirmedUses: record.totalConfirmedUses,
    totalReservedUses: record.totalReservedUses,
  });
  return {
    id: record.publicId,
    code: record.code,
    internalName: record.internalName,
    publicDescription: record.publicDescription,
    internalDescription: record.internalDescription,
    discountType: record.discountType,
    discountValue: serializeMoney(record.discountValue),
    maximumDiscountAmount: serializeMoney(record.maximumDiscountAmount),
    minimumPurchaseAmount: serializeMoney(record.minimumPurchaseAmount),
    currency: record.currency,
    startsAt: record.startsAt.toISOString(),
    endsAt: record.endsAt.toISOString(),
    relativeDuration: record.relativeDuration,
    administrativeStatus: record.administrativeStatus,
    effectiveStatus,
    remainingDuration: formatRemainingDuration(record.endsAt),
    appliesToAllModules: record.appliesToAllModules,
    eligibilityScope: record.eligibilityScope,
    firstPurchaseOnly: record.firstPurchaseOnly,
    maxTotalUses: record.maxTotalUses,
    maxUsesPerUser: record.maxUsesPerUser,
    totalReservedUses: record.totalReservedUses,
    totalConfirmedUses: record.totalConfirmedUses,
    stackable: record.stackable,
    priority: record.priority,
    version: record.version,
    modules: record.modules.map(({ course }) => course),
    eligibleUsers: record.eligibleUsers.map(({ user }) => user),
    eligibleFilieres: record.eligibleFilieres.map(({ filiere }) => filiere),
    createdBy: record.createdBy,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    disabledAt: record.disabledAt?.toISOString() || null,
    archivedAt: record.archivedAt?.toISOString() || null,
  };
}

function promoAuditSnapshot(record: PromoRecord): Prisma.InputJsonObject {
  const serialized = serializePromo(record);
  return {
    code: serialized.code,
    internalName: serialized.internalName,
    discountType: serialized.discountType,
    discountValue: serialized.discountValue,
    maximumDiscountAmount: serialized.maximumDiscountAmount,
    minimumPurchaseAmount: serialized.minimumPurchaseAmount,
    startsAt: serialized.startsAt,
    endsAt: serialized.endsAt,
    administrativeStatus: serialized.administrativeStatus,
    appliesToAllModules: serialized.appliesToAllModules,
    moduleIds: serialized.modules.map((course) => course.id),
    eligibilityScope: serialized.eligibilityScope,
    eligibleUserIds: serialized.eligibleUsers.map((user) => user.id),
    eligibleFilieres: serialized.eligibleFilieres,
    maxTotalUses: serialized.maxTotalUses,
    maxUsesPerUser: serialized.maxUsesPerUser,
    firstPurchaseOnly: serialized.firstPurchaseOnly,
    version: serialized.version,
  } as Prisma.InputJsonObject;
}

async function findPromoByPublicId(tx: Tx | typeof prisma, publicId: string) {
  return tx.promoCode.findUnique({ where: { publicId }, include: promoInclude });
}

async function lockPromo(tx: Tx, promoCodeId: string) {
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "AxelmondResearchLab"."PromoCode" WHERE "id" = ${promoCodeId} FOR UPDATE`,
  );
}

function effectiveError(record: PromoRecord, now: Date): PromoCodeError | null {
  if (["DISABLED", "ARCHIVED"].includes(record.administrativeStatus)) {
    return new PromoCodeError("PROMO_DISABLED", 409, PROMO_PUBLIC_ERRORS.PROMO_DISABLED);
  }
  if (["DRAFT", "PAUSED"].includes(record.administrativeStatus)) {
    return new PromoCodeError("PROMO_DISABLED", 409, PROMO_PUBLIC_ERRORS.PROMO_DISABLED);
  }
  if (now < record.startsAt) return new PromoCodeError("PROMO_NOT_STARTED", 409, PROMO_PUBLIC_ERRORS.PROMO_NOT_STARTED);
  if (now >= record.endsAt || record.administrativeStatus === "EXPIRED") {
    return new PromoCodeError("PROMO_EXPIRED", 409, PROMO_PUBLIC_ERRORS.PROMO_EXPIRED);
  }
  return null;
}

async function assertPromoEligibility(
  tx: Tx,
  record: PromoRecord,
  input: { userId: string; courseId: number; originalAmount: number; now: Date; includeExistingReservation?: boolean },
) {
  const effective = effectiveError(record, input.now);
  if (effective) throw effective;
  if (!Number.isFinite(input.originalAmount) || input.originalAmount <= 0) {
    throw new PromoCodeError("PROMO_NOT_APPLICABLE", 409, PROMO_PUBLIC_ERRORS.PROMO_NOT_APPLICABLE);
  }
  if (!record.appliesToAllModules && !record.modules.some((entry) => entry.courseId === input.courseId)) {
    throw new PromoCodeError("PROMO_NOT_APPLICABLE", 409, PROMO_PUBLIC_ERRORS.PROMO_NOT_APPLICABLE);
  }
  const minimum = serializeMoney(record.minimumPurchaseAmount);
  if (minimum != null && input.originalAmount < minimum) {
    throw new PromoCodeError("PROMO_MINIMUM_NOT_REACHED", 409, PROMO_PUBLIC_ERRORS.PROMO_MINIMUM_NOT_REACHED);
  }
  const user = await tx.user.findUnique({ where: { id: input.userId }, select: { filiere: true, role: true } });
  if (!user || user.role !== "STUDENT") {
    throw new PromoCodeError("PROMO_USER_NOT_ELIGIBLE", 403, PROMO_PUBLIC_ERRORS.PROMO_USER_NOT_ELIGIBLE);
  }
  const priorPayments = await tx.payment.count({ where: { userId: input.userId, status: "COMPLETED" } });
  if (record.firstPurchaseOnly && priorPayments > 0) {
    throw new PromoCodeError("PROMO_ALREADY_USED", 409, PROMO_PUBLIC_ERRORS.PROMO_ALREADY_USED);
  }
  if (record.eligibilityScope === "NEW_STUDENTS" && priorPayments > 0) {
    throw new PromoCodeError("PROMO_USER_NOT_ELIGIBLE", 403, PROMO_PUBLIC_ERRORS.PROMO_USER_NOT_ELIGIBLE);
  }
  if (record.eligibilityScope === "EXISTING_STUDENTS" && priorPayments === 0) {
    throw new PromoCodeError("PROMO_USER_NOT_ELIGIBLE", 403, PROMO_PUBLIC_ERRORS.PROMO_USER_NOT_ELIGIBLE);
  }
  if (
    record.eligibilityScope === "SELECTED_USERS" &&
    !record.eligibleUsers.some((entry) => entry.userId === input.userId)
  ) {
    throw new PromoCodeError("PROMO_USER_NOT_ELIGIBLE", 403, PROMO_PUBLIC_ERRORS.PROMO_USER_NOT_ELIGIBLE);
  }
  if (
    record.eligibilityScope === "SELECTED_FILIERES" &&
    !record.eligibleFilieres.some(
      (entry) =>
        entry.filiere ===
        String(user.filiere || "")
          .trim()
          .toLocaleLowerCase("fr"),
    )
  ) {
    throw new PromoCodeError("PROMO_USER_NOT_ELIGIBLE", 403, PROMO_PUBLIC_ERRORS.PROMO_USER_NOT_ELIGIBLE);
  }

  const statuses = ["RESERVED", "CONFIRMED"] as const;
  const usedByUser = await tx.promoCodeUsage.count({
    where: { promoCodeId: record.id, userId: input.userId, status: { in: [...statuses] } },
  });
  const allowedUsedByUser = input.includeExistingReservation ? Math.max(0, usedByUser - 1) : usedByUser;
  if (record.maxUsesPerUser != null && allowedUsedByUser >= record.maxUsesPerUser) {
    throw new PromoCodeError("PROMO_ALREADY_USED", 409, PROMO_PUBLIC_ERRORS.PROMO_ALREADY_USED);
  }
  const reservedOffset = input.includeExistingReservation ? 1 : 0;
  if (
    record.maxTotalUses != null &&
    record.totalConfirmedUses + Math.max(0, record.totalReservedUses - reservedOffset) >= record.maxTotalUses
  ) {
    throw new PromoCodeError("PROMO_TOTAL_LIMIT_REACHED", 409, PROMO_PUBLIC_ERRORS.PROMO_TOTAL_LIMIT_REACHED);
  }
}

function buildQuote(record: PromoRecord, originalAmount: number) {
  return calculatePromoDiscount({
    originalAmount,
    discountType: record.discountType,
    discountValue: Number(record.discountValue),
    maximumDiscountAmount: serializeMoney(record.maximumDiscountAmount),
    currency: record.currency,
  });
}

export async function releaseExpiredPromoReservations(now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const expired = await tx.promoCodeUsage.findMany({
      where: { status: "RESERVED", expiresAt: { lte: now } },
      select: { id: true, promoCodeId: true },
      orderBy: [{ promoCodeId: "asc" }, { expiresAt: "asc" }],
      take: 100,
    });
    let released = 0;
    const byPromo = new Map<string, string[]>();
    expired.forEach((usage) => byPromo.set(usage.promoCodeId, [...(byPromo.get(usage.promoCodeId) || []), usage.id]));
    for (const [promoCodeId, usageIds] of byPromo) {
      await lockPromo(tx, promoCodeId);
      const claimed = await tx.promoCodeUsage.updateMany({
        where: { id: { in: usageIds }, status: "RESERVED", expiresAt: { lte: now } },
        data: { status: "RELEASED", releasedAt: now },
      });
      if (claimed.count === 0) continue;
      await tx.promoCode.update({
        where: { id: promoCodeId },
        data: { totalReservedUses: { decrement: claimed.count } },
      });
      released += claimed.count;
    }
    return released;
  });
}

export async function validatePromoCodeEligibility(input: {
  code: string;
  userId: string;
  courseId: number;
  originalAmount: number;
  now?: Date;
}) {
  await releaseExpiredPromoReservations(input.now);
  const code = normalizePromoCodeInput(input.code);
  if (!code) throw new PromoCodeError("PROMO_NOT_FOUND", 404, PROMO_PUBLIC_ERRORS.PROMO_NOT_FOUND);
  return prisma.$transaction(async (tx) => {
    const record = await tx.promoCode.findUnique({ where: { code }, include: promoInclude });
    if (!record) throw new PromoCodeError("PROMO_NOT_FOUND", 404, PROMO_PUBLIC_ERRORS.PROMO_NOT_FOUND);
    await assertPromoEligibility(tx, record, { ...input, now: input.now || new Date() });
    return {
      promoCodeId: record.publicId,
      code: record.code,
      description: record.publicDescription,
      discountType: record.discountType,
      discountValue: Number(record.discountValue),
      maximumDiscountAmount: serializeMoney(record.maximumDiscountAmount),
      ...buildQuote(record, input.originalAmount),
      validUntil: record.endsAt.toISOString(),
      provisional: true,
    };
  });
}

export async function reservePromoCodeUsageInTransaction(
  tx: Tx,
  input: {
    code: string;
    userId: string;
    courseId: number;
    originalAmount: number;
    provider: PromoUsageProvider;
    expiresAt: Date;
    externalReference?: string;
  },
) {
  const code = normalizePromoCodeInput(input.code);
  if (!code) return null;
  const initial = await tx.promoCode.findUnique({ where: { code }, select: { id: true } });
  if (!initial) throw new PromoCodeError("PROMO_NOT_FOUND", 404, PROMO_PUBLIC_ERRORS.PROMO_NOT_FOUND);
  await lockPromo(tx, initial.id);
  const record = await tx.promoCode.findUniqueOrThrow({ where: { id: initial.id }, include: promoInclude });
  await assertPromoEligibility(tx, record, { ...input, now: new Date() });
  const quote = buildQuote(record, input.originalAmount);
  const usage = await tx.promoCodeUsage.create({
    data: {
      publicReference: generatePromoUsageReference(),
      promoCodeId: record.id,
      userId: input.userId,
      courseId: input.courseId,
      provider: input.provider,
      externalReference: input.externalReference,
      promoCodeSnapshot: record.code,
      discountTypeSnapshot: record.discountType,
      discountValueSnapshot: record.discountValue,
      maximumDiscountSnapshot: record.maximumDiscountAmount,
      originalPriceSnapshot: quote.originalAmount,
      discountAmountSnapshot: quote.discountAmount,
      finalPriceSnapshot: quote.finalAmount,
      currencySnapshot: record.currency,
      promoVersionSnapshot: record.version,
      expiresAt: input.expiresAt,
    },
  });
  await tx.promoCode.update({ where: { id: record.id }, data: { totalReservedUses: { increment: 1 } } });
  return { usage, quote, promo: record };
}

export async function reservePromoCodeUsage(input: Parameters<typeof reservePromoCodeUsageInTransaction>[1]) {
  await releaseExpiredPromoReservations();
  return prisma.$transaction((tx) => reservePromoCodeUsageInTransaction(tx, input));
}

export async function attachPromoReservationExternalReference(usageId: string, externalReference: string) {
  return prisma.promoCodeUsage.updateMany({
    where: { id: usageId, status: "RESERVED", externalReference: null },
    data: { externalReference },
  });
}

export async function releasePromoCodeReservationByExternalReference(externalReference: string, cancelled = false) {
  return prisma.$transaction(async (tx) => {
    const usage = await tx.promoCodeUsage.findUnique({ where: { externalReference } });
    if (!usage || usage.status !== "RESERVED") return { released: false };
    await lockPromo(tx, usage.promoCodeId);
    const claimed = await tx.promoCodeUsage.updateMany({
      where: { id: usage.id, status: "RESERVED" },
      data: { status: cancelled ? "CANCELLED" : "RELEASED", releasedAt: new Date() },
    });
    if (claimed.count !== 1) return { released: false };
    await tx.promoCode.update({ where: { id: usage.promoCodeId }, data: { totalReservedUses: { decrement: 1 } } });
    return { released: true, usageId: usage.id };
  });
}

export async function releasePromoCodeReservationInTransaction(tx: Tx, usageId: string, cancelled = false) {
  const usage = await tx.promoCodeUsage.findUnique({ where: { id: usageId } });
  if (!usage || usage.status !== "RESERVED") return { released: false };
  await lockPromo(tx, usage.promoCodeId);
  const claimed = await tx.promoCodeUsage.updateMany({
    where: { id: usage.id, status: "RESERVED" },
    data: { status: cancelled ? "CANCELLED" : "RELEASED", releasedAt: new Date() },
  });
  if (claimed.count !== 1) return { released: false };
  await tx.promoCode.update({ where: { id: usage.promoCodeId }, data: { totalReservedUses: { decrement: 1 } } });
  return { released: true };
}

export async function releasePromoCodeReservationById(usageId: string, cancelled = false) {
  return prisma.$transaction((tx) => releasePromoCodeReservationInTransaction(tx, usageId, cancelled));
}

export async function assertPayPalPromoReservationUsable(orderId: string) {
  const usage = await prisma.promoCodeUsage.findUnique({
    where: { externalReference: orderId },
    include: { promoCode: true },
  });
  if (!usage) return null;
  if (usage.status !== "RESERVED" || (usage.expiresAt && usage.expiresAt <= new Date())) {
    throw new PromoCodeError("PROMO_EXPIRED", 409, PROMO_PUBLIC_ERRORS.PROMO_EXPIRED);
  }
  const error = effectiveError(usage.promoCode as unknown as PromoRecord, new Date());
  if (error) throw error;
  return usage;
}

export async function confirmPromoCodeUsageInTransaction(
  tx: Tx,
  input: {
    usageId: string;
    paymentId?: string;
    centerPaymentRequestId?: string;
    idempotencyKey: string;
    allowInactiveReservedPromo?: boolean;
  },
) {
  let usage = await tx.promoCodeUsage.findUnique({ where: { id: input.usageId } });
  if (!usage) throw new PromoCodeError("PROMO_RESERVATION_NOT_FOUND", 409, "Réservation promotionnelle introuvable.");
  await lockPromo(tx, usage.promoCodeId);
  usage = await tx.promoCodeUsage.findUniqueOrThrow({ where: { id: usage.id } });
  if (usage.status === "CONFIRMED") return { usage, idempotent: true };
  if (usage.status !== "RESERVED") {
    throw new PromoCodeError(
      "PROMO_RESERVATION_INVALID",
      409,
      "Cette réservation promotionnelle n’est plus disponible.",
    );
  }
  if (usage.expiresAt && usage.expiresAt <= new Date()) {
    throw new PromoCodeError("PROMO_EXPIRED", 409, PROMO_PUBLIC_ERRORS.PROMO_EXPIRED);
  }
  if (!input.allowInactiveReservedPromo) {
    const promo = await tx.promoCode.findUniqueOrThrow({ where: { id: usage.promoCodeId }, include: promoInclude });
    const error = effectiveError(promo, new Date());
    if (error) throw error;
  }
  const claimed = await tx.promoCodeUsage.updateMany({
    where: { id: usage.id, status: "RESERVED" },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      idempotencyKey: input.idempotencyKey,
      paymentId: input.paymentId,
      centerPaymentRequestId: input.centerPaymentRequestId,
    },
  });
  if (claimed.count !== 1)
    throw new PromoCodeError("PROMO_CONFIRM_CONFLICT", 409, "La promotion a déjà été confirmée.");
  await tx.promoCode.update({
    where: { id: usage.promoCodeId },
    data: { totalReservedUses: { decrement: 1 }, totalConfirmedUses: { increment: 1 } },
  });
  return { usage: await tx.promoCodeUsage.findUniqueOrThrow({ where: { id: usage.id } }), idempotent: false };
}

export async function createPromoCode(adminId: string, input: any) {
  let code: string;
  try {
    code = assertValidPromoCodeFormat(input.code);
  } catch {
    throw new PromoCodeError(
      "PROMO_CODE_FORMAT_INVALID",
      400,
      "Le code doit contenir 4 à 32 caractères : lettres, chiffres et tirets internes uniquement.",
    );
  }
  const internalName = cleanText(input.internalName, 160);
  if (!internalName) throw new PromoCodeError("PROMO_NAME_REQUIRED", 400, "Le nom interne est requis.");
  const discount = normalizeDiscount(input);
  const dates = resolvePromoDates(input);
  const appliesToAllModules = Boolean(input.appliesToAllModules);
  const courseIds = normalizeCourseIds(input.courseIds);
  if (!appliesToAllModules && courseIds.length === 0) {
    throw new PromoCodeError("PROMO_MODULE_REQUIRED", 400, "Sélectionnez au moins un module.");
  }
  const eligibilityScope = normalizeEligibilityScope(input.eligibilityScope);
  const eligibleUserIds = normalizeIds(input.eligibleUserIds);
  const eligibleFilieres = normalizeFilieres(input.eligibleFilieres);
  if (eligibilityScope === "SELECTED_USERS" && eligibleUserIds.length === 0) {
    throw new PromoCodeError("PROMO_USER_REQUIRED", 400, "Sélectionnez au moins un étudiant.");
  }
  if (eligibilityScope === "SELECTED_FILIERES" && eligibleFilieres.length === 0) {
    throw new PromoCodeError("PROMO_FILIERE_REQUIRED", 400, "Sélectionnez au moins une filière.");
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.promoCode.create({
        data: {
          publicId: generatePromoPublicId(),
          code,
          internalName,
          publicDescription: cleanText(input.publicDescription, 600),
          internalDescription: cleanText(input.internalDescription, 2000),
          ...discount,
          minimumPurchaseAmount: optionalMoney(input.minimumPurchaseAmount, "Le montant minimum"),
          currency: PROMO_CURRENCY,
          startsAt: dates.startsAt,
          endsAt: dates.endsAt,
          relativeDuration: dates.relativeDuration ?? Prisma.JsonNull,
          administrativeStatus: normalizeStatus(input.administrativeStatus),
          appliesToAllModules,
          eligibilityScope,
          firstPurchaseOnly: Boolean(input.firstPurchaseOnly),
          maxTotalUses: positiveOptionalInt(input.maxTotalUses, "La limite globale"),
          maxUsesPerUser: positiveOptionalInt(input.maxUsesPerUser, "La limite par utilisateur"),
          stackable: false,
          priority: Number.isInteger(Number(input.priority)) ? Number(input.priority) : 0,
          createdByUserId: adminId,
          modules: appliesToAllModules ? undefined : { create: courseIds.map((courseId) => ({ courseId })) },
          eligibleUsers:
            eligibilityScope === "SELECTED_USERS"
              ? { create: eligibleUserIds.map((userId) => ({ userId })) }
              : undefined,
          eligibleFilieres:
            eligibilityScope === "SELECTED_FILIERES"
              ? { create: eligibleFilieres.map((filiere) => ({ filiere })) }
              : undefined,
        },
      });
      const record = await findPromoByPublicId(tx, created.publicId);
      if (!record) throw new Error("PROMO_CREATE_FAILED");
      await tx.promoCodeAuditLog.create({
        data: {
          promoCodeId: record.id,
          action: "CREATED",
          actorUserId: adminId,
          newValues: promoAuditSnapshot(record),
        },
      });
      return serializePromo(record);
    });
  } catch (error: any) {
    if (error?.code === "P2002") throw new PromoCodeError("PROMO_CODE_DUPLICATE", 409, "Ce code existe déjà.");
    throw error;
  }
}

export async function generateUniquePromoCode() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateSecurePromoCode();
    if (!(await prisma.promoCode.findUnique({ where: { code }, select: { id: true } }))) return code;
  }
  throw new PromoCodeError("PROMO_GENERATION_FAILED", 503, "Impossible de générer un code unique.");
}

export async function listPromoCodes(filters: {
  q?: string;
  status?: string;
  discountType?: string;
  courseId?: number;
  creatorId?: string;
  usage?: "USED" | "UNUSED";
  startsFrom?: Date;
  endsBefore?: Date;
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
}) {
  await releaseExpiredPromoReservations();
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const q = cleanText(filters.q, 100);
  const where: Prisma.PromoCodeWhereInput = {
    ...(!filters.includeArchived ? { administrativeStatus: { not: "ARCHIVED" } } : {}),
    ...(filters.status ? { administrativeStatus: normalizeStatus(filters.status) } : {}),
    ...(filters.discountType === "PERCENTAGE" || filters.discountType === "FIXED"
      ? { discountType: filters.discountType }
      : {}),
    ...(filters.courseId
      ? { OR: [{ appliesToAllModules: true }, { modules: { some: { courseId: filters.courseId } } }] }
      : {}),
    ...(filters.creatorId ? { createdByUserId: filters.creatorId } : {}),
    ...(filters.usage === "USED" ? { totalConfirmedUses: { gt: 0 } } : {}),
    ...(filters.usage === "UNUSED" ? { totalConfirmedUses: 0, totalReservedUses: 0 } : {}),
    ...(filters.startsFrom ? { startsAt: { gte: filters.startsFrom } } : {}),
    ...(filters.endsBefore ? { endsAt: { lte: filters.endsBefore } } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { internalName: { contains: q, mode: "insensitive" } },
            { publicDescription: { contains: q, mode: "insensitive" } },
            { internalDescription: { contains: q, mode: "insensitive" } },
            { modules: { some: { course: { title: { contains: q, mode: "insensitive" } } } } },
          ],
        }
      : {}),
  };
  const [total, records] = await prisma.$transaction([
    prisma.promoCode.count({ where }),
    prisma.promoCode.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: promoInclude,
    }),
  ]);
  return {
    items: records.map(serializePromo),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPromoCodeDetails(publicId: string) {
  await releaseExpiredPromoReservations();
  const record = await prisma.promoCode.findUnique({ where: { publicId }, include: promoInclude });
  if (!record) throw new PromoCodeError("PROMO_NOT_FOUND", 404, "Code promotionnel introuvable.");
  const [statistics, auditLog, usages] = await Promise.all([
    getPromoCodeStatistics(publicId),
    prisma.promoCodeAuditLog.findMany({
      where: { promoCodeId: record.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { actor: { select: { id: true, fullName: true, email: true } } },
    }),
    prisma.promoCodeUsage.findMany({
      where: { promoCodeId: record.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    }),
  ]);
  return {
    ...serializePromo(record),
    statistics,
    auditLog: auditLog.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })),
    usages: usages.map((usage) => ({
      id: usage.publicReference,
      status: usage.status,
      provider: usage.provider,
      user: usage.user,
      module: usage.course,
      originalAmount: Number(usage.originalPriceSnapshot),
      discountAmount: Number(usage.discountAmountSnapshot),
      finalAmount: Number(usage.finalPriceSnapshot),
      currency: usage.currencySnapshot,
      reservedAt: usage.reservedAt.toISOString(),
      confirmedAt: usage.confirmedAt?.toISOString() || null,
      releasedAt: usage.releasedAt?.toISOString() || null,
      expiresAt: usage.expiresAt?.toISOString() || null,
    })),
  };
}

export async function getPromoCodeStatistics(publicId: string) {
  const promo = await prisma.promoCode.findUnique({ where: { publicId }, select: { id: true } });
  if (!promo) throw new PromoCodeError("PROMO_NOT_FOUND", 404, "Code promotionnel introuvable.");
  const usages = await prisma.promoCodeUsage.findMany({
    where: { promoCodeId: promo.id },
    select: {
      status: true,
      provider: true,
      originalPriceSnapshot: true,
      discountAmountSnapshot: true,
      finalPriceSnapshot: true,
      courseId: true,
      course: { select: { title: true } },
    },
  });
  const confirmed = usages.filter((usage) => usage.status === "CONFIRMED");
  const modules = new Map<number, { id: number; title: string; uses: number }>();
  confirmed.forEach((usage) => {
    const item = modules.get(usage.courseId) || { id: usage.courseId, title: usage.course.title, uses: 0 };
    item.uses += 1;
    modules.set(usage.courseId, item);
  });
  return {
    confirmedUses: confirmed.length,
    activeReservations: usages.filter((usage) => usage.status === "RESERVED").length,
    cancelledOrReleased: usages.filter((usage) => ["CANCELLED", "RELEASED"].includes(usage.status)).length,
    cancelledUses: usages.filter((usage) => usage.status === "CANCELLED").length,
    releasedUses: usages.filter((usage) => usage.status === "RELEASED").length,
    refundedUses: usages.filter((usage) => usage.status === "REFUNDED").length,
    totalOriginalAmount: confirmed.reduce((sum, usage) => sum + Number(usage.originalPriceSnapshot), 0),
    totalDiscountAmount: confirmed.reduce((sum, usage) => sum + Number(usage.discountAmountSnapshot), 0),
    totalPaidAmount: confirmed.reduce((sum, usage) => sum + Number(usage.finalPriceSnapshot), 0),
    paypalUses: confirmed.filter((usage) => usage.provider === "PAYPAL").length,
    centerUses: confirmed.filter((usage) => usage.provider === "CENTER").length,
    freeUses: confirmed.filter((usage) => usage.provider === "FREE").length,
    topModules: [...modules.values()].sort((a, b) => b.uses - a.uses).slice(0, 10),
  };
}

export async function updatePromoCode(adminId: string, publicId: string, input: any) {
  return prisma.$transaction(async (tx) => {
    const existing = await findPromoByPublicId(tx, publicId);
    if (!existing) throw new PromoCodeError("PROMO_NOT_FOUND", 404, "Code promotionnel introuvable.");
    await lockPromo(tx, existing.id);
    const current = await findPromoByPublicId(tx, publicId);
    if (!current) throw new PromoCodeError("PROMO_NOT_FOUND", 404, "Code promotionnel introuvable.");
    if (input.version != null && Number(input.version) !== current.version) {
      throw new PromoCodeError("PROMO_CONCURRENT_UPDATE", 409, "Ce code a été modifié par un autre administrateur.");
    }
    const discount = normalizeDiscount({
      discountType: input.discountType ?? current.discountType,
      discountValue: input.discountValue ?? Number(current.discountValue),
      maximumDiscountAmount:
        input.maximumDiscountAmount === undefined
          ? serializeMoney(current.maximumDiscountAmount)
          : input.maximumDiscountAmount,
    });
    const dates =
      input.startsAt !== undefined || input.endsAt !== undefined || input.duration
        ? resolvePromoDates({
            startsAt: input.startsAt ?? current.startsAt,
            endsAt: input.endsAt ?? current.endsAt,
            duration: input.duration,
          })
        : { startsAt: current.startsAt, endsAt: current.endsAt, relativeDuration: current.relativeDuration as any };
    const appliesToAllModules = input.appliesToAllModules ?? current.appliesToAllModules;
    const courseIds =
      input.courseIds === undefined
        ? current.modules.map((entry) => entry.courseId)
        : normalizeCourseIds(input.courseIds);
    if (!appliesToAllModules && courseIds.length === 0) {
      throw new PromoCodeError("PROMO_MODULE_REQUIRED", 400, "Sélectionnez au moins un module.");
    }
    const eligibilityScope = normalizeEligibilityScope(input.eligibilityScope ?? current.eligibilityScope);
    const eligibleUserIds =
      input.eligibleUserIds === undefined
        ? current.eligibleUsers.map((entry) => entry.userId)
        : normalizeIds(input.eligibleUserIds);
    const eligibleFilieres =
      input.eligibleFilieres === undefined
        ? current.eligibleFilieres.map((entry) => entry.filiere)
        : normalizeFilieres(input.eligibleFilieres);
    if (eligibilityScope === "SELECTED_USERS" && eligibleUserIds.length === 0) {
      throw new PromoCodeError("PROMO_USER_REQUIRED", 400, "Sélectionnez au moins un étudiant.");
    }
    if (eligibilityScope === "SELECTED_FILIERES" && eligibleFilieres.length === 0) {
      throw new PromoCodeError("PROMO_FILIERE_REQUIRED", 400, "Sélectionnez au moins une filière.");
    }
    const maxTotalUses =
      input.maxTotalUses === undefined
        ? current.maxTotalUses
        : positiveOptionalInt(input.maxTotalUses, "La limite globale");
    const alreadyAllocatedUses = current.totalConfirmedUses + current.totalReservedUses;
    if (maxTotalUses != null && maxTotalUses < alreadyAllocatedUses) {
      throw new PromoCodeError(
        "PROMO_LIMIT_BELOW_USAGE",
        409,
        `La limite globale ne peut pas être inférieure aux ${alreadyAllocatedUses} utilisations déjà confirmées ou réservées.`,
      );
    }
    const previousValues = promoAuditSnapshot(current);
    await tx.promoCode.update({
      where: { id: current.id },
      data: {
        internalName: cleanText(input.internalName ?? current.internalName, 160) || current.internalName,
        publicDescription:
          input.publicDescription === undefined ? current.publicDescription : cleanText(input.publicDescription, 600),
        internalDescription:
          input.internalDescription === undefined
            ? current.internalDescription
            : cleanText(input.internalDescription, 2000),
        ...discount,
        minimumPurchaseAmount:
          input.minimumPurchaseAmount === undefined
            ? current.minimumPurchaseAmount
            : optionalMoney(input.minimumPurchaseAmount, "Le montant minimum"),
        startsAt: dates.startsAt,
        endsAt: dates.endsAt,
        relativeDuration: dates.relativeDuration ?? Prisma.JsonNull,
        administrativeStatus: normalizeStatus(input.administrativeStatus ?? current.administrativeStatus),
        appliesToAllModules,
        eligibilityScope,
        firstPurchaseOnly: input.firstPurchaseOnly ?? current.firstPurchaseOnly,
        maxTotalUses,
        maxUsesPerUser:
          input.maxUsesPerUser === undefined
            ? current.maxUsesPerUser
            : positiveOptionalInt(input.maxUsesPerUser, "La limite par utilisateur"),
        priority: input.priority === undefined ? current.priority : Number(input.priority) || 0,
        version: { increment: 1 },
        modules: {
          deleteMany: {},
          ...(appliesToAllModules ? {} : { create: courseIds.map((courseId) => ({ courseId })) }),
        },
        eligibleUsers: {
          deleteMany: {},
          ...(eligibilityScope === "SELECTED_USERS" ? { create: eligibleUserIds.map((userId) => ({ userId })) } : {}),
        },
        eligibleFilieres: {
          deleteMany: {},
          ...(eligibilityScope === "SELECTED_FILIERES"
            ? { create: eligibleFilieres.map((filiere) => ({ filiere })) }
            : {}),
        },
      },
    });
    const updated = await findPromoByPublicId(tx, publicId);
    if (!updated) throw new Error("PROMO_UPDATE_FAILED");
    await tx.promoCodeAuditLog.create({
      data: {
        promoCodeId: updated.id,
        action: "UPDATED",
        actorUserId: adminId,
        previousValues,
        newValues: promoAuditSnapshot(updated),
        reason: cleanText(input.reason, 500),
      },
    });
    return serializePromo(updated);
  });
}

export async function setPromoCodeStatus(
  adminId: string,
  publicId: string,
  status: PromoAdministrativeStatus,
  reason?: unknown,
) {
  return prisma.$transaction(async (tx) => {
    const record = await findPromoByPublicId(tx, publicId);
    if (!record) throw new PromoCodeError("PROMO_NOT_FOUND", 404, "Code promotionnel introuvable.");
    await lockPromo(tx, record.id);
    const previous = promoAuditSnapshot(record);
    const now = new Date();
    const updatedBase = await tx.promoCode.update({
      where: { id: record.id },
      data: {
        administrativeStatus: status,
        disabledAt: status === "DISABLED" ? now : status === "ACTIVE" ? null : record.disabledAt,
        archivedAt: status === "ARCHIVED" ? now : record.archivedAt,
        version: { increment: 1 },
      },
    });
    if (["DISABLED", "ARCHIVED"].includes(status)) {
      const released = await tx.promoCodeUsage.updateMany({
        where: { promoCodeId: record.id, provider: "PAYPAL", status: "RESERVED" },
        data: { status: "CANCELLED", releasedAt: now },
      });
      if (released.count > 0) {
        await tx.promoCode.update({
          where: { id: record.id },
          data: { totalReservedUses: { decrement: released.count } },
        });
      }
    }
    const updated = await findPromoByPublicId(tx, updatedBase.publicId);
    if (!updated) throw new Error("PROMO_STATUS_UPDATE_FAILED");
    await tx.promoCodeAuditLog.create({
      data: {
        promoCodeId: record.id,
        action: status,
        actorUserId: adminId,
        previousValues: previous,
        newValues: promoAuditSnapshot(updated),
        reason: cleanText(reason, 500),
      },
    });
    return serializePromo(updated);
  });
}

export async function duplicatePromoCode(adminId: string, publicId: string) {
  const record = await prisma.promoCode.findUnique({ where: { publicId }, include: promoInclude });
  if (!record) throw new PromoCodeError("PROMO_NOT_FOUND", 404, "Code promotionnel introuvable.");
  return createPromoCode(adminId, {
    code: await generateUniquePromoCode(),
    internalName: `${record.internalName} — copie`,
    publicDescription: record.publicDescription,
    internalDescription: record.internalDescription,
    discountType: record.discountType,
    discountValue: Number(record.discountValue),
    maximumDiscountAmount: serializeMoney(record.maximumDiscountAmount),
    minimumPurchaseAmount: serializeMoney(record.minimumPurchaseAmount),
    startsAt: record.startsAt,
    endsAt: record.endsAt > new Date() ? record.endsAt : new Date(Date.now() + 86_400_000),
    administrativeStatus: "DRAFT",
    appliesToAllModules: record.appliesToAllModules,
    courseIds: record.modules.map((entry) => entry.courseId),
    eligibilityScope: record.eligibilityScope,
    eligibleUserIds: record.eligibleUsers.map((entry) => entry.userId),
    eligibleFilieres: record.eligibleFilieres.map((entry) => entry.filiere),
    firstPurchaseOnly: record.firstPurchaseOnly,
    maxTotalUses: record.maxTotalUses,
    maxUsesPerUser: record.maxUsesPerUser,
    priority: record.priority,
  });
}

export async function deletePromoCode(adminId: string, publicId: string) {
  return prisma.$transaction(async (tx) => {
    const record = await findPromoByPublicId(tx, publicId);
    if (!record) throw new PromoCodeError("PROMO_NOT_FOUND", 404, "Code promotionnel introuvable.");
    await lockPromo(tx, record.id);
    const usageCount = await tx.promoCodeUsage.count({ where: { promoCodeId: record.id } });
    if (usageCount > 0) {
      throw new PromoCodeError(
        "PROMO_ARCHIVE_REQUIRED",
        409,
        "Ce code possède un historique financier et doit être archivé au lieu d’être supprimé.",
      );
    }
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "PROMO_CODE_DELETED",
        resource: "PromoCode",
        resourceId: publicId,
        details: promoAuditSnapshot(record),
      },
    });
    await tx.promoCode.delete({ where: { id: record.id } });
    return { deleted: true, id: publicId };
  });
}

export async function listPromoAdminOptions() {
  const [courses, students, creators] = await Promise.all([
    prisma.course.findMany({
      where: { published: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true, price: true },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { fullName: "asc" },
      take: 1000,
      select: { id: true, fullName: true, email: true, filiere: true },
    }),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true },
    }),
  ]);
  const filieres = [...new Set(students.map((student) => student.filiere?.trim()).filter(Boolean) as string[])].sort();
  return { courses, students, creators, filieres, timeZone: "Africa/Casablanca", currency: PROMO_CURRENCY };
}
