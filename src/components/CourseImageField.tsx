import { useEffect, useId, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { RASTER_IMAGE_ACCEPT } from "../avatar-security";

interface CourseImageFieldProps {
  file: File | null;
  currentImageUrl?: string | null;
  status?: string;
  onFileChange: (file: File | null) => void;
}

export default function CourseImageField({ file, currentImageUrl, status = "", onFileChange }: CourseImageFieldProps) {
  const inputId = useId();
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setLocalPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const previewUrl = localPreviewUrl || currentImageUrl || "";

  return (
    <div className="space-y-2">
      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Image du module</span>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
          {previewUrl ? (
            <img src={previewUrl} alt="Aperçu du module" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-7 w-7 text-slate-600" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={inputId}
              className="inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-emerald-700 bg-emerald-950/50 px-3 py-2 text-[11px] font-black text-emerald-300 transition-colors hover:border-emerald-500 hover:text-emerald-200"
            >
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
              {previewUrl ? "Remplacer" : "Choisir une image"}
            </label>
            {file && (
              <button
                type="button"
                onClick={() => onFileChange(null)}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-xl px-2.5 py-2 text-[11px] font-bold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Annuler
              </button>
            )}
          </div>
          <input
            id={inputId}
            type="file"
            accept={RASTER_IMAGE_ACCEPT}
            className="sr-only"
            onChange={(event) => {
              const selectedFile = event.currentTarget.files?.[0] || null;
              onFileChange(selectedFile);
              event.currentTarget.value = "";
            }}
          />
          <p className="text-[10px] leading-relaxed text-slate-500">
            JPEG, PNG ou WebP, 8 Mo maximum. L'image sera cadrée en carré sur la carte.
          </p>
        </div>
      </div>
      {status && (
        <p className="text-[11px] font-semibold text-slate-400" aria-live="polite">
          {status}
        </p>
      )}
    </div>
  );
}
