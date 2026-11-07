import React from "react";
import { useSquad } from "@/context/SquadContext";
import { Trophy, Users, Clock, Coins, ChevronRight, Swords, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export const ActiveTournamentsTab: React.FC = () => {
  const { tournaments, setTournamentSubTab } = useSquad();

  const handleJoinTournament = (tournamentTitle: string) => {
    toast({
      title: "Iscrizione Registrata",
      description: `Il tuo team CyberReapers è iscritto a: ${tournamentTitle}`,
    });
    setTournamentSubTab("match_room");
  };

  return (
    <div className="space-y-4">
      {/* Featured Banner Card */}
      <div className="relative rounded-2xl overflow-hidden border border-purple-500/40 bg-gradient-to-br from-purple-950/70 via-[#101426] to-[#0c1020] p-4 shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-900/60 border border-purple-400/40 text-[11px] font-bold text-purple-200 uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Torneo Principale della Settimana
          </div>
          <h3 className="text-base font-extrabold text-white tracking-wide">
            WARZONE CLASH: TRIOS RESURGENCE
          </h3>
          <p className="text-xs text-zinc-300 break-words leading-relaxed">
            Montepremi garantito di 5.000 SCoin con convalida IA arbitrale istantanea. Round 3 attivo adesso!
          </p>
          <div className="pt-1 flex items-center gap-3">
            <button
              onClick={() => setTournamentSubTab("match_room")}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(139,92,246,0.5)] transition-all"
            >
              <Swords className="w-4 h-4" />
              Entra nella Stanza Match
            </button>
            <button
              onClick={() => setTournamentSubTab("leaderboard")}
              className="px-3 py-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-xs font-semibold rounded-xl"
            >
              Vedi Classifica
            </button>
          </div>
        </div>
      </div>

      {/* Tournaments List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Competizioni Disponibili ({tournaments.length})
          </span>
          <span className="text-[11px] text-cyan-400 font-medium">
            Formato SquadUP Safe
          </span>
        </div>

        {tournaments.map((tournament) => {
          const isLive = tournament.status === "in_corso";

          return (
            <div
              key={tournament.id}
              className="bg-[#121628]/90 border border-purple-900/30 hover:border-purple-600/50 rounded-2xl p-4 space-y-3 transition-all shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300">
                      {tournament.game}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                        isLive
                          ? "bg-rose-500/20 border border-rose-500/60 text-rose-300 animate-pulse"
                          : "bg-emerald-500/20 border border-emerald-500/60 text-emerald-300"
                      }`}
                    >
                      {isLive ? "In Corso" : "Iscrizioni"}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white tracking-wide truncate">
                    {tournament.title}
                  </h4>
                </div>

                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 shrink-0">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-extrabold">
                    {tournament.prizePoolSCoin.toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed break-words">
                {tournament.description}
              </p>

              {/* Tournament Meta Info */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800/80 text-[11px] text-zinc-400">
                <div className="flex items-center gap-1.5 truncate">
                  <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="truncate">
                    {tournament.teamsJoined}/{tournament.maxTeams} Squadre
                  </span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{tournament.startsAt}</span>
                </div>
                <div className="flex items-center justify-end">
                  <span className="text-[10px] font-semibold text-zinc-300">
                    Quota: {tournament.entryFeeSCoin} SCoin
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-1">
                {isLive ? (
                  <button
                    onClick={() => setTournamentSubTab("match_room")}
                    className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <span>Vai al Match & Carica Kill Screen</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleJoinTournament(tournament.title)}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Iscrivi Squadra ({tournament.entryFeeSCoin} SCoin)</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
