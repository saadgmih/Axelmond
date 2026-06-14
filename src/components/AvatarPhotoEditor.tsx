import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Minus, Plus, RotateCcw, X, ZoomIn } from "lucide-react";
import {
  AVATAR_CIRCLE_SIZE,
  AVATAR_CROP_DEFAULTS,
  AVATAR_VIEWPORT_SIZE,
  clampAvatarPan,
  createCroppedAvatarFile,
  loadImageElement,
  type AvatarCropState,
} from "../utils/avatar-crop";
import { getClientErrorMessage } from "../client-errors";

interface AvatarPhotoEditorProps {
  file: File;
  isOpen: boolean;
  accentClass?: string;
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void | Promise<void>;
}

export default function AvatarPhotoEditor({
  file,
  isOpen,
  accentClass = "bg-indigo-600 hover:bg-indigo-700",
  onCancel,
  onConfirm,
}: AvatarPhotoEditorProps) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [crop, setCrop] = useState<AvatarCropState>(AVATAR_CROP_DEFAULTS);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    if (!isOpen || !file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setCrop(AVATAR_CROP_DEFAULTS);
    setErrorMsg("");
    loadImageElement(url)
      .then((img) => setImageSize({ width: img.width, height: img.height }))
      .catch((err) => setErrorMsg(getClientErrorMessage(err, "Image invalide.")));

    return () => URL.revokeObjectURL(url);
  }, [file, isOpen]);

  const updateCrop = useCallback(
    (next: Partial<AvatarCropState>) => {
      setCrop((prev) => {
        const merged = { ...prev, ...next };
        if (!imageSize.width || !imageSize.height) return merged;
        const clamped = clampAvatarPan(merged.panX, merged.panY, imageSize.width, imageSize.height, merged.zoom);
        return { ...merged, ...clamped };
      });
    },
    [imageSize.height, imageSize.width],
  );

  const baseScale =
    imageSize.width && imageSize.height
      ? Math.max(AVATAR_CIRCLE_SIZE / imageSize.width, AVATAR_CIRCLE_SIZE / imageSize.height)
      : 1;
  const scale = baseScale * crop.zoom;
  const imageWidth = imageSize.width * scale;
  const imageHeight = imageSize.height * scale;

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, panX: crop.panX, panY: crop.panY };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const deltaX = event.clientX - dragRef.current.x;
    const deltaY = event.clientY - dragRef.current.y;
    updateCrop({
      panX: dragRef.current.panX + deltaX,
      panY: dragRef.current.panY + deltaY,
    });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleConfirm = async () => {
    if (!previewUrl) return;
    setIsSaving(true);
    setErrorMsg("");
    try {
      const image = await loadImageElement(previewUrl);
      const cropped = await createCroppedAvatarFile(image, crop, file.name);
      await onConfirm(cropped);
    } catch (err: any) {
      setErrorMsg(getClientErrorMessage(err, "Recadrage impossible."));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h3 className="text-sm font-black">Recadrer la photo</h3>
            <p className="text-[11px] text-slate-400">Déplacez et zoomez comme sur WhatsApp</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-700 p-2 text-slate-300 transition-colors hover:bg-slate-800"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-6">
          <div
            className="relative mx-auto touch-none overflow-hidden rounded-[28px] bg-slate-950"
            style={{ width: AVATAR_VIEWPORT_SIZE, height: AVATAR_VIEWPORT_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={(event) => {
              event.preventDefault();
              updateCrop({ zoom: Math.min(3, Math.max(1, crop.zoom + (event.deltaY < 0 ? 0.08 : -0.08))) });
            }}
          >
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Aperçu recadrage"
                draggable={false}
                className="absolute max-w-none select-none"
                style={{
                  width: imageWidth,
                  height: imageHeight,
                  left: AVATAR_VIEWPORT_SIZE / 2 - imageWidth / 2 + crop.panX,
                  top: AVATAR_VIEWPORT_SIZE / 2 - imageHeight / 2 + crop.panY,
                }}
              />
            )}

            <div className="pointer-events-none absolute inset-0">
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(2,6,23,0.72)]"
                style={{ width: AVATAR_CIRCLE_SIZE, height: AVATAR_CIRCLE_SIZE }}
              />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3">
              <ZoomIn className="h-4 w-4 shrink-0 text-slate-400" />
              <button
                type="button"
                onClick={() => updateCrop({ zoom: Math.max(1, crop.zoom - 0.1) })}
                className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
                aria-label="Zoom arrière"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={crop.zoom}
                onChange={(e) => updateCrop({ zoom: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
              <button
                type="button"
                onClick={() => updateCrop({ zoom: Math.min(3, crop.zoom + 0.1) })}
                className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
                aria-label="Zoom avant"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCrop(AVATAR_CROP_DEFAULTS)}
              className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-400 transition-colors hover:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Réinitialiser le cadrage
            </button>
          </div>
        </div>

        {errorMsg && <p className="px-5 pb-2 text-center text-xs font-semibold text-red-300">{errorMsg}</p>}

        <div className="flex gap-3 border-t border-slate-800 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-700 py-3 text-xs font-bold text-slate-200 hover:bg-slate-800"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={isSaving || !previewUrl}
            onClick={handleConfirm}
            className={`flex-1 rounded-xl py-3 text-xs font-bold text-white disabled:opacity-60 ${accentClass}`}
          >
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
