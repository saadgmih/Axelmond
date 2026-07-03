import React from "react";
import { CameraOff, Hand, Mic, MicOff, Search, UserX, Video, VideoOff, VolumeX } from "lucide-react";
import type { LiveParticipantCard } from "../VirtualClassroom";
import { liveRoleLabel } from "./live-classroom-formatters";

export interface LiveParticipantsPanelProps {
  raisedHandParticipants: LiveParticipantCard[];
  participantQuery: string;
  onParticipantQueryChange: (value: string) => void;
  filteredParticipants: LiveParticipantCard[];
  canModerate: boolean;
  onModerateParticipant: (action: string, participant: LiveParticipantCard) => void;
}

export default function LiveParticipantsPanel({
  raisedHandParticipants,
  participantQuery,
  onParticipantQueryChange,
  filteredParticipants,
  canModerate,
  onModerateParticipant,
}: LiveParticipantsPanelProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {raisedHandParticipants.length > 0 && (
        <div className="rounded-xl border border-lime-500/20 bg-lime-500/10 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-lime-300">Mains levées</p>
          <div className="space-y-2">
            {raisedHandParticipants.map((participant) => (
              <div key={participant.identity} className="flex items-center gap-2 text-xs font-semibold text-lime-100">
                <Hand className="h-4 w-4" />
                <span>{participant.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={participantQuery}
          onChange={(event) => onParticipantQueryChange(event.target.value)}
          placeholder="Rechercher un participant..."
          className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Membres de la session</p>
          <span className="text-xs font-mono text-zinc-400">{filteredParticipants.length}</span>
        </div>
        {filteredParticipants.map((participant) => (
          <div
            key={participant.identity}
            className="group relative rounded-xl hover:bg-zinc-800/50 p-2.5 flex items-center justify-between transition-colors border border-transparent hover:border-white/5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xs font-bold shrink-0">
                {participant.initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{participant.name}</p>
                <p className="text-[10px] text-zinc-500 truncate font-medium">{liveRoleLabel(participant.role)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              {participant.handRaised && <Hand className="w-3.5 h-3.5 text-lime-400" />}
              {participant.hasAudio ? (
                <Mic className="w-3.5 h-3.5 text-zinc-500" />
              ) : (
                <MicOff className="w-3.5 h-3.5 text-red-400/70" />
              )}
              {participant.hasVideo ? (
                <Video className="w-3.5 h-3.5 text-zinc-500" />
              ) : (
                <VideoOff className="w-3.5 h-3.5 text-zinc-600" />
              )}
            </div>

            {canModerate && !participant.isLocal && (
              <div className="absolute right-2 opacity-0 group-hover:opacity-100 bg-zinc-800 p-1 rounded-lg flex items-center gap-1 shadow-xl border border-white/10 transition-opacity">
                <button
                  onClick={() => onModerateParticipant("MUTE_AUDIO", participant)}
                  className="p-1.5 hover:bg-zinc-700 rounded text-zinc-300"
                  title="Couper le micro"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onModerateParticipant("MUTE_VIDEO", participant)}
                  className="p-1.5 hover:bg-zinc-700 rounded text-zinc-300"
                  title="Couper la caméra"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onModerateParticipant("REMOVE_PARTICIPANT", participant)}
                  className="p-1.5 hover:bg-red-500/20 rounded text-red-400"
                  title="Expulser"
                >
                  <UserX className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
