import React, { useState } from "react";
import {
  X,
  Trophy,
  Swords,
  Calendar,
  Users,
  Coins,
  Loader2,
  Sparkles,
  FileText,
  Target,
  Sliders,
  Clock,
  CheckCircle2,
  Edit3,
  Layers,
  ArrowRight,
  Wand2,
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

const AI_PROMPT_PRESETS = [
  {
    label: "Warzone Resurgence Trios",
    icon: "🔥",
    prompt:
      "Torneo di Warzone Resurgence a 8 squadre (Trios). Eliminazione diretta con Quarti, Semifinali e Finale. 2 punti per ogni kill di squadra, 15 pt per la vittoria, 10 pt per il 2° posto. Partenza domani alle ore 21:00.",
  },
  {
    label: "EA FC 24 Champions Cup",
    icon: "⚽",
    prompt:
      "Torneo EA FC 24 1v1 con 8 giocatori divisi in 2 gironi da 4 (andata e ritorno), poi semifinali incrociate e finale secca. 3 punti per vittoria, 1 per pareggio. Regole competitive standard FUT.",
  },
  {
    label: "Call of Duty CDL S&D",
    icon: "🎯",
    prompt:
      "Torneo competitivo CDL Cerca e Distruggi 4v4 a 4 squadre. Bracket a doppia eliminazione con Winner e Loser bracket. Regolamento ufficiale CDL: vietate armi bannate, cambio host alternato.",
  },
  {
    label: "Rocket League 2v2",
    icon: "🏎️",
    prompt:
      "Torneo Rocket League 2v2 con 8 team. Quarti e Semifinali Best of 3, Finalissima Best of 5. Assegna punti gol e assist.",
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
  } = useSquad();

  const CREATION_COST_SC = 100;
  const canAfford = isUniversalAdmin || sCoinBalance >= CREATION_COST_SC;

  // Mode: "ai" (OpenRouter Gemini Flash) or "manual"
  const [creationMode, setCreationMode] = useState<"ai" | "manual">("ai");

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [generatedTournament, setGeneratedTournament] = useState<GeneratedTournamentStructure | null>(null);

  // Manual & Editable form fields
  const [title, setTitle] = useState("");
  const [gameMode, setGameMode] = useState("Warzone Resurgence");
  const [tournamentType, setTournamentType] = useState<"elimination" | "groups_and_knockout" | "championship" | "round_robin">("elimination");
  const [teamLimit, setTeamLimit] = useState<number>(8);
  const [prizeDescription, setPrizeDescription] = useState("1.500 SCoin + Badge Campioni");
  const [rules, setRules] = useState(
    "1. Carica gli screenshot del tabellone finale nella Stanza Match entro 15 minuti.\n2. Vietato ogni tipo di hack o exploit.\n3. Risultati convalidati dall'arbitro IA multimodale."
  );
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [startHour, setStartHour] = useState("21:00");
  const [phasesSummary, setPhasesSummary] = useState("Eliminazione diretta a tabellone unico");

  // Scoring
  const [killPoints, setKillPoints] = useState<number>(1);
  const [points1st, setPoints1st] = useState<number>(15);
  const [points2nd, setPoints2nd] = useState<number>(10);
  const [points3rd, setPoints3rd] = useState<number>(7);

  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // Handle AI Generation via Centralized System Service
  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Descrizione mancante",
        description: "Inserisci qualche dettaglio su come desideri il torneo (gioco, partecipanti, regole...).",
        variant: "destructive",
      });
      return;
    }

    setIsAiGenerating(true);

    try {
      const generated = await generateTournamentWithAI(aiPrompt);
      setGeneratedTournament(generated);

      // Populate editable fields with AI generated content
      setTitle(generated.name);
      setGameMode(generated.game_mode);
      setTournamentType(generated.type || "elimination");
      setTeamLimit(generated.team_limit || 8);
      setPrizeDescription(generated.prize_description || "1.000 SCoin + Ruolo Campione");
      setRules(generated.rules);
      setPhasesSummary(generated.phases_summary || "Fase a eliminazione diretta");

      if (generated.leaderboard_settings) {
        setKillPoints(generated.leaderboard_settings.kill_points ?? 1);
        setPoints1st(generated.leaderboard_settings.placement_points?.["1"] ?? 15);
        setPoints2nd(generated.leaderboard_settings.placement_points?.["2"] ?? 10);
        setPoints3rd(generated.leaderboard_settings.placement_points?.["3"] ?? 7);
      }

      toast({
        title: "Struttura Torneo Generata! ⚡",
        description: `Configurato "${generated.name}" con ${generated.initial_matches?.length || 0} match iniziali. Puoi rivedere e confermare.`,
      });
    } catch (err: any) {
      console.warn("[CreateTournament AI] Fallback a compilazione guidata:", err);
      // Ensure the user is never blocked
      setTitle("Torneo Community Warzone");
      setGameMode("Warzone Resurgence Trios");
      setTeamLimit(8);
      setCreationMode("manual");
      toast({
        title: "Configurazione Attiva",
        description: "Compilazione rapida pronta. Puoi rifinire i campi prima di confermare.",
      });
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Save Tournament & Initial Matches to Supabase
  const handleSaveTournament = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      openAuthModal("signup");
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

    const finalTitle = title.trim();
    if (!finalTitle) {
      toast({
        title: "Titolo richiesto",
        description: "Inserisci o genera un nome per il torneo.",
        variant: "destructive",
      });
      return;
    }

    const numTeams = Number(teamLimit);
    if (isNaN(numTeams) || numTeams < 2) {
      toast({
        title: "Numero partecipanti non valido",
        description: "Inserisci almeno 2 partecipanti o squadre.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const fullDateStr = `${startDate}T${startHour}:00`;
      const parsedStartsAt = new Date(fullDateStr).toISOString();

      // Deduct 100 SCoin if not universal admin
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
          description: `Costo creazione torneo: ${finalTitle}`,
        });
      }

      const leaderboardSettings = {
        format: "teams",
        kill_points: Number(killPoints) || 1,
        placement_points: {
          "1": Number(points1st) || 15,
          "2": Number(points2nd) || 10,
          "3": Number(points3rd) || 7,
          top10: 1,
        },
      };

      const initialMatches = generatedTournament?.initial_matches || [
        { round_name: "Match 1", player1_name: "Squadra 1", player2_name: "Squadra 2" },
        { round_name: "Match 2", player1_name: "Squadra 3", player2_name: "Squadra 4" },
      ];

      // 1. Insert into public.tournaments
      const { data: newTournament, error: tournErr } = await supabase
        .from("tournaments")
        .insert({
          name: finalTitle,
          game_mode: gameMode.trim(),
          type: tournamentType,
          starts_at: parsedStartsAt,
          team_limit: numTeams,
          prize_description: prizeDescription.trim(),
          rules: rules.trim(),
          entry_fee_sc: 0,
          creation_cost_sc: CREATION_COST_SC,
          owner_id: currentUser.id,
          owner_name: userProfile.name,
          leaderboard_settings: leaderboardSettings,
          status: "upcoming",
          bracket: initialMatches,
          matches: initialMatches,
          teams: [],
        })
        .select()
        .single();

      if (tournErr) throw tournErr;

      // 2. Insert initial matches into tournament_matches table
      if (newTournament && initialMatches.length > 0) {
        const matchesToInsert = initialMatches.map((m) => ({
          tournament_id: newTournament.id,
          round_name: m.round_name || "Fase Iniziale",
          score_player1: 0,
          score_player2: 0,
          status: "pending",
          ai_parsed_data: {
            team1_name: m.player1_name || "Team 1",
            team2_name: m.player2_name || "Team 2",
            phases_summary: phasesSummary,
          },
        }));

        const { error: matchInsertErr } = await supabase
          .from("tournament_matches")
          .insert(matchesToInsert);

        if (matchInsertErr) {
          console.warn("[CreateTournament] Warning inserimento tournament_matches:", matchInsertErr);
        }
      }

      // 3. Create match chat room
      if (newTournament) {
        await supabase.from("tournament_match_chats").insert({
          tournament_id: newTournament.id,
          team_id: "general",
          room_name: `Stanza Arbitraggio & Match: ${newTournament.name}`,
        });

        // 4. Initial leaderboard entry
        await supabase.from("tournament_leaderboards").insert({
          tournament_id: newTournament.id,
          team_id: `team_${currentUser.id.slice(0, 8)}`,
          team_name: userProfile.clanTag
            ? `[${userProfile.clanTag}] ${userProfile.name}`
            : `${userProfile.name}'s Squad`,
          total_kills: 0,
          total_score: 0,
          matches_played: 0,
        });
      }

      await refreshTournaments();
      await refreshUserData();

      toast({
        title: "Torneo Pubblicato con Successo! 🏆",
        description: `"${finalTitle}" è ora attivo nella lobby con tabellone e convalida IA. ${
          !isUniversalAdmin ? "100 SCoin detratti (rimborsabili se annulli il torneo)." : ""
        }`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("[CreateTournament] Errore salvataggio:", err);
      toast({
        title: "Errore durante la creazione",
        description: err.message || "Impossibile salvare il torneo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
        <div className="relative w-full max-w-xl rounded-3xl bg-[#0f1322] border border-purple-500/40 p-4 sm:p-6 shadow-[0_0_40px_rgba(139,92,246,0.3)] overflow-hidden max-h-[92vh] flex flex-col">
          {/* Ambient Top Glow */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-80 h-24 bg-gradient-to-r from-purple-600/30 via-cyan-500/20 to-amber-500/20 blur-2xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-900/90 transition-colors z-10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="pb-3 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-[10px] font-extrabold text-purple-300 uppercase tracking-wider mb-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Organizzatore Tornei
              </div>

              <span className="text-[10px] font-mono text-cyan-300 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>IA Centralizzata Attiva</span>
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-extrabold text-white">
              Crea Torneo con IA &amp; Arbitraggio OCR
            </h3>
            <p className="text-[11px] text-zinc-400">
              Descrivi il torneo in linguaggio naturale: l'IA configurerà partecipanti, regole e fasi all'istante.
            </p>

            {/* Mode Switch Tabs */}
            <div className="flex items-center gap-2 mt-3 p-1 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
              <button
                type="button"
                onClick={() => setCreationMode("ai")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  creationMode === "ai"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                <span>Assistente IA (OpenRouter)</span>
              </button>

              <button
                type="button"
                onClick={() => setCreationMode("manual")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  creationMode === "manual"
                    ? "bg-zinc-800 text-white shadow-md border border-zinc-700"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                <span>Modulo Manuale</span>
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 text-xs">
            {creationMode === "ai" && (
              <div className="space-y-4">
                {/* AI Prompt Input Box */}
                <div className="space-y-2 bg-gradient-to-br from-purple-950/30 via-[#121628] to-cyan-950/20 border border-purple-500/30 rounded-2xl p-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Descrivi il torneo che vuoi realizzare:</span>
                    </label>
                    <span className="text-[10px] text-zinc-400">Gemini Flash Multimodal</span>
                  </div>

                  <textarea
                    rows={4}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Es: Vorrei organizzare un torneo di Warzone Resurgence a 8 squadre. Eliminazione diretta dai quarti alla finale. Assegna 2 punti per ogni kill e 15 punti per la vittoria finale. Il torneo partirà domani sera alle 21:00 con un montepremi di 2.000 SCoin..."
                    className="w-full p-3 rounded-xl bg-zinc-950/90 border border-purple-900/60 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 text-xs leading-relaxed resize-none"
                  />

                  {/* Preset Quick Chips */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Oppure prova uno schema rapido:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {AI_PROMPT_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setAiPrompt(preset.prompt)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-purple-950/60 border border-zinc-800 hover:border-purple-500/50 text-[11px] font-medium text-zinc-300 transition-all flex items-center gap-1"
                        >
                          <span>{preset.icon}</span>
                          <span>{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AI Generate Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isAiGenerating || !aiPrompt.trim()}
                      onClick={handleGenerateWithAI}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(139,92,246,0.4)] transition-all cursor-pointer"
                    >
                      {isAiGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                          <span>Gemini Flash sta elaborando regolamento e bracket...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Genera Struttura Torneo con IA</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* AI Result Structured Preview */}
                {generatedTournament && (
                  <div className="bg-[#121628] border border-emerald-500/40 rounded-2xl p-4 space-y-3.5 shadow-md animate-fade-in">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-extrabold text-emerald-300">
                          Struttura Generata dall'IA
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        Rivedi e personalizza prima di salvare
                      </span>
                    </div>

                    {/* Summary Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-zinc-900/80 border border-zinc-800 p-2 rounded-xl text-center">
                        <span className="text-[10px] text-zinc-400 block font-medium">Gioco/Modo</span>
                        <span className="text-xs font-bold text-white truncate block">
                          {generatedTournament.game_mode}
                        </span>
                      </div>

                      <div className="bg-zinc-900/80 border border-zinc-800 p-2 rounded-xl text-center">
                        <span className="text-[10px] text-zinc-400 block font-medium">Partecipanti</span>
                        <span className="text-xs font-bold text-purple-300 block">
                          {generatedTournament.team_limit} Squadre
                        </span>
                      </div>

                      <div className="bg-zinc-900/80 border border-zinc-800 p-2 rounded-xl text-center">
                        <span className="text-[10px] text-zinc-400 block font-medium">Formato</span>
                        <span className="text-xs font-bold text-cyan-300 block uppercase">
                          {generatedTournament.type}
                        </span>
                      </div>

                      <div className="bg-zinc-900/80 border border-zinc-800 p-2 rounded-xl text-center">
                        <span className="text-[10px] text-zinc-400 block font-medium">Match Iniziali</span>
                        <span className="text-xs font-bold text-amber-300 block">
                          {generatedTournament.initial_matches?.length || 0} Incontri
                        </span>
                      </div>
                    </div>

                    {/* Phases Summary */}
                    {generatedTournament.phases_summary && (
                      <div className="bg-purple-950/30 border border-purple-800/30 p-2.5 rounded-xl text-[11px] text-purple-200">
                        <strong className="text-white block mb-0.5">Fasi del Torneo:</strong>
                        {generatedTournament.phases_summary}
                      </div>
                    )}

                    {/* Initial Matches List Preview */}
                    {generatedTournament.initial_matches && generatedTournament.initial_matches.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-zinc-300 block">
                          Tabellone Iniziale Generato ({generatedTournament.initial_matches.length} Match):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {generatedTournament.initial_matches.map((m, idx) => (
                            <div
                              key={idx}
                              className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between text-[11px]"
                            >
                              <div className="min-w-0">
                                <span className="text-[9px] font-bold text-purple-400 block uppercase">
                                  {m.round_name}
                                </span>
                                <span className="font-semibold text-white truncate block">
                                  {m.player1_name} <span className="text-rose-400 font-bold">vs</span> {m.player2_name}
                                </span>
                              </div>
                              <Swords className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Editable Configuration Fields (Visible in Manual or after AI generation) */}
            <form onSubmit={handleSaveTournament} id="tournament-form" className="space-y-3.5">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-zinc-200 pt-1 border-t border-zinc-800/80">
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Dettagli e Regole del Torneo</span>
              </div>

              {/* Title */}
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Nome Torneo *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Es. Warzone Resurgence Community Clash"
                  className="w-full px-3 py-2 bg-zinc-950/90 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Game Mode & Max Teams */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                    Gioco e Modalità
                  </label>
                  <input
                    type="text"
                    value={gameMode}
                    onChange={(e) => setGameMode(e.target.value)}
                    placeholder="Es. Warzone Resurgence Trios"
                    className="w-full px-3 py-2 bg-zinc-950/90 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                    Numero Massimo Partecipanti
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={128}
                    value={teamLimit}
                    onChange={(e) => setTeamLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950/90 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Date & Start Hour */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                    Data di Inizio
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950/90 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                    Ora di Inizio (24h)
                  </label>
                  <input
                    type="time"
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950/90 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Prize */}
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Montepremi e Riconoscimenti
                </label>
                <input
                  type="text"
                  value={prizeDescription}
                  onChange={(e) => setPrizeDescription(e.target.value)}
                  placeholder="Es. 2.000 SCoin + Badge Campioni"
                  className="w-full px-3 py-2 bg-zinc-950/90 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Rules */}
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Regolamento Ufficiale (usato dall'Arbitro IA per l'OCR)
                </label>
                <textarea
                  rows={3}
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  className="w-full p-2.5 bg-zinc-950/90 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                />
              </div>

              {/* Scoring Rules */}
              <div className="bg-zinc-950/60 border border-zinc-800 p-3 rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-zinc-300 block">
                  Assegnazione Punteggi Classifica Live:
                </span>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <span className="text-[9px] text-zinc-400 block font-semibold">Pt / Kill</span>
                    <input
                      type="number"
                      value={killPoints}
                      onChange={(e) => setKillPoints(Number(e.target.value))}
                      className="w-full mt-1 p-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-center text-xs text-purple-300 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 block font-semibold">1° Posto</span>
                    <input
                      type="number"
                      value={points1st}
                      onChange={(e) => setPoints1st(Number(e.target.value))}
                      className="w-full mt-1 p-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-center text-xs text-amber-300 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 block font-semibold">2° Posto</span>
                    <input
                      type="number"
                      value={points2nd}
                      onChange={(e) => setPoints2nd(Number(e.target.value))}
                      className="w-full mt-1 p-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-center text-xs text-zinc-300 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 block font-semibold">3° Posto</span>
                    <input
                      type="number"
                      value={points3rd}
                      onChange={(e) => setPoints3rd(Number(e.target.value))}
                      className="w-full mt-1 p-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-center text-xs text-amber-600 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Tournament Creation Cost Card */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-950/40 to-cyan-950/20 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-white block">
                      Costo Creazione Torneo: {isUniversalAdmin ? "Gratuito (God Mode)" : "100 SCoin"}
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      {isUniversalAdmin
                        ? "Account Universale fedezdesimone@gmail.com con SCoin infiniti"
                        : "Rimborsato integralmente (100 SCoin) se elimini il torneo"}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-zinc-400 block">Tuo Saldo</span>
                  <span className="text-xs font-black text-amber-300">
                    {isUniversalAdmin ? "∞ SC" : `${sCoinBalance.toLocaleString()} SC`}
                  </span>
                </div>
              </div>
            </form>
          </div>

          {/* Footer Submit Button */}
          <div className="pt-3 border-t border-zinc-800 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition-colors"
            >
              Annulla
            </button>

            <button
              type="submit"
              form="tournament-form"
              disabled={isLoading || !title.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Salvataggio su Supabase in corso...</span>
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4 text-amber-300" />
                  <span>Crea e Pubblica Torneo su Supabase</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
