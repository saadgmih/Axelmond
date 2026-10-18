/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { act } from "react";
import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PremiumVideoPlayer from "../src/components/PremiumVideoPlayer";

if (typeof React.act !== "function") {
  (React as typeof React & { act: typeof act }).act = act;
}
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("PremiumVideoPlayer Pillar 2 Features (PiP, Resume, Shortcuts, Seeker)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(document, "pictureInPictureEnabled", {
      value: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the Picture-in-Picture button when PiP is supported and handles click", () => {
    const { container } = render(
      <PremiumVideoPlayer
        src="https://example.com/course.mp4"
        title="Algèbre 1"
        instructor="Professeur Axelmond"
        activeSector="student"
      />,
    );

    const pipButton = screen.getByRole("button", { name: "Image dans l'image" });
    expect(pipButton).toBeInTheDocument();

    const video = container.querySelector("video")!;
    video.requestPictureInPicture = vi.fn().mockResolvedValue({} as any);

    fireEvent.click(pipButton);
    expect(video.requestPictureInPicture).toHaveBeenCalled();
  });

  it("displays resume playback prompt when saved progress is found in localStorage", () => {
    window.localStorage.setItem("pa_video_progress_content-42", "142");

    const { container } = render(
      <PremiumVideoPlayer
        contentId="content-42"
        src="https://example.com/course.mp4"
        title="Algèbre 1"
        instructor="Professeur Axelmond"
        activeSector="student"
      />,
    );

    const video = container.querySelector("video")!;
    video.play = vi.fn().mockResolvedValue(undefined);

    expect(screen.getByText(/Reprendre à/)).toBeInTheDocument();
    expect(screen.getByText("2:22")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reprendre" })).toBeInTheDocument();

    // Clicking Reprendre dismisses prompt and seeks
    fireEvent.click(screen.getByRole("button", { name: "Reprendre" }));
    expect(screen.queryByText(/Reprendre à/)).not.toBeInTheDocument();
  });

  it("handles keyboard shortcuts (space, m, arrow keys) when player is focused", () => {
    const { container } = render(
      <PremiumVideoPlayer
        src="https://example.com/course.mp4"
        title="Algèbre 1"
        instructor="Professeur Axelmond"
        activeSector="student"
      />,
    );

    const video = container.querySelector("video")!;
    video.play = vi.fn().mockResolvedValue(undefined);
    video.pause = vi.fn();
    Object.defineProperty(video, "duration", { value: 600, configurable: true });
    Object.defineProperty(video, "currentTime", { value: 50, writable: true, configurable: true });
    fireEvent.loadedMetadata(video);
    fireEvent.durationChange(video);

    const playerContainer = container.querySelector(".course-video-player") as HTMLElement;

    // Focus container
    playerContainer.focus();

    // Press 'k' to toggle play
    fireEvent.keyDown(window, { key: "k" });
    expect(video.play).toHaveBeenCalled();

    // Press 'ArrowRight' to seek forward
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(video.currentTime).toBe(55);

    // Press 'ArrowLeft' to seek backward
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(video.currentTime).toBe(50);

    // Press 'm' to mute
    fireEvent.keyDown(window, { key: "m" });
    expect(video.muted).toBe(true);
  });

  it("displays hover timestamp tooltip when moving cursor over progress slider", () => {
    const { container } = render(
      <PremiumVideoPlayer
        src="https://example.com/course.mp4"
        title="Algèbre 1"
        instructor="Professeur Axelmond"
        activeSector="student"
      />,
    );

    const video = container.querySelector("video")!;
    Object.defineProperty(video, "duration", { value: 200, configurable: true });
    fireEvent.loadedMetadata(video);
    fireEvent.durationChange(video);

    const progressContainer = container.querySelector(".course-video-progress")!;
    expect(progressContainer).toBeInTheDocument();

    // Mock getBoundingClientRect
    vi.spyOn(progressContainer, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 200,
      bottom: 20,
      width: 200,
      height: 20,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    // Move to 50% (x = 100)
    fireEvent.mouseMove(progressContainer, { clientX: 100 });
    // Duration is 200s, 50% is 100s -> 1:40
    expect(screen.getByText("1:40")).toBeInTheDocument();

    // Mouse leave hides tooltip
    fireEvent.mouseLeave(progressContainer);
    expect(screen.queryByText("1:40")).not.toBeInTheDocument();
  });
});
