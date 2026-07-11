import type { BrowserContext } from "@playwright/test";

export const FAKE_MEDIA_CHROME_ARGS = ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"];

export async function attachFakeMediaStreams(context: BrowserContext) {
  await context.addInitScript(() => {
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const tracks: MediaStreamTrack[] = [];

      if (constraints?.audio) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          const dest = audioCtx.createMediaStreamDestination();
          const osc = audioCtx.createOscillator();
          osc.connect(dest);
          osc.start(0);
          const audioTrack = dest.stream.getAudioTracks()[0];
          if (audioTrack) tracks.push(audioTrack);
        } catch {
          /* headless fallback */
        }
      }

      if (constraints?.video) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#1e3a5f";
            ctx.fillRect(0, 0, 640, 480);
          }
          let angle = 0;
          setInterval(() => {
            if (!ctx) return;
            ctx.fillStyle = "#1e3a5f";
            ctx.fillRect(0, 0, 640, 480);
            ctx.fillStyle = "#fff";
            ctx.font = "24px sans-serif";
            ctx.fillText("PROD LIVE MOCK", 40, 80);
            ctx.beginPath();
            ctx.arc(320 + Math.cos(angle) * 80, 240 + Math.sin(angle) * 80, 16, 0, 2 * Math.PI);
            ctx.fillStyle = "#10b981";
            ctx.fill();
            angle += 0.12;
          }, 100);
          const stream = canvas.captureStream(30);
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) tracks.push(videoTrack);
        } catch {
          /* headless fallback */
        }
      }

      return new MediaStream(tracks);
    };
  });
}
