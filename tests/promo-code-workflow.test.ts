import fs from "node:fs";
import { describe, expect, it } from "vitest";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const migration = fs.readFileSync("prisma/migrations/20260718010000_promo_code_management/migration.sql", "utf8");
const service = fs.readFileSync("src/promo-code-service.ts", "utf8");
const routes = fs.readFileSync("src/routes/promo-code-routes.ts", "utf8");
const payments = fs.readFileSync("src/routes/payments-routes.ts", "utf8");
const paypalEnrollment = fs.readFileSync("src/paypal-enrollment.ts", "utf8");
const centerPayments = fs.readFileSync("src/center-payments.ts", "utf8");
const freeEnrollment = fs.readFileSync("src/course-free-enrollment.ts", "utf8");
const modal = fs.readFileSync("src/components/PaymentModal.tsx", "utf8");
const adminView = fs.readFileSync("src/views/teacher/AdminPromoCodesView.tsx", "utf8");
const rbac = fs.readFileSync("src/rbac.ts", "utf8");

describe("complete promo code workflow wiring", () => {
  it("adds normalized promotion, module, user, usage and audit models", () => {
    expect(schema).toMatch(/model PromoCode \{/);
    expect(schema).toMatch(/model PromoCodeModule \{/);
    expect(schema).toMatch(/model PromoCodeEligibleUser \{/);
    expect(schema).toMatch(/model PromoCodeUsage \{/);
    expect(schema).toMatch(/model PromoCodeAuditLog \{/);
  });

  it("stores financial snapshots as decimals", () => {
    for (const field of [
      "discountValueSnapshot",
      "originalPriceSnapshot",
      "discountAmountSnapshot",
      "finalPriceSnapshot",
    ]) {
      expect(schema).toMatch(new RegExp(`${field}\\s+Decimal`));
    }
  });

  it("creates a non-destructive migration with constraints and indexes", () => {
    expect(migration).toMatch(/CREATE TABLE .*PromoCodeUsage/);
    expect(migration).toMatch(/PromoCodeUsage_final_check/);
    expect(migration).toMatch(/status_expiresAt_idx/);
    expect(migration).not.toMatch(/DROP TABLE|DROP COLUMN/);
  });

  it("exposes all requested administrative endpoints behind requireAdmin", () => {
    for (const endpoint of [
      "/api/admin/promo-codes",
      "/api/admin/promo-codes/:id",
      "/duplicate",
      "/statistics",
      "/usages",
      "/audit-log",
    ]) {
      expect(routes).toContain(endpoint);
    }
    expect(routes).toMatch(/app\.get\("\/api\/admin\/promo-codes"/);
    expect(routes).toMatch(/app\.post\("\/api\/admin\/promo-codes"/);
    expect(routes).toMatch(/app\.patch\("\/api\/admin\/promo-codes\/:id"/);
    for (const action of ["activate", "pause", "disable", "archive"]) {
      expect(routes).toContain(`${action}:`);
    }
    expect(routes).toMatch(/requireAuth, requireAdmin/);
  });

  it("permits student preview but keeps administrative RBAC isolated", () => {
    expect(routes).toContain("/api/modules/:moduleId/promo-code/validate");
    expect(routes).toMatch(/user\.role !== "STUDENT"/);
    expect(rbac).toContain("promo-code\\/validate");
  });

  it("serializes global limits with a database row lock", () => {
    expect(service).toMatch(/FOR UPDATE/);
    expect(service).toMatch(/totalConfirmedUses \+ Math\.max\(0, record\.totalReservedUses/);
    expect(service).toMatch(/status: "RESERVED"/);
  });

  it("releases expired reservations lazily", () => {
    expect(service).toMatch(/releaseExpiredPromoReservations/);
    expect(service).toMatch(/expiresAt: \{ lte: now \}/);
    expect(service).toMatch(/status: "RELEASED"/);
  });

  it("reserves PayPal discounts and rechecks them before capture", () => {
    expect(payments).toMatch(/reservePromoCodeUsage\(/);
    expect(payments).toMatch(/assertPayPalPromoReservationUsable\(orderId\)/);
    expect(payments).toMatch(/releasePromoCodeReservationByExternalReference/);
    expect(paypalEnrollment).toMatch(/promoReservationReference/);
    expect(paypalEnrollment).toMatch(/PAYPAL_AMOUNT_MISMATCH/);
  });

  it("reserves center discounts until request expiry and confirms them after validation", () => {
    expect(centerPayments).toMatch(/provider: "CENTER"/);
    expect(centerPayments).toMatch(/centerPaymentRequestId: request\.id/);
    expect(centerPayments).toMatch(/allowInactiveReservedPromo: true/);
    expect(centerPayments).toMatch(/releasePromoCodeReservationInTransaction/);
  });

  it("supports explicit zero-MAD promo activation without PayPal", () => {
    expect(freeEnrollment).toMatch(/provider: "FREE"/);
    expect(freeEnrollment).toMatch(/free-promo-/);
    expect(freeEnrollment).toMatch(/promoUsageId/);
  });

  it("shows a server preview and a remove action to students", () => {
    expect(modal).toMatch(/api\.validatePromoCode/);
    expect(modal).toContain("Prix initial");
    expect(modal).toContain("Réduction");
    expect(modal).toContain("Prix final");
    expect(modal).toContain("Retirer le code");
    expect(modal).toContain("revérifié lors du paiement");
  });

  it("provides responsive administration, precise and relative dates, filters, statistics and history", () => {
    expect(adminView).toContain("Créer un code promotionnel");
    expect(adminView).toContain("Générer automatiquement");
    expect(adminView).toContain("Dates précises");
    expect(adminView).toContain("Durée relative");
    expect(adminView).toContain("Désactiver maintenant");
    expect(adminView).toContain("Filtrer par module");
    expect(adminView).toContain("Filtrer par créateur");
    expect(adminView).toContain("Début à partir du");
    expect(adminView).toContain("Fin au plus tard le");
    expect(adminView).toContain("Créé le");
    expect(adminView).toContain("Historique immuable");
    expect(adminView).toContain("Utilisations réelles");
    expect(adminView).toContain("Modules les plus concernés");
    expect(adminView).toContain("Dernière modification");
    expect(adminView).toMatch(/sm:grid-cols|lg:grid-cols|xl:grid-cols/);
  });
});
