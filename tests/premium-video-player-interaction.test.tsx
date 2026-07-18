/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { act } from "react";
import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PremiumVideoPlayer from "../src/components/PremiumVideoPlayer";

// React 19 production builds omit React.act; testing-library still expects it.
if (typeof React.act !== "function") {
  (React as typeof React & { act: typeof act }).act = act;
}
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("PremiumVideoPlayer volume control", () => {
  afterEach(() => {
    cleanup();
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

  it("shows an explicit loader until video metadata is available", () => {
    const { container } = render(
      <PremiumVideoPlayer
        src="https://example.com/course.mp4"
        title="Médiane"
        instructor="Professeur Axelmond"
        activeSector="student"
      />,
    );

    expect(screen.getByText("Chargement de la vidéo…")).toBeInTheDocument();
    fireEvent.loadedMetadata(container.querySelector("video")!);
    expect(screen.queryByText("Chargement de la vidéo…")).not.toBeInTheDocument();
  });

  it("shows buffering without replacing it with a permanent error", () => {
    const { container } = render(
      <PremiumVideoPlayer
        src="https://example.com/course.mp4"
        title="Médiane"
        instructor="Professeur Axelmond"
        activeSector="student"
      />,
    );

    const video = container.querySelector("video")!;
    fireEvent.loadedMetadata(video);
    fireEvent.waiting(video);
    expect(screen.getByText("Mise en mémoire tampon…")).toBeInTheDocument();
    fireEvent.canPlay(video);
    expect(screen.queryByText("Mise en mémoire tampon…")).not.toBeInTheDocument();
  });

  it("uses two bounded automatic retries before showing the manual retry", () => {
    vi.useFakeTimers();
    const { container } = render(
      <PremiumVideoPlayer
        src="https://example.com/course.mp4"
        title="Médiane"
        instructor="Professeur Axelmond"
        activeSector="student"
      />,
    );

    fireEvent.error(container.querySelector("video")!);
    act(() => vi.advanceTimersByTime(500));
    fireEvent.error(container.querySelector("video")!);
    act(() => vi.advanceTimersByTime(1_000));
    fireEvent.error(container.querySelector("video")!);

    expect(screen.getByText("La vidéo ne peut pas être chargée pour le moment.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Réessayer/ }));
    expect(screen.getByText("Chargement de la vidéo…")).toBeInTheDocument();
  });

  it("resets the media state when the source changes", () => {
    const props = {
      title: "Médiane",
      instructor: "Professeur Axelmond",
      activeSector: "student",
    };
    const { container, rerender } = render(<PremiumVideoPlayer src="https://example.com/one.mp4" {...props} />);
    fireEvent.loadedMetadata(container.querySelector("video")!);
    expect(screen.queryByText("Chargement de la vidéo…")).not.toBeInTheDocument();

    rerender(<PremiumVideoPlayer src="https://example.com/two.mp4" {...props} />);
    expect(screen.getByText("Chargement de la vidéo…")).toBeInTheDocument();
  });
});
