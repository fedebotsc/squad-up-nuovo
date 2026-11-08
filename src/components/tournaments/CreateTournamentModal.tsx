import React, { useState } from "react";
import {
  X,
  Trophy,
  Sparkles,
  Wand2,
  Coins,
  Loader2,
  CheckCircle2,
  Calendar,
  Layers,
  Target,
  Swords,
  Shield,
  Clock,
  Flame,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  generateTournamentWithAI,
  GeneratedTournamentStructure,
} from "@/services/openRouterService";

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AI_PRESET_TEMPLATES = [
  {
    label: "Warzone Resurgence Trios",
    icon: "🔥",
    prompt:
      "Torneo di Warzone Resurgence per 8 squadre da 3 giocatori. Eliminazione diretta con Quarti, Semifinali e Finale. Punti: 1 pt per ogni kill, 15 pt per il 1° posto, 10 pt per il 2°. Regolamento standard anti-cheat e divieto di riot shield. Partenza domani alle 21:00.",
  },
  {
    label: "EA FC 24 Champions Cup",
    icon: "⚽",
    prompt:
      "Coppa EA FC 24 1v1 ad 8 giocatori a gironi e fase finale a eliminazione diretta. Partite da 6 minuti a tempo, squadre solo club o FUT. 3 punti a vittoria, 1 per pareggio. Regolamento ufficiale esportivo.",
  },
  {
    label: "Call of Duty CDL 4v4 S&D",
    icon: "🎯",
    prompt:
      "Torneo competitivo CDL Cerca e Distruggi 4v4 a 4 squadre. Doppia eliminazione Winner e Loser bracket. Regolamento ufficiale CDL: vietate armi bannate, cambio host alternato. Montepremi 2.000 SCoin.",
  },
  {
    label: "Rocket League 2v2 Soccar",
    icon: "🏎️",
    prompt:
      "Torneo Rocket League 2v2 a eliminazione diretta con 8 squadre. Quarti e Semifinali Best of 3, Finalissima Best of 5. Screenshot del tabellone obbligatorio a fine match.",
  },
];

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    currentUser,
    userProfile,
    sCoinBalance,
    isUniversalAdmin,
    openAuthModal,
    refreshTournaments,
    refreshUserData,
    setSelectedTournament,
    setTournamentSubTab,
  } = useSquad();

  const CREATION_COST_SC = 100;
  const canAfford = isUniversalAdmin || sCoinBalance >= CREATION_COST_SC;

  // Single free-form text input for AI generation
  const [tournamentDescription, setTournamentDescription] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>("");

  if (!isOpen) return null;

  // Handle single AI Generation & autonomous Creation
  const handleCreateWithAI = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    if (!tournamentDescription.trim()) {
      toast({
        title: "Descrizione richiesta",
        description:
          "Inserisci una breve descrizione del torneo (gioco, partecipanti, orario, regole). L'Intelligenza Artificiale estrarrà e genererà tutto in autonomia.",
        variant: "destructive",
      });
      return;
    }

    if (!canAfford) {
      toast({
        title: "Saldo SCoin Insufficiente",
        description: `La creazione di un torneo richiede ${CREATION_COST_SC} SCoin. Il tuo saldo attuale è di ${sCoinBalance.toLocaleString()} SCoin.`,
        variant: "destructive",
      });
      return;
    }

    setIsAiGenerating(true);
    setGenerationStep("Analisi della descrizione con l'Intelligenza Artificiale...");

    try {
      // Step 1: AI Analysis
      const generated = await generateTournamentWithAI(tournamentDescription);

      setGenerationStep("Generazione del regolamento e impostazioni competitive...");

      const finalTitle = generated.name || "SquadUP Championship";
      const finalGameMode = generated.game_mode || "Warzone Resurgence";
      const finalRules =
        generated.rules ||
        "1. Tutti i partecipanti devono presentarsi in lobby puntuali.\n2. Caricare screenshot tabellone a fine partita per l'arbitraggio OCR.\n3. È severamente vietato l'uso di cheat o comportamenti tossici.";
      const finalTeamLimit = Number(generated.team_limit) || 8;
      const finalType = generated.type || "elimination";
      const finalPrize = generated.prize_description || "1.500 SCoin + Ruolo Campione";

      // Detect flags from text
      const descLower = tournamentDescription.toLowerCase();
      const doubleLobby =
        descLower.includes("doppia lobby") ||
        descLower.includes("due lobby") ||
        descLower.includes("double lobby") ||
        descLower.includes("2 lobby");

      const requireKd =
        descLower.includes("kd") ||
        descLower.includes("k/d") ||
        descLower.includes("ratio") ||
        descLower.includes("verifica kd");

      // Calculate start date
      const startsAtDate = new Date();
      const hoursToAdd = Number(generated.starts_in_hours) || 24;
      startsAtDate.setHours(startsAtDate.getHours() + hoursToAdd);

      setGenerationStep("Salvataggio torneo e generazione del tabellone...");

      // Deduct SCoin if not universal admin
      if (!isUniversalAdmin && CREATION_COST_SC > 0) {
        const newBal = Math.max(0, sCoinBalance - CREATION_COST_SC);
        await supabase
          .from("profiles")
          .update({
            balance: newBal,
            coins: newBal,
            schoins: newBal,
          })
          .eq("id", currentUser.id);

        await supabase.from("sc_transactions").insert({
          user_id: currentUser.id,
          recipient_id: currentUser.id,
          amount: -CREATION_COST_SC,
          type: "tournament_entry",
          description: `Costo creazione torneo IA: ${finalTitle}`,
        });
      }

      const leaderboardSettings = generated.leaderboard_settings || {
        format: "teams",
        kill_points: 1,
        placement_points: {
          "1": 15,
          "2": 10,
          "3": 7,
          "4": 5,
          "5": 3,
          top10: 1,
        },
      };

      // Insert Tournament into Supabase
      const { data: newTournament, error: tournError } = await supabase
        .from("tournaments")
        .insert({
          name: finalTitle,
          game_mode: finalGameMode,
          starts_at: startsAtDate.toISOString(),
          team_limit: finalTeamLimit,
          prize_description: finalPrize,
          status: "upcoming",
          type: finalType,
          entry_fee_sc: 0,
          creation_cost_sc: CREATION_COST_SC,
          owner_id: currentUser.id,
          owner_name: userProfile.name || "Organizzatore",
          rules: finalRules,
          double_lobby_enabled: doubleLobby,
          require_kd_verification: requireKd,
          leaderboard_settings: leaderboardSettings,
          bracket: generated.initial_matches || [],
        })
        .select()
        .single();

      if (tournError) throw tournError;

      // Create main match chat room
      try {
        await supabase.from("tournament_match_chats").insert({
          tournament_id: newTournament.id,
          title: `Chat Ufficiale: ${finalTitle}`,
        });
      } catch (chatErr) {
        console.warn("[CreateTournament] Match chat creata:", chatErr);
      }

      // Insert initial match pairs if present
      const initialMatches = generated.initial_matches || [];
      if (initialMatches.length > 0) {
        try {
          const matchRows = initialMatches.map((m, idx) => ({
            tournament_id: newTournament.id,
            round_name: m.round_name || `Round 1 - Match ${idx + 1}`,
            player1_id: null,
            player2_id: null,
            score_player1: 0,
            score_player2: 0,
            status: "scheduled",
            ai_parsed_data: {
              player1_initial_name: m.player1_name,
              player2_initial_name: m.player2_name,
            },
          }));

          await supabase.from("tournament_matches").insert(matchRows);
        } catch (matchErr) {
          console.warn("[CreateTournament] Match inseriti con fallback:", matchErr);
        }
      }

      // Success toast
      toast({
        title: "Torneo Generato dall'IA! 🏆⚡",
        description: `"${finalTitle}" creato con successo! Regole e tabellone impostati in autonomia.`,
      });

      // Refresh data and select newly created tournament
      await refreshTournaments();
      await refreshUserData();

      setSelectedTournament({
        id: newTournament.id,
        title: newTournament.name,
        game: newTournament.game_mode,
        teamsJoined: 1,
        maxTeams: newTournament.team_limit,
        prizePoolSCoin: 0,
        entryFeeSCoin: newTournament.entry_fee_sc || 0,
        startsAt: new Date(newTournament.starts_at).toLocaleString("it-IT", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: newTournament.status as any,
        description: newTournament.rules,
        raw: newTournament,
      } as any);
      setTournamentSubTab("match_room");

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("[CreateTournament AI Error]:", err);
      toast({
        title: "Errore generazione torneo",
        description: err.message || "Impossibile completare la creazione del torneo con IA.",
        variant: "destructive",
      });
    } finally {
      setIsAiGenerating(false);
      setGenerationStep("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-[#0f1322] border border-purple-900/50 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-6 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-purple-900/40 bg-[#121628]/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 p-0.5 shadow-[0_0_12px_rgba(139,92,246,0.5)]">
              <div className="w-full h-full bg-[#0d1020] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <span>Crea Torneo con IA</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/30">
                  Autonomo
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Inserisci una descrizione: l'IA genera nome, regole e dettagli
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isAiGenerating}
            className="p-1.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Cost & Info Banner */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-[#0e1222] border border-purple-800/40 text-xs">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-zinc-300 font-medium">Costo creazione torneo:</span>
              <span className="font-black text-amber-300">
                {isUniversalAdmin ? "Gratuito (Admin)" : `${CREATION_COST_SC} SCoin`}
              </span>
            </div>

            <div className="text-[11px] font-bold text-zinc-400">
              Saldo:{" "}
              <span className={canAfford ? "text-cyan-300" : "text-rose-400 font-extrabold"}>
                {sCoinBalance.toLocaleString()} SC
              </span>
            </div>
          </div>

          {isAiGenerating ? (
            /* AI Processing Animation */
            <div className="py-12 px-4 text-center space-y-4 bg-[#121628]/80 border border-purple-800/40 rounded-2xl">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 animate-spin blur-md opacity-70" />
                <div className="relative w-full h-full rounded-2xl bg-[#0f1322] border border-cyan-400/60 flex items-center justify-center">
                  <Wand2 className="w-8 h-8 text-cyan-300 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-sm font-extrabold text-white tracking-wide">
                  Intelligenza Artificiale al Lavoro...
                </h4>
                <p className="text-xs text-cyan-300 font-medium">
                  {generationStep || "Analisi della descrizione del torneo..."}
                </p>
              </div>

              <div className="max-w-xs mx-auto text-[11px] text-zinc-400 leading-relaxed">
                Estrazione autonoma del nome, formulazione delle regole ufficiali, strutturazione del tabellone e calcolo parametri competitivi in corso.
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateWithAI} className="space-y-4">
              {/* Single Free-Form Description Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Descrizione del Torneo (Campo Unico)</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">IA Autonoma</span>
                </label>

                <textarea
                  rows={6}
                  value={tournamentDescription}
                  onChange={(e) => setTournamentDescription(e.target.value)}
                  placeholder="Descrivi liberamente il torneo come vuoi...&#10;&#10;Esempio:&#10;Torneo di Warzone Resurgence a 8 squadre trios con eliminazione diretta venerdì alle 21:00. Punteggio: 1 punto per ogni kill, 15 punti vittoria, 10 pt per il 2° posto. Vietato riot shield e armi glitchate."
                  className="w-full p-3.5 rounded-2xl bg-black/40 border border-purple-900/50 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all leading-relaxed resize-none"
                />

                <p className="text-[10px] text-zinc-400 leading-normal">
                  ✨ L'IA analizzerà il testo estraendo ed elaborando automaticamente il nome del torneo, la modalità, le regole complete e il tabellone di gara.
                </p>
              </div>

              {/* Quick Inspiration Prompts */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 block">
                  Oppure seleziona un template rapido da personalizzare:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AI_PRESET_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTournamentDescription(tmpl.prompt)}
                      className="p-2.5 rounded-xl bg-zinc-900/60 hover:bg-purple-950/40 border border-purple-900/30 hover:border-purple-600/50 text-left transition-all cursor-pointer group flex items-start gap-2"
                    >
                      <span className="text-sm shrink-0">{tmpl.icon}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-zinc-200 group-hover:text-cyan-300 block truncate transition-colors">
                          {tmpl.label}
                        </span>
                        <span className="text-[10px] text-zinc-500 line-clamp-1">
                          {tmpl.prompt}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isAiGenerating || !canAfford || !tournamentDescription.trim()}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 disabled:opacity-50 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.35)] transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Crea Torneo con IA</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
