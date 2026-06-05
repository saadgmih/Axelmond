import { genUploader } from "uploadthing/client";
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

export function validateUploadFile(file: File, type: "VIDEO" | "PDF" | "IMAGE" | "AVATAR" | "SUPPORT_IMAGE"): string {
  const sizeMb = file.size / (1024 * 1024);
  if (type === "PDF" && file.type !== "application/pdf") return "Sélectionnez un fichier PDF valide.";
  if ((type === "IMAGE" || type === "AVATAR" || type === "SUPPORT_IMAGE") && !file.type.startsWith("image/")) return "Sélectionnez une image valide.";
  if (type === "VIDEO" && !file.type.startsWith("video/")) return "Sélectionnez une vidéo valide.";
  if (type === "PDF" && sizeMb > 32) return "Le PDF ne doit pas dépasser 32 Mo.";
  if (type === "VIDEO" && sizeMb > 512) return "La vidéo ne doit pas dépasser 512 Mo.";
  if ((type === "IMAGE" || type === "AVATAR") && sizeMb > 8) return "L'image ne doit pas dépasser 8 Mo.";
  if (type === "SUPPORT_IMAGE" && sizeMb > 4) return "L'image ne doit pas dépasser 4 Mo.";
  return "";
}
