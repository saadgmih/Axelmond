interface LiveConnectionNoticeProps {
  message: string;
  variant?: "success" | "warning" | "info";
}

export default function LiveConnectionNotice({ message, variant = "info" }: LiveConnectionNoticeProps) {
  const toneClass =
    variant === "success"
      ? "border-emerald-400/20 bg-black/75 text-emerald-50"
      : variant === "warning"
        ? "border-amber-400/25 bg-black/80 text-amber-50"
        : "border-white/10 bg-black/75 text-zinc-100";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className={`max-w-[min(92%,520px)] rounded-full border px-4 py-2 text-center text-[11px] font-medium leading-snug shadow-2xl backdrop-blur-md sm:text-xs ${toneClass}`}
      >
        {message}
      </div>
    </div>
  );
}
