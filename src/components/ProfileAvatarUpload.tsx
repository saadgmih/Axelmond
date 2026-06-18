import { useRef, useState } from "react";
import { Camera, CheckCircle2, Trash2, Upload } from "lucide-react";
import AvatarPhotoEditor from "./AvatarPhotoEditor";

type AccentVariant = "indigo" | "pink" | "violet" | "teal";

const accentStyles: Record<AccentVariant, { button: string; ring: string; frame: string }> = {
  indigo: {
    button: "bg-indigo-600 hover:bg-indigo-700",
    ring: "ring-indigo-500/20",
    frame: "border-white/20 bg-gradient-to-tr from-indigo-500 to-purple-600",
  },
  pink: {
    button: "bg-pink-600 hover:bg-pink-700",
    ring: "ring-pink-500/20",
    frame: "border-white/20 bg-gradient-to-tr from-pink-500 to-rose-600",
  },
  violet: {
    button: "bg-violet-600 hover:bg-violet-700",
    ring: "ring-violet-500/20",
    frame: "border-white/15 bg-gradient-to-tr from-violet-600 to-purple-700",
  },
  teal: {
    button: "bg-teal-600 hover:bg-teal-700",
    ring: "ring-teal-500/20",
    frame: "border-white/15 bg-gradient-to-tr from-teal-500 to-cyan-600",
  },
};

const darkAccentStyles: Record<AccentVariant, { button: string; ring: string; frame: string }> = {
  indigo: {
    button: "bg-indigo-600 hover:bg-indigo-500",
    ring: "ring-indigo-500/25",
    frame: "border-white/15 bg-gradient-to-br from-indigo-950 to-[#020617]",
  },
  pink: {
    button: "bg-pink-600 hover:bg-pink-500",
    ring: "ring-pink-500/25",
    frame: "border-white/15 bg-gradient-to-br from-pink-950 to-[#020617]",
  },
  violet: {
    button: "bg-violet-600 hover:bg-violet-500",
    ring: "ring-violet-500/25",
    frame: "border-white/15 bg-gradient-to-br from-violet-950 to-[#020617]",
  },
  teal: {
    button: "bg-teal-600 hover:bg-teal-500",
    ring: "ring-teal-500/25",
    frame: "border-white/15 bg-gradient-to-br from-teal-950 to-[#020617]",
  },
};

interface ProfileAvatarUploadProps {
  avatarUrl?: string;
  initials?: string;
  statusMsg: string;
  accent?: AccentVariant;
  variant?: "light" | "dark";
  previewSize?: number;
  onUpload: (file: File) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}

export default function ProfileAvatarUpload({
  avatarUrl,
  initials = "AR",
  statusMsg,
  accent = "indigo",
  variant = "light",
  previewSize = 112,
  onUpload,
  onDelete,
}: ProfileAvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const theme = variant === "dark" ? darkAccentStyles[accent] : accentStyles[accent];
  const isDark = variant === "dark";
  const initialsSize = previewSize >= 96 ? "text-3xl" : previewSize >= 80 ? "text-2xl" : "text-lg";

  const handleFilePick = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setSelectedFile(file);
    setIsEditorOpen(true);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleConfirm = async (croppedFile: File) => {
    setIsUploading(true);
    try {
      await onUpload(croppedFile);
      setIsEditorOpen(false);
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Choisir une photo de profil"
          className="group relative shrink-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
        >
          <div
            className={`relative overflow-hidden rounded-2xl border-4 shadow-2xl ring-4 ${theme.frame} ${theme.ring}`}
            style={{ width: previewSize, height: previewSize }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Photo de profil" className="h-full w-full object-cover" />
            ) : (
              <div className={`flex h-full w-full items-center justify-center font-black text-white ${initialsSize}`}>
                {initials}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition-colors group-hover:bg-slate-950/45 group-focus-visible:bg-slate-950/45">
              <span className="flex h-10 w-10 scale-90 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white opacity-0 backdrop-blur-sm transition-all group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100">
                <Camera className="h-5 w-5" />
              </span>
            </div>
          </div>

          {avatarUrl && (
            <span className="pointer-events-none absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500 shadow-lg">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </span>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFilePick(e.target.files?.[0] || null)}
            className="sr-only"
          />
        </button>

        <p className={`max-w-[220px] text-center text-[11px] leading-relaxed ${isDark ? "text-slate-500" : "text-slate-500"}`}>
          Cliquez sur la photo pour la modifier ou la recadrer.
        </p>

        {avatarUrl && (
          <button
            type="button"
            onClick={onDelete}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
              isDark
                ? "text-slate-500 hover:bg-red-950/30 hover:text-red-300"
                : "text-slate-500 hover:bg-red-50 hover:text-red-600"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer la photo
          </button>
        )}

        {statusMsg && (
          <p
            className={`w-full rounded-xl px-3 py-2 text-center text-[11px] font-semibold ${
              isDark ? "bg-indigo-950/40 text-indigo-300" : "bg-slate-50 text-slate-500"
            }`}
          >
            {statusMsg}
          </p>
        )}
      </div>

      {selectedFile && (
        <AvatarPhotoEditor
          file={selectedFile}
          isOpen={isEditorOpen}
          accentClass={theme.button}
          onCancel={() => {
            setIsEditorOpen(false);
            setSelectedFile(null);
          }}
          onConfirm={handleConfirm}
        />
      )}

      {isUploading && isEditorOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/40">
          <div className="rounded-2xl bg-white px-5 py-4 text-xs font-bold text-slate-700 shadow-xl">
            <Upload className="mx-auto mb-2 h-5 w-5 animate-pulse text-indigo-600" />
            Téléversement en cours...
          </div>
        </div>
      )}
    </>
  );
}
