import { genUploader } from "uploadthing/client";
import { isAllowedRasterImageMime, isAllowedRasterImageUpload } from "./avatar-security";
import type { OurFileRouter } from "./uploadthing";

const viteEnv = (import.meta as any).env as { VITE_API_BASE_URL?: string };
const apiBaseUrl = (viteEnv.VITE_API_BASE_URL || "").replace(/\/$/, "");
export const uploadthingApiUrl = `${apiBaseUrl}/api/uploadthing`;

export const { uploadFiles } = genUploader<OurFileRouter>({ url: uploadthingApiUrl });

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
  return sanitizeClientErrorMessage(rawMessage, "Upload impossible. Vérifiez le fichier et réessayez.");
}

export function validateUploadFile(
  file: File,
  type: "VIDEO" | "PDF" | "IMAGE" | "AVATAR" | "SUPPORT_IMAGE" | "MESSAGE",
): string {
  const sizeMb = file.size / (1024 * 1024);
  if (type === "MESSAGE") {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "audio/mpeg",
      "audio/wav",
      "audio/webm",
      "audio/mp4",
      "audio/ogg",
      "audio/x-m4a",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const normalizedType = file.type.toLowerCase().split(";")[0].trim();
    if (!allowed.includes(normalizedType)) return "Type de fichier non autorisé pour la messagerie.";
    if (isAllowedRasterImageMime(normalizedType) && !isAllowedRasterImageUpload(file.name, normalizedType)) {
      return "Seules les images JPEG, PNG ou WebP sont autorisées.";
    }
    if (isAllowedRasterImageMime(normalizedType) && sizeMb > 8) return "L'image ne doit pas dépasser 8 Mo.";
    if (normalizedType.startsWith("video/") && sizeMb > 64) return "La vidéo ne doit pas dépasser 64 Mo.";
    if (normalizedType.startsWith("audio/") && sizeMb > 16) return "L'audio ne doit pas dépasser 16 Mo.";
    if ((normalizedType === "application/pdf" || normalizedType.includes("word")) && sizeMb > 16)
      return "Le document ne doit pas dépasser 16 Mo.";
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
  if (type === "VIDEO" && sizeMb > 512) return "La vidéo ne doit pas dépasser 512 Mo.";
  if ((type === "IMAGE" || type === "AVATAR") && sizeMb > 8) return "L'image ne doit pas dépasser 8 Mo.";
  if (type === "SUPPORT_IMAGE" && sizeMb > 4) return "L'image ne doit pas dépasser 4 Mo.";
  return "";
}
