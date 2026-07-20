/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { act } from "react";
import * as React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

if (typeof React.act !== "function") {
  (React as typeof React & { act: typeof act }).act = act;
}
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mediaSourceMock = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("../src/api", () => ({
  api: { getLessonContentMediaSource: mediaSourceMock.get },
}));

import PremiumVideoPlayer from "../src/components/PremiumVideoPlayer";

describe("PremiumVideoPlayer resilient source fallback", () => {
  afterEach(() => {
    cleanup();
    mediaSourceMock.get.mockReset();
  });

  it("switches from the CDN URL to the authenticated same-origin relay after a playback error", async () => {
    mediaSourceMock.get.mockResolvedValue({
      sourceUrl: "https://app-id.ufs.sh/f/video-key",
      proxySourceUrl: "/api/lesson-contents/content-1/media",
      mimeType: "video/mp4",
    });

    const { container } = render(
      <PremiumVideoPlayer
        contentId="content-1"
        src="https://app-id.ufs.sh/f/video-key"
        title="Vidéo"
        instructor="Professeur"
        activeSector="student"
      />,
    );

    await waitFor(() =>
      expect(container.querySelector("video")?.getAttribute("src")).toBe("https://app-id.ufs.sh/f/video-key"),
    );
    fireEvent.error(container.querySelector("video")!);
    expect(container.querySelector("video")?.getAttribute("src")).toBe("/api/lesson-contents/content-1/media");
  });

  it("uses a CSS brand signature during the encoded intro to avoid video color seams", async () => {
    mediaSourceMock.get.mockResolvedValue({
      sourceUrl: "https://app-id.ufs.sh/f/branded-video",
      proxySourceUrl: "/api/lesson-contents/content-1/media",
      mimeType: "video/mp4",
      brandedIntroDuration: 5,
    });

    const { container } = render(
      <PremiumVideoPlayer
        contentId="content-1"
        src="https://app-id.ufs.sh/f/branded-video"
        title="Vidéo"
        instructor="Professeur"
        activeSector="student"
      />,
    );

    await waitFor(() => expect(screen.getByTestId("branded-video-intro")).toHaveClass("bg-slate-950"));
    const video = container.querySelector("video")!;
    expect(video).toHaveClass("opacity-0");

    Object.defineProperty(video, "currentTime", { configurable: true, value: 5.1 });
    fireEvent.timeUpdate(video);

    await waitFor(() => expect(screen.queryByTestId("branded-video-intro")).not.toBeInTheDocument());
    expect(video).toHaveClass("opacity-100");
  });
});
