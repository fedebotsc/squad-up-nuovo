import React, { useState, useEffect } from "react";
import {
  Swords,
  Trophy,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Shuffle,
  Users,
  ChevronRight,
  Flame,
  Award,
  AlertTriangle,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  EliminationBracketState,
  EliminationMatch,
  RegisteredTeam,
  getBracketState,
  saveBracketState,
  initializeBracket,
  generateSampleTeamsForBracket,
  getRegisteredTeams,
  saveRegisteredTeams,
} from "@/services/tournamentBracketService";
import { EliminationMatchRoomModal } from "./EliminationMatchRoomModal";
import { toast } from "@/components/ui/use-toast";
import { useSquad } from "@/context/SquadContext";

interface SingleEliminationBracketViewProps {
  tournament: any;
  isOrganizer: boolean;
}

export const SingleEliminationBracketView: React.FC<SingleEliminationBracketViewProps> = ({
  tournament,
  isOrganizer,
}) => {
  const { currentUser } = useSquad();
  const rawTourn = tournament?.raw || tournament || {};
  const tournamentId = tournament?.id || "default_tourn";
  const teamLimit = Number(rawTourn.team_limit) || 8;
  const teamSize = Number(rawTourn.team_size) || 3;

  const [bracketState, setBracketState] = useState<EliminationBracketState | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<EliminationMatch | null>(null);

  const loadBracket = () => {
    let state = getBracketState(tournamentId);
    if (!state) {
      let registered = getRegisteredTeams(tournamentId);
      if (registered.length === 0) {
        registered = generateSampleTeamsForBracket(tournamentId, teamSize);
        saveRegisteredTeams(tournamentId, registered);
      }
      state = initializeBracket(tournamentId, teamLimit, registered);
    }
    setBracketState(state);
  };

  useEffect(() => {
    loadBracket();
  }, [tournamentId]);

  // Randomize / Reseed approved teams into Round 1
  const handleRandomSeed = () => {
    let registered = getRegisteredTeams(tournamentId);
    if (registered.length < 2) {
      registered = generateSampleTeamsForBracket(tournamentId, teamSize);
      saveRegisteredTeams(tournamentId, registered);
    }

    // Shuffle
    const shuffled = [...registered].sort(() => Math.random() - 0.5);
    const newState = initializeBracket(tournamentId, teamLimit, shuffled);
    setBracketState(newState);

    toast({
      title: "Sorteggio Casuale Completato! 🎲⚔️",
      description: "Le squadre sono state inserite casualmente nel tabellone a eliminazione diretta.",
    });
  };

  // Add test teams if user wants to immediately simulate the tournament
  const handleAddSampleTeams = () => {
    const samples = generateSampleTeamsForBracket(tournamentId, teamSize);
    saveRegisteredTeams(tournamentId, samples);
    const newState = initializeBracket(tournamentId, teamLimit, samples);
    setBracketState(newState);

    toast({
      title: "Tabellone Popolato con 8 Squadre! 🔥",
      description: "Puoi aprire qualsiasi scontro per testare chat, verifica uccisioni IA e passaggio turno.",
    });
  };

  if (!bracketState) {
    return (
      <div className="p-8 text-center bg-[#121628] rounded-2xl border border-purple-900/30 text-zinc-400">
        Inizializzazione tabellone ad eliminazione diretta...
      </div>
    );
  }

  const champion = bracketState.championTeam;

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white tracking-wide">
              Tabellone a Eliminazione Diretta
            </h4>
            <p className="text-[10px] text-zinc-400">
              Formato Single Elimination • Scontri diretti 1v1 tra team
            </p>
          </div>
        </div>

        {isOrganizer && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRandomSeed}
              className="py-1.5 px-3 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Mescola casualmente le squadre nel Round 1"
            >
              <Shuffle className="w-3 h-3 text-cyan-400" />
              <span>Sorteggio Casuale</span>
            </button>

            <button
              onClick={handleAddSampleTeams}
              className="py-1.5 px-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Popola 8 team verificati per testare tutto il tabellone"
            >
              <Play className="w-3 h-3 text-amber-400" />
              <span>Reset & Demo 8 Team</span>
            </button>
          </div>
        )}
      </div>

      {/* Champion Banner if completed */}
      {champion && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-950/60 via-purple-950/60 to-amber-950/60 border border-amber-500/60 text-center space-y-2 shadow-[0_0_25px_rgba(245,158,11,0.25)] animate-fade-in">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
            <Trophy className="w-7 h-7" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              CAMPIONI ASSOLUTI DEL TORNEO 🏆
            </span>
            <h3 className="text-lg font-black text-white">
              {champion.teamName}
            </h3>
            <p className="text-xs text-zinc-300">
              Capitano: {champion.captainName} • {champion.members.length} Giocatori
            </p>
          </div>
        </div>
      )}

      {/* Interactive Bracket Rounds */}
      <div className="space-y-4">
        {bracketState.rounds.map((round) => (
          <div key={round.roundNumber} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-purple-400">
                {round.roundName}
              </span>
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-[10px] text-zinc-500 font-bold">
                {round.matches.filter((m) => m.status === "completed").length}/{round.matches.length} Conclusi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {round.matches.map((match) => {
                const isCompleted = match.status === "completed";
                const winnerId = match.winnerTeamId;

                return (
                  <div
                    key={match.id}
                    onClick={() => setSelectedMatch(match)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group shadow-md ${
                      isCompleted
                        ? "bg-[#121628]/95 border-emerald-500/40 hover:border-emerald-500/70"
                        : "bg-[#121628]/95 border-purple-900/40 hover:border-purple-600/60"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between text-[10px] pb-2 mb-2 border-b border-zinc-800/80">
                      <span className="font-extrabold text-zinc-400 uppercase">
                        {match.roundName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {match.override && (
                          <span className="text-[9px] font-bold text-amber-300 bg-amber-950 px-1.5 py-0.2 rounded-full border border-amber-600/40">
                            Override Arbitro
                          </span>
                        )}
                        <span
                          className={`font-black uppercase px-2 py-0.5 rounded-full text-[9px] border ${
                            isCompleted
                              ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 flex items-center gap-1"
                              : "bg-purple-950/80 border-purple-500/50 text-purple-300"
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Concluso</span>
                            </>
                          ) : (
                            "Apri Stanza Match"
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Team 1 Row */}
                    <div
                      className={`flex items-center justify-between p-2 rounded-xl mb-1.5 transition-colors ${
                        isCompleted && winnerId === match.team1?.id
                          ? "bg-amber-950/40 border border-amber-500/40"
                          : "bg-zinc-950/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isCompleted && winnerId === match.team1?.id && (
                          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                        <span
                          className={`text-xs font-bold truncate ${
                            isCompleted && winnerId === match.team1?.id
                              ? "text-amber-300"
                              : "text-white"
                          }`}
                        >
                          {match.team1?.teamName || "In attesa scontro..."}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-black text-cyan-300 ml-2 shrink-0">
                        {match.team1Score} pt
                      </span>
                    </div>

                    {/* Team 2 Row */}
                    <div
                      className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                        isCompleted && winnerId === match.team2?.id
                          ? "bg-amber-950/40 border border-amber-500/40"
                          : "bg-zinc-950/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isCompleted && winnerId === match.team2?.id && (
                          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                        <span
                          className={`text-xs font-bold truncate ${
                            isCompleted && winnerId === match.team2?.id
                              ? "text-amber-300"
                              : "text-white"
                          }`}
                        >
                          {match.team2?.teamName || "In attesa scontro..."}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-black text-cyan-300 ml-2 shrink-0">
                        {match.team2Score} pt
                      </span>
                    </div>

                    {/* Action hint footer */}
                    <div className="pt-2 mt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400 group-hover:text-purple-300 transition-colors">
                      <span>Chat scontro & Caricamento screenshot</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Match Room / Match Chat Modal */}
      {selectedMatch && (
        <EliminationMatchRoomModal
          isOpen={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
          match={selectedMatch}
          tournament={tournament}
          onMatchUpdated={() => {
            loadBracket();
            const updated = getBracketState(tournamentId);
            if (updated) {
              for (const r of updated.rounds) {
                const found = r.matches.find((m) => m.id === selectedMatch.id);
                if (found) {
                  setSelectedMatch(found);
                  break;
                }
              }
            }
          }}
        />
      )}
    </div>
  );
};
