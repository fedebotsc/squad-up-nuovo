import React, { useState } from "react";
import {
  Trophy,
  Flame,
  Crosshair,
  ShieldAlert,
  Scale,
  Award,
  ChevronRight,
  Layers,
  Sparkles,
  RefreshCw,
  Info,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
} from "lucide-react";
import {
  ChampionshipState,
  ChampionshipTeamProgress,
  setChampionshipCurrentGame,
  concludeChampionship,
  reopenChampionship,
} from "@/services/tournamentChampionshipService";
import { AdminPenaltyAdjustmentModal } from "./AdminPenaltyAdjustmentModal";
import { toast } from "@/components/ui/use-toast";

interface ChampionshipLeaderboardViewProps {
  tournamentId: string;
  championshipState: ChampionshipState;
  onRefresh: () => void;
  isOrganizer: boolean;
  adminName: string;
  adminId: string;
  onOpenTeamChat?: (teamId: string) => void;
}

export const ChampionshipLeaderboardView: React.FC<ChampionshipLeaderboardViewProps> = ({
  tournamentId,
  championshipState,
  onRefresh,
  isOrganizer,
  adminName,
  adminId,
  onOpenTeamChat,
}) => {
  const [selectedTeamForPenalty, setSelectedTeamForPenalty] = useState<ChampionshipTeamProgress | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const { totalGames, currentGame, isCompleted, championTeamName, teams } = championshipState;

  const handleAdvanceGame = (nextGame: number) => {
    setChampionshipCurrentGame(tournamentId, nextGame);
    toast({
      title: `Game ${nextGame} Attivo! 🎮`,
      description: `Il torneo è ora impostato sul Game ${nextGame} di ${totalGames}.`,
    });
    onRefresh();
  };

  const handleConcludeChampionship = () => {
    if (teams.length === 0) {
      toast({
        title: "Nessuna squadra",
        description: "Impossibile concludere un torneo senza squadre.",
        variant: "destructive",
      });
      return;
    }

    const winner = teams[0];
    if (confirm(`Confermi di voler concludere il campionato e decretare "${winner.teamName}" come Vincitore Ufficiale?`)) {
      concludeChampionship(tournamentId);
      toast({
        title: "🏆 Campionato Concluso!",
        description: `La squadra "${winner.teamName}" ha vinto il torneo con ${winner.totalPoints} punti totali!`,
      });
      onRefresh();
    }
  };

  const handleReopenChampionship = () => {
    reopenChampionship(tournamentId);
    toast({
      title: "Campionato Riaperto",
      description: "La classifica è nuovamente attiva e modificabile.",
    });
    onRefresh();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Status & Controls Banner */}
      <div className="bg-[#121628]/95 border border-purple-900/50 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>Classifica Generale Progressiva</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/40 text-purple-300">
                  {totalGames} Game Totali
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Punteggio calcolato unicamente da colonna "UCCISIONI" e piazzamento per ogni game
              </p>
            </div>
          </div>

          {/* Current Game Status Badge */}
          <div className="flex items-center gap-1.5">
            {isCompleted ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Torneo Concluso</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-black uppercase flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Game {currentGame} in Corso</span>
              </span>
            )}
          </div>
        </div>

        {/* Organizer Game Navigation Bar */}
        {isOrganizer && (
          <div className="pt-2 border-t border-purple-900/30 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-zinc-400 mr-1">
                Controllo Game:
              </span>
              {Array.from({ length: totalGames }, (_, i) => i + 1).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleAdvanceGame(g)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                    currentGame === g
                      ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/30 font-black"
                      : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800"
                  }`}
                >
                  Game {g}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isCompleted ? (
                <button
                  type="button"
                  onClick={handleConcludeChampionship}
                  className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-black font-extrabold text-[11px] flex items-center gap-1 shadow-md cursor-pointer transition-all"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Chiudi &amp; Decreta Vincitore</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReopenChampionship}
                  className="py-1 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-semibold transition-colors cursor-pointer"
                >
                  Riapri Classifica
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Champion Celebration Banner if Completed */}
      {isCompleted && championTeamName && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/30 via-purple-900/40 to-cyan-900/30 border-2 border-amber-400/70 p-5 text-center space-y-2 shadow-2xl animate-fade-in">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-[0_0_20px_rgba(251,191,36,0.6)]">
            <Trophy className="w-7 h-7" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-300">
              Vincitore Ufficiale del Campionato 🏆
            </span>
            <h2 className="text-xl font-black text-white tracking-wide">
              {championTeamName}
            </h2>
            <p className="text-xs text-zinc-300">
              Punteggio Finale: <strong className="text-amber-300">{teams[0]?.totalPoints || 0} Punti</strong> • {teams[0]?.totalKills || 0} Kill complessive
            </p>
          </div>
        </div>
      )}

      {/* Teams Progressive Table */}
      {teams.length === 0 ? (
        <div className="bg-[#121628]/90 border border-purple-900/30 rounded-2xl p-8 text-center space-y-2">
          <Trophy className="w-8 h-8 text-purple-400 mx-auto" />
          <h4 className="text-sm font-bold text-white">Nessuna squadra ancora in classifica</h4>
          <p className="text-xs text-zinc-400">
            Le squadre compariranno automaticamente non appena le iscrizioni verranno approvate e i primi game inviati.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {teams.map((team, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            const isThird = idx === 2;
            const isExpanded = expandedTeamId === team.teamId;
            const hasPenalties = team.penaltyAdjustments && team.penaltyAdjustments.length > 0;

            return (
              <div
                key={team.teamId}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isFirst
                    ? "bg-gradient-to-r from-amber-950/40 via-[#151a30] to-[#121628] border-amber-500/50 shadow-md shadow-amber-950/20"
                    : isSecond
                    ? "bg-[#13182d] border-zinc-500/40"
                    : isThird
                    ? "bg-[#13182d] border-amber-900/40"
                    : "bg-[#101426] border-purple-900/30"
                }`}
              >
                {/* Main Team Row */}
                <div className="p-3.5 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isFirst
                          ? "bg-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                          : isSecond
                          ? "bg-zinc-300 text-black"
                          : isThird
                          ? "bg-amber-700 text-white"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {idx + 1}
                    </div>

                    {/* Team Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[150px] sm:max-w-xs">
                          {team.teamName}
                        </span>
                        {isFirst && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            Leader
                          </span>
                        )}
                        {hasPenalties && (
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                              team.penaltyPoints < 0
                                ? "bg-rose-950 text-rose-300 border-rose-500/40"
                                : "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                            }`}
                            title="Penalità o Bonus Admin applicati"
                          >
                            {team.penaltyPoints > 0 ? `+${team.penaltyPoints}` : team.penaltyPoints} pt correzione
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                        <span className="flex items-center gap-0.5 font-semibold text-purple-300">
                          <Crosshair className="w-3 h-3 text-purple-400" />
                          {team.totalKills} Kill Totali
                        </span>
                        <span>•</span>
                        <span>
                          {team.gamesPlayed} di {totalGames} Game giocati
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Points & Actions */}
                  <div className="flex items-center gap-3 shrink-0 ml-auto">
                    <div className="text-right">
                      <span className="text-base sm:text-lg font-black text-white block leading-none">
                        {team.totalPoints}
                      </span>
                      <span className="text-[9px] uppercase font-extrabold text-zinc-400">
                        Punti Totali
                      </span>
                    </div>

                    {/* Expand Breakdown Button */}
                    <button
                      type="button"
                      onClick={() => setExpandedTeamId(isExpanded ? null : team.teamId)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors cursor-pointer"
                      title="Dettaglio Game"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>

                    {/* Admin Penalty Trigger */}
                    {isOrganizer && (
                      <button
                        type="button"
                        onClick={() => setSelectedTeamForPenalty(team)}
                        className="py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Applica penalità o correzione con motivazione obbligatoria"
                      >
                        <Scale className="w-3 h-3" />
                        <span className="hidden sm:inline">Penalità / Modifica</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Game-by-Game Breakdown Panel */}
                {isExpanded && (
                  <div className="p-3 bg-zinc-950/70 border-t border-zinc-800/80 space-y-2.5 text-xs animate-fade-in">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-bold border-b border-zinc-800 pb-1.5">
                      <span>Riepilogo Game per Game:</span>
                      <span>Base: {team.basePoints} pt • Modifiche: {team.penaltyPoints} pt</span>
                    </div>

                    {/* Games Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Array.from({ length: totalGames }, (_, i) => i + 1).map((gNum) => {
                        const gData = team.games[gNum];

                        return (
                          <div
                            key={gNum}
                            className={`p-2 rounded-xl border text-[11px] space-y-1 ${
                              gData
                                ? "bg-zinc-900 border-purple-500/30 text-zinc-200"
                                : "bg-zinc-950/50 border-zinc-800/60 text-zinc-500"
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span>Game {gNum}</span>
                              {gData ? (
                                <span className="text-cyan-300 font-black">
                                  +{gData.totalPoints} pt
                                </span>
                              ) : (
                                <span className="text-zinc-600">In attesa</span>
                              )}
                            </div>

                            {gData ? (
                              <div className="text-[10px] text-zinc-400 space-y-0.5">
                                <div>Posizione: #{gData.placement}</div>
                                <div>Kill (Colonna Uccisioni): {gData.kills}</div>
                              </div>
                            ) : (
                              <div className="text-[10px] text-zinc-600 italic">
                                Prove non inviate
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Audit Notes of Admin Penalties if any */}
                    {hasPenalties && (
                      <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>Note Ufficiali Correzioni &amp; Penalità Admin:</span>
                        </span>
                        <div className="space-y-1">
                          {team.penaltyAdjustments.map((adj) => (
                            <div
                              key={adj.id}
                              className="p-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[10px] flex items-center justify-between gap-2"
                            >
                              <div className="text-zinc-300">
                                <strong>"{adj.reason}"</strong>
                                <span className="text-zinc-500 text-[9px] block">
                                  Applicata da {adj.adminName} ({new Date(adj.createdAt).toLocaleDateString("it-IT")})
                                </span>
                              </div>
                              <span
                                className={`font-black shrink-0 ${
                                  adj.pointsDelta < 0 ? "text-rose-400" : "text-emerald-400"
                                }`}
                              >
                                {adj.pointsDelta > 0 ? `+${adj.pointsDelta}` : adj.pointsDelta} pt
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Penalty / Bonus Adjustment Modal */}
      {selectedTeamForPenalty && (
        <AdminPenaltyAdjustmentModal
          isOpen={Boolean(selectedTeamForPenalty)}
          onClose={() => setSelectedTeamForPenalty(null)}
          tournamentId={tournamentId}
          team={selectedTeamForPenalty}
          adminName={adminName}
          adminId={adminId}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};
