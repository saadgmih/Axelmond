import { ExternalLink, FileText, X } from "lucide-react";
import type { LiveSharedResource } from "../../live/live-sync";

interface LiveResourceStageProps {
  resource: LiveSharedResource;
  canModerate: boolean;
  onDismiss: () => void;
}

export default function LiveResourceStage({ resource, canModerate, onDismiss }: LiveResourceStageProps) {
  const embedUrl = resource.kind === "pdf" ? `${resource.url}#toolbar=1&navpanes=0` : resource.url;

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
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-bold text-zinc-200 transition hover:bg-zinc-800"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ouvrir
          </a>
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
        <iframe
          title={resource.title}
          src={embedUrl}
          className="absolute inset-0 h-full w-full border-0 bg-white"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
