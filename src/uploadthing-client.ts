import { genUploader } from "uploadthing/client";
import { isAllowedRasterImageMime, isAllowedRasterImageUpload } from "./avatar-security";
import type { OurFileRouter } from "./uploadthing";

const viteEnv = (import.meta as any).env as { VITE_API_BASE_URL?: string };
const apiBaseUrl = (viteEnv.VITE_API_BASE_URL || "").replace(/\/$/, "");
export const uploadthingApiUrl = `${apiBaseUrl}/api/uploadthing`;

export const { uploadFiles } = genUploader<OurFileRouter>({ url: uploadthingApiUrl });

export function getUploadedFileUrl(file: any): string {
  return file?.serverData?.url
    || file?.serverData?.ufsUrl
    || file?.serverData?.appUrl
    || file?.ufsUrl
    || file?.appUrl
    || file?.url
    || "";
}

export function getUploadErrorMessage(err: any): string {
  const message = err?.message || err?.cause?.message || "";
  if (message.includes("Failed to report event")) {
    return "Le serveur d'upload ne répond pas. Vérifiez que localhost:3000 est lancé et que /api/uploadthing est accessible.";
  }
  if (message.includes("callback") || message.includes("callbackUrl")) {
    return "Callback UploadThing inaccessible. En local, utilisez le mode dev UploadThing ou un tunnel public.";
  }
  if (message.includes("Unauthorized") || message.includes("Authentification") || message.includes("Session")) {
    return "Session expirée ou non autorisée. Reconnectez-vous puis réessayez l'upload.";
  }
  if (message.includes("FileSizeMismatch") || message.includes("too large") || message.includes("exceeds")) {
    return "Fichier trop volumineux pour cette catégorie.";
  }
  return message || "Upload impossible. Vérifiez le fichier, la session et la configuration UploadThing.";
}

export function validateUploadFile(file: File, type: "VIDEO" | "PDF" | "IMAGE" | "AVATAR" | "SUPPORT_IMAGE" | "MESSAGE"): string {
  const sizeMb = file.size / (1024 * 1024);
  if (type === "MESSAGE") {
    const allowed = [
      "image/jpeg", "image/png", "image/webp",
      "video/mp4", "video/webm",
      "audio/mpeg", "audio/wav", "audio/webm",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) return "Type de fichier non autorisé pour la messagerie.";
    if (isAllowedRasterImageMime(file.type) && !isAllowedRasterImageUpload(file.name, file.type)) {
      return "Seules les images JPEG, PNG ou WebP sont autorisées.";
    }
    if (isAllowedRasterImageMime(file.type) && sizeMb > 8) return "L'image ne doit pas dépasser 8 Mo.";
    if (file.type.startsWith("video/") && sizeMb > 64) return "La vidéo ne doit pas dépasser 64 Mo.";
    if (file.type.startsWith("audio/") && sizeMb > 16) return "L'audio ne doit pas dépasser 16 Mo.";
    if ((file.type === "application/pdf" || file.type.includes("word")) && sizeMb > 16) return "Le document ne doit pas dépasser 16 Mo.";
    return "";
  }
  if (type === "PDF" && file.type !== "application/pdf") return "Sélectionnez un fichier PDF valide.";
  if ((type === "IMAGE" || type === "AVATAR" || type === "SUPPORT_IMAGE") && !isAllowedRasterImageUpload(file.name, file.type)) {
    return "Sélectionnez une image JPEG, PNG ou WebP.";
  }
  if (type === "VIDEO" && !file.type.startsWith("video/")) return "Sélectionnez une vidéo valide.";
  if (type === "PDF" && sizeMb > 32) return "Le PDF ne doit pas dépasser 32 Mo.";
  if (type === "VIDEO" && sizeMb > 512) return "La vidéo ne doit pas dépasser 512 Mo.";
  if ((type === "IMAGE" || type === "AVATAR") && sizeMb > 8) return "L'image ne doit pas dépasser 8 Mo.";
  if (type === "SUPPORT_IMAGE" && sizeMb > 4) return "L'image ne doit pas dépasser 4 Mo.";
  return "";
}
