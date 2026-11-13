import React, { useState } from "react";
import { useSquad } from "@/context/SquadContext";
import {
  Trophy,
  Users,
  Clock,
  Coins,
  ChevronRight,
  Swords,
  Plus,
  Sparkles,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Tournament } from "@/data/mockData";
import { CreateTournamentModal } from "./CreateTournamentModal";
import { TournamentRegistrationModal } from "./TournamentRegistrationModal";
import { Layers, Target } from "lucide-react";

export const ActiveTournamentsTab: React.FC = () => {
  const {
    tournaments,
    setTournamentSubTab,
    setSelectedTournament,
    refreshUserData,
    currentUser,
    isUniversalAdmin,
    deleteTournament,
  } = useSquad();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tournamentPendingDelete, setTournamentPendingDelete] = useState<Tournament | null>(null);
  const [tournamentForRegistration, setTournamentForRegistration] = useState<Tournament | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Tutte");

  const filteredTournaments = tournaments.filter((t) => {
    if (selectedCategory === "Tutte") return true;
    const raw = (t as any)?.raw || {};
    const game = ((t.game || raw.game_mode || "") as string).toLowerCase();
    const cat = selectedCategory.toLowerCase();
    return game.includes(cat) || cat.includes(game);
  });

  const handleSelectTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setTournamentSubTab("match_room");
    toast({
      title: "Torneo selezionato",
      description: `Stanza match per: ${tournament.title}`,
    });
  };

  const handleConfirmDelete = async () => {
    if (!tournamentPendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteTournament(tournamentPendingDelete.id);
      setTournamentPendingDelete(null);
    } catch (err: any) {
      console.warn("[ActiveTournamentsTab] Errore cancellazione:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar with Create Tournament Button */}
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
            Tornei Disponibili ({tournaments.length})
          </span>
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-300" />
            <span>SquadUP Tornei Competitivi Call of Duty</span>
          </span>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-[0_0_15px_rgba(139,92,246,0.35)] transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Crea Torneo</span>
          <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
            100 SC
          </span>
        </button>
      </div>

      {/* Category Pills: Warzone Battle Royale, Warzone Ritorno, Multiplayer */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {["Tutte", "Warzone Battle Royale", "Warzone Ritorno", "Multiplayer"].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat
                ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                : "bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredTournaments.length > 0 ? (
        <div className="space-y-3">
          {filteredTournaments.map((tournament) => {
            const isLive = tournament.status === "in_corso" || tournament.status === "live";
            const rawTourn = (tournament as any)?.raw || tournament;
            const isChampionship = rawTourn.type === "leaderboard_championship" || tournament.category === "Classifica a Punteggio";
            const formatBadge = isChampionship ? "Classifica a Punteggio" : "Eliminazione Diretta";
            const teamSizeNum = rawTourn.team_size || 3;
            const teamSizeLabel = teamSizeNum === 1 ? "Solo (1v1)" : teamSizeNum === 2 ? "Duo (2p)" : teamSizeNum === 3 ? "Trio (3p)" : "Squad (4p)";
            const bannerUrl = tournament.banner || rawTourn.banner_url;
            const coOrganizerNames = rawTourn.co_organizer_names;

            return (
              <div
                key={tournament.id}
                className="bg-[#121628]/90 border border-purple-900/30 hover:border-purple-600/50 rounded-2xl overflow-hidden space-y-3 transition-all shadow-md"
              >
                {bannerUrl && (
                  <div className="relative w-full h-28 overflow-hidden border-b border-purple-900/40">
                    <img
                      src={bannerUrl}
                      alt={tournament.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121628] via-transparent to-black/40" />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                        isChampionship
                          ? "bg-amber-950/90 border-amber-500/60 text-amber-200"
                          : "bg-purple-950/90 border-purple-500/60 text-purple-200"
                      }`}>
                        {formatBadge}
                      </span>
                      {isChampionship && rawTourn.total_games && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-500/60 text-cyan-200">
                          {rawTourn.total_games} Game
                        </span>
                      )}
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-cyan-300 border border-cyan-500/40">
                        {teamSizeLabel}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-4 pt-1 space-y-3">
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

                      {!bannerUrl && (
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${
                          isChampionship
                            ? "bg-amber-950 border-amber-500/40 text-amber-200"
                            : "bg-purple-950 border border-purple-500/40 text-purple-200"
                        }`}>
                          {formatBadge}
                        </span>
                      )}

                      {Boolean((tournament as any)?.raw?.double_lobby_enabled) && (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 uppercase flex items-center gap-1">
                          <Layers className="w-2.5 h-2.5 text-cyan-400" />
                          Doppia Lobby
                        </span>
                      )}

                      {Boolean((tournament as any)?.raw?.require_kd_verification) && (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 uppercase flex items-center gap-1">
                          <Target className="w-2.5 h-2.5 text-amber-400" />
                          Verifica KD
                        </span>
                      )}
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

                {Array.isArray(coOrganizerNames) && coOrganizerNames.length > 0 && (
                  <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <span className="font-semibold text-cyan-400">Co-organizzatori:</span>
                    <span>{coOrganizerNames.join(", ")}</span>
                  </div>
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
                        ? `Quota: ${tournament.entryFeeSCoin} SC`
                        : "Ingresso Free"}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={() => handleSelectTournament(tournament)}
                    className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>Stanza Match & Chat</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>

                  <button
                    onClick={() => setTournamentForRegistration(tournament)}
                    className="py-2 px-3 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    title="Iscrivi la tua Squadra al Torneo"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Iscriviti</span>
                  </button>

                  {(isUniversalAdmin || (currentUser?.id && (tournament as any)?.raw?.owner_id === currentUser.id)) && (
                    <button
                      onClick={() => setTournamentPendingDelete(tournament)}
                      title="Elimina Torneo con Rimborso SCoin"
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 hover:text-white transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
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
            Organizza tu il primo torneo competitivo per la community o per il tuo clan!
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
          >
            Crea il Tuo Torneo
          </button>
        </div>
      )}

      {/* Create Tournament Modal */}
      <CreateTournamentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          refreshUserData();
        }}
      />

      {/* Tournament Registration Modal */}
      {tournamentForRegistration && (
        <TournamentRegistrationModal
          isOpen={!!tournamentForRegistration}
          onClose={() => setTournamentForRegistration(null)}
          tournament={tournamentForRegistration}
          onSuccess={() => {
            refreshUserData();
            handleSelectTournament(tournamentForRegistration);
          }}
        />
      )}

      {/* Delete Tournament Confirmation Dialog */}
      {tournamentPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#121629] border border-rose-500/50 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-extrabold text-white">
                Eliminare il torneo?
              </h4>
              <p className="text-xs font-semibold text-rose-300">
                "{tournamentPendingDelete.title}"
              </p>
              <div className="text-[11px] text-zinc-300 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-left mt-2 space-y-1.5">
                <span className="font-bold text-white block">Rimborsi automatici garantiti:</span>
                <p>• <strong>100 SCoin</strong> rimborsati all'organizzatore per il costo di creazione.</p>
                {tournamentPendingDelete.entryFeeSCoin > 0 && (
                  <p>• <strong>{tournamentPendingDelete.entryFeeSCoin} SCoin</strong> rimborsati a ciascun partecipante iscritto.</p>
                )}
                <p className="text-[10px] text-zinc-400 italic pt-1">
                  I match, le classifiche e la chat del torneo verranno cancellati.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTournamentPendingDelete(null)}
                className="py-2.5 px-3 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="py-2.5 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-rose-950/50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminazione...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Conferma & Rimborsa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
