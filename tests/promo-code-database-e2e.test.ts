import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../src/db";
import {
  createPromoCode,
  deletePromoCode,
  PromoCodeError,
  releasePromoCodeReservationById,
  reservePromoCodeUsage,
  setPromoCodeStatus,
  updatePromoCode,
  validatePromoCodeEligibility,
} from "../src/promo-code-service";
import { cancelStudentCenterPaymentRequest, createCenterPaymentRequest } from "../src/center-payments";

const enabled = process.env.PROMO_DATABASE_E2E === "1";

describe.skipIf(!enabled)("promo code database E2E", () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const codePrefix = `E2E${suffix
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(-12)}`;
  const userIds: string[] = [];
  let courseId: number | null = null;

  afterAll(async () => {
    if (!enabled) return;
    const promos = await prisma.promoCode.findMany({
      where: { code: { startsWith: codePrefix } },
      select: { id: true, publicId: true },
    });
    const promoIds = promos.map((promo) => promo.id);
    await prisma.$transaction(async (tx) => {
      if (userIds.length) {
        await tx.centerPaymentRequest.deleteMany({ where: { userId: { in: userIds } } });
      }
      if (promoIds.length) {
        await tx.promoCodeUsage.deleteMany({ where: { promoCodeId: { in: promoIds } } });
        await tx.promoCodeAuditLog.deleteMany({ where: { promoCodeId: { in: promoIds } } });
        await tx.promoCode.deleteMany({ where: { id: { in: promoIds } } });
      }
      await tx.auditLog.deleteMany({
        where: {
          OR: [
            { userId: { in: userIds } },
            { resource: "PromoCode", resourceId: { in: promos.map((promo) => promo.publicId) } },
          ],
        },
      });
      if (courseId) await tx.course.deleteMany({ where: { id: courseId } });
      if (userIds.length) {
        await tx.notification.deleteMany({ where: { userId: { in: userIds } } });
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
      }
    });
    const [remainingPromos, remainingUsers, remainingCourses] = await Promise.all([
      prisma.promoCode.count({ where: { code: { startsWith: codePrefix } } }),
      prisma.user.count({ where: { id: { in: userIds } } }),
      courseId ? prisma.course.count({ where: { id: courseId } }) : Promise.resolve(0),
    ]);
    if (remainingPromos + remainingUsers + remainingCourses !== 0) {
      throw new Error("PROMO_DATABASE_E2E_CLEANUP_FAILED");
    }
    await prisma.$disconnect();
  });

  it("runs the complete reservation, concurrency, snapshot and center workflow", async () => {
    const discipline = await prisma.discipline.findFirst({ select: { id: true } });
    expect(discipline, "A discipline is required for the disposable E2E course").not.toBeNull();

    const [admin, studentA, studentB] = await Promise.all([
      prisma.user.create({
        data: {
          email: `promo-admin-${suffix}@example.test`,
          passwordHash: "database-e2e-not-a-login-secret",
          fullName: "Promo E2E Admin",
          role: "ADMIN",
          emailVerified: true,
        },
      }),
      prisma.user.create({
        data: {
          email: `promo-a-${suffix}@example.test`,
          passwordHash: "database-e2e-not-a-login-secret",
          fullName: "Promo E2E Student A",
          role: "STUDENT",
          filiere: "Mathématiques",
          emailVerified: true,
        },
      }),
      prisma.user.create({
        data: {
          email: `promo-b-${suffix}@example.test`,
          passwordHash: "database-e2e-not-a-login-secret",
          fullName: "Promo E2E Student B",
          role: "STUDENT",
          filiere: "Mathématiques",
          emailVerified: true,
        },
      }),
    ]);
    userIds.push(admin.id, studentA.id, studentB.id);

    const course = await prisma.course.create({
      data: {
        title: `Promo E2E ${suffix}`,
        level: "E2E",
        credits: 1,
        duration: "1 heure",
        category: "Test",
        price: 200,
        iconName: "BookOpen",
        color: "emerald",
        instructor: "E2E",
        description: "Module temporaire pour validation transactionnelle des codes promo.",
        published: true,
        disciplineId: discipline!.id,
        createdById: admin.id,
      },
    });
    courseId = course.id;

    const startsAt = new Date(Date.now() - 60_000);
    const endsAt = new Date(Date.now() + 3_600_000);
    const centerCode = `${codePrefix}C`;
    const promo = await createPromoCode(admin.id, {
      code: centerCode,
      internalName: "E2E centre et snapshots",
      publicDescription: "Réduction E2E",
      discountType: "PERCENTAGE",
      discountValue: 25,
      startsAt,
      endsAt,
      administrativeStatus: "ACTIVE",
      appliesToAllModules: false,
      courseIds: [course.id],
      eligibilityScope: "SELECTED_FILIERES",
      eligibleFilieres: ["Mathématiques"],
      maxTotalUses: 5,
      maxUsesPerUser: 2,
    });

    const preview = await validatePromoCodeEligibility({
      code: centerCode.toLowerCase(),
      userId: studentA.id,
      courseId: course.id,
      originalAmount: 200,
    });
    expect(preview).toMatchObject({ originalAmount: 200, discountAmount: 50, finalAmount: 150, provisional: true });

    const center = await createCenterPaymentRequest({
      userId: studentA.id,
      courseId: course.id,
      promoCode: centerCode,
    });
    expect(center.request.promotion).toMatchObject({ code: centerCode, discountAmount: 50, finalAmount: 150 });

    await updatePromoCode(admin.id, promo.id, { version: promo.version, discountValue: 50 });
    const snapshot = await prisma.promoCodeUsage.findUniqueOrThrow({
      where: {
        centerPaymentRequestId: (
          await prisma.centerPaymentRequest.findUniqueOrThrow({ where: { publicReference: center.request.reference } })
        ).id,
      },
    });
    expect(Number(snapshot.discountValueSnapshot)).toBe(25);
    expect(Number(snapshot.finalPriceSnapshot)).toBe(150);

    await setPromoCodeStatus(admin.id, promo.id, "DISABLED", "E2E disable check");
    await expect(
      validatePromoCodeEligibility({ code: centerCode, userId: studentB.id, courseId: course.id, originalAmount: 200 }),
    ).rejects.toMatchObject({ code: "PROMO_DISABLED" });
    const cancelled = await cancelStudentCenterPaymentRequest(studentA.id, center.request.reference);
    expect(cancelled.status).toBe("CANCELLED");
    expect((await prisma.promoCodeUsage.findUniqueOrThrow({ where: { id: snapshot.id } })).status).toBe("CANCELLED");
    await expect(deletePromoCode(admin.id, promo.id)).rejects.toBeInstanceOf(PromoCodeError);

    const limitedCode = `${codePrefix}L`;
    const limited = await createPromoCode(admin.id, {
      code: limitedCode,
      internalName: "E2E concurrence",
      discountType: "FIXED",
      discountValue: 20,
      startsAt,
      endsAt,
      administrativeStatus: "ACTIVE",
      appliesToAllModules: false,
      courseIds: [course.id],
      eligibilityScope: "ALL_STUDENTS",
      maxTotalUses: 1,
      maxUsesPerUser: 1,
    });
    const concurrent = await Promise.allSettled(
      [studentA.id, studentB.id].map((userId) =>
        reservePromoCodeUsage({
          code: limitedCode,
          userId,
          courseId: course.id,
          originalAmount: 200,
          provider: "PAYPAL",
          expiresAt: new Date(Date.now() + 60_000),
        }),
      ),
    );
    expect(concurrent.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(concurrent.filter((result) => result.status === "rejected")).toHaveLength(1);
    const successful = concurrent.find((result) => result.status === "fulfilled");
    if (successful?.status === "fulfilled" && successful.value) {
      await releasePromoCodeReservationById(successful.value.usage.id, true);
    }
    expect((await prisma.promoCode.findUniqueOrThrow({ where: { publicId: limited.id } })).totalReservedUses).toBe(0);

    const freeCode = `${codePrefix}F`;
    await createPromoCode(admin.id, {
      code: freeCode,
      internalName: "E2E gratuit explicite",
      discountType: "PERCENTAGE",
      discountValue: 100,
      startsAt,
      endsAt,
      administrativeStatus: "ACTIVE",
      appliesToAllModules: false,
      courseIds: [course.id],
      eligibilityScope: "ALL_STUDENTS",
    });
    const free = await reservePromoCodeUsage({
      code: freeCode,
      userId: studentB.id,
      courseId: course.id,
      originalAmount: 200,
      provider: "FREE",
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(free?.quote).toMatchObject({ originalAmount: 200, discountAmount: 200, finalAmount: 0 });
    if (free) await releasePromoCodeReservationById(free.usage.id, true);

    const unused = await createPromoCode(admin.id, {
      code: `${codePrefix}U`,
      internalName: "E2E suppression physique",
      discountType: "FIXED",
      discountValue: 10,
      startsAt,
      endsAt,
      administrativeStatus: "DRAFT",
      appliesToAllModules: true,
      eligibilityScope: "ALL_STUDENTS",
    });
    expect(await deletePromoCode(admin.id, unused.id)).toMatchObject({ deleted: true });
    expect(
      await prisma.auditLog.findFirst({ where: { resourceId: unused.id, action: "PROMO_CODE_DELETED" } }),
    ).not.toBeNull();
  }, 60_000);
});
