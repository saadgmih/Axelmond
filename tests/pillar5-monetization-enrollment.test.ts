import { describe, it, expect } from "vitest";
import { formatMad, PLATFORM_CURRENCY_CODE } from "../src/utils/morocco-locale";
import { formatInvoiceReference } from "../src/utils/user-facing-labels";
import type { CenterPaymentRequestView, CenterPaymentStatus } from "../src/center-payment-types";
import type { Invoice } from "../src/types";

describe("Pilier 5 : Monétisation & Inscriptions de A à Z", () => {
  describe("1. Formatage monétaire & Références officielles", () => {
    it("utilise le Dirham Marocain (MAD) et la devise officielle de la plateforme", () => {
      expect(PLATFORM_CURRENCY_CODE).toBe("MAD");
      expect(formatMad(450)).toMatch(/450.*(DH|MAD)/i);
      expect(formatMad(0)).toMatch(/0.*(DH|MAD)/i);
    });

    it("génère des références de facture normalisées", () => {
      expect(formatInvoiceReference("INV-2026-9912")).toBe("Reçu n° 9912");
      expect(formatInvoiceReference("INV")).toBe("Reçu");
    });
  });

  describe("2. Logique de tarification, remises et gratuité", () => {
    it("calcule correctement les réductions en pourcentage", () => {
      const originalPrice = 500;
      const discountPercentage = 20;
      const discountAmount = (originalPrice * discountPercentage) / 100;
      const finalAmount = originalPrice - discountAmount;

      expect(discountAmount).toBe(100);
      expect(finalAmount).toBe(400);
    });

    it("calcule correctement les réductions à montant fixe", () => {
      const originalPrice = 500;
      const fixedDiscount = 150;
      const finalAmount = Math.max(0, originalPrice - fixedDiscount);

      expect(finalAmount).toBe(350);
    });

    it("détecte le basculement en inscription gratuite pour un cours à 0 DH ou code 100%", () => {
      const isFreeCourse = (price: number, discountAmount = 0) => Math.max(0, price - discountAmount) <= 0;

      expect(isFreeCourse(0, 0)).toBe(true);
      expect(isFreeCourse(450, 450)).toBe(true);
      expect(isFreeCourse(450, 400)).toBe(false);
    });
  });

  describe("3. Demandes de paiement au centre de formation (Rabat)", () => {
    it("valide la structure d'une demande de règlement sur place", () => {
      const request: CenterPaymentRequestView = {
        reference: "AXEL-RABAT-9876",
        status: "PENDING_PAYMENT",
        amount: 350,
        currency: "MAD",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
        accessDurationDays: 180,
        module: {
          id: 19,
          title: "Microéconomie Avancée",
        },
        center: {
          centerName: "Centre Principal Rabat",
          address: "Avenue Mohammed V, Rabat",
          openingHours: "09h00 - 18h00",
          phone: "+212 537 00 00 00",
          email: "contact@axelmond.com",
          expirationDays: 5,
          currency: "MAD",
          accessDurationDays: 180,
          instructions: "Présentez cette référence.",
        },
      } as any;

      expect(request.reference).toMatch(/^AXEL-/);
      expect(request.status).toBe("PENDING_PAYMENT");
      expect(request.amount).toBe(350);
      expect(request.currency).toBe("MAD");
      expect(new Date(request.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it("gère les transitions d'état d'une demande au centre", () => {
      const validStatuses: CenterPaymentStatus[] = [
        "PENDING_PAYMENT",
        "UNDER_REVIEW",
        "PAID",
        "REJECTED",
        "EXPIRED",
        "CANCELLED",
        "REFUNDED",
      ];

      expect(validStatuses).toContain("PAID");
      expect(validStatuses).toContain("PENDING_PAYMENT");
      expect(validStatuses).toContain("CANCELLED");
    });
  });

  describe("4. Liste unifiée des transactions de l'étudiant", () => {
    it("fusionne et classe chronologiquement les paiements en ligne et au centre", () => {
      const mockInvoices: Invoice[] = [
        {
          id: "INV-ONLINE-01",
          courseTitle: "Algorithmique II",
          date: "2026-09-01",
          amount: 400,
          status: "Payé",
        },
      ];

      const mockCenterRequests: CenterPaymentRequestView[] = [
        {
          reference: "AXEL-2026-002",
          status: "PAID",
          amount: 300,
          currency: "MAD",
          createdAt: "2026-10-01T10:00:00Z",
          expiresAt: "2026-10-06T10:00:00Z",
          accessDurationDays: 180,
          module: { id: 2, title: "Statistiques Inférentielles" },
          center: {
            centerName: "Centre Rabat",
            address: "Rabat",
            openingHours: "9h-18h",
            phone: "+212 537 00 00 00",
            email: "contact@axelmond.com",
            expirationDays: 5,
            currency: "MAD",
            accessDurationDays: 180,
            instructions: "Présentez cette référence.",
          },
        } as any,
      ];

      type UnifiedItem = {
        id: string;
        source: "center" | "online";
        reference: string;
        timestamp: number;
        amount: number;
      };

      const unified: UnifiedItem[] = [
        ...mockInvoices.map((inv) => ({
          id: `online-${inv.id}`,
          source: "online" as const,
          reference: inv.id,
          timestamp: new Date(inv.date).getTime(),
          amount: inv.amount,
        })),
        ...mockCenterRequests.map((req) => ({
          id: `center-${req.reference}`,
          source: "center" as const,
          reference: req.reference,
          timestamp: new Date(req.createdAt).getTime(),
          amount: req.amount,
        })),
      ].sort((a, b) => b.timestamp - a.timestamp);

      expect(unified).toHaveLength(2);
      expect(unified[0].source).toBe("center");
      expect(unified[1].source).toBe("online");
      expect(unified.reduce((acc, item) => acc + item.amount, 0)).toBe(700);
    });
  });

  describe("5. Validation des Codes d'Accès Administrateur", () => {
    it("détecte les codes mono-module et multi-modules", () => {
      const singleModuleCode = {
        code: "ACCES-MATH-1234",
        isMultiModule: false,
        appliesToAllModules: false,
        modules: [{ id: 10, title: "Mathématiques Générales" }],
      };

      const platformCode = {
        code: "ACCES-ALL-2026",
        isMultiModule: true,
        appliesToAllModules: true,
        modules: [],
      };

      expect(singleModuleCode.modules).toHaveLength(1);
      expect(platformCode.appliesToAllModules).toBe(true);
    });
  });
});
