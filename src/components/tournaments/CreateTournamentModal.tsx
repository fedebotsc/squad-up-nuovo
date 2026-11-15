import React, { useState, useEffect, useMemo } from "react";
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
import { getChampionshipState } from "@/services/tournamentChampionshipService";
import { SCoinShopModal } from "@/components/shop/SCoinShopModal";

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export type TournamentFormat = "single_elimination" | "leaderboard_championship";
export type KdRuleType = "open" | "min_only" | "max_only" | "range";
export type EntryFeeType = "free" | "paid";
export type ScoringMode = "fixed" | "multiplier";

export interface CoOrganizerSelection {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
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
    refreshUserData,
    tournaments,
    setTournaments,
    setSelectedTournament,
    setTournamentSubTab,
  } = useSquad();

  const TOURNAMENT_CREATION_FEE_SC = 100;
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);

  // Selected format among the 3 main options
  const [selectedFormat, setSelectedFormat] = useState<TournamentFormat>("single_elimination");

  // Step tracking for Eliminazione Diretta configuration (Steps 1 to 7)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // STEP 1: Nome Torneo & Categoria
  const [tournamentName, setTournamentName] = useState("");
  const [gameMode, setGameMode] = useState<"Warzone Battle Royale" | "Warzone Ritorno" | "Multiplayer">("Warzone Battle Royale");

  // STEP 2: Data e Ora di inizio (STRICT 24H FORMAT)
  const [startDateDay, setStartDateDay] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [startTimeHour, setStartTimeHour] = useState("21"); // 00 - 23 (24h)
  const [startTimeMinute, setStartTimeMinute] = useState("00"); // 00 - 55

  const formattedDate24h = useMemo(() => {
    try {
      const [y, m, d] = startDateDay.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d, Number(startTimeHour), Number(startTimeMinute));
      const dayName = dateObj.toLocaleDateString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} • Ore ${startTimeHour.padStart(2, "0")}:${startTimeMinute.padStart(2, "0")}`;
    } catch {
      return `${startDateDay} ore ${startTimeHour}:${startTimeMinute}`;
    }
  }, [startDateDay, startTimeHour, startTimeMinute]);

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

  // STEP 4: Componenti per Squadra & Dimensione / Numero Game
  const [teamSize, setTeamSize] = useState<1 | 2 | 3 | 4>(3); // 1 = Solo, 2 = Duo, 3 = Trio, 4 = Squad
  const [bracketSize, setBracketSize] = useState<4 | 8 | 16>(8); // 8 teams default
  const [totalGames, setTotalGames] = useState<number>(5); // Numero di Game (Giornate) per Classifica a Punteggio (Campionato)
  const [championshipMaxTeams, setChampionshipMaxTeams] = useState<number>(16);

  // STEP 5: Sistema Punteggi
  const [killPoints, setKillPoints] = useState<number>(1);
  const [scoringMode, setScoringMode] = useState<ScoringMode>("fixed");
  const [placementValues, setPlacementValues] = useState<Record<number, string>>({
    1: "15",
    2: "10",
    3: "7",
    4: "5",
    5: "3",
  });

  // STEP 6: Regole e Locandina
  const [rulesText, setRulesText] = useState(
    "1. REGOLA UCCISIONI RIGOROSA: L'IA Vision conteggia esclusivamente la colonna 'UCCISIONI' per ciascun membro registrato. Le Eliminazioni (assist) non sono valide.\n2. SCREENSHOT OBBLIGATORI: Al termine del match entrambi i team devono inviare lo screenshot del piazzamento finale e della tabella uccisioni.\n3. TOLLERANZA: 10 minuti di ritardo comportano la vittoria a tavolino dell'avversario.\n4. CONDOTTA: Vietate armi bannate, exploit e comportamenti antisportivi."
  );
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"
  );

  // STEP 7: Co-organizzatori (Max 2, NO FAKE NAMES)
  const [coOrganizers, setCoOrganizers] = useState<CoOrganizerSelection[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [searchedUsers, setSearchedUsers] = useState<CoOrganizerSelection[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search real users in Supabase profiles (no fictitious mock names)
  useEffect(() => {
    if (!searchUserQuery.trim()) {
      setSearchedUsers([]);
      setIsSearchingUsers(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const query = searchUserQuery.trim();
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .neq("id", currentUser?.id || "")
          .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
          .limit(8);

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
          setSearchedUsers([]);
        }
      } catch {
        setSearchedUsers([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchUserQuery, currentUser?.id]);

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

  const handleApplyPreset = (preset: "top3" | "top5" | "top10" | "clear") => {
    if (preset === "clear") {
      setPlacementValues({});
      return;
    }
    if (scoringMode === "fixed") {
      if (preset === "top3") {
        setPlacementValues({ 1: "15", 2: "10", 3: "5" });
      } else if (preset === "top5") {
        setPlacementValues({ 1: "20", 2: "15", 3: "10", 4: "7", 5: "5" });
      } else if (preset === "top10") {
        setPlacementValues({
          1: "25",
          2: "20",
          3: "15",
          4: "12",
          5: "10",
          6: "8",
          7: "6",
          8: "4",
          9: "2",
          10: "1",
        });
      }
    } else {
      if (preset === "top3") {
        setPlacementValues({ 1: "2.0", 2: "1.5", 3: "1.2" });
      } else if (preset === "top5") {
        setPlacementValues({ 1: "2.5", 2: "2.0", 3: "1.7", 4: "1.4", 5: "1.2" });
      } else if (preset === "top10") {
        setPlacementValues({
          1: "2.5",
          2: "2.0",
          3: "1.8",
          4: "1.6",
          5: "1.4",
          6: "1.3",
          7: "1.2",
          8: "1.1",
          9: "1.0",
          10: "1.0",
        });
      }
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!tournamentName.trim()) {
        toast({
          title: "Nome Mancante",
          description: "Inserisci un nome per il torneo prima di proseguire.",
          variant: "destructive",
        });
        return;
      }
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
      toast({
        title: "Accesso Richiesto",
        description: "Devi effettuare il login per creare un torneo.",
        variant: "destructive",
      });
      return;
    }

    if (!tournamentName.trim()) {
      toast({
        title: "Nome Richiesto",
        description: "Inserisci il nome ufficiale del torneo.",
        variant: "destructive",
      });
      return;
    }

    // STRICT CHECK: 100 SCoin required to create a tournament
    if (sCoinBalance < TOURNAMENT_CREATION_FEE_SC) {
      toast({
        title: "Saldo SCoin Insufficiente",
        description: `Per creare un torneo ufficiale sono richiesti ${TOURNAMENT_CREATION_FEE_SC} SCoin. Il tuo saldo attuale è di ${sCoinBalance} SC. L'acquisto di SCoin avviene con denaro reale.`,
        variant: "destructive",
      });
      setIsShopModalOpen(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. DEDUCT 100 SCOIN VIA RPC OR ATOMIC UPDATE
      let feeDeducted = false;
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("deduct_tournament_creation_fee", {
          p_user_id: currentUser.id,
          p_amount: TOURNAMENT_CREATION_FEE_SC,
          p_tournament_name: tournamentName.trim(),
        });

        if (!rpcErr && rpcRes?.success) {
          feeDeducted = true;
        } else if (rpcRes && rpcRes.success === false) {
          throw new Error(rpcRes.error || "Saldo SCoin insufficiente per creare il torneo.");
        }
      } catch (rpcEx: any) {
        if (rpcEx.message && rpcEx.message.includes("insufficiente")) {
          throw rpcEx;
        }
        console.warn("[CreateTournament] RPC fallback to direct update:", rpcEx);
      }

      if (!feeDeducted) {
        // Direct atomic balance check & deduction from profiles table
        const { data: profData } = await supabase
          .from("profiles")
          .select("balance, coins, schoins")
          .eq("id", currentUser.id)
          .maybeSingle();

        const currentDbBalance =
          profData?.balance ?? profData?.coins ?? profData?.schoins ?? sCoinBalance ?? 0;

        if (currentDbBalance < TOURNAMENT_CREATION_FEE_SC) {
          throw new Error(
            `Saldo SCoin insufficiente. Hai ${currentDbBalance} SCoin, ne occorrono ${TOURNAMENT_CREATION_FEE_SC} per pubblicare il torneo. Ricarica con denaro reale per procedere.`
          );
        }

        const newBal = Math.max(0, currentDbBalance - TOURNAMENT_CREATION_FEE_SC);

        const { error: updateProfErr } = await supabase
          .from("profiles")
          .update({
            balance: newBal,
            coins: newBal,
            schoins: newBal,
          })
          .eq("id", currentUser.id);

        if (updateProfErr) {
          throw new Error("Errore durante la detrazione dei 100 SCoin dal profilo. Operazione annullata.");
        }

        // Record transaction in sc_transactions
        await supabase.from("sc_transactions").insert({
          user_id: currentUser.id,
          amount: -TOURNAMENT_CREATION_FEE_SC,
          transaction_type: "tournament_creation",
          description: `Creazione Torneo Ufficiale: ${tournamentName.trim()}`,
        });
      }

      // Refresh real-time user balance in UI
      if (refreshUserData) {
        await refreshUserData();
      }

      let finalBannerUrl = bannerPreview || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80";
      if (bannerFile) {
        try {
          finalBannerUrl = await uploadTournamentProof(bannerFile, "kd");
        } catch (e) {
          console.warn("[CreateTournament] Upload banner fallback:", e);
        }
      }

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

      // 24-hour formatted ISO timestamp
      const finalStartsAt = new Date(
        `${startDateDay}T${startTimeHour.padStart(2, "0")}:${startTimeMinute.padStart(2, "0")}:00`
      ).toISOString();

      const maxTeamsLimit = selectedFormat === "single_elimination" ? bracketSize : championshipMaxTeams;

      const tournamentPayload = {
        name: tournamentName.trim(),
        title: tournamentName.trim(),
        game_mode: gameMode,
        type: selectedFormat,
        category: selectedFormat === "leaderboard_championship" ? "Classifica a Punteggio" : "Eliminazione Diretta",
        starts_at: finalStartsAt,
        team_limit: maxTeamsLimit,
        max_teams: maxTeamsLimit,
        total_games: selectedFormat === "leaderboard_championship" ? totalGames : undefined,
        current_game: 1,
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
            banner_url: tournamentPayload.banner_url,
            owner_id: tournamentPayload.owner_id,
            status: tournamentPayload.status,
          })
          .select("id")
          .single();

        if (!insertError && inserted?.id) {
          createdTournamentId = inserted.id;
        }
      } catch (dbErr) {
        console.warn("[CreateTournament] Database insert fallback:", dbErr);
      }

      // Initialize format specific engine
      if (selectedFormat === "single_elimination") {
        initializeBracket(createdTournamentId, bracketSize, []);
      } else {
        getChampionshipState(createdTournamentId, totalGames, tournamentPayload.scoring_settings);
      }

      // Format startsAt for UI display in strict 24h
      const formattedStartsAt24h = new Date(finalStartsAt).toLocaleString("it-IT", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const newTournamentUI = {
        id: createdTournamentId,
        title: tournamentPayload.name,
        game: gameMode,
        category: selectedFormat === "leaderboard_championship" ? "Classifica a Punteggio" : "Eliminazione Diretta",
        banner: finalBannerUrl,
        status: "upcoming" as const,
        prizePoolSCoin: hasPrizes ? totalPrizePool : 0,
        entryFeeSCoin: entryType === "paid" ? entryFeeSCoin : 0,
        teamsJoined: 0,
        maxTeams: maxTeamsLimit,
        startsAt: formattedStartsAt24h,
        mode: `${teamSize === 1 ? "Solo" : teamSize === 2 ? "Duo" : teamSize === 3 ? "Trio" : "Squad"} (${teamSize}p)${selectedFormat === "leaderboard_championship" ? ` • ${totalGames} Game` : ""}`,
        description: rulesText,
        raw: {
          ...tournamentPayload,
          id: createdTournamentId,
        },
      };

      setTournaments([newTournamentUI, ...tournaments]);
      setSelectedTournament(newTournamentUI);
      setTournamentSubTab("active");

      toast({
        title: "Torneo Creato con Successo! 🏆",
        description: `"${tournamentPayload.name}" è pronto (-100 SCoin scalati dal saldo). Inizio: ${formattedStartsAt24h}.`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("[CreateTournamentModal] Errore creazione:", err);
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
    "Nome & Categoria",
    "Data & Orario 24h",
    "KD, Quota & Premi",
    "Squadre & Tabellone",
    "Sistema Punteggio",
    "Regole & Locandina",
    "Co-organizzatori",
  ];

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end sm:justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fade-in">
      <div className="relative w-full max-w-xl h-[100dvh] sm:h-[90dvh] sm:max-h-[780px] bg-[#0f1322] border-0 sm:border border-purple-900/60 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header Bar (shrink-0) */}
        <div className="shrink-0 flex items-center justify-between p-3 sm:p-4 border-b border-purple-950/80 bg-gradient-to-r from-purple-950/40 via-[#121628] to-[#121628]">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-xs sm:text-base font-black text-white tracking-wide truncate">
                  Crea Nuovo Torneo
                </h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] sm:text-[10px] font-black shrink-0">
                  <Coins className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                  -100 SC
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate hidden sm:block">
                {selectedFormat === "leaderboard_championship"
                  ? "Configurazione torneo Classifica a Punteggio (Campionato per Game)"
                  : "Configurazione torneo competitivo ad Eliminazione Diretta"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsShopModalOpen(true)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl border text-[10px] sm:text-[11px] font-extrabold transition-all cursor-pointer ${
                sCoinBalance >= TOURNAMENT_CREATION_FEE_SC
                  ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50"
                  : "bg-rose-950/60 border-rose-500/50 text-rose-300 hover:bg-rose-900/60"
              }`}
              title="Clicca per acquistare SCoin con denaro reale"
            >
              <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
              <span>{sCoinBalance > 99999 ? `${(sCoinBalance / 1000).toFixed(0)}k` : sCoinBalance.toLocaleString()} SC</span>
              {sCoinBalance < TOURNAMENT_CREATION_FEE_SC && (
                <span className="text-[9px] text-amber-400 underline font-black ml-0.5">Ricarica</span>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2 Main Tournament Format Selection (Eliminazione Diretta vs Classifica a Punteggio) */}
        <div className="shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 border-b border-purple-950/60 bg-zinc-950/40">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Tipologia di Torneo
            </span>
            <span className="text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 truncate max-w-[160px] sm:max-w-none">
              {selectedFormat === "leaderboard_championship"
                ? "Classifica a Punteggio"
                : "Eliminazione Diretta"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {/* 1: Eliminazione Diretta */}
            <button
              type="button"
              onClick={() => setSelectedFormat("single_elimination")}
              className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedFormat === "single_elimination"
                  ? "bg-purple-950/80 border-purple-500 shadow-md ring-2 ring-purple-500/40 text-white"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5">
                <Swords className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${selectedFormat === "single_elimination" ? "text-purple-400" : "text-zinc-500"}`} />
                <span className="text-[11px] sm:text-xs font-bold text-white truncate">Eliminazione Diretta</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-zinc-400 truncate hidden min-[380px]:block">Tabellone e Scontri</p>
            </button>

            {/* 2: Classifica a Punteggio (Campionato) */}
            <button
              type="button"
              onClick={() => setSelectedFormat("leaderboard_championship")}
              className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedFormat === "leaderboard_championship"
                  ? "bg-purple-950/80 border-purple-500 shadow-md ring-2 ring-purple-500/40 text-white"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5">
                <Trophy className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${selectedFormat === "leaderboard_championship" ? "text-amber-400" : "text-zinc-500"}`} />
                <span className="text-[11px] sm:text-xs font-bold text-white truncate">Classifica a Punti</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-zinc-400 truncate hidden min-[380px]:block">Campionato a Game</p>
            </button>
          </div>
        </div>

        {/* Step Progress Bar (shrink-0) */}
        <div className="shrink-0 px-3 sm:px-4 pt-1.5 sm:pt-2 pb-1 sm:pb-1.5 border-b border-purple-950/40 bg-[#0d101d]">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-extrabold text-purple-400 text-[10px] sm:text-[11px]">
              Passaggio {currentStep} di 7
            </span>
            <span className="font-semibold text-zinc-300 text-[10px] sm:text-[11px] truncate max-w-[180px] sm:max-w-none text-right">
              {stepLabels[currentStep - 1]}
            </span>
          </div>

          <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden flex">
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

        {/* STEP CONTENT BODY (Scrollable area) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 scrollbar-thin scrollbar-thumb-purple-900/50">
          {/* Banner Avviso Saldo SCoin Insufficiente o Costo 100 SC */}
          {sCoinBalance < TOURNAMENT_CREATION_FEE_SC ? (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/70 via-[#181224] to-amber-950/40 border border-rose-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-200 shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-rose-300">
                      Saldo SCoin Insufficiente ({sCoinBalance}/100 SC)
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                      Richiesti 100 SC
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-0.5">
                    Per pubblicare un torneo vengono scalati <strong>100 SCoin</strong>. L'acquisto di SCoin avviene con denaro reale.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShopModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs shrink-0 shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Coins className="w-4 h-4 text-black" />
                <span>Acquista SCoin</span>
              </button>
            </div>
          ) : (
            <div className="px-3 py-2 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Costo pubblicazione torneo: <strong>100 SCoin</strong> (saranno scalati al salvataggio finale)</span>
              </div>
              <span className="text-[11px] font-bold text-zinc-400">Tuo saldo: {sCoinBalance.toLocaleString()} SC</span>
            </div>
          )}

          {/* STEP 1: Nome Torneo & Modalità Gioco */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <Trophy className="w-4 h-4 text-purple-400" />
                <span>1. NOME DEL TORNEO & CATEGORIA COMPETITIVA</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Nome Ufficiale Torneo *
                </label>
                <input
                  type="text"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder="Es. SquadUP Eliminator Cup - Rebirth Island"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-purple-500 text-white text-xs outline-none transition-colors cursor-pointer"
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

          {/* STEP 2: Ora di Inizio (Formato 24h rigoroso) */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>2. DATA E ORARIO DI INIZIO SCONTRI (FORMATO 24H)</span>
              </div>

              {/* Live 24h Confirmation Banner */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/70 via-indigo-950/50 to-zinc-900 border border-purple-500/40 flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0">
                    <Clock className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Orario Ufficiale di Partenza (24h)
                    </span>
                    <span className="text-xs sm:text-sm font-black text-white truncate block">
                      {formattedDate24h}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 shrink-0">
                  24 ORE
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>Giorno del Torneo *</span>
                  </label>
                  <input
                    type="date"
                    value={startDateDay}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setStartDateDay(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-cyan-500 text-white text-xs outline-none transition-colors cursor-pointer"
                  />
                </div>

                {/* 24-Hour Time Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Orario di Partenza (24h) *</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <select
                        value={startTimeHour}
                        onChange={(e) => setStartTimeHour(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-cyan-500 text-white text-xs font-mono font-bold outline-none transition-colors cursor-pointer"
                      >
                        {Array.from({ length: 24 }).map((_, i) => {
                          const h = String(i).padStart(2, "0");
                          return (
                            <option key={h} value={h}>
                              Ore {h}:00
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <select
                        value={startTimeMinute}
                        onChange={(e) => setStartTimeMinute(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-cyan-500 text-white text-xs font-mono font-bold outline-none transition-colors cursor-pointer"
                      >
                        {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                          <option key={m} value={m}>
                            :{m} min
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick preset buttons (All in 24h) */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Scelte Rapide Orario (24h):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().slice(0, 10);
                      setStartDateDay(today);
                      setStartTimeHour("21");
                      setStartTimeMinute("00");
                    }}
                    className="py-2 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-semibold text-center transition-colors cursor-pointer"
                  >
                    Stasera 21:00
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setStartDateDay(d.toISOString().slice(0, 10));
                      setStartTimeHour("21");
                      setStartTimeMinute("00");
                    }}
                    className="py-2 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-semibold text-center transition-colors cursor-pointer"
                  >
                    Domani 21:00
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setHours(d.getHours() + 2);
                      setStartDateDay(d.toISOString().slice(0, 10));
                      setStartTimeHour(String(d.getHours()).padStart(2, "0"));
                      setStartTimeMinute("00");
                    }}
                    className="py-2 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-semibold text-center transition-colors cursor-pointer"
                  >
                    Tra 2 ore
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      const daysUntilSat = (6 - d.getDay() + 7) % 7 || 7;
                      d.setDate(d.getDate() + daysUntilSat);
                      setStartDateDay(d.toISOString().slice(0, 10));
                      setStartTimeHour("21");
                      setStartTimeMinute("30");
                    }}
                    className="py-2 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-semibold text-center transition-colors cursor-pointer"
                  >
                    Sabato 21:30
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400">
                All'orario di inizio stabilito (formato 24h), le iscrizioni si chiudono e i match del Round 1 saranno immediatamente disputabili nel tabellone.
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "open", label: "Aperto a Tutti", sub: "Nessun limite" },
                    { id: "range", label: "Fascia KD (Min/Max)", sub: "Es. 1.2 - 2.5" },
                    { id: "max_only", label: "Solo Tetto Max", sub: "Es. Max 1.8 KD" },
                    { id: "min_only", label: "Solo Minimo", sub: "Es. Min 2.0 KD" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setKdRule(item.id as KdRuleType)}
                      className={`p-2.5 rounded-2xl border text-center transition-all ${
                        kdRule === item.id
                          ? "bg-purple-950/80 border-purple-500 shadow-sm text-white"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{item.sub}</div>
                    </button>
                  ))}
                </div>

                {kdRule !== "open" && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 animate-fade-in">
                    {(kdRule === "range" || kdRule === "min_only") && (
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] text-zinc-400 font-medium">KD Minimo:</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="10"
                          value={minKd}
                          onChange={(e) => setMinKd(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold outline-none"
                        />
                      </div>
                    )}
                    {(kdRule === "range" || kdRule === "max_only") && (
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] text-zinc-400 font-medium">KD Massimo:</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="10"
                          value={maxKd}
                          onChange={(e) => setMaxKd(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Entry Fee */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Quota di Iscrizione
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEntryType("free")}
                    className={`py-2.5 px-3 rounded-2xl border text-center transition-all ${
                      entryType === "free"
                        ? "bg-purple-950/80 border-purple-500 shadow-sm text-white"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <div className="text-xs font-bold">Gratuito (Free Entry)</div>
                    <div className="text-[10px] text-zinc-500">Accesso aperto a tutti</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEntryType("paid")}
                    className={`py-2.5 px-3 rounded-2xl border text-center transition-all ${
                      entryType === "paid"
                        ? "bg-purple-950/80 border-purple-500 shadow-sm text-white"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-300" />
                      <span>Quota in SquadCoin</span>
                    </div>
                    <div className="text-[10px] text-zinc-500">Trattenuta all'iscrizione</div>
                  </button>
                </div>

                {entryType === "paid" && (
                  <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between gap-3 animate-fade-in">
                    <span className="text-xs text-zinc-300 font-medium">Costo Iscrizione per Team:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="10"
                        step="50"
                        value={entryFeeSCoin}
                        onChange={(e) => setEntryFeeSCoin(parseInt(e.target.value) || 0)}
                        className="w-24 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold text-right outline-none"
                      />
                      <span className="text-xs font-bold text-amber-300">SCoin</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Prizes */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    Montepremi & Ricompense
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasPrizes}
                      onChange={(e) => setHasPrizes(e.target.checked)}
                      className="rounded accent-purple-600"
                    />
                    <span>Abilita Montepremi</span>
                  </label>
                </div>

                {hasPrizes && (
                  <div className="p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5" />
                        <span>Montepremi Totale SCoin:</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="100"
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

          {/* STEP 4: Componenti per Squadra & Struttura Campionato */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <Users className="w-4 h-4 text-purple-400" />
                <span>
                  {selectedFormat === "leaderboard_championship"
                    ? "4. COMPONENTI PER SQUADRA & NUMERO DI GAME (GIORNATE)"
                    : "4. COMPONENTI PER SQUADRA & DIMENSIONE TABELLONE"}
                </span>
              </div>

              {/* Team Size */}
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
                      className={`py-3 px-2 rounded-2xl border text-center transition-all cursor-pointer ${
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

              {/* If Single Elimination: Bracket Size */}
              {selectedFormat === "single_elimination" ? (
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
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          bracketSize === bracket.total
                            ? "bg-purple-950/80 border-purple-500 shadow-md ring-2 ring-purple-500/30 text-white"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{bracket.label}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{bracket.rounds}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* If Classifica a Punteggio: Numero di Game (Giornate) & Limite Squadre */
                <div className="space-y-3 pt-2 border-t border-zinc-800">
                  <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-purple-900/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-cyan-400" />
                          <span>Numero di Game (Giornate Totali)*:</span>
                        </span>
                        <p className="text-[10px] text-zinc-400">
                          Quanti game complessivi disputeranno le squadre prima di decretare il vincitore
                        </p>
                      </div>

                      {/* Numeric Stepper for Total Games */}
                      <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setTotalGames((prev) => Math.max(1, prev - 1))}
                          className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={totalGames}
                          onChange={(e) => setTotalGames(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                          className="w-12 text-center text-xs font-black text-cyan-300 bg-transparent outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setTotalGames((prev) => Math.min(20, prev + 1))}
                          className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Quick Presets for Game Count */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-zinc-500 font-bold">Preset Rapidi:</span>
                      {[3, 4, 5, 6, 8, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setTotalGames(num)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                            totalGames === num
                              ? "bg-cyan-500 text-black font-black"
                              : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                          }`}
                        >
                          {num} Game
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Max Teams in Championship */}
                  <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                    <span className="text-xs text-zinc-300 font-medium">Limite Squadre Partecipanti:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="2"
                        max="64"
                        value={championshipMaxTeams}
                        onChange={(e) => setChampionshipMaxTeams(Math.max(2, parseInt(e.target.value) || 16))}
                        className="w-20 px-2.5 py-1 text-center rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold outline-none"
                      />
                      <span className="text-xs font-bold text-zinc-400">Squadre</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Sistema Punteggi */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>5. SISTEMA ASSEGNAZIONE PUNTEGGI (POSIZIONI 1 A 15)</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScoringMode("fixed")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    scoringMode === "fixed"
                      ? "bg-purple-950/80 border-purple-500 ring-2 ring-purple-500/30 text-white"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400"
                  }`}
                >
                  <div className="text-xs font-bold">Punti Fissi per Piazzamento</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Es. 1° = 15pt, 2° = 10pt</div>
                </button>

                <button
                  type="button"
                  onClick={() => setScoringMode("multiplier")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    scoringMode === "multiplier"
                      ? "bg-purple-950/80 border-purple-500 ring-2 ring-purple-500/30 text-white"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400"
                  }`}
                >
                  <div className="text-xs font-bold">Moltiplicatore Uccisioni</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Es. 1° = x2.0 alle kill, 2° = x1.75</div>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-zinc-300">Punti Base per Singola Kill:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={killPoints}
                    onChange={(e) => setKillPoints(parseFloat(e.target.value) || 1)}
                    className="w-20 px-2 py-1 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold text-right outline-none"
                  />
                  <span className="text-xs font-bold text-cyan-400">pt / kill</span>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    {scoringMode === "fixed" ? "Tabella Punti Piazzamento (1 a 15)" : "Tabella Moltiplicatori (1 a 15)"}
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("top3")}
                      className="text-[10px] text-purple-400 hover:underline px-1.5 py-0.5 rounded bg-purple-950/40"
                    >
                      Top 3
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("top5")}
                      className="text-[10px] text-purple-400 hover:underline px-1.5 py-0.5 rounded bg-purple-950/40"
                    >
                      Top 5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("top10")}
                      className="text-[10px] text-cyan-400 hover:underline px-1.5 py-0.5 rounded bg-cyan-950/40"
                    >
                      Top 10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("clear")}
                      className="text-[10px] text-zinc-400 hover:underline px-1.5 py-0.5 rounded bg-zinc-800"
                    >
                      Azzera
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-44 overflow-y-auto p-1">
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((pos) => (
                    <div
                      key={pos}
                      className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-center space-y-1"
                    >
                      <span className="text-[10px] font-bold text-zinc-400 block">{pos}° Posto</span>
                      <input
                        type="text"
                        value={placementValues[pos] || ""}
                        onChange={(e) =>
                          setPlacementValues((prev) => ({ ...prev, [pos]: e.target.value }))
                        }
                        placeholder={scoringMode === "fixed" ? "pt" : "x"}
                        className="w-full text-center px-1 py-1 rounded bg-zinc-950 border border-zinc-700 text-white text-xs font-mono font-bold outline-none"
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

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300">
                    Testo Regole Generali (Personalizzabile a Mano)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRulesText(
                        "1. REGOLA UCCISIONI RIGOROSA: L'IA Vision conteggia esclusivamente la colonna 'UCCISIONI' per ciascun membro registrato. Le Eliminazioni (assist) non sono valide.\n2. SCREENSHOT OBBLIGATORI: Al termine del match entrambi i team devono inviare lo screenshot del piazzamento finale e della tabella uccisioni.\n3. TOLLERANZA: 10 minuti di ritardo comportano la vittoria a tavolino dell'avversario.\n4. CONDOTTA: Vietate armi bannate, exploit e comportamenti antisportivi."
                      );
                    }}
                    className="text-[10px] font-bold text-purple-400 hover:underline"
                  >
                    Template Standard
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

              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Foto / Locandina Ufficiale (Anteprima Visiva)
                </label>

                {bannerPreview && (
                  <div className="relative w-full h-28 rounded-2xl overflow-hidden border border-purple-500/40">
                    <img
                      src={bannerPreview}
                      alt="Anteprima Locandina"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
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
                    className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-semibold cursor-pointer"
                  >
                    Preset Esport
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Co-organizzatori (NO FAKE NAMES) */}
          {currentStep === 7 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>7. CO-ORGANIZZATORI (MAX 2 UTENTI REALI CON PERMESSI)</span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                I co-organizzatori assegnati avranno automaticamente i permessi per revisionare le iscrizioni, convalidare screenshot e gestire le stanze match.
              </p>

              {/* Selected Co-organizers Badges */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Co-organizzatori Assegnati ({coOrganizers.length}/2):
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
                          className="hover:text-rose-400 p-0.5 cursor-pointer"
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
                  Cerca Utente Reale per Username o Activision ID:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    placeholder="Digita username o tag Activision..."
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-cyan-500 text-white text-xs outline-none"
                  />
                  {isSearchingUsers && (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400 absolute right-3 top-3" />
                  )}
                </div>

                {/* Search Results or direct add */}
                {!searchUserQuery.trim() ? (
                  <p className="text-[11px] text-zinc-500 text-center py-2">
                    Inizia a digitare l'username per cercare tra gli utenti registrati.
                  </p>
                ) : searchedUsers.length > 0 ? (
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
                ) : !isSearchingUsers ? (
                  <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center space-y-2 animate-fade-in">
                    <p className="text-xs text-zinc-400">
                      Nessun account trovato con "{searchUserQuery}"
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const clean = searchUserQuery.trim();
                        handleSelectCoOrganizer({
                          id: `user_tag_${clean.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
                          name: clean,
                          username: clean.toLowerCase().replace(/\s+/g, "_"),
                        });
                        setSearchUserQuery("");
                      }}
                      className="py-1.5 px-3 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      + Aggiungi "{searchUserQuery}" come Co-organizzatore
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons (Always visible & pinned with shrink-0) */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-purple-950/80 bg-[#0d101d] flex items-center justify-between gap-2.5 shadow-2xl z-20 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="min-h-[42px] px-3.5 sm:px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
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
              className="min-h-[42px] px-5 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-lg shadow-purple-900/40 transition-all cursor-pointer active:scale-95"
            >
              <span>Continua</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : sCoinBalance < TOURNAMENT_CREATION_FEE_SC ? (
            <button
              type="button"
              onClick={() => setIsShopModalOpen(true)}
              className="min-h-[42px] px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-rose-950/50 transition-all cursor-pointer active:scale-95"
            >
              <Coins className="w-4 h-4 text-amber-200" />
              <span>Saldo Insufficiente (Acquista 100 SC)</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCreateTournament}
              className="min-h-[42px] px-4 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creazione Torneo...</span>
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4 text-amber-300" />
                  <span>Crea Torneo (-100 SC)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Modal Acquisto SCoin con Denaro Reale */}
      <SCoinShopModal
        isOpen={isShopModalOpen}
        onClose={() => setIsShopModalOpen(false)}
      />
    </div>
  );
};
