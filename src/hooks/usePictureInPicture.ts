import { useCallback, useEffect, useState, type RefObject } from "react";

export function usePictureInPicture(videoRef: RefObject<HTMLVideoElement | null>) {
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [pipError, setPipError] = useState<string | null>(null);
  const [isSupported] = useState(() => typeof document !== "undefined" && "pictureInPictureEnabled" in document);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnter = () => {
      setIsPiPActive(true);
      setPipError(null);
    };
    const handleLeave = () => setIsPiPActive(false);

    video.addEventListener("enterpictureinpicture", handleEnter);
    video.addEventListener("leavepictureinpicture", handleLeave);

    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnter);
      video.removeEventListener("leavepictureinpicture", handleLeave);
    };
  }, [videoRef]);

  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      setPipError("Aucune vidéo active pour le mode Picture-in-Picture.");
      return;
    }

    if (!isSupported || document.pictureInPictureEnabled === false) {
      setPipError("Picture-in-Picture non pris en charge par ce navigateur.");
      return;
    }

    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
        return;
      }
      if (document.pictureInPictureElement && document.pictureInPictureElement !== video) {
        await document.exitPictureInPicture();
      }
      await video.requestPictureInPicture();
      setPipError(null);
    } catch (err) {
      console.warn("[live] Picture-in-Picture failed", err);
      setPipError("Impossible d'activer Picture-in-Picture. Réessayez après interaction avec la vidéo.");
    }
  }, [isSupported, videoRef]);

  const exitPictureInPicture = useCallback(async () => {
    if (!document.pictureInPictureElement) return;
    try {
      await document.exitPictureInPicture();
    } catch (err) {
      console.warn("[live] Picture-in-Picture exit failed", err);
    }
  }, []);

  return {
    isPiPActive,
    pipError,
    isSupported,
    togglePictureInPicture,
    exitPictureInPicture,
    clearPipError: () => setPipError(null),
  };
}
