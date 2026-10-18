/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PremiumVideoPlayer from "../src/components/PremiumVideoPlayer";

describe("PremiumVideoPlayer Settings Popover (Quality & Speed)", () => {
  it("opens settings popover with Quality and Speed options matching user design", () => {
    const { container } = render(
      <PremiumVideoPlayer
        src="https://example.com/video.mp4"
        title="Cours d'analyse"
        instructor="Professeur Axelmond"
        activeSector="student"
      />,
    );

    // Initial state: settings popover is closed
    expect(screen.queryByText("Quality")).not.toBeInTheDocument();
    expect(screen.queryByText("Speed")).not.toBeInTheDocument();

    // Click settings button
    const settingsButton = screen.getByRole("button", { name: "Paramètres vidéo" });
    fireEvent.click(settingsButton);

    // Main settings menu is now open
    expect(screen.getByText("Quality")).toBeInTheDocument();
    expect(screen.getByText("Speed")).toBeInTheDocument();
    expect(screen.getByText("Auto")).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();

    // Click Quality row
    fireEvent.click(screen.getByText("Quality"));

    // Quality submenu is shown with 4K, 2K, 1080p, 720p, 480p, 360p
    expect(screen.getByText("2160p")).toBeInTheDocument();
    expect(screen.getByText("4K")).toBeInTheDocument();
    expect(screen.getByText("1440p")).toBeInTheDocument();
    expect(screen.getByText("2K")).toBeInTheDocument();
    expect(screen.getByText("1080p")).toBeInTheDocument();
    expect(screen.getByText("720p")).toBeInTheDocument();
    expect(screen.getByText("480p")).toBeInTheDocument();
    expect(screen.getByText("360p")).toBeInTheDocument();

    // Select 4K
    fireEvent.click(screen.getByText("4K"));

    // Popover closes, and localStorage remembers 4K
    expect(window.localStorage.getItem("axelmond-video-quality")).toBe("4K");
    expect(screen.queryByText("2160p")).not.toBeInTheDocument();

    // Reopen settings menu - main row displays 4K
    fireEvent.click(settingsButton);
    expect(screen.getByText("4K")).toBeInTheDocument();

    // Click Speed row
    fireEvent.click(screen.getByText("Speed"));

    // Speed submenu is shown
    const speedButton = screen.getByRole("button", { name: /1\.5x/ });
    expect(speedButton).toBeInTheDocument();

    // Select 1.5x
    fireEvent.click(speedButton);

    // Video playback rate is updated
    const video = container.querySelector("video") as HTMLVideoElement;
    expect(video.playbackRate).toBe(1.5);
  });
});
