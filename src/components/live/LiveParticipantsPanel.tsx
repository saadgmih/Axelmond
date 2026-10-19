import React from "react";
import { CameraOff, Hand, Mic, MicOff, Search, UserX, Video, VideoOff, VolumeX } from "lucide-react";
import type { LiveParticipantCard } from "../VirtualClassroom";
import { liveRoleLabel } from "./live-classroom-formatters";
import { UserProfileTrigger } from "../UserProfileViewer";

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
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-lime-300">
              Mains levées ({raisedHandParticipants.length})
            </p>
          </div>
          <div className="space-y-2">
            {raisedHandParticipants.map((participant) => (
              <div
                key={participant.identity}
                className="flex items-center justify-between gap-2 text-xs font-semibold text-lime-100 bg-lime-950/40 px-2.5 py-1.5 rounded-lg border border-lime-500/20"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Hand className="h-4 w-4 shrink-0 text-lime-400" />
                  <span className="truncate">{participant.name}</span>
                </div>
                {canModerate && (
                  <button
                    type="button"
                    onClick={() => onModerateParticipant("GRANT_SPEECH", participant)}
                    className="shrink-0 px-2 py-0.5 rounded bg-lime-500/20 hover:bg-lime-500/30 text-lime-300 text-[10px] font-bold border border-lime-400/30 transition-colors"
                    title="Donner la parole"
                  >
                    Donner la parole
                  </button>
                )}
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
          aria-label="Rechercher un participant"
          className="live-panel-input w-full rounded-xl pl-9 pr-3 py-2.5 text-xs transition-colors focus:outline-none"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Membres de la session</p>
            <span className="text-xs font-mono text-zinc-400">({filteredParticipants.length})</span>
          </div>
          {canModerate && filteredParticipants.some((p) => !p.isLocal && p.hasAudio) && (
            <button
              type="button"
              onClick={() => {
                filteredParticipants
                  .filter((p) => !p.isLocal && p.hasAudio)
                  .forEach((p) => onModerateParticipant("MUTE_AUDIO", p));
              }}
              title="Couper les micros de tous les étudiants"
              aria-label="Couper les micros de tous les étudiants"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-[10px] font-bold transition-colors"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Muet pour tous</span>
            </button>
          )}
        </div>
        {filteredParticipants.map((participant) => (
          <div
            key={participant.identity}
            className="group relative rounded-xl hover:bg-zinc-800/50 p-2.5 flex items-center justify-between transition-colors border border-transparent hover:border-white/5"
          >
            <UserProfileTrigger
              userId={participant.userId}
              userName={participant.name}
              className="flex min-w-0 items-center gap-3 text-zinc-100 hover:text-emerald-300"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-500/20 bg-emerald-500/20 text-xs font-bold text-emerald-400">
                {participant.avatarUrl ? (
                  <img src={participant.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  participant.initials
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{participant.name}</span>
                <span className="block truncate text-[10px] font-medium text-zinc-500">
                  {liveRoleLabel(participant.role)}
                </span>
              </span>
            </UserProfileTrigger>

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
