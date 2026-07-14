import { describe, expect, it } from "vitest";
import {
  MessageAttachmentConfirmationError,
  resolveConfirmedMessageAttachment,
} from "../src/message-attachment-confirmation";

async function expectConfirmationError(promise: Promise<unknown>, statusCode: number): Promise<void> {
  try {
    await promise;
    expect.unreachable("La confirmation devait échouer");
  } catch (error) {
    expect(error).toBeInstanceOf(MessageAttachmentConfirmationError);
    if (!(error instanceof MessageAttachmentConfirmationError)) throw error;
    expect(error.statusCode).toBe(statusCode);
  }
}

describe("message attachment upload confirmation", () => {
  it("uses the URL verified by UploadThing", async () => {
    const attachment = await resolveConfirmedMessageAttachment(
      {
        storageKey: "audio-key",
        fileName: "message-vocal-123.weba",
        mimeType: "audio/webm",
        sizeBytes: 1024,
      },
      async () => ({ data: [{ key: "audio-key", url: "https://ufs.sh/f/audio-key" }] }),
    );

    expect(attachment).toEqual({
      kind: "AUDIO",
      fileName: "message-vocal-123.weba",
      mimeType: "audio/webm",
      sizeBytes: 1024,
      url: "https://ufs.sh/f/audio-key",
      storageKey: "audio-key",
    });
  });

  it("rejects a key that UploadThing cannot verify", async () => {
    await expectConfirmationError(
      resolveConfirmedMessageAttachment(
        {
          storageKey: "unknown-key",
          fileName: "message-vocal.weba",
          mimeType: "audio/webm",
          sizeBytes: 1024,
        },
        async () => ({ data: [] }),
      ),
      404,
    );
  });

  it("rejects an invalid attachment even when the storage key exists", async () => {
    await expectConfirmationError(
      resolveConfirmedMessageAttachment(
        {
          storageKey: "oversized-audio",
          fileName: "message-vocal.weba",
          mimeType: "audio/webm",
          sizeBytes: 17 * 1024 * 1024,
        },
        async () => ({ data: [{ key: "oversized-audio", url: "https://ufs.sh/f/oversized-audio" }] }),
      ),
      400,
    );
  });
});
