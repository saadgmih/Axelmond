import { describe, expect, it } from "vitest";
import {
  MessageAttachmentConfirmationError,
  resolveConfirmedMessageAttachment,
} from "../src/message-attachment-confirmation";

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
    await expect(
      resolveConfirmedMessageAttachment(
        {
          storageKey: "unknown-key",
          fileName: "message-vocal.weba",
          mimeType: "audio/webm",
          sizeBytes: 1024,
        },
        async () => ({ data: [] }),
      ),
    ).rejects.toEqual(expect.objectContaining<MessageAttachmentConfirmationError>({ statusCode: 404 }));
  });

  it("rejects an invalid attachment even when the storage key exists", async () => {
    await expect(
      resolveConfirmedMessageAttachment(
        {
          storageKey: "oversized-audio",
          fileName: "message-vocal.weba",
          mimeType: "audio/webm",
          sizeBytes: 17 * 1024 * 1024,
        },
        async () => ({ data: [{ key: "oversized-audio", url: "https://ufs.sh/f/oversized-audio" }] }),
      ),
    ).rejects.toEqual(expect.objectContaining<MessageAttachmentConfirmationError>({ statusCode: 400 }));
  });
});
