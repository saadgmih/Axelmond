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
  Document: ({ children, onLoadSuccess, onLoadError, loading }: any) => (
    <div data-testid="mock-pdf-document">
      <div data-testid="react-pdf-loading">{loading}</div>
      <button type="button" onClick={() => onLoadSuccess({ numPages: 5 })}>
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

describe("PdfLessonViewer state machine and validation", () => {
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
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("advances through states and displays only the loader during loading phases", async () => {
    let resolveResource: (value: Blob) => void = () => {};
    const resourcePromise = new Promise<Blob>((resolve) => {
      resolveResource = resolve;
    });
    protectedResourceMock.load.mockReturnValue(resourcePromise);

    render(<PdfLessonViewer contentId="content-test" title="Cours Test" />);

    // Initially should show session restoration
    expect(screen.getByText("Restauration de votre session…")).toBeInTheDocument();
    expect(screen.queryByText(/n’a pas pu être interprété/)).not.toBeInTheDocument();

    // Simulating start of resource loading
    const loadOptions = protectedResourceMock.load.mock.calls[0]?.[0];
    act(() => {
      loadOptions?.onPhase("LOADING_RESOURCE");
    });

    await screen.findByText("Téléchargement du document…");
    expect(screen.queryByText(/n’a pas pu être interprété/)).not.toBeInTheDocument();

    // Resolve resource
    await act(async () => {
      resolveResource(new Blob(["%PDF-1.7"], { type: "application/pdf" }));
    });

    // Now it should show react-pdf's validation loader
    await screen.findByTestId("react-pdf-loading");
    expect(screen.queryByText(/n’a pas pu être interprété/)).not.toBeInTheDocument();

    // Complete load
    fireEvent.click(screen.getByRole("button", { name: "Simuler le chargement du PDF" }));

    // Now ready, page 1 of 5
    const previousPageButton = screen.getByRole("button", { name: "Page précédente" });
    expect(previousPageButton.parentElement?.textContent).toContain("1 / 5");
  });

  it("handles strict PDF validation error correctly and supports retry", async () => {
    protectedResourceMock.load
      .mockRejectedValueOnce(
        new ProtectedResourceError("Le document reçu n'a pas pu être interprété. Veuillez réessayer.", "temporary"),
      )
      .mockResolvedValueOnce(new Blob(["%PDF-1.7"], { type: "application/pdf" }));

    render(<PdfLessonViewer contentId="content-test" title="Cours Test" />);

    expect(
      await screen.findByText("Le document reçu n'a pas pu être interprété. Veuillez réessayer."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();

    // Retry
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

    // Should go back to loading
    expect(screen.getByText("Restauration de votre session…")).toBeInTheDocument();
    await waitFor(() => expect(protectedResourceMock.load).toHaveBeenCalledTimes(2));
  });

  it("automatically reloads a valid blob when PDF.js fails transiently", async () => {
    protectedResourceMock.load.mockResolvedValue(new Blob(["%PDF-1.7"], { type: "application/pdf" }));

    render(<PdfLessonViewer contentId="content-test" title="Cours Test" />);
    expect(await screen.findByTestId("mock-pdf-document")).toBeInTheDocument();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Simuler une erreur PDF" }));
    expect(screen.getByText("Nouvelle tentative de lecture du document…")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(protectedResourceMock.load).toHaveBeenCalledTimes(2);
  });
});
