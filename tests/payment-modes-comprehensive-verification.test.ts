import { describe, expect, it } from "vitest";
import {
  buildCenterPaymentExpiry,
  canTransitionCenterPayment,
  centerPaymentAmountsMatch,
  CENTER_PAYMENT_METHODS,
  generateCenterPaymentReference,
  generateCenterReceiptNumber,
  isCenterPaymentReference,
  isValidCenterPaymentIdempotencyKey,
  normalizeCenterPaymentNote,
} from "../src/center-payment-domain";
import {
  calculatePromoDiscount,
  generateSecurePromoCode,
  assertValidPromoCodeFormat,
  normalizePromoCodeInput,
} from "../src/promo-code-domain";
import {
  convertMadAmountForPayPal,
  formatPayPalCheckoutEquivalent,
  getPayPalCheckoutCurrency,
  getPayPalMadConversionRate,
} from "../src/paypal-currency";
import {
  buildPayPalCustomId,
  parsePayPalCustomId,
  buildPayPalDonationCustomId,
  isPayPalDonationCustomId,
  parsePayPalDonationCustomId,
  formatPayPalAmount,
} from "../src/paypal-server";
import { extractPayPalDonationCaptureContext } from "../src/paypal-charity-donation";
import { generateCharityAccessCode, hashCharityAccessCode, charityCodeSuffix } from "../src/charity-access-code";
import { deriveInclusiveFreeAccessDays, parseFreeAccessInstant } from "../src/course-free-access-window";
import {
  buildPayPalHostedCheckoutUrl,
  storePendingPayPalCheckout,
  readPendingPayPalCheckout,
  clearPendingPayPalCheckout,
} from "../src/utils/paypal-hosted-checkout";
import { isFreeCourseCharge } from "../src/promo-codes";

