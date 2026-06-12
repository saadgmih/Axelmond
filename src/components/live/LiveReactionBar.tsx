const REACTIONS = ["👍", "👏", "❤️", "😂", "🎉", "🤔", "🔥", "✅"] as const;

interface LiveReactionBarProps {
  onReaction: (reaction: string) => void;
  compact?: boolean;
}

export default function LiveReactionBar({ onReaction, compact = false }: LiveReactionBarProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "rounded-2xl border border-white/10 bg-zinc-900/70 p-3"}`}>
      {!compact && (
        <p className="w-full text-[10px] font-bold uppercase tracking-wider text-zinc-500">Réactions live</p>
      )}
      {REACTIONS.map((reaction) => (
        <button
          key={reaction}
          type="button"
          onClick={() => onReaction(reaction)}
          className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/80 text-lg transition hover:scale-105 hover:border-indigo-400/30 hover:bg-indigo-500/10"
          aria-label={`Réagir ${reaction}`}
        >
          {reaction}
        </button>
      ))}
    </div>
  );
}
