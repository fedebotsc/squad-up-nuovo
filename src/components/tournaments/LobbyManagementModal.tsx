import React, { useState, useEffect } from "react";
import {
  X,
  Layers,
  Sparkles,
  Users,
  Target,
  ArrowRightLeft,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface LobbyTeamItem {
  id: string; // registration id
  team_name: string;
  user_id: string;
  lobby_id: string | null;
  lobby_name: string;
  kd_ratio: number | null;
  approval_status: string;
}

interface LobbyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: any;
  onSuccess?: () => void;
}

export const LobbyManagementModal: React.FC<LobbyManagementModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onSuccess,
}) => {
  const [teams, setTeams] = useState<LobbyTeamItem[]>([]);
  const [lobbies, setLobbies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBalancing, setIsBalancing] = useState(false);

  const rawTourn = tournament?.raw || tournament;

  const loadLobbyData = async () => {
    if (!rawTourn?.id) return;
    setIsLoading(true);

    try {
      // 1. Fetch tournament lobbies
      const { data: lobbiesData } = await supabase
        .from("tournament_lobbies")
        .select("*")
        .eq("tournament_id", rawTourn.id)
        .order("code", { ascending: true });

      setLobbies(lobbiesData || []);

      // 2. Fetch registrations
      const { data: regData } = await supabase
        .from("tournament_registrations")
        .select("id, team_name, user_id, lobby_id, lobby_name, kd_ratio, approval_status")
        .eq("tournament_id", rawTourn.id);

      setTeams(regData || []);
    } catch (err) {
      console.warn("[LobbyManagement] Errore caricamento:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLobbyData();
    }
  }, [isOpen, rawTourn?.id]);

  if (!isOpen) return null;

  const lobbyA = lobbies.find((l) => l.code === "A" || l.name.includes("A")) || lobbies[0];
  const lobbyB = lobbies.find((l) => l.code === "B" || l.name.includes("B")) || lobbies[1];

  const teamsA = teams.filter((t) => !t.lobby_name || t.lobby_name.includes("A"));
  const teamsB = teams.filter((t) => t.lobby_name && t.lobby_name.includes("B"));

  const avgKdA = teamsA.length
    ? (teamsA.reduce((acc, t) => acc + (t.kd_ratio || 1.5), 0) / teamsA.length).toFixed(2)
    : "0.00";

  const avgKdB = teamsB.length
    ? (teamsB.reduce((acc, t) => acc + (t.kd_ratio || 1.5), 0) / teamsB.length).toFixed(2)
    : "0.00";

  // Move single team between Lobby A and Lobby B
  const handleMoveTeam = async (team: LobbyTeamItem, targetLobbyName: "Lobby A" | "Lobby B") => {
    const targetLobby = targetLobbyName === "Lobby A" ? lobbyA : lobbyB;
    const targetLobbyId = targetLobby?.id || null;

    try {
      // 1. Update registration
      await supabase
        .from("tournament_registrations")
        .update({
          lobby_name: targetLobbyName,
          lobby_id: targetLobbyId,
        })
        .eq("id", team.id);

      // 2. Update team chat
      await supabase
        .from("tournament_team_chats")
        .update({
          lobby_id: targetLobbyId,
        })
        .eq("registration_id", team.id);

      // 3. Update leaderboards
      const teamId = `team_${team.team_name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      await supabase
        .from("tournament_leaderboards")
        .update({
          lobby_id: targetLobbyId,
          lobby_name: targetLobbyName,
        })
        .eq("tournament_id", rawTourn.id)
        .eq("team_id", teamId);

      setTeams((prev) =>
        prev.map((t) =>
          t.id === team.id
            ? { ...t, lobby_name: targetLobbyName, lobby_id: targetLobbyId }
            : t
        )
      );

      toast({
        title: "Squadra Spostata! 🔄",
        description: `"${team.team_name}" assegnata a ${targetLobbyName}`,
      });
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Errore spostamento",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // AI Smart Balancing: sorts by KD and alternates between Lobby A and Lobby B
  const handleAiSmartBalance = async () => {
    if (teams.length < 2) {
      toast({
        title: "Poche squadre",
        description: "Servono almeno 2 squadre per effettuare il bilanciamento delle lobby.",
      });
      return;
    }

    setIsBalancing(true);

    try {
      // Sort teams by KD descending
      const sorted = [...teams].sort(
        (a, b) => (b.kd_ratio || 1.5) - (a.kd_ratio || 1.5)
      );

      // Serpentine distribution: A, B, B, A, A, B...
      const updates: { id: string; targetLobbyName: string; targetLobbyId: string | null }[] = [];
      sorted.forEach((team, idx) => {
        const isA = idx % 4 === 0 || idx % 4 === 3;
        const targetName = isA ? "Lobby A" : "Lobby B";
        const targetId = isA ? (lobbyA?.id || null) : (lobbyB?.id || null);
        updates.push({ id: team.id, targetLobbyName: targetName, targetLobbyId: targetId });
      });

      for (const u of updates) {
        await supabase
          .from("tournament_registrations")
          .update({
            lobby_name: u.targetLobbyName,
            lobby_id: u.targetLobbyId,
          })
          .eq("id", u.id);

        await supabase
          .from("tournament_team_chats")
          .update({
            lobby_id: u.targetLobbyId,
          })
          .eq("registration_id", u.id);
      }

      await loadLobbyData();
      toast({
        title: "Lobby Bilanciate dall'Arbitro IA! ⚖️",
        description: `Squadre ripartite equamente tra Lobby A e Lobby B in base al KD medio.`,
      });
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Errore bilanciamento",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsBalancing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0f1324] border border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl my-6 max-h-[90vh] overflow-y-auto space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 pr-8">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              <span>Gestione Doppia Lobby</span>
            </div>
            <h3 className="text-base font-black text-white">
              {rawTourn.name || rawTourn.title}
            </h3>
          </div>

          {/* AI Balance Action Button */}
          <button
            type="button"
            disabled={isBalancing || teams.length < 2}
            onClick={handleAiSmartBalance}
            className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isBalancing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Scale className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>Bilancia con IA (KD)</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Caricamento squadre nelle lobby...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LOBBY A */}
            <div className="bg-[#12162a] border border-cyan-500/30 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 font-black text-xs flex items-center justify-center border border-cyan-500/40">
                    A
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">Lobby A</h4>
                    <span className="text-[10px] text-zinc-400 font-semibold">
                      {teamsA.length} Squadre • KD Medio: {avgKdA}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {teamsA.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-6">
                    Nessuna squadra in Lobby A
                  </p>
                ) : (
                  teamsA.map((t) => (
                    <div
                      key={t.id}
                      className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between text-xs hover:border-cyan-500/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-white truncate block">
                          {t.team_name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                          <span className="text-amber-400 font-semibold">
                            KD {t.kd_ratio ? t.kd_ratio.toFixed(2) : "1.50"}
                          </span>
                          <span>•</span>
                          <span
                            className={
                              t.approval_status === "approved"
                                ? "text-emerald-400"
                                : "text-amber-400"
                            }
                          >
                            {t.approval_status === "approved" ? "Approvata" : "In attesa"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleMoveTeam(t, "Lobby B")}
                        className="p-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Sposta in Lobby B"
                      >
                        <span>Sposta in B</span>
                        <ArrowRightLeft className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* LOBBY B */}
            <div className="bg-[#12162a] border border-purple-500/30 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 font-black text-xs flex items-center justify-center border border-purple-500/40">
                    B
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">Lobby B</h4>
                    <span className="text-[10px] text-zinc-400 font-semibold">
                      {teamsB.length} Squadre • KD Medio: {avgKdB}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {teamsB.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-6">
                    Nessuna squadra in Lobby B
                  </p>
                ) : (
                  teamsB.map((t) => (
                    <div
                      key={t.id}
                      className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between text-xs hover:border-purple-500/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-white truncate block">
                          {t.team_name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                          <span className="text-amber-400 font-semibold">
                            KD {t.kd_ratio ? t.kd_ratio.toFixed(2) : "1.50"}
                          </span>
                          <span>•</span>
                          <span
                            className={
                              t.approval_status === "approved"
                                ? "text-emerald-400"
                                : "text-amber-400"
                            }
                          >
                            {t.approval_status === "approved" ? "Approvata" : "In attesa"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleMoveTeam(t, "Lobby A")}
                        className="p-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Sposta in Lobby A"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        <span>Sposta in A</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-zinc-800 text-center">
          <button
            onClick={onClose}
            className="py-2 px-6 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold cursor-pointer"
          >
            Chiudi Gestione Lobby
          </button>
        </div>
      </div>
    </div>
  );
};
