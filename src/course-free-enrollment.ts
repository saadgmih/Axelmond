import { buildCourseInvoiceId, serializeInvoiceRecord, type CoursePaymentEnrollmentInput } from "./course-payments";
import { prisma } from "./db";
import { buildEnrollmentEndDate } from "./enrollment-access";
import { isFreeCourseCharge, resolveCourseChargeAmount } from "./promo-codes";
import { PUBLIC_API_ERRORS } from "./public-api-errors";
import { isStudentRole } from "./rbac";
import { toAppUser } from "./server/mappers/user-mappers";

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

  const chargePricing = resolveCourseChargeAmount(course.price, params.promoCode);
  if (chargePricing.error) {
    return { ok: false, status: 400, error: chargePricing.error, code: "PROMO_INVALID" };
  }

  if (!isFreeCourseCharge(chargePricing.amount)) {
    return {
      ok: false,
      status: 400,
      error: "Ce module n'est pas gratuit. Utilisez le paiement en ligne.",
      code: "FREE_ENROLL_NOT_FREE",
    };
  }

  const invoiceId = buildCourseInvoiceId("FREE");
  const externalId = `free-enroll-${params.userId}-${params.courseId}`;
  const enrollmentEndDate = buildEnrollmentEndDate(new Date(), course.freeAccessDurationDays ?? undefined);

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
    });

    return {
      ok: true,
      duplicate: result.duplicate,
      user: toAppUser(result.user),
      invoice: (result.invoice as ReturnType<typeof serializeInvoiceRecord> | null) ?? null,
      message: result.duplicate ? "Vous êtes déjà inscrit à ce module." : "Inscription gratuite confirmée.",
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "USER_NOT_FOUND") {
      return { ok: false, status: 404, error: PUBLIC_API_ERRORS.accountNotFound, code: "USER_NOT_FOUND" };
    }
    throw err;
  }
}
