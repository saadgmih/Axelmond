import { useRef, useState } from "react";
import { Camera, Trash2, Upload } from "lucide-react";
import AvatarPhotoEditor from "./AvatarPhotoEditor";

type AccentVariant = "indigo" | "pink" | "violet" | "teal";

const accentStyles: Record<AccentVariant, { button: string; border: string; icon: string }> = {
  indigo: {
    button: "bg-indigo-600 hover:bg-indigo-700",
    border: "hover:border-indigo-300 hover:bg-indigo-50/30",
    icon: "text-indigo-400",
  },
  pink: {
    button: "bg-pink-600 hover:bg-pink-700",
    border: "hover:border-pink-300 hover:bg-pink-50/30",
    icon: "text-pink-500",
  },
  violet: {
    button: "bg-violet-600 hover:bg-violet-700",
    border: "hover:border-violet-300 hover:bg-violet-50/30",
    icon: "text-violet-500",
  },
  teal: {
    button: "bg-teal-600 hover:bg-teal-700",
    border: "hover:border-teal-300 hover:bg-teal-50/30",
    icon: "text-teal-500",
  },
};

interface ProfileAvatarUploadProps {
  avatarUrl?: string;
  initials?: string;
  statusMsg: string;
  accent?: AccentVariant;
  onUpload: (file: File) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}

export default function ProfileAvatarUpload({
  avatarUrl,
  initials = "AR",
  statusMsg,
  accent = "indigo",
  onUpload,
  onDelete,
}: ProfileAvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const theme = accentStyles[accent];

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
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Photo de profil" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-sm font-black text-white">
                {initials}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800">Aperçu actuel</p>
            <p className="text-[11px] text-slate-500">Recadrez la zone visible de votre photo de profil.</p>
          </div>
        </div>

        <label
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 transition-colors ${theme.border}`}
        >
          <Camera className={`h-5 w-5 ${theme.icon}`} />
          <span className="text-center text-[11px] font-semibold text-slate-600">
            Choisir une photo et recadrer
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFilePick(e.target.files?.[0] || null)}
            className="sr-only"
          />
        </label>

        <button
          type="button"
          onClick={onDelete}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Supprimer la photo
        </button>

        {statusMsg && (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-center text-[11px] font-semibold text-slate-500">
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
