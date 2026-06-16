import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { getFreshSessionToken } from "../api";

interface PdfLessonViewerProps {
  contentId: string;
  title: string;
  downloadUrl?: string | null;
}

export default function PdfLessonViewer({ contentId, title, downloadUrl }: PdfLessonViewerProps) {
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
          throw new Error("Impossible d'afficher ce document dans la plateforme.");
        }

        const blob = await response.blob();
        if (!blob.size) {
          throw new Error("Le document PDF est vide ou inaccessible.");
        }

        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setBlobUrl(objectUrl);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Impossible de charger le PDF.");
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
          <p className="mt-3 text-sm font-medium text-slate-600">Chargement du document…</p>
        </div>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">{title}</p>
            <p className="mt-1 text-sm text-amber-800">{error || "Aperçu indisponible."}</p>
          </div>
        </div>
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-500"
          >
            <Download className="h-4 w-4" />
            Ouvrir le PDF dans un nouvel onglet
          </a>
        )}
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
