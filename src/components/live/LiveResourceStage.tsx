import { ExternalLink, FileText, Link2, X } from "lucide-react";
import { isSafeLiveResourceUrl } from "../../live/live-sync-validation";
import type { LiveSharedResource } from "../../live/live-sync";

interface LiveResourceStageProps {
  resource: LiveSharedResource;
  canModerate: boolean;
  onDismiss: () => void;
}

export default function LiveResourceStage({ resource, canModerate, onDismiss }: LiveResourceStageProps) {
  const safeUrl = isSafeLiveResourceUrl(resource.url) ? resource.url : null;
  const embedUrl = resource.kind === "pdf" && safeUrl ? `${safeUrl}#toolbar=1&navpanes=0` : null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-zinc-950">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-zinc-900/95 px-4 py-3 backdrop-blur-md">
        <div className="min-w-0 flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-indigo-300" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{resource.title}</p>
            <p className="truncate text-[10px] text-zinc-400">Partagé par {resource.sharedBy}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {safeUrl && (
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-bold text-zinc-200 transition hover:bg-zinc-800"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ouvrir
            </a>
          )}
          {canModerate && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Fermer la ressource partagée"
              className="rounded-lg border border-white/10 p-2 text-zinc-300 transition hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="relative min-h-0 flex-1 bg-zinc-950">
        {!safeUrl ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-300">
            Cette ressource utilise une URL non autorisée et ne peut pas être affichée.
          </div>
        ) : embedUrl ? (
          <iframe
            title={resource.title}
            src={embedUrl}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            sandbox="allow-same-origin allow-popups allow-forms"
            referrerPolicy="no-referrer"
            allow="fullscreen"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <Link2 className="h-10 w-10 text-indigo-300" />
            <div className="max-w-lg space-y-2">
              <p className="text-sm font-bold text-white">{resource.title}</p>
              <p className="text-xs text-zinc-400">
                Pour des raisons de sécurité, seuls les PDF HTTPS sont intégrés dans la salle.
                Ouvrez ce lien dans un nouvel onglet pour consulter la ressource.
              </p>
            </div>
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500"
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir la ressource
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
