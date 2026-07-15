/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { act } from "react";
import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PremiumVideoPlayer from "../src/components/PremiumVideoPlayer";

// React 19 production builds omit React.act; testing-library still expects it.
if (typeof React.act !== "function") {
  (React as typeof React & { act: typeof act }).act = act;
}
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("PremiumVideoPlayer volume control", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays open when the vertical slider is released and focused", () => {
    vi.useFakeTimers();
    render(
      <PremiumVideoPlayer
        src="https://example.com/course.mp4"
        title="Médiane"
        instructor="Professeur Axelmond"
        activeSector="student"
      />,
    );

    const slider = screen.getByRole("slider", { name: "Volume vidéo" });
    const popover = slider.parentElement;
    const volumeGroup = popover?.parentElement;
    expect(popover).not.toBeNull();
    expect(volumeGroup).not.toBeNull();

    fireEvent.pointerEnter(volumeGroup!);
    fireEvent.focus(slider);
    fireEvent.pointerDown(slider);
    fireEvent.pointerLeave(volumeGroup!);
    fireEvent.pointerUp(slider);

    act(() => vi.advanceTimersByTime(300));
    expect(popover).toHaveClass("pointer-events-auto", "opacity-100");

    fireEvent.blur(slider);
    act(() => vi.advanceTimersByTime(300));
    expect(popover).toHaveClass("pointer-events-none", "opacity-0");
  });
});
