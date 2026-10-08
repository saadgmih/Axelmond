import {
  buildCourseInvoiceId,
  serializeInvoiceRecord,
  type CoursePaymentEnrollmentInput,
  APP_USER_BILLING_INCLUDE,
} from "./course-payments";
import {
  isAfterFreeAccessWindow,
  isBeforeFreeAccessWindow,
  resolveCourseFreeAccessWindow,
  resolveFreeEnrollmentEndDate,
} from "./course-free-access-window";
import { prisma } from "./db";
import { isFreeCourseCharge, resolveCourseChargeAmount } from "./promo-codes";
import { PUBLIC_API_ERRORS } from "./public-api-errors";
import { isStudentRole } from "./rbac";
import { toAppUser } from "./server/mappers/user-mappers";
import { buildEnrollmentEndDate } from "./enrollment-access";
import { PromoCodeError, releasePromoCodeReservationById, reservePromoCodeUsage } from "./promo-code-service";

export type FreeCourseEnrollmentResult =
  | {
      ok: true;
      duplicate: boolean;
      user: ReturnType<typeof toAppUser>;
      invoice: ReturnType<typeof serializeInvoiceRecord> | null;
      message: string;
    }
  | { ok: false; status: number; error: string; code?: string };

type PersistEnrollment = (
  params: CoursePaymentEnrollmentInput,
) => Promise<{ duplicate: boolean; user: unknown; invoice: unknown }>;

