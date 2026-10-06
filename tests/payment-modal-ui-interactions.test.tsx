/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { act } from "react";
import * as React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PaymentModal from "../src/components/PaymentModal";
import type { Course } from "../src/types";

if (typeof React.act !== "function") {
  (React as typeof React & { act: typeof act }).act = act;
}
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock de l'API cliente
const apiMock = vi.hoisted(() => ({
  getPayPalConfig: vi.fn(),
  getCenterPaymentConfig: vi.fn(),
  validatePromoCode: vi.fn(),
  removePromoCode: vi.fn(),
  createPayPalOrder: vi.fn(),
  capturePayPalOrder: vi.fn(),
  cancelPayPalOrder: vi.fn(),
  createCenterPaymentRequest: vi.fn(),
  freeEnrollCourse: vi.fn(),
  validateAccessCode: vi.fn(),
}));

vi.mock("../src/api", () => ({
  api: apiMock,
  getFreshSessionToken: vi.fn().mockResolvedValue("mock-token"),
}));

const mockPaidCourse = {
  id: 101,
  title: "Algorithmique & Structures de Données",
  description: "Formation complète universitaire",
  price: 450,
  category: "Informatique",
  level: "Licence",
  duration: "30h",
  published: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
} as unknown as Course;

const mockFreeCourse: Course = {
  ...mockPaidCourse,
  id: 102,
  title: "Introduction aux Mathématiques",
  price: 0,
};

describe("PaymentModal — Tests d'Interactions UI et Modes de Paiement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getPayPalConfig.mockResolvedValue({
      clientId: "test-client-id",
      env: "sandbox",
      currency: "USD",
    });
    apiMock.getCenterPaymentConfig.mockResolvedValue({
      centerName: "Centre Principal Rabat",
      address: "Avenue Mohammed V, Rabat",
      openingHours: "09h00 - 18h00",
      phone: "+212 537 00 00 00",
      email: "contact@axelmond.com",
      expirationDays: 5,
      currency: "MAD",
      accessDurationDays: 180,
      instructions: "Présentez votre référence au guichet.",
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("1. Affiche les modes de paiement en ligne, au centre et le champ code promo pour un cours payant", async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    await act(async () => {
      render(<PaymentModal course={mockPaidCourse} onClose={handleClose} onSuccess={handleSuccess} />);
    });

    expect(screen.getByText("Algorithmique & Structures de Données")).toBeInTheDocument();
    expect(screen.getAllByText(/450/).length).toBeGreaterThan(0);

    // Mode Carte / PayPal présent
    expect(screen.getByText(/Payer par carte ou PayPal/i)).toBeInTheDocument();

    // Section Paiement au centre présente
    expect(screen.getByText(/Paiement au Centre/i)).toBeInTheDocument();

    // Section Code promo présente avec son placeholder exact
    expect(screen.getByPlaceholderText(/Code promotionnel/i)).toBeInTheDocument();
  });

  it("2. Bascule automatiquement en mode Inscription Gratuite quand le prix est de 0 MAD", async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    await act(async () => {
      render(<PaymentModal course={mockFreeCourse} onClose={handleClose} onSuccess={handleSuccess} />);
    });

    // Bouton gratuit visible
    const freeButton = screen.getByRole("button", { name: /S'inscrire gratuitement/i });
    expect(freeButton).toBeInTheDocument();

    // Pas de bouton PayPal
    expect(screen.queryByText(/Payer par carte ou PayPal/i)).not.toBeInTheDocument();
  });

  it("3. Applique une réduction par Code Promo partiel (affiche la réduction)", async () => {
    apiMock.validatePromoCode.mockResolvedValue({
      code: "PROMO20",
      originalAmount: 450,
      discountAmount: 90,
      finalAmount: 360,
      currency: "MAD",
      discountType: "PERCENTAGE",
      discountValue: 20,
    });

    await act(async () => {
      render(<PaymentModal course={mockPaidCourse} onClose={vi.fn()} onSuccess={vi.fn()} />);
    });

    const promoInput = screen.getByPlaceholderText(/Code promotionnel/i);

    await act(async () => {
      fireEvent.change(promoInput, { target: { value: "PROMO20" } });
    });

    const applyButton = screen.getByRole("button", { name: "Appliquer" });
    await act(async () => {
      fireEvent.click(applyButton);
    });

    expect(apiMock.validatePromoCode).toHaveBeenCalledWith(101, "PROMO20");
    await waitFor(() => {
      expect(screen.getByText(/Code validé !/i)).toBeInTheDocument();
      expect(screen.getAllByText(/360/).length).toBeGreaterThan(0);
    });
  });

  it("4. Bascule en mode 'S'inscrire gratuitement' lorsqu'un code promo 100% est appliqué", async () => {
    apiMock.validatePromoCode.mockResolvedValue({
      code: "BIENVENUE100",
      originalAmount: 450,
      discountAmount: 450,
      finalAmount: 0,
      currency: "MAD",
      discountType: "PERCENTAGE",
      discountValue: 100,
    });

    await act(async () => {
      render(<PaymentModal course={mockPaidCourse} onClose={vi.fn()} onSuccess={vi.fn()} />);
    });

    const promoInput = screen.getByPlaceholderText(/Code promotionnel/i);

    await act(async () => {
      fireEvent.change(promoInput, { target: { value: "BIENVENUE100" } });
    });

    const applyButton = screen.getByRole("button", { name: "Appliquer" });
    await act(async () => {
      fireEvent.click(applyButton);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /S'inscrire gratuitement/i })).toBeInTheDocument();
    });
  });

  it("5. Permet la confirmation d'une demande de Paiement au Centre", async () => {
    apiMock.createCenterPaymentRequest.mockResolvedValue({
      request: {
        reference: "PC-2026-123456",
        status: "PENDING_PAYMENT",
        amount: 450,
        currency: "MAD",
        expiresAt: "2026-10-15T00:00:00Z",
      },
      duplicate: false,
    });

    await act(async () => {
      render(<PaymentModal course={mockPaidCourse} onClose={vi.fn()} onSuccess={vi.fn()} />);
    });

    // Clique sur Confirmer ma demande au centre
    const confirmCenterBtn = await screen.findByRole("button", { name: /Confirmer ma demande/i });

    await act(async () => {
      fireEvent.click(confirmCenterBtn);
    });

    await waitFor(() => {
      expect(apiMock.createCenterPaymentRequest).toHaveBeenCalledWith(101, {
        promoCode: undefined,
        studentNote: undefined,
      });
    });
  });

  it("6. Exécute l'inscription gratuite et notifie le parent en cas de succès", async () => {
    const handleSuccess = vi.fn();
    apiMock.freeEnrollCourse.mockResolvedValue({
      ok: true,
      message: "Inscription réussie",
      user: { id: "user-1", email: "test@example.com", enrolledCourses: [102] },
      invoice: { id: "INV-FREE-01", amount: 0 },
    });

    await act(async () => {
      render(<PaymentModal course={mockFreeCourse} onClose={vi.fn()} onSuccess={handleSuccess} />);
    });

    const freeButton = screen.getByRole("button", { name: /S'inscrire gratuitement/i });

    await act(async () => {
      fireEvent.click(freeButton);
    });

    await waitFor(() => {
      expect(apiMock.freeEnrollCourse).toHaveBeenCalledWith(102, undefined);
      expect(handleSuccess).toHaveBeenCalledWith(102, 0, expect.objectContaining({ id: "user-1" }));
    });
  });
});