describe("Audit et Validation Exhaustive de TOUS les Modes et Types de Paiement", () => {
  // ─── 1. MODE PAIEMENT EN LIGNE (PAYPAL & CARTE BANCAIRE) ───────────────────
  describe("Mode 1 : Paiement en ligne PayPal & Carte bancaire", () => {
    it("1.1 Convertit correctement le montant MAD en devise de checkout PayPal", () => {
      // 350 MAD converti avec le taux de change
      const usdAmount = convertMadAmountForPayPal(350);
      expect(usdAmount).toBe(35);
      expect(formatPayPalAmount(usdAmount)).toBe("35.00");
      expect(formatPayPalCheckoutEquivalent(350)).toContain("35.00");
    });

    it("1.2 Vérifie la configuration de devise et le taux de change MAD/USD", () => {
      expect(getPayPalCheckoutCurrency()).toBe("USD");
      expect(getPayPalMadConversionRate()).toBe(0.1);
    });

    it("1.3 Encode et décode le custom_id sécurisé pour éviter le tampering d'inscription", () => {
      const customId = buildPayPalCustomId("user-stud-123", 42, 35.0, 350.0, "USD", "PR-2026-ABC");
      const parsed = parsePayPalCustomId(customId);
      expect(parsed).toEqual({
        userId: "user-stud-123",
        courseId: 42,
        expectedAmount: "35.00",
        payPalCurrency: "USD",
        amountMad: "350.00",
        promoReservationReference: "PR-2026-ABC",
      });
    });

    it("1.4 Rejette un custom_id malformé ou falsifié", () => {
      expect(parsePayPalCustomId("hack_custom_id")).toBeNull();
      expect(parsePayPalCustomId("")).toBeNull();
      expect(parsePayPalCustomId(undefined)).toBeNull();
    });

    it("1.5 Construit correctement l'URL de redirection Hosted Checkout (Sandbox et Live)", () => {
      const sandboxUrl = buildPayPalHostedCheckoutUrl("ORDER-TEST-7788", "sandbox");
      expect(sandboxUrl).toBe("https://www.sandbox.paypal.com/checkoutnow?token=ORDER-TEST-7788");

      const liveUrl = buildPayPalHostedCheckoutUrl("ORDER-TEST-7788", "live");
      expect(liveUrl).toBe("https://www.paypal.com/checkoutnow?token=ORDER-TEST-7788");
    });

    it("1.6 Gère le stockage sécurisé de session de retour PayPal (pending checkout)", () => {
      // Simule un environnement de stockage local avec window.sessionStorage
      const mockStorage: Record<string, string> = {};
      const fakeSessionStorage = {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
      };

      const originalWindow = globalThis.window;
      (globalThis as any).window = { sessionStorage: fakeSessionStorage };

      try {
        storePendingPayPalCheckout({
          orderId: "ORD-999",
          courseId: 10,
          amountMad: 400,
          createdAt: Date.now(),
        });

        const stored = readPendingPayPalCheckout();
        expect(stored?.orderId).toBe("ORD-999");
        expect(stored?.courseId).toBe(10);
        expect(stored?.amountMad).toBe(400);

        clearPendingPayPalCheckout();
        expect(readPendingPayPalCheckout()).toBeNull();
      } finally {
        (globalThis as any).window = originalWindow;
      }
    });
  });

  // ─── 2. MODE PAIEMENT AU CENTRE (PRÉSENTIEL / GUICHET) ──────────────────────
  describe("Mode 2 : Paiement au Centre (Guichet / Présentiel)", () => {
    it("2.1 Génère des références lisibles et professionnelles pour le guichet", () => {
      const ref = generateCenterPaymentReference(new Date("2026-10-06T12:00:00Z"));
      expect(ref).toMatch(/^PC-2026-\d{6}$/);
      expect(isCenterPaymentReference(ref)).toBe(true);
      expect(isCenterPaymentReference("FAKE-REF")).toBe(false);
    });

    it("2.2 Calcule la date d'expiration par défaut (5 jours)", () => {
      const now = new Date("2026-10-06T10:00:00Z");
      const expiry = buildCenterPaymentExpiry(now, 5);
      expect(expiry.toISOString()).toBe("2026-10-11T10:00:00.000Z");
    });

    it("2.3 Supporte les 5 moyens de paiement physiques au centre", () => {
      expect(CENTER_PAYMENT_METHODS).toEqual(["CASH", "CARD_AT_CENTER", "BANK_TRANSFER", "CHECK", "OTHER"]);
    });

    it("2.4 Vérifie la concordance exacte des montants au centime près", () => {
      expect(centerPaymentAmountsMatch(450, 450)).toBe(true);
      expect(centerPaymentAmountsMatch(450.0, 450.001)).toBe(true);
      expect(centerPaymentAmountsMatch(450, 449.9)).toBe(false); // Sous-paiement rejeté
      expect(centerPaymentAmountsMatch(450, 450.5)).toBe(false); // Surpaiement inexpliqué rejeté
    });

    it("2.5 Génère un numéro de reçu officiel unique", () => {
      const receiptNo = generateCenterReceiptNumber(new Date("2026-10-06T12:00:00Z"));
      expect(receiptNo).toMatch(/^REC-2026-\d{6}$/);
    });

    it("2.6 Valide rigoureusement la machine à états des demandes de paiement au centre", () => {
      // Transitions valides
      expect(canTransitionCenterPayment("PENDING_PAYMENT", "UNDER_REVIEW")).toBe(true);
      expect(canTransitionCenterPayment("PENDING_PAYMENT", "PAID")).toBe(true);
      expect(canTransitionCenterPayment("PENDING_PAYMENT", "EXPIRED")).toBe(true);
      expect(canTransitionCenterPayment("PENDING_PAYMENT", "CANCELLED")).toBe(true);
      expect(canTransitionCenterPayment("UNDER_REVIEW", "PAID")).toBe(true);
      expect(canTransitionCenterPayment("UNDER_REVIEW", "REJECTED")).toBe(true);
      expect(canTransitionCenterPayment("PAID", "REFUNDED")).toBe(true);

      // Transitions invalides / frauduleuses
      expect(canTransitionCenterPayment("PENDING_PAYMENT", "REFUNDED")).toBe(false); // Pas de remboursement avant paiement
      expect(canTransitionCenterPayment("REJECTED", "PAID")).toBe(false); // Rejeté = terminal
      expect(canTransitionCenterPayment("EXPIRED", "PAID")).toBe(false); // Expiré = terminal
      expect(canTransitionCenterPayment("CANCELLED", "PAID")).toBe(false); // Annulé = terminal
      expect(canTransitionCenterPayment("REFUNDED", "PAID")).toBe(false); // Remboursé = terminal
    });

    it("2.7 Nettoie et borne les notes laissées par les étudiants", () => {
      expect(normalizeCenterPaymentNote("   Paiement prévu demain matin   ")).toBe("Paiement prévu demain matin");
      expect(normalizeCenterPaymentNote("")).toBeNull();
      const longText = "x".repeat(1500);
      expect(normalizeCenterPaymentNote(longText, 500)?.length).toBe(500);
    });

    it("2.8 Valide la clé d'idempotence pour éviter les doubles validations en caisse", () => {
      expect(isValidCenterPaymentIdempotencyKey("idemp_caissier_01_abc123")).toBe(true);
      expect(isValidCenterPaymentIdempotencyKey("short")).toBe(false); // < 8 caractères
      expect(isValidCenterPaymentIdempotencyKey("avec des espaces")).toBe(false);
    });
  });

  // ─── 3. MODE INSCRIPTION GRATUITE (COURS À 0 MAD) ───────────────────────────
  describe("Mode 3 : Inscription Gratuite (Cours à 0 MAD)", () => {
    it("3.1 Détecte les montants éligibles à l'inscription gratuite directe", () => {
      expect(isFreeCourseCharge(0)).toBe(true);
      expect(isFreeCourseCharge(-10)).toBe(true);
      expect(isFreeCourseCharge(0.0)).toBe(true);
      expect(isFreeCourseCharge(0.01)).toBe(false);
      expect(isFreeCourseCharge(300)).toBe(false);
    });
  });

  // ─── 4. MODE FENÊTRE D'ACCÈS GRATUIT (OFFRES PROMOTIONNELLES TEMPORELLES) ──
  describe("Mode 4 : Fenêtre d'Accès Gratuit Temporaire", () => {
    it("4.1 Calcule correctement le nombre de jours d'accès inclus", () => {
      const start = new Date("2026-10-01T00:00:00Z");
      const end = new Date("2026-10-07T23:59:59Z");
      const days = deriveInclusiveFreeAccessDays(start, end);
      expect(days).toBe(7);
    });

    it("4.2 Analyse les bornes de dates pour l'accès gratuit", () => {
      const startInstant = parseFreeAccessInstant("2026-10-01", "start");
      const endInstant = parseFreeAccessInstant("2026-10-01", "end");
      expect(startInstant.toISOString()).toBe("2026-10-01T00:00:00.000Z");
      expect(endInstant.toISOString()).toBe("2026-10-01T23:59:59.999Z");
    });
  });

  // ─── 5. MODE CODE PROMOTIONNEL 100% (INSCRIPTION GRATUITE VIA CODE) ────────
  describe("Mode 5 : Code Promotionnel à 100% (Gratuité Totale)", () => {
    it("5.1 Calcule une remise de 100% ramenant le prix final à zéro", () => {
      const quote = calculatePromoDiscount({
        originalAmount: 500,
        discountType: "PERCENTAGE",
        discountValue: 100,
      });

      expect(quote).toEqual({
        originalAmount: 500,
        discountAmount: 500,
        finalAmount: 0,
        currency: "MAD",
      });
      expect(isFreeCourseCharge(quote.finalAmount)).toBe(true);
    });

    it("5.2 Normalise et valide le format des codes 100%", () => {
      const code = normalizePromoCodeInput("  bienvenue-100  ");
      expect(code).toBe("BIENVENUE-100");
      expect(assertValidPromoCodeFormat(code)).toBe("BIENVENUE-100");
    });
  });

  // ─── 6. MODE CODE PROMOTIONNEL PARTIEL (% ET MONTANT FIXE) ─────────────────
  describe("Mode 6 : Code Promotionnel Partiel (Pourcentage & Montant Fixe)", () => {
    it("6.1 Applique une réduction en pourcentage standard", () => {
      const quote = calculatePromoDiscount({
        originalAmount: 400,
        discountType: "PERCENTAGE",
        discountValue: 25, // 25% de 400 = 100 MAD de réduction
      });
      expect(quote.discountAmount).toBe(100);
      expect(quote.finalAmount).toBe(300);
    });

    it("6.2 Applique une réduction en montant fixe", () => {
      const quote = calculatePromoDiscount({
        originalAmount: 450,
        discountType: "FIXED",
        discountValue: 150,
      });
      expect(quote.discountAmount).toBe(150);
      expect(quote.finalAmount).toBe(300);
    });

    it("6.3 Plafonne la réduction maximale lorsque spécifiée", () => {
      const quote = calculatePromoDiscount({
        originalAmount: 1000,
        discountType: "PERCENTAGE",
        discountValue: 50, // 50% = 500 MAD
        maximumDiscountAmount: 200, // plafonné à 200 MAD
      });
      expect(quote.discountAmount).toBe(200);
      expect(quote.finalAmount).toBe(800);
    });

    it("6.4 Ne produit jamais de montant négatif si le montant fixe dépasse le prix", () => {
      const quote = calculatePromoDiscount({
        originalAmount: 100,
        discountType: "FIXED",
        discountValue: 200,
      });
      expect(quote.discountAmount).toBe(100);
      expect(quote.finalAmount).toBe(0);
      expect(isFreeCourseCharge(quote.finalAmount)).toBe(true);
    });

    it("6.5 Génère des codes promos cryptographiquement sécurisés", () => {
      const code = generateSecurePromoCode();
      expect(code).toMatch(/^PA-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    });
  });

  // ─── 7. MODE CODE D'ACCÈS D'INSCRIPTION / CLÉ SPÉCIALE ─────────────────────
  describe("Mode 7 : Clés d'Accès d'Inscription (Enrollment Access Codes)", () => {
    it("7.1 Génère des codes de format sécurisé pour octroyer l'accès direct", () => {
      const code = generateSecurePromoCode();
      expect(assertValidPromoCodeFormat(code)).toBe(code);
    });

    it("7.2 Rejette les caractères invalides ou les formats dangereux", () => {
      expect(() => assertValidPromoCodeFormat("CODE<SCRIPT>")).toThrow();
      expect(() => assertValidPromoCodeFormat("A B C")).toThrow();
      expect(() => assertValidPromoCodeFormat("")).toThrow();
    });
  });

  // ─── 8. MODE DONS DE BIENFAISANCE & PARRAINAGE SOLIDAIRE (CHARITY) ──────────
  describe("Mode 8 : Dons de Bienfaisance & Codes Solidaires (Charity)", () => {
    it("8.1 Génère des codes solidaires Sadaqa uniques et sécurisés", () => {
      const code = generateCharityAccessCode();
      expect(code).toMatch(/^SADAQA-[A-F0-9]{8}$/);
      expect(charityCodeSuffix(code).length).toBe(4);
    });

    it("8.2 Hache de manière irréversible le code solidaire en SHA-256 pour la base", () => {
      const code = "SADAQA-1A2B3C4D";
      const hash = hashCharityAccessCode(code);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      // Même hash pour code non normalisé (minuscules / espaces)
      expect(hashCharityAccessCode("  sadaqa-1a2b3c4d ")).toBe(hash);
    });

    it("8.3 Prépare et décode le custom_id pour les dons PayPal", () => {
      const customId = buildPayPalDonationCustomId("donor-42", "donation-uuid-99", 10.0, 100.0, "USD");
      expect(isPayPalDonationCustomId(customId)).toBe(true);

      const parsed = parsePayPalDonationCustomId(customId);
      expect(parsed).toEqual({
        userId: "donor-42",
        donationId: "donation-uuid-99",
        expectedAmount: "10.00",
        payPalCurrency: "USD",
        amountMad: "100.00",
      });
    });

    it("8.4 Extrait fidèlement le contexte de capture du don", () => {
      const customId = buildPayPalDonationCustomId("donor-42", "donation-uuid-99", 25.0, 250.0, "USD");
      const mockCapturePayload = {
        status: "COMPLETED",
        purchase_units: [
          {
            custom_id: customId,
            payments: {
              captures: [
                {
                  id: "CAP-DONATION-1234",
                  status: "COMPLETED",
                  amount: { value: "25.00", currency_code: "USD" },
                },
              ],
            },
          },
        ],
      };

      const ctx = extractPayPalDonationCaptureContext(mockCapturePayload);
      expect(ctx.metadata?.donationId).toBe("donation-uuid-99");
      expect(ctx.metadata?.userId).toBe("donor-42");
      expect(ctx.capture?.id).toBe("CAP-DONATION-1234");
      expect(ctx.capture?.status).toBe("COMPLETED");
    });
  });
});
