import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  confirmConversationAttachment: vi.fn(),
  uploadFiles: vi.fn(),
}));

vi.mock("../src/api", () => ({
  getFreshSessionToken: vi.fn(async () => "session-token"),
  api: { confirmConversationAttachment: mocks.confirmConversationAttachment },
}));

vi.mock("../src/uploadthing-client", () => ({
  uploadFiles: mocks.uploadFiles,
  bindUploadProgress: (callback: (progress: number) => void) => callback,
  getUploadedFileUrl: (entry: { ufsUrl?: string }) => entry?.ufsUrl || "",
  getUploadErrorMessage: () => "Upload impossible",
}));

import { uploadMessageAttachmentFile } from "../src/message-attachment-upload";

describe("message attachment upload callback fallback", () => {
  beforeEach(() => {
    mocks.confirmConversationAttachment.mockReset();
    mocks.uploadFiles.mockReset();
  });

  it("confirms an uploaded file through the API when callback data is missing", async () => {
    mocks.uploadFiles.mockResolvedValue([
      {
        key: "audio-key",
        ufsUrl: "https://ufs.sh/f/audio-key",
        serverData: null,
      },
    ]);
    mocks.confirmConversationAttachment.mockResolvedValue({
      kind: "AUDIO",
      fileName: "message-vocal.weba",
      mimeType: "audio/webm",
      sizeBytes: 4,
      url: "https://ufs.sh/f/audio-key",
      storageKey: "audio-key",
    });

    const file = new File([new Uint8Array([82, 73, 70, 70])], "message-vocal.weba", { type: "audio/webm" });
    const attachment = await uploadMessageAttachmentFile(file, "conversation-1");

    expect(mocks.confirmConversationAttachment).toHaveBeenCalledWith("conversation-1", {
      storageKey: "audio-key",
      fileName: "message-vocal.weba",
      mimeType: "audio/webm",
      sizeBytes: 4,
    });
    expect(attachment.kind).toBe("AUDIO");
    expect(attachment.storageKey).toBe("audio-key");
  });
});
