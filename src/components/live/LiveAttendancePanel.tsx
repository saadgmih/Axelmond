import React from "react";
import { Download } from "lucide-react";
import type { LiveParticipantCard } from "../VirtualClassroom";
import { formatLiveDuration, liveRoleLabel } from "./live-classroom-formatters";

export interface AttendanceRow {
  id?: string;
  identity?: string;
  name: string;
  role?: string;
  durationSeconds?: number;
}

export interface LiveAttendancePanelProps {
  attendanceReport: {
    summary?: {
      online?: number;
      averageDurationSeconds?: number;
    };
  } | null;
  connectedParticipants: LiveParticipantCard[];
  elapsedSeconds: number;
  attendanceRows: AttendanceRow[];
  onExportAttendance: () => void;
}

export default function LiveAttendancePanel({
  attendanceReport,
  connectedParticipants,
  elapsedSeconds,
  attendanceRows,
  onExportAttendance,
}: LiveAttendancePanelProps) {
  const rows = attendanceRows.length ? attendanceRows : connectedParticipants;

  const rowKey = (row: AttendanceRow | LiveParticipantCard) =>
    ("id" in row && row.id) || ("identity" in row && row.identity) || row.name;

  const rowDurationSeconds = (row: AttendanceRow | LiveParticipantCard) =>
    "durationSeconds" in row && row.durationSeconds != null ? row.durationSeconds : elapsedSeconds;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 shadow-sm text-center">
          <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Actifs</p>
          <p className="text-3xl font-black text-emerald-400">
            {attendanceReport?.summary?.online ?? connectedParticipants.length}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 shadow-sm text-center">
          <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Durée Moy.</p>
          <p className="text-2xl font-bold text-emerald-400 mt-2 font-mono">
            {formatLiveDuration(attendanceReport?.summary?.averageDurationSeconds || elapsedSeconds)}
          </p>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-white/5 overflow-hidden shadow-sm">
        <div className="flex justify-between px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase bg-zinc-950/50 border-b border-white/5">
          <span>Identité</span>
          <span>Durée</span>
        </div>
        <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto custom-scrollbar">
          {rows.map((row) => (
            <div
              key={rowKey(row)}
              className="flex justify-between items-center px-4 py-3 hover:bg-zinc-800/50 transition-colors"
            >
              <div>
                <p className="text-xs font-bold text-zinc-200">{row.name}</p>
                <p className="text-[10px] text-zinc-500 font-medium">{liveRoleLabel(row.role)}</p>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded">
                {formatLiveDuration(rowDurationSeconds(row))}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onExportAttendance}
        className="w-full mt-2 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold transition-colors flex justify-center items-center gap-2 border border-white/5 shadow-sm"
      >
        <Download className="w-4 h-4" /> Exporter le rapport (CSV)
      </button>
    </div>
  );
}
