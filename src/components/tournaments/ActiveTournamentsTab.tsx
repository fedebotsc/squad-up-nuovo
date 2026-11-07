import React from "react";
import { useSquad } from "@/context/SquadContext";
import { Trophy, Users, Clock, Coins, ChevronRight, Swords } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Tournament } from "@/data/mockData";

export const ActiveTournamentsTab: React.FC = () => {
  const { tournaments, setTournamentSubTab, setSelectedTournament } = useSquad();

  const handleSelectTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setTournamentSubTab("match_room");
    toast({
      title: "Torneo selezionato",
      description: `Stanza match per: ${tournament.title}`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Tornei Disponibili ({tournaments.length})
        </span>
        <span className="text-[11px] text-cyan-400 font-medium">
          SquadUP Competitivo
        </span>
      </div>

      {tournaments.length > 0 ? (
        <div className="space-y-3">
          {tournaments.map((tournament) => {
            const isLive = tournament.status === "in_corso" || tournament.status === "live";

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
                        {isLive ? "In Corso" : "Aperto"}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white tracking-wide truncate">
                      {tournament.title}
                    </h4>
                  </div>

                  {tournament.prizePoolSCoin > 0 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 shrink-0">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-extrabold">
                        {tournament.prizePoolSCoin.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {tournament.description && (
                  <p className="text-xs text-zinc-300 leading-relaxed break-words">
                    {tournament.description}
                  </p>
                )}

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
                      {tournament.entryFeeSCoin > 0
                        ? `Quota: ${tournament.entryFeeSCoin} SCoin`
                        : "Ingresso Gratuito"}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-1">
                  <button
                    onClick={() => handleSelectTournament(tournament)}
                    className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>Entra nella Stanza Match</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#121628]/90 border border-purple-900/30 rounded-2xl p-8 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Trophy className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-white">Nessun torneo attivo al momento</h4>
          <p className="text-xs text-zinc-400 break-words max-w-xs mx-auto">
            I nuovi tornei ed eventi competitivi verranno mostrati qui appena aperti dagli organizzatori.
          </p>
        </div>
      )}
    </div>
  );
};
