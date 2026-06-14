import React from "react";
import { FileUp } from "lucide-react";
import type { LivePollState } from "../../live/live-sync";
import LivePollPanel from "./LivePollPanel";

export interface LiveToolsPanelProps {
  canModerate: boolean;
  livePoll: LivePollState;
  myPollVote: string | null;
  onPollQuestionChange: (value: string) => void;
  onPublishPoll: () => void;
  onEndPoll: () => void;
  onVotePoll: (option: string) => void;
  resourceTitle: string;
  resourceUrl: string;
  onResourceTitleChange: (value: string) => void;
  onResourceUrlChange: (value: string) => void;
  onShareResource: () => void;
}

export default function LiveToolsPanel({
  canModerate,
  livePoll,
  myPollVote,
  onPollQuestionChange,
  onPublishPoll,
  onEndPoll,
  onVotePoll,
  resourceTitle,
  resourceUrl,
  onResourceTitleChange,
  onResourceUrlChange,
  onShareResource,
}: LiveToolsPanelProps) {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <LivePollPanel
        canModerate={canModerate}
        pollQuestion={livePoll.question}
        pollOptions={livePoll.options}
        pollVotes={livePoll.votes}
        pollActive={livePoll.active}
        myVote={myPollVote}
        onQuestionChange={onPollQuestionChange}
        onPublishPoll={onPublishPoll}
        onEndPoll={onEndPoll}
        onVote={onVotePoll}
      />
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Partager une ressource</p>
        <input
          value={resourceTitle}
          onChange={(event) => onResourceTitleChange(event.target.value)}
          placeholder="Titre (PDF, slides, lien...)"
          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white"
        />
        <input
          value={resourceUrl}
          onChange={(event) => onResourceUrlChange(event.target.value)}
          placeholder="URL du document ou de la présentation"
          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white"
        />
        <button
          type="button"
          onClick={onShareResource}
          className="w-full rounded-xl border border-indigo-400/30 bg-indigo-500/10 py-2.5 text-xs font-bold text-indigo-200"
        >
          <FileUp className="mr-2 inline h-4 w-4" />
          Partager au module
        </button>
      </div>
    </div>
  );
}
