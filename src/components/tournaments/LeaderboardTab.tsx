import React from "react";
import { useSquad } from "@/context/SquadContext";
import { Trophy, Flame, Crosshair } from "lucide-react";

export const LeaderboardTab: React.FC = () => {
  const { leaderboard } = useSquad();

  // Sort by points desc
  const sorted = [...leaderboard].sort((a, b) => b.points - a.points);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>CLASSIFICA LIVE TORNEO</span>
        </div>
        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
          Aggiornamento IA Tempo Reale
        </span>
      </div>

      <div className="space-y-2">
        {sorted.map((entry, index) => {
          const isTop3 = index < 3;
          const isMine = entry.isMyTeam;

          return (
            <div
              key={entry.teamName}
              className={`rounded-2xl p-3.5 border transition-all ${
                isMine
                  ? "bg-gradient-to-r from-purple-950/60 via-[#161c36] to-cyan-950/40 border-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                  : "bg-[#121628]/90 border-purple-900/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Rank badge */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${
                      index === 0
                        ? "bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                        : index === 1
                        ? "bg-zinc-300 text-black"
                        : index === 2
                        ? "bg-amber-700 text-white"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-extrabold truncate max-w-[140px] ${
                          isMine ? "text-cyan-300" : "text-white"
                        }`}
                      >
                        {entry.teamName}
                      </span>
                      <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-purple-900/40 text-purple-300 border border-purple-700/40">
                        [{entry.tag}]
                      </span>
                      {isMine && (
                        <span className="text-[9px] font-bold uppercase px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                          Tu
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Crosshair className="w-3 h-3 text-purple-400" />
                        {entry.kills} Kill
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Flame className="w-3 h-3 text-rose-400" />
                        {entry.damage.toLocaleString()} DMG
                      </span>
                    </div>
                  </div>
                </div>

                {/* Points display */}
                <div className="text-right shrink-0">
                  <span className="text-sm font-extrabold text-white block">
                    {entry.points}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-zinc-400">
                    Punti Totali
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
