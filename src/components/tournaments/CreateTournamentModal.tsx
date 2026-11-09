import React, { useState, useEffect } from "react";
import {
  X,
  Trophy,
  Sparkles,
  Calendar,
  Layers,
  Target,
  Swords,
  Shield,
  Clock,
  Flame,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Users,
  Coins,
  UploadCloud,
  Search,
  UserCheck,
  UserPlus,
  AlertCircle,
  HelpCircle,
  Hash,
  Sliders,
  DollarSign,
  Gift,
  FileText,
  Image as ImageIcon,
  Check,
  Loader2,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { uploadTournamentProof } from "@/services/tournamentVerificationService";
import { initializeBracket, generateSampleTeamsForBracket, saveRegisteredTeams } from "@/services/tournamentBracketService";

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export type TournamentFormat = "single_elimination" | "round_robin" | "battle_royale";
export type KdRuleType = "open" | "min_only" | "max_only" | "range";
export type EntryFeeType = "free" | "paid";
export type ScoringMode = "fixed" | "multiplier";

interface CoOrganizerSelection {
  id: string;
  name: string;
  avatar?: string;
  username?: string;
}

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

  // Selected format among the 3 main options
  const [selectedFormat, setSelectedFormat] = useState<TournamentFormat>("single_elimination");

  // Step tracking for Eliminazione Diretta configuration (Steps 1 to 7)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // STEP 1: Nome Torneo & Categoria
  const [tournamentName, setTournamentName] = useState("");
  const [gameMode, setGameMode] = useState<"Warzone Battle Royale" | "Warzone Ritorno" | "Multiplayer">("Warzone Battle Royale");

  // STEP 2: Data e Ora di inizio
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(21, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });

  // STEP 3: Regole KD & Iscrizione & Premi
  const [kdRule, setKdRule] = useState<KdRuleType>("range");
  const [minKd, setMinKd] = useState<number>(1.2);
  const [maxKd, setMaxKd] = useState<number>(2.5);
  const [entryType, setEntryType] = useState<EntryFeeType>("free");
  const [entryFeeSCoin, setEntryFeeSCoin] = useState<number>(100);
  const [hasPrizes, setHasPrizes] = useState<boolean>(true);
  const [totalPrizePool, setTotalPrizePool] = useState<number>(1500);
  const [firstPlacePrize, setFirstPlacePrize] = useState("1.000 SCoin + Ruolo Campione");
  const [secondPlacePrize, setSecondPlacePrize] = useState("350 SCoin");
  const [thirdPlacePrize, setThirdPlacePrize] = useState("150 SCoin");

  // STEP 4: Componenti per Squadra
  const [teamSize, setTeamSize] = useState<1 | 2 | 3 | 4>(3); // 1 = Solo, 2 = Duo, 3 = Trio, 4 = Squad
  const [bracketSize, setBracketSize] = useState<4 | 8 | 16>(8); // 8 teams default

  // STEP 5: Sistema Punteggi
  const [killPoints, setKillPoints] = useState<number>(1);
  const [scoringMode, setScoringMode] = useState<ScoringMode>("fixed");
  // Placements 1 to 15 (Optional / Partial filling allowed)
  const [placementValues, setPlacementValues] = useState<Record<number, string>>({
    1: "15",
    2: "10",
    3: "7",
    4: "5",
    5: "3",
  });

  // STEP 6: Regole e Locandina
  const [rulesText, setRulesText] = useState(
    "1. Divieto assoluto di cheat, glitched weapons o comportamenti antisportivi.\n2. Al termine di ogni scontro entrambe le squadre DEVONO caricare gli screenshot di Posizionamento finale e Kill effettive (Colonna UCCISIONI).\n3. La colonna Eliminazioni non è valida perché include assist.\n4. Puntualità: 10 minuti di tolleranza massima prima del forfait."
  );
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"
  );

  // STEP 7: Co-organizzatori (Max 2)
  const [coOrganizers, setCoOrganizers] = useState<CoOrganizerSelection[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [searchedUsers, setSearchedUsers] = useState<CoOrganizerSelection[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search users in app
  useEffect(() => {
    if (!searchUserQuery.trim()) {
      setSearchedUsers([
        { id: "user_ghost", name: "Ghost_Tactical", username: "ghost_tactical", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" },
        { id: "user_viper", name: "ViperLeader", username: "viper_lead", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" },
        { id: "user_apex", name: "ApexOfficial", username: "apex_ref", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80" },
      ]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .or(`username.ilike.%${searchUserQuery.trim()}%,display_name.ilike.%${searchUserQuery.trim()}%`)
          .limit(6);

        if (!error && data && data.length > 0) {
          setSearchedUsers(
            data.map((u: any) => ({
              id: u.id,
              name: u.display_name || u.username || "Gamer",
              username: u.username,
              avatar: u.avatar_url,
            }))
          );
        } else {
          // Fallback mock search
          setSearchedUsers([
            { id: "u_custom_1", name: searchUserQuery, username: searchUserQuery.toLowerCase().replace(/\s+/g, "_") },
          ]);
        }
      } catch {
        setSearchedUsers([
          { id: "u_custom_1", name: searchUserQuery, username: searchUserQuery.toLowerCase().replace(/\s+/g, "_") },
        ]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchUserQuery]);

  if (!isOpen) return null;

  const handleSelectCoOrganizer = (user: CoOrganizerSelection) => {
    if (coOrganizers.some((c) => c.id === user.id)) {
      setCoOrganizers((prev) => prev.filter((c) => c.id !== user.id));
      return;
    }
    if (coOrganizers.length >= 2) {
      toast({
        title: "Limite raggiunto",
        description: "Puoi selezionare al massimo 2 co-organizzatori per il torneo.",
        variant: "destructive",
      });
      return;
    }
    setCoOrganizers((prev) => [...prev, user]);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleApplyPreset = (preset: "top3" | "top5" | "clear") => {
    if (preset === "clear") {
      setPlacementValues({});
      return;
    }
    if (scoringMode === "fixed") {
      if (preset === "top3") {
        setPlacementValues({ 1: "15", 2: "10", 3: "5" });
      } else {
        setPlacementValues({ 1: "20", 2: "15", 3: "10", 4: "7", 5: "5" });
      }
    } else {
      if (preset === "top3") {
        setPlacementValues({ 1: "2.0", 2: "1.5", 3: "1.25" });
      } else {
        setPlacementValues({ 1: "2.0", 2: "1.75", 3: "1.5", 4: "1.3", 5: "1.1" });
      }
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !tournamentName.trim()) {
      toast({
        title: "Nome richiesto",
        description: "Inserisci un nome per il torneo prima di proseguire.",
        variant: "destructive",
      });
      return;
    }
    if (currentStep < 7) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleCreateTournament = async () => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    if (!tournamentName.trim()) {
      toast({
        title: "Nome Mancante",
        description: "Inserisci il nome del torneo.",
        variant: "destructive",
      });
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload custom banner if chosen
      let finalBannerUrl = bannerPreview || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80";
      if (bannerFile) {
        try {
          finalBannerUrl = await uploadTournamentProof(bannerFile, "kd");
        } catch (e) {
          console.warn("[CreateTournament] Fallback banner url:", e);
        }
      }

      // Convert placements to clean dictionary
      const parsedPlacements: Record<string, number> = {};
      Object.entries(placementValues).forEach(([rank, val]) => {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
          parsedPlacements[rank] = num;
        }
      });

      const coOrganizerIds = coOrganizers.map((c) => c.id);
      const coOrganizerNames = coOrganizers.map((c) => c.name);

      const prizeDescription = hasPrizes
        ? `Montepremi: ${totalPrizePool.toLocaleString()} SCoin • 1°: ${firstPlacePrize} • 2°: ${secondPlacePrize} • 3°: ${thirdPlacePrize}`
        : "Nessun montepremi in denaro";

      const finalStartsAt = new Date(startDate).toISOString();

      // Tournament payload
      const tournamentPayload = {
        name: tournamentName.trim(),
        title: tournamentName.trim(),
        game_mode: gameMode,
        type: "single_elimination",
        starts_at: finalStartsAt,
        team_limit: bracketSize,
        max_teams: bracketSize,
        entry_fee_sc: entryType === "paid" ? entryFeeSCoin : 0,
        entry_fee_scoin: entryType === "paid" ? entryFeeSCoin : 0,
        prize_pool_scoin: hasPrizes ? totalPrizePool : 0,
        prize_description: prizeDescription,
        status: "upcoming",
        owner_id: currentUser.id,
        owner_name: userProfile.name || "Organizzatore",
        co_organizers: coOrganizerIds,
        co_organizer_names: coOrganizerNames,
        rules: rulesText,
        banner_url: finalBannerUrl,
        require_kd_verification: kdRule !== "open",
        min_kd_limit: kdRule === "min_only" || kdRule === "range" ? minKd : null,
        max_kd_limit: kdRule === "max_only" || kdRule === "range" ? maxKd : null,
        team_size: teamSize,
        scoring_settings: {
          scoring_mode: scoringMode,
          kill_points: killPoints,
          placement_points: scoringMode === "fixed" ? parsedPlacements : undefined,
          placement_multipliers: scoringMode === "multiplier" ? parsedPlacements : undefined,
        },
      };

      let createdTournamentId = `tourn_local_${Date.now()}`;

      // Insert into Supabase with safe fallback
      try {
        const { data: inserted, error: insertError } = await supabase
          .from("tournaments")
          .insert({
            name: tournamentPayload.name,
            game_mode: tournamentPayload.game_mode,
            type: tournamentPayload.type,
            starts_at: tournamentPayload.starts_at,
            team_limit: tournamentPayload.team_limit,
            entry_fee_sc: tournamentPayload.entry_fee_sc,
            prize_description: tournamentPayload.prize_description,
            rules: tournamentPayload.rules,
            owner_id: currentUser.id,
            owner_name: tournamentPayload.owner_name,
            banner_url: finalBannerUrl,
            require_kd_verification: tournamentPayload.require_kd_verification,
            min_kd_limit: tournamentPayload.min_kd_limit,
            max_kd_limit: tournamentPayload.max_kd_limit,
          })
          .select()
          .maybeSingle();

        if (inserted?.id) {
          createdTournamentId = inserted.id;
        }
      } catch (dbErr) {
        console.warn("[CreateTournament] Supabase insert fallback to local state:", dbErr);
      }

      // Generate seed bracket & demo sample teams so it's fully playable immediately
      const sampleTeams = generateSampleTeamsForBracket(createdTournamentId, teamSize);
      saveRegisteredTeams(createdTournamentId, sampleTeams);
      initializeBracket(createdTournamentId, bracketSize, sampleTeams);

      // Create main match chat if DB allows
      try {
        await supabase.from("tournament_match_chats").insert({
          tournament_id: createdTournamentId,
          title: `Stanza Torneo: ${tournamentName}`,
        });
      } catch {}

      toast({
        title: "Torneo ad Eliminazione Diretta Creato! 🏆⚔️",
        description: `"${tournamentName}" è ora attivo. Tabellone a ${bracketSize} squadre configurato con successo.`,
      });

      // Refresh squad context & navigate to match room
      await refreshTournaments();
      await refreshUserData();

      setSelectedTournament({
        id: createdTournamentId,
        title: tournamentPayload.name,
        game: tournamentPayload.game_mode,
        category: "Eliminazione Diretta",
        banner: finalBannerUrl,
        status: "upcoming",
        prizePoolSCoin: tournamentPayload.prize_pool_scoin,
        entryFeeSCoin: tournamentPayload.entry_fee_sc,
        teamsJoined: sampleTeams.length,
        maxTeams: bracketSize,
        startsAt: new Date(finalStartsAt).toLocaleDateString([], {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        mode: teamSize === 1 ? "Solo" : teamSize === 2 ? "Duo" : teamSize === 3 ? "Trio" : "Squad",
        description: rulesText,
        raw: {
          ...tournamentPayload,
          id: createdTournamentId,
        },
      });

      setTournamentSubTab("match_room");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("[CreateTournament Error]:", err);
      toast({
        title: "Errore durante la creazione",
        description: err.message || "Si è verificato un errore imprevisto.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepLabels = [
    "Nome & Gioco",
    "Data & Ora",
    "KD & Iscrizione",
    "Componenti Team",
    "Punteggi",
    "Regole & Locandina",
    "Co-organizzatori",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#0f1322] border border-purple-900/60 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-purple-950/80 bg-gradient-to-r from-purple-950/40 via-[#121628] to-[#121628]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wide">
                Crea Nuovo Torneo
              </h3>
              <p className="text-[11px] text-zinc-400">
                Configurazione torneo competitivo ad Eliminazione Diretta
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Main Tournament Format Selection */}
        <div className="p-4 sm:p-5 border-b border-purple-950/60 bg-zinc-950/40">
          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2.5">
            Seleziona la Tipologia di Torneo
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* 1: Eliminazione Diretta (Selected & Focused) */}
            <button
              type="button"
              onClick={() => setSelectedFormat("single_elimination")}
              className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                selectedFormat === "single_elimination"
                  ? "bg-purple-950/60 border-purple-500 shadow-md shadow-purple-950/60 ring-2 ring-purple-500/30"
                  : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-400"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Swords className={`w-4 h-4 ${selectedFormat === "single_elimination" ? "text-purple-400" : "text-zinc-500"}`} />
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40">
                    FOCUS
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white leading-tight">
                  Eliminazione Diretta
                </h4>
                <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                  Tabellone a scontri diretti con Quarti, Semi e Finale
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-purple-900/30 flex items-center justify-between text-[10px] font-bold text-purple-300">
                <span>Tabellone IA</span>
                <Check className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* 2: Girone all'Italiana */}
            <button
              type="button"
              onClick={() => {
                setSelectedFormat("round_robin");
                toast({
                  title: "Modalità Girone all'Italiana",
                  description: "Formato disponibile. Clicca su Eliminazione Diretta per visualizzare il flusso completo richiesto.",
                });
              }}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                selectedFormat === "round_robin"
                  ? "bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/30"
                  : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 text-zinc-400"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="text-[9px] font-semibold text-zinc-400">Classifica</span>
                </div>
                <h4 className="text-xs font-bold text-white leading-tight">
                  Girone all'Italiana
                </h4>
                <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                  Tutti contro tutti con assegnazione punti a incontro
                </p>
              </div>
              <div className="mt-2 text-[10px] font-semibold text-zinc-500">
                Gironi A / B
              </div>
            </button>

            {/* 3: Battle Royale a Punti */}
            <button
              type="button"
              onClick={() => {
                setSelectedFormat("battle_royale");
                toast({
                  title: "Modalità Custom BR",
                  description: "Formato a lobby cumulativa. Clicca su Eliminazione Diretta per la gestione scontro diretto a tabellone.",
                });
              }}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                selectedFormat === "battle_royale"
                  ? "bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/30"
                  : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 text-zinc-400"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span className="text-[9px] font-semibold text-zinc-400">Lobby</span>
                </div>
                <h4 className="text-xs font-bold text-white leading-tight">
                  Battle Royale a Punti
                </h4>
                <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                  Classifica live basata sulla somma piazzamento e kill
                </p>
              </div>
              <div className="mt-2 text-[10px] font-semibold text-zinc-500">
                Punteggio Cumulativo
              </div>
            </button>
          </div>
        </div>

        {/* Step Progress Bar for Eliminazione Diretta */}
        <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-purple-950/40 bg-[#0d101d]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-extrabold text-purple-400">
              Passaggio {currentStep} di 7
            </span>
            <span className="font-semibold text-zinc-300">
              {stepLabels[currentStep - 1]}
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden flex">
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
              <div
                key={s}
                className={`flex-1 h-full transition-all duration-300 ${
                  s <= currentStep
                    ? "bg-gradient-to-r from-purple-500 to-cyan-400"
                    : "bg-transparent"
                } ${s > 1 ? "border-l border-zinc-900" : ""}`}
              />
            ))}
          </div>
        </div>

        {/* STEP CONTENT BODY */}
        <div className="p-4 sm:p-5 max-h-[62vh] overflow-y-auto space-y-4">
          {/* STEP 1: Nome Torneo & Modalità Gioco */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <Trophy className="w-4 h-4 text-purple-400" />
                <span>1. NOME DEL TORNEO & GIOCO</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Nome Ufficiale Torneo *
                </label>
                <input
                  type="text"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder="Es. SquadUP Eliminator Cup #1 - Rebirth Island"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-purple-500 text-white text-xs outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Categoria del Torneo *
                </label>
                <select
                  value={gameMode}
                  onChange={(e) => setGameMode(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-purple-500 text-white text-xs outline-none transition-colors"
                >
                  <option value="Warzone Battle Royale">Warzone Battle Royale</option>
                  <option value="Warzone Ritorno">Warzone Ritorno</option>
                  <option value="Multiplayer">Multiplayer</option>
                </select>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs text-zinc-300 space-y-1">
                <div className="font-bold text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Arbitraggio Automatico IA Vision</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Il tabellone a eliminazione diretta gestirà automaticamente lo scontro tra le squadre accoppiate. I partecipanti caricheranno screenshot di piazzamento e la tabella uccisioni.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Ora di Inizio */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>2. DATA E ORA DI INIZIO SCONTRI</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Seleziona Giorno & Orario di Partenza *
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-cyan-500 text-white text-xs outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setHours(d.getHours() + 2);
                    setStartDate(d.toISOString().slice(0, 16));
                  }}
                  className="py-2 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-semibold text-center transition-colors"
                >
                  Tra 2 ore
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    d.setHours(21, 0, 0, 0);
                    setStartDate(d.toISOString().slice(0, 16));
                  }}
                  className="py-2 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-semibold text-center transition-colors"
                >
                  Domani alle 21:00
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + (6 - d.getDay() + 7) % 7);
                    d.setHours(21, 30, 0, 0);
                    setStartDate(d.toISOString().slice(0, 16));
                  }}
                  className="py-2 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-semibold text-center transition-colors"
                >
                  Weekend Serale
                </button>
              </div>

              <p className="text-[11px] text-zinc-400">
                All'orario di inizio stabilito, il tabellone verrà bloccato e i match del Round 1 saranno immediatamente disputabili nelle rispettive stanze scontro.
              </p>
            </div>
          )}

          {/* STEP 3: Regole KD & Iscrizione & Premi */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <Target className="w-4 h-4 text-amber-400" />
                <span>3. REGOLE KD, ISCRIZIONE & PREMI FINALI</span>
              </div>

              {/* KD Limits */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Parametri KD (Kills / Deaths) Ammessi
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: "open", label: "Aperto a tutti", desc: "Nessun limite" },
                    { id: "min_only", label: "Solo Minimo", desc: "Es. KD >= 1.5" },
                    { id: "max_only", label: "Solo Massimo", desc: "Es. KD <= 2.0" },
                    { id: "range", label: "Range Min & Max", desc: "Es. 1.2 - 2.5" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setKdRule(opt.id as KdRuleType)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        kdRule === opt.id
                          ? "bg-amber-950/60 border-amber-500 text-white"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{opt.label}</div>
                      <div className="text-[10px] text-zinc-400 truncate">{opt.desc}</div>
                    </button>
                  ))}
                </div>

                {kdRule !== "open" && (
                  <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 grid grid-cols-2 gap-3 mt-2">
                    {(kdRule === "min_only" || kdRule === "range") && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-400">
                          KD Minimo Richiesto
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="10"
                          value={minKd}
                          onChange={(e) => setMinKd(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs outline-none"
                        />
                      </div>
                    )}
                    {(kdRule === "max_only" || kdRule === "range") && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-400">
                          KD Massimo Consentito
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.5"
                          max="10"
                          value={maxKd}
                          onChange={(e) => setMaxKd(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Entry Fee (Free vs Paid) */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Quota di Iscrizione
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEntryType("free")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      entryType === "free"
                        ? "bg-emerald-950/60 border-emerald-500 text-white"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="text-xs font-bold text-emerald-400">Iscrizione Gratuita</div>
                    <div className="text-[10px] text-zinc-400">Nessun costo in SCoin</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEntryType("paid")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      entryType === "paid"
                        ? "bg-purple-950/60 border-purple-500 text-white"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="text-xs font-bold text-purple-300">A Pagamento (SCoin)</div>
                    <div className="text-[10px] text-zinc-400">Buy-in per squadra</div>
                  </button>
                </div>

                {entryType === "paid" && (
                  <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3 mt-2">
                    <span className="text-xs text-zinc-300 font-medium">
                      Quota iscrizione per team:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <input
                        type="number"
                        min="10"
                        step="50"
                        value={entryFeeSCoin}
                        onChange={(e) => setEntryFeeSCoin(parseInt(e.target.value) || 0)}
                        className="w-24 px-2 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs text-right font-bold outline-none"
                      />
                      <span className="text-xs font-bold text-amber-300">SC</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Final Prizes */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-amber-400" />
                    <span>Premi per le Posizioni Finali</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={hasPrizes}
                      onChange={(e) => setHasPrizes(e.target.checked)}
                      className="rounded accent-purple-500 w-4 h-4"
                    />
                    <span>Abilita Premi</span>
                  </label>
                </div>

                {hasPrizes && (
                  <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Montepremi Totale:</span>
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <input
                          type="number"
                          value={totalPrizePool}
                          onChange={(e) => setTotalPrizePool(parseInt(e.target.value) || 0)}
                          className="w-28 px-2 py-1 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs font-bold text-right outline-none"
                        />
                        <span className="text-xs font-bold text-amber-300">SC</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 pt-1 border-t border-zinc-800/80">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="text-amber-400 font-bold w-20 shrink-0">🥇 1° Posto:</span>
                        <input
                          type="text"
                          value={firstPlacePrize}
                          onChange={(e) => setFirstPlacePrize(e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-[11px] outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="text-zinc-300 font-bold w-20 shrink-0">🥈 2° Posto:</span>
                        <input
                          type="text"
                          value={secondPlacePrize}
                          onChange={(e) => setSecondPlacePrize(e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-[11px] outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="text-amber-700 font-bold w-20 shrink-0">🥉 3° Posto:</span>
                        <input
                          type="text"
                          value={thirdPlacePrize}
                          onChange={(e) => setThirdPlacePrize(e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-[11px] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Componenti per Squadra */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <Users className="w-4 h-4 text-purple-400" />
                <span>4. COMPONENTI PER SQUADRA & DIMENSIONE TABELLONE</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Giocatori per Squadra (Min 1 - Max 4)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { size: 1, label: "Solo (1)", icon: "👤" },
                    { size: 2, label: "Duo (2)", icon: "👥" },
                    { size: 3, label: "Trio (3)", icon: "🔥" },
                    { size: 4, label: "Squad (4)", icon: "🛡️" },
                  ].map((item) => (
                    <button
                      key={item.size}
                      type="button"
                      onClick={() => setTeamSize(item.size as any)}
                      className={`py-3 px-2 rounded-2xl border text-center transition-all ${
                        teamSize === item.size
                          ? "bg-purple-950/80 border-purple-500 shadow-md ring-2 ring-purple-500/30 text-white"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <div className="text-lg mb-1">{item.icon}</div>
                      <div className="text-xs font-bold">{item.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Numero di Squadre nel Tabellone
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { total: 4, label: "4 Squadre", rounds: "Semifinali + Finale" },
                    { total: 8, label: "8 Squadre", rounds: "Quarti + Semifinali + Finale (Standard)" },
                    { total: 16, label: "16 Squadre", rounds: "Ottavi + Quarti + Semi + Finale" },
                  ].map((bracket) => (
                    <button
                      key={bracket.total}
                      type="button"
                      onClick={() => setBracketSize(bracket.total as any)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        bracketSize === bracket.total
                          ? "bg-cyan-950/70 border-cyan-500 shadow-md ring-2 ring-cyan-500/30 text-white"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <div className="text-xs font-black text-cyan-300">{bracket.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{bracket.rounds}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 space-y-1">
                <span className="font-bold text-white">Riepilogo Squadre:</span>
                <p className="text-[11px] text-zinc-400">
                  Ogni capitano iscriverà <strong className="text-purple-300">{teamSize} {teamSize === 1 ? "giocatore" : "giocatori"}</strong> con i rispettivi Activision ID e screenshot del KD. Il tabellone accoglierà <strong className="text-cyan-300">{bracketSize} squadre</strong> per un totale di {teamSize * bracketSize} concorrenti.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: Sistema Punteggi */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>5. SISTEMA PUNTEGGI & METODO POSIZIONAMENTO</span>
              </div>

              {/* Points per Kill */}
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white">Punti per ogni Kill</div>
                  <div className="text-[10px] text-zinc-400">
                    Solo colonna UCCISIONI effettive (escluse eliminazioni con assist)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={killPoints}
                    onChange={(e) => setKillPoints(parseFloat(e.target.value) || 1)}
                    className="w-16 px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs font-bold text-center outline-none"
                  />
                  <span className="text-xs font-bold text-emerald-400">pt / kill</span>
                </div>
              </div>

              {/* Mode: Fixed Points vs Multiplier */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Modalità Assegnazione Punti Piazzamento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScoringMode("fixed");
                      setPlacementValues({ 1: "15", 2: "10", 3: "7", 4: "5", 5: "3" });
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      scoringMode === "fixed"
                        ? "bg-purple-950/80 border-purple-500 ring-2 ring-purple-500/30 text-white"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="text-xs font-bold text-purple-300">Punti Fissi</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      Sommati alle kill (es. 1°: +15 pt, 2°: +10 pt)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setScoringMode("multiplier");
                      setPlacementValues({ 1: "2.0", 2: "1.75", 3: "1.5", 4: "1.25", 5: "1.1" });
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      scoringMode === "multiplier"
                        ? "bg-cyan-950/80 border-cyan-500 ring-2 ring-cyan-500/30 text-white"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="text-xs font-bold text-cyan-300">Moltiplicatore Posizione</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      Moltiplica le kill (es. 1°: x2.0, 2°: x1.75)
                    </div>
                  </button>
                </div>
              </div>

              {/* Placements 1 to 15 (Partial configuration allowed!) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block">
                      Valori Posizioni dal 1° al 15° Posto (Facoltativi)
                    </label>
                    <span className="text-[10px] text-zinc-400">
                      Compila anche solo un sottoinsieme (es. le prime 3 o 5 posizioni)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("top3")}
                      className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-200"
                    >
                      Top 3
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("top5")}
                      className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-200"
                    >
                      Top 5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("clear")}
                      className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-rose-300"
                    >
                      Azzera
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((rank) => (
                    <div key={rank} className="space-y-1">
                      <span className="text-[10px] font-semibold text-zinc-400 block text-center">
                        {rank}° Posto
                      </span>
                      <input
                        type="text"
                        placeholder={scoringMode === "fixed" ? "0 pt" : "x1.0"}
                        value={placementValues[rank] || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPlacementValues((prev) => ({
                            ...prev,
                            [rank]: v,
                          }));
                        }}
                        className="w-full py-1.5 px-2 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-purple-500 text-white text-xs font-bold text-center outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Regole e Locandina */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>6. REGOLAMENTO SCRITTO A MANO & LOCANDINA</span>
              </div>

              {/* Rules text */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    Testo Regole Generali (Personalizzabile a Mano)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRulesText(
                        "1. REGOLA UCCISIONI RIGOROSA: L'IA Vision conteggia esclusivamente la colonna 'UCCISIONI' per ciascun membro registrato. Le Eliminazioni (assist) non sono valide.\n2. SCREENSHOT OBBLIGATORI: Al termine del match entrambi i team devono inviare lo screenshot del piazzamento finale e del tabellone di squadra.\n3. TOLLERANZA: 10 minuti di ritardo comportano la vittoria a tavolino dell'avversario.\n4. ANTI-CHEAT & CONDOTTA: Vietate armi bannate, exploit e comportamenti antisportivi."
                      );
                    }}
                    className="text-[10px] font-bold text-purple-400 hover:underline"
                  >
                    Template Esport Standard
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                  placeholder="Scrivi qui il regolamento del torneo..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-purple-500 text-white text-xs outline-none transition-colors"
                />
              </div>

              {/* Banner poster upload */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Foto / Locandina Ufficiale (Anteprima Visiva Scheda Torneo)
                </label>

                {bannerPreview && (
                  <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-purple-500/40 group">
                    <img
                      src={bannerPreview}
                      alt="Anteprima Locandina"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                      <span className="text-[11px] font-bold text-white drop-shadow">
                        {tournamentName || "Anteprima Locandina Torneo"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <UploadCloud className="w-4 h-4 text-purple-400" />
                    <span>Carica Immagine / Locandina</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerChange}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setBannerPreview(
                        "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"
                      )
                    }
                    className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-semibold"
                  >
                    Preset Esport
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Co-organizzatori */}
          {currentStep === 7 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>7. CO-ORGANIZZATORI (MAX 2 UTENTI CON PERMESSI DI GESTIONE)</span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                I co-organizzatori selezionati avranno automaticamente i permessi per revisionare le iscrizioni, convalidare screenshot, gestire le stanze match e applicare override arbitrali.
              </p>

              {/* Selected Co-organizers Badges */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Co-organizzatori Selezionati ({coOrganizers.length}/2):
                </label>
                {coOrganizers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {coOrganizers.map((co) => (
                      <div
                        key={co.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-500/50 text-white text-xs"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-bold">{co.name}</span>
                        <button
                          type="button"
                          onClick={() => handleSelectCoOrganizer(co)}
                          className="hover:text-rose-400 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-500 text-xs text-center">
                    Nessun co-organizzatore assegnato (facoltativo)
                  </div>
                )}
              </div>

              {/* Search User Input */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Cerca Utente nell'App per Nome o Username:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    placeholder="Es. ghost_tactical, Viper..."
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-cyan-500 text-white text-xs outline-none"
                  />
                  {isSearchingUsers && (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400 absolute right-3 top-3" />
                  )}
                </div>

                {/* Search Results */}
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {searchedUsers.map((user) => {
                    const isSelected = coOrganizers.some((c) => c.id === user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => handleSelectCoOrganizer(user)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-purple-950/70 border-purple-500 text-white"
                            : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-7 h-7 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-purple-400 shrink-0">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 truncate">
                            <span className="text-xs font-bold truncate block">{user.name}</span>
                            {user.username && (
                              <span className="text-[10px] text-zinc-500 truncate block">
                                @{user.username}
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? "bg-purple-500 text-white"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {isSelected ? "Selezionato" : "Aggiungi"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-4 sm:p-5 border-t border-purple-950/80 bg-[#0d101d] flex items-center justify-between gap-3">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Indietro</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 7 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
            >
              <span>Continua</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCreateTournament}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-black flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Configurazione Torneo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Pubblica e Avvia Torneo</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
