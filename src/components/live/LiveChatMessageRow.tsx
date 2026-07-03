import { memo } from "react";
import type { LiveChatMessage } from "../../livekit";

interface LiveChatMessageRowProps {
  message: LiveChatMessage;
}

function LiveChatMessageRow({ message }: LiveChatMessageRowProps) {
  return (
    <div className={`flex flex-col ${message.isMe ? "items-end" : "items-start"}`}>
      <div className="flex items-baseline gap-2 mb-1 mx-1">
        <span className="text-[10px] font-bold text-zinc-400">{message.sender}</span>
        <span className="text-[9px] text-zinc-600 font-mono">{message.time}</span>
      </div>
      <div
        className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${
          message.isMe
            ? "bg-emerald-600 text-white rounded-tr-sm"
            : "bg-zinc-800 text-zinc-100 rounded-tl-sm border border-white/5"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}

export default memo(LiveChatMessageRow);
