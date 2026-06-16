import { useEffect, useState } from "react";
import { Camera, FileText } from "lucide-react";
import { getFreshSessionToken } from "../api";

interface PdfLessonViewerProps {
  contentId: string;
  title: string;
  mediaType?: "PDF" | "IMAGE";
}

export default function PdfLessonViewer({ contentId, title, mediaType = "PDF" }: PdfLessonViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const loadDocument = async () => {
      setLoading(true);
      setError("");
      setBlobUrl(null);

      try {
        const token = await getFreshSessionToken();
        if (!token) {
          throw new Error("Session expirée. Reconnectez-vous.");
        }

        const response = await fetch(`/api/lesson-contents/${contentId}/document`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Impossible d'afficher ce contenu dans la plateforme.");
        }

        const blob = await response.blob();
        if (!blob.size) {
          throw new Error("Le fichier est vide ou inaccessible.");
        }

        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setBlobUrl(objectUrl);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Impossible de charger le contenu.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadDocument();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [contentId]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="mt-3 text-sm font-medium text-slate-600">Chargement du contenu…</p>
        </div>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5">
        <div className="flex items-start gap-3">
          {mediaType === "IMAGE" ? (
            <Camera className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          ) : (
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          )}
          <div>
            <p className="text-sm font-semibold text-amber-900">{title}</p>
            <p className="mt-1 text-sm text-amber-800">{error || "Aperçu indisponible."}</p>
          </div>
        </div>
      </div>
    );
  }

  if (mediaType === "IMAGE") {
    return (
      <div
        className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm select-none"
        onContextMenu={(event) => event.preventDefault()}
      >
        <img
          src={blobUrl}
          alt={title}
          draggable={false}
          className="mx-auto max-h-[70vh] w-full object-contain"
        />
      </div>
    );
  }

  return (
    <embed
      title={title}
      src={blobUrl}
      type="application/pdf"
      className="h-[70vh] w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
    />
  );
}
