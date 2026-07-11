/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { act } from "react";
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteChunkFallback } from "../../src/lazyViews.tsx";

// React 19 production builds omit React.act; testing-library still expects it.
if (typeof React.act !== "function") {
  (React as typeof React & { act: typeof act }).act = act;
}

describe("RouteChunkFallback RTL", () => {
  it("renders loading label for lazy route chunks", () => {
    render(<RouteChunkFallback label="Chargement du catalogue…" />);
    expect(screen.getByText("Chargement du catalogue…")).toBeInTheDocument();
  });
});
