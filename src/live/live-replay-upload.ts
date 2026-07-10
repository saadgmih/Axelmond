import { bindUploadProgress, getUploadErrorMessage, uploadFiles } from "../uploadthing-client";
import { getFreshSessionToken } from "../api";

type UploadLiveReplayInput = {
  courseId: number;
  liveSessionId: string;
  title: string;
};

export async function uploadLiveReplayVideo(
  file: File,
  input: UploadLiveReplayInput,
  onProgress?: (message: string) => void,
): Promise<void> {
  const token = await getFreshSessionToken();
  if (!token) {
    throw new Error("Session expirée. Reconnectez-vous pour enregistrer la rediffusion.");
  }

  try {
    await (uploadFiles as any)("liveReplay", {
      files: [file],
      input,
      headers: { Authorization: `Bearer ${token}` },
      onUploadProgress: onProgress
        ? bindUploadProgress((progress) => onProgress(`Téléversement rediffusion : ${progress}%`))
        : undefined,
    });
  } catch (err) {
    throw new Error(getUploadErrorMessage(err));
  }
}
