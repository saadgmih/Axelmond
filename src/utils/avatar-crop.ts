export type AvatarCropState = {
  zoom: number;
  panX: number;
  panY: number;
};

export const AVATAR_CROP_DEFAULTS: AvatarCropState = {
  zoom: 1,
  panX: 0,
  panY: 0,
};

export const AVATAR_VIEWPORT_SIZE = 320;
export const AVATAR_CIRCLE_SIZE = 280;
export const AVATAR_OUTPUT_SIZE = 512;

export function getAvatarBaseScale(imageWidth: number, imageHeight: number, circleSize = AVATAR_CIRCLE_SIZE) {
  return Math.max(circleSize / imageWidth, circleSize / imageHeight);
}

export function clampAvatarPan(
  panX: number,
  panY: number,
  imageWidth: number,
  imageHeight: number,
  zoom: number,
  circleSize = AVATAR_CIRCLE_SIZE,
) {
  const baseScale = getAvatarBaseScale(imageWidth, imageHeight, circleSize);
  const scale = baseScale * zoom;
  const renderedW = imageWidth * scale;
  const renderedH = imageHeight * scale;
  const maxPanX = Math.max(0, (renderedW - circleSize) / 2);
  const maxPanY = Math.max(0, (renderedH - circleSize) / 2);

  return {
    panX: Math.min(maxPanX, Math.max(-maxPanX, panX)),
    panY: Math.min(maxPanY, Math.max(-maxPanY, panY)),
  };
}

export async function loadImageElement(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de charger l'image sélectionnée."));
    img.src = source;
  });
}

export async function createCroppedAvatarFile(
  image: HTMLImageElement,
  crop: AvatarCropState,
  fileName = "profile-photo.jpg",
): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible pour le recadrage.");

  const baseScale = getAvatarBaseScale(image.width, image.height);
  const scale = baseScale * crop.zoom;
  const sourceSize = AVATAR_CIRCLE_SIZE / scale;
  const sourceCenterX = image.width / 2 - crop.panX / scale;
  const sourceCenterY = image.height / 2 - crop.panY / scale;
  const sourceX = sourceCenterX - sourceSize / 2;
  const sourceY = sourceCenterY - sourceSize / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
  ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.92);
  });
  if (!blob) throw new Error("Export de la photo recadrée impossible.");

  return new File([blob], fileName.replace(/\.\w+$/, "") + ".jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
