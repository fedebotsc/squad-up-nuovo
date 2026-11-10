import React, { useState, useEffect } from "react";
import { useSquad } from "@/context/SquadContext";
import { Trophy, Crosshair, Flame, RefreshCw, Shield, Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getChampionshipState, ChampionshipState } from "@/services/tournamentChampionshipService";
import { ChampionshipLeaderboardView } from "./ChampionshipLeaderboardView";

interface LeaderboardRow {
  id: string;
  tournament_id: string;
  team_id: string;
  team_name: string;
  total_kills: number;
  total_score: number;
  matches_played: number;
  updated_at?: string;
}

export const LeaderboardTab: React.FC = () => {
  const { leaderboard, selectedTournament, userProfile, currentUser, isUniversalAdmin, setTournamentSubTab } = useSquad();
  const [dbLeaderboard, setDbLeaderboard] = useState<LeaderboardRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lobbyFilter, setLobbyFilter] = useState<"all" | "A" | "B">("all");

  const rawTourn = (selectedTournament as any)?.raw || selectedTournament || {};
  const isChampionship =
    rawTourn.type === "leaderboard_championship" ||
    selectedTournament?.category === "Classifica a Punteggio" ||
    Boolean(rawTourn.total_games);

  const [championshipState, setChampionshipState] = useState<ChampionshipState | null>(null);

  const refreshChampionship = () => {
    if (selectedTournament?.id) {
      const state = getChampionshipState(
        selectedTournament.id,
        rawTourn.total_games || 5,
        rawTourn.scoring_settings
      );
      setChampionshipState(state);
    }
  };

  useEffect(() => {
    if (isChampionship && selectedTournament?.id) {
      refreshChampionship();
    }
  }, [selectedTournament?.id, isChampionship]);

  const isOrganizer =
    isUniversalAdmin ||
    (currentUser?.id && rawTourn.owner_id === currentUser.id) ||
    (Array.isArray(rawTourn.co_organizers) && rawTourn.co_organizers.includes(currentUser?.id));

  const isDoubleLobby = Boolean((selectedTournament as any)?.raw?.double_lobby_enabled);

  const fetchLiveLeaderboard = async () => {
    if (!selectedTournament?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tournament_leaderboards")
        .select("*")
        .eq("tournament_id", selectedTournament.id)
        .order("total_score", { ascending: false });

      if (error) throw error;
      setDbLeaderboard(data || []);
    } catch (err) {
      console.warn("[LeaderboardTab] Errore caricamento classifica:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveLeaderboard();

    // Subscribe to live changes
    if (!selectedTournament?.id) return;
    const channel = supabase
      .channel(`leaderboard-${selectedTournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_leaderboards",
          filter: `tournament_id=eq.${selectedTournament.id}`,
        },
        () => {
          fetchLiveLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTournament?.id]);

  // Filter dbLeaderboard by lobby
  const filteredDbLeaderboard = dbLeaderboard.filter((item: any) => {
    if (lobbyFilter === "all") return true;
    const lName = item.lobby_name || "";
    return lName.toUpperCase().includes(lobbyFilter);
  });

  // Merge DB entries or context entries
  const displayEntries =
    filteredDbLeaderboard.length > 0
      ? filteredDbLeaderboard.map((item: any, idx) => ({
          rank: idx + 1,
          teamName: item.team_name,
          lobbyName: item.lobby_name,
          kills: item.total_kills || 0,
          points: item.total_score || 0,
          matches: item.matches_played || 0,
          isMyTeam:
            item.team_name.toLowerCase().includes(userProfile.name.toLowerCase()) ||
            (userProfile.clanTag && item.team_name.includes(userProfile.clanTag)),
        }))
      : leaderboard.map((e, idx) => ({
          rank: idx + 1,
          teamName: e.teamName,
          lobbyName: null,
          kills: e.kills,
          points: e.points,
          matches: 1,
          isMyTeam: e.isMyTeam,
        }));

  if (isChampionship && championshipState && selectedTournament) {
    return (
      <ChampionshipLeaderboardView
        tournamentId={selectedTournament.id}
        championshipState={championshipState}
        onRefresh={refreshChampionship}
        isOrganizer={isOrganizer}
        adminName={userProfile.name || "Organizzatore"}
        adminId={currentUser?.id || ""}
        onOpenTeamChat={() => {
          setTournamentSubTab("match_room");
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2 px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>CLASSIFICA LIVE TORNEO</span>
        </div>

        <div className="flex items-center gap-2">
          {isDoubleLobby && (
            <div className="flex items-center gap-1 bg-[#151a30] p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                onClick={() => setLobbyFilter("all")}
                className={`px-2 py-0.5 rounded-lg font-bold text-[10px] transition-colors ${
                  lobbyFilter === "all" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Tutte
              </button>
              <button
                onClick={() => setLobbyFilter("A")}
                className={`px-2 py-0.5 rounded-lg font-bold text-[10px] transition-colors ${
                  lobbyFilter === "A" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Lobby A
              </button>
              <button
                onClick={() => setLobbyFilter("B")}
                className={`px-2 py-0.5 rounded-lg font-bold text-[10px] transition-colors ${
                  lobbyFilter === "B" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Lobby B
              </button>
            </div>
          )}

          {selectedTournament && (
            <span className="text-[10px] text-cyan-400 font-semibold truncate max-w-[120px]">
              {selectedTournament.title}
            </span>
          )}
          <button
            onClick={fetchLiveLeaderboard}
            disabled={isLoading}
            className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Aggiorna classifica"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin text-purple-400" : ""}`} />
          </button>
        </div>
      </div>

      {displayEntries.length > 0 ? (
        <div className="space-y-2">
          {displayEntries.map((entry, index) => {
            const isMine = entry.isMyTeam;

            return (
              <div
                key={entry.teamName + index}
                className={`rounded-2xl p-3.5 border transition-all ${
                  isMine
                    ? "bg-gradient-to-r from-purple-950/60 via-[#161c36] to-cyan-950/40 border-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                    : "bg-[#121628]/90 border-purple-900/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-xs font-extrabold truncate max-w-[140px] sm:max-w-xs ${
                            isMine ? "text-cyan-300" : "text-white"
                          }`}
                        >
                          {entry.teamName}
                        </span>
                        {entry.lobbyName && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 uppercase">
                            {entry.lobbyName}
                          </span>
                        )}
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
                          <Swords className="w-3 h-3 text-cyan-400" />
                          {entry.matches} {entry.matches === 1 ? "Match" : "Match"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-white block">
                      {entry.points}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-zinc-400">
                      Punti
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#121628]/90 border border-purple-900/30 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Trophy className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">Nessuna classifica disponibile</h4>
          <p className="text-xs text-zinc-400 break-words max-w-xs mx-auto">
            I punteggi compariranno al termine dei primi match convalidati dall'arbitro IA OpenRouter.
          </p>
        </div>
      )}
    </div>
  );
};
