import { isAllowedRasterImageMime, isAllowedRasterImageUpload } from "./avatar-security";
import {
  detectMessageAttachmentKind,
  MESSAGE_AUDIO_MIME_TYPES,
  MESSAGE_DOCUMENT_MIME_TYPES,
  MESSAGE_VIDEO_MIME_TYPES,
  normalizeMessageAttachmentMimeType,
} from "./message-attachment-utils";

const viteEnv = (import.meta as any).env as { VITE_API_BASE_URL?: string };
const apiBaseUrl = (viteEnv.VITE_API_BASE_URL || "").replace(/\/$/, "");
export const uploadthingApiUrl = `${apiBaseUrl}/api/storage/upload`;

export interface NativeUploadOptions {
  files: (File | Blob)[];
  input?: any;
  headers?: Record<string, string>;
  onUploadProgress?: (progress: { progress: number; file?: File | Blob }) => void;
}

export async function uploadFiles(endpoint: string, options: NativeUploadOptions): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${apiBaseUrl}/api/storage/upload?endpoint=${encodeURIComponent(endpoint)}`;
    xhr.open("POST", url);

    if (options.headers) {
      for (const [key, val] of Object.entries(options.headers)) {
        if (key.toLowerCase() !== "content-type") {
          xhr.setRequestHeader(key, val);
        }
      }
    }

    if (options.onUploadProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
          options.onUploadProgress?.({ progress: percent, file: options.files[0] });
        }
      };
    }

    xhr.onload = () => {
      let data: any;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && Array.isArray(data)) {
        resolve(data);
      } else {
        const errorMsg =
          data?.error ||
          data?.message ||
          (xhr.status === 413
            ? "Fichier trop volumineux pour le serveur."
            : xhr.status === 401
              ? "Session expirée ou non autorisée."
              : `Échec du téléversement (${xhr.status})`);
        const err = new Error(errorMsg);
        (err as any).serverData = data;
        (err as any).status = xhr.status;
        reject(err);
      }
    };

    xhr.onerror = () => {
      reject(new Error("Erreur de connexion réseau lors du téléversement."));
    };

    xhr.ontimeout = () => {
      reject(new Error("Délai de téléversement dépassé."));
    };

    const formData = new FormData();
    for (const f of options.files) {
      if (f instanceof File) {
        formData.append("files", f, f.name);
      } else {
        formData.append("files", f, "blob.bin");
      }
    }

    if (options.input !== undefined) {
      formData.append("input", JSON.stringify(options.input));
    }

    xhr.send(formData);
  });
}

export {
  bindUploadProgress,
  clampUploadProgress,
  formatUploadProgressLabel,
  formatUploadProgressPercent,
  uploadProgressBarWidth,
} from "./upload-progress";

export function getUploadedFileUrl(file: any): string {
  return (
    file?.serverData?.url ||
    file?.serverData?.ufsUrl ||
    file?.serverData?.appUrl ||
    file?.ufsUrl ||
    file?.appUrl ||
    file?.url ||
    ""
  );
}

export function getUploadedFileCustomId(file: any): string {
  const customId = file?.customId || file?.serverData?.customId;
  return typeof customId === "string" ? customId.trim() : "";
}

import { sanitizeClientErrorMessage } from "./client-errors";

export function getUploadErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const record = err as Record<string, unknown>;
    if (record.code === "UPLOAD_RATE_LIMIT_EXCEEDED") {
      return "Trop d'envois de fichiers. Veuillez patienter 15 minutes.";
    }
    const serverData = record.serverData;
    if (serverData && typeof serverData === "object") {
      const serverError = (serverData as Record<string, unknown>).error;
      if (typeof serverError === "string" && serverError.trim()) {
        return sanitizeClientErrorMessage(serverError, "Upload impossible. Vérifiez le fichier et réessayez.");
      }
    }
  }

  const rawMessage =
    err && typeof err === "object"
      ? String(
          (err as { message?: string; error?: string; cause?: { message?: string } }).message ||
            (err as { error?: string }).error ||
            (err as { cause?: { message?: string } }).cause?.message ||
            "",
        )
      : typeof err === "string"
        ? err
        : "";
  if (rawMessage.includes("Failed to report event")) {
    return "Le serveur d'upload ne répond pas. Vérifiez votre connexion et réessayez.";
  }
  if (rawMessage.includes("callback") || rawMessage.includes("callbackUrl")) {
    return "Service d'upload temporairement indisponible. Réessayez dans quelques instants.";
  }
  if (
    rawMessage.includes("Unauthorized") ||
    rawMessage.includes("Authentification") ||
    rawMessage.includes("Session")
  ) {
    return "Session expirée ou non autorisée. Reconnectez-vous puis réessayez l'upload.";
  }
  if (rawMessage.includes("FileSizeMismatch") || rawMessage.includes("too large") || rawMessage.includes("exceeds")) {
    return "Fichier trop volumineux pour cette catégorie.";
  }
  if (rawMessage.includes("Invalid file type") || rawMessage.includes("Type de fichier non autorisé")) {
    return "Type de fichier non autorisé pour la messagerie.";
  }
  if (rawMessage.includes("Invalid input") || rawMessage.includes("invalid_type") || rawMessage.includes("too_small")) {
    return "Données de téléversement invalides. Vérifiez le titre et les informations du fichier.";
  }
  return sanitizeClientErrorMessage(rawMessage, "Upload impossible. Vérifiez le fichier et réessayez.");
}

export function validateUploadFile(
  file: File,
  type: "VIDEO" | "PDF" | "IMAGE" | "AVATAR" | "SUPPORT_IMAGE" | "MESSAGE",
): string {
  const sizeMb = file.size / (1024 * 1024);
  if (type === "MESSAGE") {
    const normalizedType = normalizeMessageAttachmentMimeType(file.type, file.name);
    const kind = detectMessageAttachmentKind(normalizedType, file.name);
    const isAllowed =
      kind === "IMAGE"
        ? isAllowedRasterImageMime(normalizedType)
        : kind === "VIDEO"
          ? MESSAGE_VIDEO_MIME_TYPES.includes(normalizedType as (typeof MESSAGE_VIDEO_MIME_TYPES)[number])
          : kind === "AUDIO"
            ? MESSAGE_AUDIO_MIME_TYPES.includes(normalizedType as (typeof MESSAGE_AUDIO_MIME_TYPES)[number])
            : kind === "DOCUMENT"
              ? MESSAGE_DOCUMENT_MIME_TYPES.includes(normalizedType as (typeof MESSAGE_DOCUMENT_MIME_TYPES)[number])
              : false;

    if (!isAllowed) return "Type de fichier non autorisé pour la messagerie.";
    if (kind === "IMAGE" && !isAllowedRasterImageUpload(file.name, normalizedType)) {
      return "Seules les images JPEG, PNG ou WebP sont autorisées.";
    }
    if (kind === "IMAGE" && sizeMb > 8) return "L'image ne doit pas dépasser 8 Mo.";
    if (kind === "VIDEO" && sizeMb > 64) return "La vidéo ne doit pas dépasser 64 Mo.";
    if (kind === "AUDIO" && sizeMb > 16) return "L'audio ne doit pas dépasser 16 Mo.";
    if (kind === "DOCUMENT" && sizeMb > 16) return "Le document ne doit pas dépasser 16 Mo.";
    return "";
  }
  if (type === "PDF" && file.type !== "application/pdf") return "Sélectionnez un fichier PDF valide.";
  if (
    (type === "IMAGE" || type === "AVATAR" || type === "SUPPORT_IMAGE") &&
    !isAllowedRasterImageUpload(file.name, file.type)
  ) {
    return "Sélectionnez une image JPEG, PNG ou WebP.";
  }
  if (type === "VIDEO" && !file.type.startsWith("video/")) return "Sélectionnez une vidéo valide.";
  if (type === "PDF" && sizeMb > 32) return "Le PDF ne doit pas dépasser 32 Mo.";
  if (type === "VIDEO" && sizeMb > 5120) return "La vidéo ne doit pas dépasser 5 Go.";
  if ((type === "IMAGE" || type === "AVATAR") && sizeMb > 8) return "L'image ne doit pas dépasser 8 Mo.";
  if (type === "SUPPORT_IMAGE" && sizeMb > 4) return "L'image ne doit pas dépasser 4 Mo.";
  return "";
}
