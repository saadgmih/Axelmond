import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { getClientErrorMessage } from "../../client-errors";
import { api, getFreshSessionToken } from "../../api";
import type { AppUser } from "../../shared/app-user";
import {
  bindUploadProgress,
  formatUploadProgressLabel,
  uploadFiles,
  getUploadedFileUrl,
  getUploadErrorMessage,
  validateUploadFile,
} from "../../uploadthing-client";

type AcademicProfileFormSetter = Dispatch<SetStateAction<Record<string, unknown>>>;

export function usePlatformAvatarActions(
  currentUser: AppUser | null,
  updateSessionUser: (user: AppUser) => void,
  setAcademicProfileForm: AcademicProfileFormSetter,
) {
  const [avatarStatusMsg, setAvatarStatusMsg] = useState("");

  const handleUploadAvatarFile = useCallback(
    async (file: File) => {
      const token = await getFreshSessionToken();
      if (!currentUser || !token) {
        setAvatarStatusMsg("Session expirée. Reconnectez-vous.");
        return;
      }

      const validationError = validateUploadFile(file, "AVATAR");
      if (validationError) {
        setAvatarStatusMsg(validationError);
        return;
      }

      try {
        setAvatarStatusMsg("Téléversement de la photo...");
        const result = await (uploadFiles as any)("avatarImage", {
          files: [file],
          headers: { Authorization: `Bearer ${token}` },
          onUploadProgress: bindUploadProgress((progress) =>
            setAvatarStatusMsg(`Téléversement de la photo : ${formatUploadProgressLabel(progress)}`),
          ),
        });
        const avatarUrl = getUploadedFileUrl(result?.[0]);
        if (!avatarUrl) throw new Error("URL de photo introuvable après téléversement");
        const updatedUser = { ...currentUser, avatarUrl };
        updateSessionUser(updatedUser);
        setAcademicProfileForm((prev) => ({ ...prev, avatarUrl }));
        setAvatarStatusMsg("Photo de profil mise à jour.");
      } catch (err: any) {
        console.error("Failed to upload avatar:", err);
        setAvatarStatusMsg(getUploadErrorMessage(err));
        throw err;
      }
    },
    [currentUser, updateSessionUser, setAcademicProfileForm],
  );

  const handleDeleteAvatar = useCallback(async () => {
    if (!currentUser) return;
    try {
      const response = await api.deleteAvatar();
      const updatedUser = response.user ? (response.user as AppUser) : { ...currentUser, avatarUrl: undefined };
      updateSessionUser(updatedUser);
      setAcademicProfileForm((prev) => ({ ...prev, avatarUrl: "" }));
      setAvatarStatusMsg(response.message || "Photo de profil supprimée.");
    } catch (err: any) {
      setAvatarStatusMsg(getClientErrorMessage(err, "Suppression de la photo impossible."));
    }
  }, [currentUser, updateSessionUser, setAcademicProfileForm]);

  return { avatarStatusMsg, handleUploadAvatarFile, handleDeleteAvatar };
}
