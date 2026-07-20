import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const state: { promo: any; usages: any[]; priorPayments: number; userFiliere: string | null; sequence: number } = {
    promo: null,
    usages: [],
    priorPayments: 0,
    userFiliere: "Mathématiques",
    sequence: 0,
  };
  let queue = Promise.resolve();

  const matchesUsage = (usage: any, where: any) => {
    if (where?.id) {
      const allowedIds = typeof where.id === "string" ? [where.id] : where.id.in;
      if (!allowedIds.includes(usage.id)) return false;
    }
    if (where?.promoCodeId && usage.promoCodeId !== where.promoCodeId) return false;
    if (where?.userId && usage.userId !== where.userId) return false;
    if (where?.status) {
      const allowed = typeof where.status === "string" ? [where.status] : where.status.in;
      if (!allowed.includes(usage.status)) return false;
    }
    if (where?.expiresAt?.lte && !(usage.expiresAt && usage.expiresAt <= where.expiresAt.lte)) return false;
    return true;
  };

  const tx: any = {
    $queryRaw: vi.fn(async () => [{ id: state.promo?.id }]),
    promoCode: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (!state.promo) return null;
        if (where.code && where.code !== state.promo.code) return null;
        if (where.id && where.id !== state.promo.id) return null;
        return state.promo;
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: any) => {
        if (!state.promo || (where.id && where.id !== state.promo.id)) throw new Error("not found");
        return state.promo;
      }),
      update: vi.fn(async ({ data }: any) => {
        if (data.totalReservedUses?.increment) state.promo.totalReservedUses += data.totalReservedUses.increment;
        if (data.totalReservedUses?.decrement) state.promo.totalReservedUses -= data.totalReservedUses.decrement;
        if (data.totalConfirmedUses?.increment) state.promo.totalConfirmedUses += data.totalConfirmedUses.increment;
        return state.promo;
      }),
    },
    promoCodeUsage: {
      findMany: vi.fn(async ({ where }: any) => state.usages.filter((usage) => matchesUsage(usage, where))),
      findUnique: vi.fn(async ({ where }: any) =>
        state.usages.find(
          (usage) =>
            (where.id && usage.id === where.id) ||
            (where.externalReference && usage.externalReference === where.externalReference) ||
            (where.publicReference && usage.publicReference === where.publicReference),
        ),
      ),
      findUniqueOrThrow: vi.fn(async ({ where }: any) => {
        const usage = state.usages.find((item) => item.id === where.id);
        if (!usage) throw new Error("not found");
        return usage;
      }),
      count: vi.fn(async ({ where }: any) => state.usages.filter((usage) => matchesUsage(usage, where)).length),
      create: vi.fn(async ({ data }: any) => {
        const usage = { id: `usage-${++state.sequence}`, status: "RESERVED", ...data };
        state.usages.push(usage);
        return usage;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const matched = state.usages.filter((usage) => matchesUsage(usage, where));
        matched.forEach((usage) => Object.assign(usage, data));
        return { count: matched.length };
      }),
    },
    user: { findUnique: vi.fn(async () => ({ role: "STUDENT", filiere: state.userFiliere })) },
    payment: { count: vi.fn(async () => state.priorPayments) },
  };

  const prisma: any = {
    ...tx,
    $transaction: vi.fn((callback: any) => {
      if (Array.isArray(callback)) return Promise.all(callback);
      const run = queue.then(() => callback(tx));
      queue = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    }),
  };

  const reset = () => {
    queue = Promise.resolve();
    state.promo = {
      id: "promo-1",
      publicId: "PROMO-PUBLIC",
      code: "RENTREE20",
      internalName: "Rentrée",
      publicDescription: "20 %",
      internalDescription: null,
      discountType: "PERCENTAGE",
      discountValue: 20,
      maximumDiscountAmount: null,
      minimumPurchaseAmount: null,
      currency: "MAD",
      startsAt: new Date("2026-07-01T00:00:00Z"),
      endsAt: new Date("2026-08-01T00:00:00Z"),
      relativeDuration: null,
      administrativeStatus: "ACTIVE",
      appliesToAllModules: true,
      eligibilityScope: "ALL_STUDENTS",
      firstPurchaseOnly: false,
      maxTotalUses: null,
      maxUsesPerUser: null,
      totalReservedUses: 0,
      totalConfirmedUses: 0,
      stackable: false,
      priority: 0,
      version: 1,
      createdByUserId: "admin-1",
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-07-01T00:00:00Z"),
      disabledAt: null,
      archivedAt: null,
      createdBy: { id: "admin-1", fullName: "Admin", email: "admin@example.com" },
      modules: [],
      eligibleUsers: [],
      eligibleFilieres: [],
    };
    state.usages = [];
    state.priorPayments = 0;
    state.userFiliere = "Mathématiques";
    state.sequence = 0;
  };
  return { state, prisma, tx, reset };
});

vi.mock("../src/db", () => ({ prisma: database.prisma }));

import {
  confirmPromoCodeUsageInTransaction,
  PromoCodeError,
  releaseExpiredPromoReservations,
  reservePromoCodeUsage,
} from "../src/promo-code-service";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
  vi.clearAllMocks();
  database.reset();
});

afterEach(() => {
  vi.useRealTimers();
});

function reserve(userId = "student-1", courseId = 42) {
  return reservePromoCodeUsage({
    code: "rentree20",
    userId,
    courseId,
    originalAmount: 400,
    provider: "PAYPAL",
    expiresAt: new Date("2026-07-20T00:00:00Z"),
  });
}

