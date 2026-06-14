/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteChunkFallback } from "../../src/lazyViews.tsx";

describe("RouteChunkFallback RTL", () => {
  it("renders loading label for lazy route chunks", () => {
    render(<RouteChunkFallback label="Chargement du catalogue…" />);
    expect(screen.getByText("Chargement du catalogue…")).toBeInTheDocument();
  });
});
