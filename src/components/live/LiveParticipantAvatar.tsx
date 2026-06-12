interface LiveParticipantAvatarProps {
  name: string;
  initials: string;
  avatarUrl?: string | null;
  size?: "md" | "lg" | "xl";
  isSpeaking?: boolean;
  isFeatured?: boolean;
}

const sizeMap = {
  md: { shell: "h-16 w-16 text-lg", ring: "h-20 w-20" },
  lg: { shell: "h-24 w-24 sm:h-28 sm:w-28 text-2xl sm:text-3xl", ring: "h-28 w-28 sm:h-32 sm:w-32" },
  xl: { shell: "h-32 w-32 sm:h-40 sm:w-40 text-3xl sm:text-4xl", ring: "h-36 w-36 sm:h-44 sm:w-44" },
};

export default function LiveParticipantAvatar({
  name,
  initials,
  avatarUrl,
  size = "lg",
  isSpeaking = false,
  isFeatured = false,
}: LiveParticipantAvatarProps) {
  const sizes = sizeMap[size];

  return (
    <div className="relative flex items-center justify-center">
      <div
        className={`absolute rounded-full bg-gradient-to-br from-indigo-500/40 via-violet-500/30 to-cyan-400/20 blur-md transition-opacity ${
          sizes.ring
        } ${isSpeaking || isFeatured ? "opacity-100 animate-pulse" : "opacity-70"}`}
      />
      <div
        className={`absolute rounded-full border border-indigo-400/30 ${sizes.ring} ${
          isSpeaking ? "animate-ping opacity-40" : "opacity-0"
        }`}
      />
      <div
        className={`relative z-10 overflow-hidden rounded-full border-2 shadow-2xl shadow-indigo-950/40 ${sizes.shell} ${
          isSpeaking ? "border-indigo-300" : "border-white/15"
        } bg-gradient-to-br from-slate-800 via-indigo-950 to-violet-950 flex items-center justify-center font-black text-white`}
        title={name}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="bg-gradient-to-br from-indigo-200 to-violet-300 bg-clip-text text-transparent">
            {initials}
          </span>
        )}
      </div>
    </div>
  );
}
