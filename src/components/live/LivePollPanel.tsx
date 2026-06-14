interface LivePollPanelProps {
  canModerate: boolean;
  pollQuestion: string;
  pollOptions: string[];
  pollVotes: Record<string, number>;
  pollActive: boolean;
  myVote: string | null;
  onQuestionChange: (value: string) => void;
  onPublishPoll: () => void;
  onEndPoll: () => void;
  onVote: (option: string) => void;
}

export default function LivePollPanel({
  canModerate,
  pollQuestion,
  pollOptions,
  pollVotes,
  pollActive,
  myVote,
  onQuestionChange,
  onPublishPoll,
  onEndPoll,
  onVote,
}: LivePollPanelProps) {
  const totalVotes = pollOptions.reduce((sum, option) => sum + (pollVotes[option] || 0), 0);

  return (
    <div className="space-y-4">
      {canModerate ? (
        <label className="block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Question du sondage</span>
          <input
            value={pollQuestion}
            onChange={(event) => onQuestionChange(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
          />
        </label>
      ) : (
        <p className="text-sm font-bold text-white">{pollQuestion}</p>
      )}

      {pollActive && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          Sondage en cours · {totalVotes} vote{totalVotes > 1 ? "s" : ""}
        </p>
      )}

      <div className="space-y-2">
        {pollOptions.map((option) => {
          const votes = pollVotes[option] || 0;
          const ratio = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isMyVote = myVote === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onVote(option)}
              disabled={!pollActive || Boolean(myVote)}
              className={`relative w-full overflow-hidden rounded-xl border px-3 py-3 text-left transition ${
                isMyVote
                  ? "border-emerald-400/40 bg-emerald-500/10"
                  : "border-white/10 bg-zinc-900 hover:border-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-70"
              }`}
            >
              <div
                className="absolute inset-y-0 left-0 bg-indigo-500/15 transition-all"
                style={{ width: `${ratio}%` }}
              />
              <div className="relative flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-zinc-100">{option}</span>
                <span className="text-[10px] font-black text-indigo-300">
                  {ratio}% ({votes})
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {canModerate && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPublishPoll}
            className="flex-1 rounded-xl border border-indigo-400/30 bg-indigo-500/10 py-2.5 text-xs font-bold text-indigo-200 transition hover:bg-indigo-500/20"
          >
            {pollActive ? "Relancer le sondage" : "Lancer le sondage"}
          </button>
          {pollActive && (
            <button
              type="button"
              onClick={onEndPoll}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-300 transition hover:bg-zinc-800"
            >
              Terminer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