describe("promo code transactional service", () => {
  it("reserves a server-calculated snapshot", async () => {
    const result = await reserve();
    expect(result?.quote).toMatchObject({ originalAmount: 400, discountAmount: 80, finalAmount: 320 });
    expect(database.state.usages[0]).toMatchObject({
      promoCodeSnapshot: "RENTREE20",
      originalPriceSnapshot: 400,
      discountAmountSnapshot: 80,
      finalPriceSnapshot: 320,
      promoVersionSnapshot: 1,
    });
    expect(database.state.promo.totalReservedUses).toBe(1);
  });

  it("rejects a non-selected module", async () => {
    database.state.promo.appliesToAllModules = false;
    database.state.promo.modules = [{ promoCodeId: "promo-1", courseId: 7, course: { id: 7, title: "Analyse" } }];
    await expect(reserve()).rejects.toMatchObject({ code: "PROMO_NOT_APPLICABLE" });
  });

  it("accepts one of several selected modules", async () => {
    database.state.promo.appliesToAllModules = false;
    database.state.promo.modules = [{ promoCodeId: "promo-1", courseId: 42, course: { id: 42, title: "IA" } }];
    await expect(reserve()).resolves.toBeTruthy();
  });

  it("enforces the minimum purchase amount on the original price", async () => {
    database.state.promo.minimumPurchaseAmount = 500;
    await expect(reserve()).rejects.toMatchObject({ code: "PROMO_MINIMUM_NOT_REACHED" });
  });

  it("enforces selected-user eligibility", async () => {
    database.state.promo.eligibilityScope = "SELECTED_USERS";
    database.state.promo.eligibleUsers = [{ userId: "student-2", user: {} }];
    await expect(reserve("student-1")).rejects.toMatchObject({ code: "PROMO_USER_NOT_ELIGIBLE" });
    await expect(reserve("student-2")).resolves.toBeTruthy();
  });

  it("enforces selected-filiere eligibility", async () => {
    database.state.promo.eligibilityScope = "SELECTED_FILIERES";
    database.state.promo.eligibleFilieres = [{ filiere: "mathématiques" }];
    await expect(reserve()).resolves.toBeTruthy();
    database.state.userFiliere = "Physique";
    await expect(reserve("student-2")).rejects.toMatchObject({ code: "PROMO_USER_NOT_ELIGIBLE" });
  });

  it("enforces first-purchase-only", async () => {
    database.state.promo.firstPurchaseOnly = true;
    database.state.priorPayments = 1;
    await expect(reserve()).rejects.toMatchObject({ code: "PROMO_ALREADY_USED" });
  });

  it("enforces the per-user limit", async () => {
    database.state.promo.maxUsesPerUser = 1;
    await reserve("student-1");
    await expect(reserve("student-1", 43)).rejects.toMatchObject({ code: "PROMO_ALREADY_USED" });
  });

  it("serializes two concurrent attempts for the final global use", async () => {
    database.state.promo.maxTotalUses = 1;
    const results = await Promise.allSettled([reserve("student-1"), reserve("student-2")]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(database.state.usages).toHaveLength(1);
    expect(database.state.promo.totalReservedUses).toBe(1);
    expect(database.tx.$queryRaw).toHaveBeenCalled();
  });

  it("releases expired reservations and restores the counter", async () => {
    await reserve();
    database.state.usages[0].expiresAt = new Date("2026-07-17T00:00:00Z");
    expect(await releaseExpiredPromoReservations(new Date("2026-07-18T00:00:00Z"))).toBe(1);
    expect(database.state.usages[0].status).toBe("RELEASED");
    expect(database.state.promo.totalReservedUses).toBe(0);
  });

  it("confirms a reservation exactly once", async () => {
    const reservation = await reserve();
    const input = {
      usageId: reservation!.usage.id,
      paymentId: "payment-1",
      idempotencyKey: "capture-1",
    };
    const first = await confirmPromoCodeUsageInTransaction(database.tx, input);
    const second = await confirmPromoCodeUsageInTransaction(database.tx, input);
    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
    expect(database.state.promo.totalReservedUses).toBe(0);
    expect(database.state.promo.totalConfirmedUses).toBe(1);
  });

  it("rejects a PayPal confirmation disabled after preview", async () => {
    const reservation = await reserve();
    database.state.promo.administrativeStatus = "DISABLED";
    await expect(
      confirmPromoCodeUsageInTransaction(database.tx, {
        usageId: reservation!.usage.id,
        idempotencyKey: "capture-disabled",
      }),
    ).rejects.toBeInstanceOf(PromoCodeError);
  });

  it("keeps an already-created center reservation after later disablement", async () => {
    const reservation = await reserve();
    database.state.promo.administrativeStatus = "DISABLED";
    await expect(
      confirmPromoCodeUsageInTransaction(database.tx, {
        usageId: reservation!.usage.id,
        idempotencyKey: "center-validation",
        allowInactiveReservedPromo: true,
      }),
    ).resolves.toMatchObject({ idempotent: false });
  });

  it("preserves old snapshots after the promotion changes", async () => {
    const reservation = await reserve();
    database.state.promo.discountValue = 50;
    database.state.promo.version = 2;
    expect(reservation!.usage).toMatchObject({
      discountValueSnapshot: 20,
      finalPriceSnapshot: 320,
      promoVersionSnapshot: 1,
    });
  });
});