export async function processFreeCourseEnrollment(params: {
  userId: string;
  role: string;
  courseId: number;
  promoCode?: string;
  reqIp?: string;
  persistCoursePaymentEnrollment: PersistEnrollment;
}): Promise<FreeCourseEnrollmentResult> {
  if (!isStudentRole(params.role)) {
    return {
      ok: false,
      status: 403,
      error: "Seuls les étudiants peuvent s'inscrire à un module.",
      code: "FREE_ENROLL_STUDENT_ONLY",
    };
  }

  const course = await prisma.course.findUnique({ where: { id: params.courseId } });
  if (!course) {
    return { ok: false, status: 404, error: PUBLIC_API_ERRORS.courseNotFound, code: "COURSE_NOT_FOUND" };
  }

  let promoReservation: Awaited<ReturnType<typeof reservePromoCodeUsage>> = null;
  let chargeAmount = course.price;
  if (params.promoCode?.trim()) {
    try {
      promoReservation = await reservePromoCodeUsage({
        code: params.promoCode,
        userId: params.userId,
        courseId: params.courseId,
        originalAmount: course.price,
        provider: "FREE",
        expiresAt: new Date(Date.now() + 5 * 60_000),
      });
      chargeAmount = promoReservation?.quote.finalAmount ?? course.price;
    } catch (error) {
      if (error instanceof PromoCodeError) {
        return { ok: false, status: error.statusCode, error: error.message, code: error.code };
      }
      throw error;
    }
  } else {
    const chargePricing = resolveCourseChargeAmount(course.price, "");
    chargeAmount = chargePricing.amount;
  }

  if (!isFreeCourseCharge(chargeAmount)) {
    if (promoReservation) await releasePromoCodeReservationById(promoReservation.usage.id, true);
    return {
      ok: false,
      status: 400,
      error: "Ce module n'est pas gratuit. Utilisez le paiement en ligne.",
      code: "FREE_ENROLL_NOT_FREE",
    };
  }

  const invoiceId = buildCourseInvoiceId("FREE");
  const externalId = promoReservation
    ? `free-promo-${promoReservation.usage.publicReference}`
    : `free-enroll-${params.userId}-${params.courseId}`;
  const now = new Date();
  const freeAccessWindow = resolveCourseFreeAccessWindow(course);
  const enrollmentEndDate = promoReservation?.promo?.endsAt
    ? new Date(promoReservation.promo.endsAt)
    : promoReservation
      ? buildEnrollmentEndDate(now)
      : resolveFreeEnrollmentEndDate(course, now);

  if (!promoReservation) {
    if (!freeAccessWindow) {
      return {
        ok: false,
        status: 400,
        error: "Ce module gratuit doit avoir une période de gratuité (date de début et de fin).",
        code: "FREE_ENROLL_WINDOW_NOT_CONFIGURED",
      };
    }
    if (isBeforeFreeAccessWindow(course, now)) {
      return {
        ok: false,
        status: 400,
        error: `La période de gratuité commence le ${freeAccessWindow.startsAt.toLocaleDateString("fr-FR")}.`,
        code: "FREE_ENROLL_WINDOW_NOT_STARTED",
      };
    }
    if (isAfterFreeAccessWindow(course, now)) {
      return {
        ok: false,
        status: 400,
        error: `La période de gratuité de ce module est terminée depuis le ${freeAccessWindow.endsAt.toLocaleDateString(
          "fr-FR",
        )}.`,
        code: "FREE_ENROLL_WINDOW_EXPIRED",
      };
    }
  }

  try {
    const result = await params.persistCoursePaymentEnrollment({
      userId: params.userId,
      courseId: params.courseId,
      courseTitle: course.title,
      coursePrice: 0,
      invoiceId,
      provider: "MOCK",
      externalId,
      auditAction: "ENROLL_FREE",
      reqIp: params.reqIp,
      enrollmentEndDate,
      promoUsageId: promoReservation?.usage.id,
    });

    // If the access code covers multiple modules, auto-enroll in all sibling modules for this student
    let siblingSuccessCount = 0;
    if (promoReservation?.promo?.internalName.startsWith("[Code acces]")) {
      const siblingCourses = promoReservation.promo.appliesToAllModules
        ? await prisma.course.findMany({
            where: { published: true, id: { not: params.courseId } },
            select: { id: true, title: true },
          })
        : promoReservation.promo.modules
            .filter((m) => m.course.id !== params.courseId)
            .map((m) => ({ id: m.course.id, title: m.course.title }));

      for (const sibling of siblingCourses) {
        try {
          const siblingInvoiceId = buildCourseInvoiceId("FREE");
          const siblingExternalId = `free-promo-${promoReservation.usage.publicReference}-${sibling.id}`;
          await params.persistCoursePaymentEnrollment({
            userId: params.userId,
            courseId: sibling.id,
            courseTitle: sibling.title,
            coursePrice: 0,
            invoiceId: siblingInvoiceId,
            provider: "MOCK",
            externalId: siblingExternalId,
            auditAction: "ENROLL_FREE",
            reqIp: params.reqIp,
            enrollmentEndDate,
          });
          siblingSuccessCount++;
        } catch (siblingErr) {
          console.warn(`[access-code] Auto-enrollment sibling course ${sibling.id} failed:`, siblingErr);
        }
      }
    }

    let finalUser = result.user;
    if (siblingSuccessCount > 0) {
      const refreshed = await prisma.user.findUnique({
        where: { id: params.userId },
        include: APP_USER_BILLING_INCLUDE,
      });
      if (refreshed) {
        finalUser = refreshed;
      }
    }

    const message = result.duplicate
      ? "Vous êtes déjà inscrit à ce module."
      : siblingSuccessCount > 0
        ? `Code validé ! Vos ${siblingSuccessCount + 1} modules ont été débloqués avec succès.`
        : "Inscription gratuite confirmée.";

    return {
      ok: true,
      duplicate: result.duplicate,
      user: toAppUser(finalUser),
      invoice: (result.invoice as ReturnType<typeof serializeInvoiceRecord> | null) ?? null,
      message,
    };
  } catch (err: unknown) {
    if (promoReservation) await releasePromoCodeReservationById(promoReservation.usage.id, true).catch(() => undefined);
    if (err instanceof Error && err.message === "USER_NOT_FOUND") {
      return { ok: false, status: 404, error: PUBLIC_API_ERRORS.accountNotFound, code: "USER_NOT_FOUND" };
    }
    throw err;
  }
}
