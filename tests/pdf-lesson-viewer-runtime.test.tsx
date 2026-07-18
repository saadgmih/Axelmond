/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { act } from "react";
import * as React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

if (typeof React.act !== "function") {
  (React as typeof React & { act: typeof act }).act = act;
}
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const protectedResourceMock = vi.hoisted(() => ({ load: vi.fn() }));

vi.mock("../src/protected-resource", () => {
  class ProtectedResourceError extends Error {
    constructor(
      message: string,
      readonly kind: "temporary" | "permanent" | "session" | "cancelled",
    ) {
      super(message);
      this.name = "ProtectedResourceError";
    }
  }
  return { loadProtectedResource: protectedResourceMock.load, ProtectedResourceError };
});

vi.mock("react-pdf", () => ({
  pdfjs: { GlobalWorkerOptions: {} },
  Document: ({ children, onLoadSuccess, onLoadError }: any) => (
    <div data-testid="mock-pdf-document">
      <button type="button" onClick={() => onLoadSuccess({ numPages: 3 })}>
        Simuler le chargement du PDF
      </button>
      <button type="button" onClick={() => onLoadError(new Error("invalid"))}>
        Simuler une erreur PDF
      </button>
      {children}
    </div>
  ),
  Page: ({ pageNumber }: { pageNumber: number }) => <div>Page rendue {pageNumber}</div>,
}));

import PdfLessonViewer from "../src/components/PdfLessonViewer";
import { ProtectedResourceError } from "../src/protected-resource";

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

describe("PdfLessonViewer session restoration states", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:protected-document"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(() => undefined),
    });
    protectedResourceMock.load.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows session restoration before starting protected content", () => {
    protectedResourceMock.load.mockReturnValue(new Promise(() => undefined));
    render(<PdfLessonViewer contentId="content-a" title="Cours PDF" />);
    expect(screen.getByText("Restauration de votre session…")).toBeInTheDocument();
  });

  it("never shows 1 / ? while PDF metadata is unknown", async () => {
    protectedResourceMock.load.mockResolvedValue(new Blob(["%PDF-1.7"], { type: "application/pdf" }));
    const { container } = render(<PdfLessonViewer contentId="content-a" title="Cours PDF" />);

    await screen.findByText("Chargement du document…");
    expect(container.textContent).not.toContain("?");
    expect(screen.queryByRole("button", { name: "Page précédente" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Simuler le chargement du PDF" }));
    const previousPageButton = screen.getByRole("button", { name: "Page précédente" });
    expect(previousPageButton.parentElement?.textContent).toContain("1 / 3");
    expect(previousPageButton).toBeInTheDocument();
  });

  it("resets the page metadata when the stable content identifier changes", async () => {
    protectedResourceMock.load.mockResolvedValue(new Blob(["%PDF-1.7"], { type: "application/pdf" }));
    const { container, rerender } = render(<PdfLessonViewer contentId="content-a" title="Cours A" />);
    fireEvent.click(await screen.findByRole("button", { name: "Simuler le chargement du PDF" }));
    expect(container.textContent).toContain("1 / 3");

    rerender(<PdfLessonViewer contentId="content-b" title="Cours B" />);
    await waitFor(() => expect(protectedResourceMock.load).toHaveBeenCalledTimes(2));
    expect(container.textContent).not.toContain("1 / 3");
    expect(container.textContent).not.toContain("?");
  });

  it("offers a manual retry after a temporary loading failure", async () => {
    protectedResourceMock.load
      .mockRejectedValueOnce(new ProtectedResourceError("Service temporairement indisponible.", "temporary"))
      .mockResolvedValueOnce(new Blob(["%PDF-1.7"], { type: "application/pdf" }));
    render(<PdfLessonViewer contentId="content-a" title="Cours PDF" />);

    expect(await screen.findByText("Service temporairement indisponible.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Réessayer/ }));
    expect(await screen.findByText("Chargement du document…")).toBeInTheDocument();
    expect(protectedResourceMock.load).toHaveBeenCalledTimes(2);
  });

  it("converts a PDF parser failure into a retryable state", async () => {
    protectedResourceMock.load.mockResolvedValue(new Blob(["%PDF-1.7"], { type: "application/pdf" }));
    render(<PdfLessonViewer contentId="content-a" title="Cours PDF" />);

    fireEvent.click(await screen.findByRole("button", { name: "Simuler une erreur PDF" }));
    expect(screen.getByText(/n’a pas pu être interprété/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Réessayer/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ouvrir dans un nouvel onglet/ })).toHaveAttribute(
      "href",
      "blob:protected-document",
    );
  });
});
