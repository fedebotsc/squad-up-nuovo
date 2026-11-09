import React, { useState, useRef, useEffect } from "react";
import { useSquad } from "@/context/SquadContext";
import {
  UploadCloud,
  CheckCircle2,
  Swords,
  Send,
  Sparkles,
  ShieldCheck,
  Flame,
  Award,
  Crosshair,
  Loader2,
  Trophy,
  Target,
  Medal,
  Check,
  Image as ImageIcon,
  X,
  FileCheck,
  Key,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
  Plus,
  Trash2,
  AlertTriangle,
  MessageSquare,
  Users,
  Sliders,
  Filter,
  ArrowRight,
  Lock,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MatchScreenshotOcrModal, TournamentMatchItem } from "./MatchScreenshotOcrModal";
import { TournamentRegistrationModal } from "./TournamentRegistrationModal";
import { TournamentTeamChatView, TeamChatData } from "./TournamentTeamChatView";
import { LobbyManagementModal } from "./LobbyManagementModal";
import { SingleEliminationBracketView } from "./SingleEliminationBracketView";
import { TournamentRegistrationsReview } from "./TournamentRegistrationsReview";

type RoomSubTab = "bracket" | "team_chats" | "registrations" | "lobby_leaderboards";

export const MatchRoomTab: React.FC = () => {
  const {
    selectedTournament,
    setTournamentSubTab,
    matchChat,
    sendMatchMessage,
    userProfile,
    currentUser,
    openAuthModal,
    isUniversalAdmin,
    deleteTournament,
  } = useSquad();

  const [activeRoomView, setActiveRoomView] = useState<RoomSubTab>("bracket");

  // Modals state
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [isLobbyModalOpen, setIsLobbyModalOpen] = useState(false);
  const [activeMatchForOcr, setActiveMatchForOcr] = useState<TournamentMatchItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingTourn, setIsDeletingTourn] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // Tournament Matches state
  const [matches, setMatches] = useState<TournamentMatchItem[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  // General Room Chat state
  const [chatInput, setChatInput] = useState("");
  const [liveMessages, setLiveMessages] = useState<any[]>([]);

  // Team Chats State
  const [teamChats, setTeamChats] = useState<TeamChatData[]>([]);
  const [isLoadingTeamChats, setIsLoadingTeamChats] = useState(false);
  const [selectedTeamChat, setSelectedTeamChat] = useState<TeamChatData | null>(null);
  const [lobbyFilter, setLobbyFilter] = useState<"all" | "A" | "B">("all");
  const [myRegistration, setMyRegistration] = useState<any | null>(null);

  // Leaderboard per Lobby state
  const [lobbyLeaderboards, setLobbyLeaderboards] = useState<any[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // User Registration & Access State
  const [userRegistration, setUserRegistration] = useState<any | null>(null);
  const [isLoadingReg, setIsLoadingReg] = useState<boolean>(true);

  const rawTourn = (selectedTournament as any)?.raw || selectedTournament || {};
  const isDoubleLobby = Boolean(rawTourn.double_lobby_enabled);
  const requireKd = Boolean(rawTourn.require_kd_verification);
  const tournamentRulesText = rawTourn.rules || selectedTournament?.description || "";

  const isOrganizer =
    isUniversalAdmin ||
    (currentUser?.id && rawTourn.owner_id === currentUser.id) ||
    (Array.isArray(rawTourn.co_organizers) && rawTourn.co_organizers.includes(currentUser?.id));

  // Check current user registration status for this tournament
  const checkUserRegistration = async () => {
    if (!selectedTournament?.id) {
      setUserRegistration(null);
      setIsLoadingReg(false);
      return;
    }

    if (!currentUser?.id) {
      setUserRegistration(null);
      setIsLoadingReg(false);
      return;
    }

    setIsLoadingReg(true);
    try {
      const { data: reg, error } = await supabase
        .from("tournament_registrations")
        .select("*")
        .eq("tournament_id", selectedTournament.id)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (reg) {
        setUserRegistration(reg);
        setMyRegistration(reg);
      } else {
        const { data: chatReg } = await supabase
          .from("tournament_team_chats")
          .select("*, lobbies:lobby_id(id, name, code)")
          .eq("tournament_id", selectedTournament.id)
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (chatReg) {
          const pseudoReg = {
            id: chatReg.id,
            team_name: chatReg.team_name,
            approval_status: chatReg.status || "pending_approval",
            lobby_name: chatReg.lobbies?.name || "Lobby A",
            created_at: chatReg.created_at,
            kd_ratio: null,
          };
          setUserRegistration(pseudoReg);
          setMyRegistration(pseudoReg);
        } else {
          setUserRegistration(null);
        }
      }
    } catch (err) {
      console.warn("[MatchRoom] Errore verifica iscrizione:", err);
    } finally {
      setIsLoadingReg(false);
    }
  };

  const isApproved = Boolean(
    userRegistration &&
      (userRegistration.approval_status === "approved" ||
        userRegistration.approval_status === "approvata")
  );

  const isPending = Boolean(
    userRegistration &&
      (userRegistration.approval_status === "pending" ||
        userRegistration.approval_status === "pending_approval" ||
        userRegistration.approval_status === "in_attesa")
  );

  const isRejected = Boolean(
    userRegistration &&
      (userRegistration.approval_status === "rejected" ||
        userRegistration.approval_status === "rifiutata")
  );

  const hasAccess = Boolean(isOrganizer || isApproved);

  // Load matches
  const loadMatches = async () => {
    if (!selectedTournament?.id) return;
    setIsLoadingMatches(true);
    try {
      const { data, error } = await supabase
        .from("tournament_matches")
        .select(`
          id,
          tournament_id,
          round_name,
          player1_id,
          player2_id,
          score_player1,
          score_player2,
          status,
          screenshot_url,
          ai_parsed_data,
          played_at,
          created_at
        `)
        .eq("tournament_id", selectedTournament.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMatches(data || []);
    } catch (err) {
      console.warn("[MatchRoom] Errore caricamento match:", err);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  // Load Team Chats
  const loadTeamChats = async () => {
    if (!selectedTournament?.id) return;
    setIsLoadingTeamChats(true);
    try {
      const { data, error } = await supabase
        .from("tournament_team_chats")
        .select("*, lobbies:lobby_id(id, name, code)")
        .eq("tournament_id", selectedTournament.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTeamChats((data as any[]) || []);

      // Check if current user has a team chat
      if (currentUser?.id && data) {
        const myChat = data.find((c: any) => c.user_id === currentUser.id);
        if (myChat) {
          setMyRegistration(myChat);
        }
      }
    } catch (err) {
      console.warn("[MatchRoom] Errore caricamento chat squadre:", err);
    } finally {
      setIsLoadingTeamChats(false);
    }
  };

  // Load Leaderboards per Lobby
  const loadLeaderboards = async () => {
    if (!selectedTournament?.id) return;
    setIsLoadingLeaderboard(true);
    try {
      const { data, error } = await supabase
        .from("tournament_leaderboards")
        .select("*")
        .eq("tournament_id", selectedTournament.id)
        .order("total_score", { ascending: false });

      if (error) throw error;
      setLobbyLeaderboards(data || []);
    } catch (err) {
      console.warn("[MatchRoom] Errore classifica:", err);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  // Load General Messages
  const loadGeneralMessages = async () => {
    if (!selectedTournament?.id) return;
    try {
      const { data: chats } = await supabase
        .from("tournament_match_chats")
        .select("id")
        .eq("tournament_id", selectedTournament.id)
        .limit(1);

      const chatId = chats?.[0]?.id;
      if (chatId) {
        const { data: messages } = await supabase
          .from("tournament_messages")
          .select("*, profiles:sender_id(id, username, display_name, avatar_url)")
          .eq("match_chat_id", chatId)
          .order("created_at", { ascending: true })
          .limit(40);

        if (messages) {
          setLiveMessages(messages);
        }
      }
    } catch (err) {
      console.warn("[MatchRoom] Errore caricamento messaggi generali:", err);
    }
  };

  useEffect(() => {
    if (!selectedTournament?.id) return;

    checkUserRegistration();
    loadMatches();
    loadTeamChats();
    loadLeaderboards();
    loadGeneralMessages();

    // Subscribe to tournament_registrations changes for live approval unlock
    const regChannel = supabase
      .channel(`user-reg-sync-${selectedTournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_registrations",
          filter: `tournament_id=eq.${selectedTournament.id}`,
        },
        () => {
          checkUserRegistration();
          loadTeamChats();
          loadMatches();
        }
      )
      .subscribe();

    // Subscribe to tournament_team_chats changes
    const teamChatChannel = supabase
      .channel(`team-chats-room-${selectedTournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_team_chats",
          filter: `tournament_id=eq.${selectedTournament.id}`,
        },
        () => {
          loadTeamChats();
          checkUserRegistration();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(regChannel);
      supabase.removeChannel(teamChatChannel);
    };
  }, [selectedTournament?.id, currentUser?.id]);

  const handleSendGeneralMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    if (!currentUser) {
      openAuthModal("login");
      return;
    }

    const text = chatInput.trim();
    setChatInput("");
    sendMatchMessage(text);

    try {
      const { data: chats } = await supabase
        .from("tournament_match_chats")
        .select("id")
        .eq("tournament_id", selectedTournament?.id)
        .limit(1);

      if (chats?.[0]?.id) {
        await supabase.from("tournament_messages").insert({
          match_chat_id: chats[0].id,
          sender_id: currentUser.id,
          message: text,
          is_screenshot: false,
        });
      }
    } catch (err) {
      console.warn("[MatchRoom] Errore invio messaggio chat:", err);
    }
  };

  const handleCreateDefaultMatches = async () => {
    if (!selectedTournament?.id || !currentUser) return;

    try {
      const defaultMatches = [
        {
          tournament_id: selectedTournament.id,
          round_name: "Fase 1 - Match A1",
          score_player1: 0,
          score_player2: 0,
          status: "pending",
          ai_parsed_data: { team1_name: "Squad Alpha", team2_name: "Cyber Wolves" },
        },
        {
          tournament_id: selectedTournament.id,
          round_name: "Fase 1 - Match A2",
          score_player1: 0,
          score_player2: 0,
          status: "pending",
          ai_parsed_data: { team1_name: "Phantom Ghost", team2_name: "Viper Legion" },
        },
        {
          tournament_id: selectedTournament.id,
          round_name: "Fase 1 - Match B1",
          score_player1: 0,
          score_player2: 0,
          status: "pending",
          ai_parsed_data: { team1_name: "Titan Esports", team2_name: "Apex Striker" },
        },
        {
          tournament_id: selectedTournament.id,
          round_name: "Fase 1 - Match B2",
          score_player1: 0,
          score_player2: 0,
          status: "pending",
          ai_parsed_data: { team1_name: "Shadow Elite", team2_name: "Omega Unit" },
        },
      ];

      const { data, error } = await supabase
        .from("tournament_matches")
        .insert(defaultMatches)
        .select();

      if (error) throw error;
      if (data) setMatches(data as any[]);

      toast({
        title: "Tabellone Iniziale Generato! ⚔️",
        description: "I match sono stati creati. Ora i giocatori possono caricare gli screenshot.",
      });
    } catch (err: any) {
      toast({
        title: "Errore generazione match",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTournament) return;
    setIsDeletingTourn(true);
    try {
      await deleteTournament(selectedTournament.id);
      setShowDeleteConfirm(false);
      setTournamentSubTab("active");
    } catch (err) {
      console.warn("[MatchRoom] Errore cancellazione:", err);
    } finally {
      setIsDeletingTourn(false);
    }
  };

  if (!selectedTournament) {
    return (
      <div className="space-y-4">
        <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-8 text-center space-y-4 shadow-lg">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Swords className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Nessun torneo selezionato</h3>
            <p className="text-xs text-zinc-400 break-words max-w-xs mx-auto leading-relaxed">
              Per visualizzare le lobby, convalidare i KD con IA e accedere alle chat di squadra, seleziona prima un torneo.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setTournamentSubTab("active")}
              className="py-2.5 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Scegli un Torneo</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered team chats by lobby
  const filteredTeamChats = teamChats.filter((c) => {
    if (lobbyFilter === "all") return true;
    const lName = c.lobbies?.name || (c.lobby_id ? "Lobby A" : "");
    return lName.toUpperCase().includes(lobbyFilter);
  });

  // Filtered leaderboards by lobby
  const filteredLeaderboards = lobbyLeaderboards.filter((l) => {
    if (lobbyFilter === "all") return true;
    const lName = l.lobby_name || "";
    return lName.toUpperCase().includes(lobbyFilter);
  });

  return (
    <div className="space-y-4">
      {/* Tournament Match Room Banner */}
      <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-start justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                STANZA UFFICIALE SQUADUP
              </span>
              <span className="text-[10px] text-purple-300 font-semibold bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-800/40">
                {selectedTournament.game}
              </span>

              {isDoubleLobby && (
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 uppercase flex items-center gap-1">
                  <Layers className="w-3 h-3 text-cyan-400" />
                  Doppia Lobby (A & B)
                </span>
              )}

              {requireKd && (
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 uppercase flex items-center gap-1">
                  <Target className="w-3 h-3 text-amber-400" />
                  Verifica KD (IA)
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-white truncate">
              {selectedTournament.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Register Team Button */}
            <button
              onClick={() => setIsRegModalOpen(true)}
              className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{myRegistration ? "Modifica Iscrizione" : "Iscrivi Squadra"}</span>
            </button>

            {/* Organizer Lobby Manager Trigger */}
            {isOrganizer && isDoubleLobby && (
              <button
                onClick={() => setIsLobbyModalOpen(true)}
                className="py-1.5 px-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Gestione e bilanciamento squadre nelle lobby"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gestione Lobby IA</span>
              </button>
            )}

            {/* Delete Tournament */}
            {isOrganizer && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/25 hover:text-white transition-all cursor-pointer"
                title="Elimina Torneo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Rules toggle */}
        {tournamentRulesText && (
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2.5 text-xs">
            <button
              onClick={() => setShowRules(!showRules)}
              className="w-full flex items-center justify-between text-zinc-300 hover:text-white font-semibold text-[11px]"
            >
              <div className="flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Regolamento Ufficiale e Criteri Arbitraggio IA</span>
              </div>
              {showRules ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showRules && (
              <div className="mt-2 pt-2 border-t border-zinc-800 text-[11px] text-zinc-300 leading-relaxed whitespace-pre-line animate-fade-in">
                {tournamentRulesText}
              </div>
            )}
          </div>
        )}

        {/* Room View Navigation Sub-Tabs (shown only when user has approved access or is organizer) */}
        {hasAccess && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
            <button
              onClick={() => {
                setActiveRoomView("bracket");
                setSelectedTeamChat(null);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeRoomView === "bracket"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-950/40"
                  : "bg-zinc-900/80 text-zinc-400 hover:text-white"
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Tabellone Match</span>
            </button>

            <button
              onClick={() => {
                setActiveRoomView("registrations");
                setSelectedTeamChat(null);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeRoomView === "registrations"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-950/40"
                  : "bg-zinc-900/80 text-zinc-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Revisione Iscrizioni</span>
            </button>

            <button
              onClick={() => {
                setActiveRoomView("team_chats");
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                activeRoomView === "team_chats"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-950/40"
                  : "bg-zinc-900/80 text-zinc-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>Chat Squadre & KD</span>
              {teamChats.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500 text-black text-[9px] font-black">
                  {teamChats.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveRoomView("lobby_leaderboards");
                setSelectedTeamChat(null);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeRoomView === "lobby_leaderboards"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-950/40"
                  : "bg-zinc-900/80 text-zinc-400 hover:text-white"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Classifiche Live</span>
            </button>
          </div>
        )}
      </div>

      {/* ACCESS CONTROL: IF NOT ORGANIZER AND NOT APPROVED */}
      {!hasAccess ? (
        <div className="bg-[#121628]/95 border border-purple-900/40 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xl animate-fade-in">
          <div className="relative w-16 h-16 mx-auto">
            <div
              className={`absolute inset-0 rounded-2xl blur-md animate-pulse ${
                isPending ? "bg-amber-500/30" : "bg-purple-600/30"
              }`}
            />
            <div
              className={`relative w-full h-full rounded-2xl bg-[#0f1322] border flex items-center justify-center ${
                isPending ? "border-amber-500/50 text-amber-400" : "border-purple-500/50 text-purple-400"
              }`}
            >
              <Lock className="w-8 h-8" />
            </div>
          </div>

          {isLoadingReg ? (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Verifica iscrizione in corso...</span>
            </div>
          ) : isPending ? (
            <div className="space-y-3.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5" />
                <span>Iscrizione in Attesa di Approvazione</span>
              </div>

              <h4 className="text-base font-extrabold text-white">
                Contenuti del Torneo Riservati
              </h4>

              <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                La tua iscrizione per la squadra <strong className="text-amber-300">"{userRegistration?.team_name}"</strong> è stata registrata con successo ed è in fase di revisione da parte degli organizzatori.
              </p>

              <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-left max-w-sm mx-auto space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Lobby Assegnata:</span>
                  <span className="font-bold text-cyan-300">{userRegistration?.lobby_name || "Lobby A"}</span>
                </div>
                {userRegistration?.kd_ratio && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">KD Inviato:</span>
                    <span className="font-bold text-amber-300">{userRegistration.kd_ratio}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs border-t border-amber-900/40 pt-2">
                  <span className="text-zinc-400">Stato Approvazione:</span>
                  <span className="font-bold text-amber-400">In attesa dell'organizzatore ⏳</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-[11px] text-zinc-300 max-w-sm mx-auto flex items-start gap-2 text-left">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  L'accesso al tabellone delle partite, alle lobby e ai dettagli interni della competizione sarà sbloccato solo dopo che l'iscrizione sarà stata ufficialmente accettata.
                </span>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => setIsRegModalOpen(true)}
                  className="py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Modifica Dati Iscrizione
                </button>
              </div>
            </div>
          ) : isRejected ? (
            <div className="space-y-3.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-black uppercase tracking-wider">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Iscrizione Non Approvata</span>
              </div>

              <h4 className="text-base font-extrabold text-white">
                Candidatura Non Accettata
              </h4>

              <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                {userRegistration?.rejection_reason ||
                  "La candidatura non soddisfa i requisiti del torneo o la lobby ha raggiunto la capienza massima."}
              </p>

              <button
                onClick={() => setIsRegModalOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Invia Nuova Iscrizione
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-black uppercase tracking-wider">
                <Lock className="w-3 h-3" />
                <span>Accesso Riservato</span>
              </div>

              <h4 className="text-base font-extrabold text-white">
                Tabellone e Lobby Riservati ai Partecipanti
              </h4>

              <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                Questo torneo è protetto. I partecipanti che non sono ancora iscritti o la cui iscrizione è in attesa di approvazione non possono visualizzare il tabellone, le lobby o i dettagli interni della competizione.
              </p>

              <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-[11px] text-zinc-300 max-w-sm mx-auto flex items-start gap-2 text-left">
                <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  L'accesso ai contenuti del torneo sarà sbloccato solo dopo che la tua iscrizione sarà stata inviata e ufficialmente accettata dagli organizzatori.
                </span>
              </div>

              <div className="pt-2">
                {currentUser ? (
                  <button
                    onClick={() => setIsRegModalOpen(true)}
                    className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-extrabold flex items-center justify-center gap-2 mx-auto shadow-lg shadow-purple-900/40 transition-all cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>Iscrivi la tua Squadra per Sbloccare i Contenuti</span>
                  </button>
                ) : (
                  <button
                    onClick={() => openAuthModal("signup")}
                    className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-extrabold flex items-center justify-center gap-2 mx-auto shadow-lg shadow-purple-900/40 transition-all cursor-pointer"
                  >
                    <span>Accedi o Registrati per Iscriverti</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* VIEW 1: BRACKET & MATCHES TAB */}
          {activeRoomView === "bracket" && (
            <div className="space-y-4">
              <SingleEliminationBracketView
                tournament={selectedTournament}
                isOrganizer={isOrganizer}
              />
            </div>
          )}

          {/* VIEW: TOURNAMENT REGISTRATIONS REVIEW */}
          {activeRoomView === "registrations" && (
            <TournamentRegistrationsReview
              tournament={selectedTournament}
              isOrganizer={isOrganizer}
              onUpdate={() => {
                checkUserRegistration();
                loadTeamChats();
              }}
            />
          )}

          {false && (
            <div style={{ display: "none" }}>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Incontri in Tabellone ({matches.length})
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveRoomView("lobby_leaderboards")}
                className="text-[11px] font-bold text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Vedi Classifica Live</span>
              </button>
            </div>
          </div>

          {isLoadingMatches ? (
            <div className="bg-[#121628]/80 border border-purple-900/30 rounded-2xl p-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span>Caricamento incontri dal database...</span>
            </div>
          ) : matches.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5">
              {matches.map((m) => {
                const team1 = m.player1_name || m.ai_parsed_data?.team1_name || "Squadra 1";
                const team2 = m.player2_name || m.ai_parsed_data?.team2_name || "Squadra 2";
                const isCompleted = m.status === "completed";
                const winner = m.ai_parsed_data?.winner;

                return (
                  <div
                    key={m.id}
                    className={`bg-[#121628]/95 border rounded-2xl p-3.5 transition-all shadow-md ${
                      isCompleted
                        ? "border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-[#121628] to-[#121628]"
                        : "border-purple-900/40 hover:border-purple-600/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-zinc-800/70 pb-2 mb-2.5">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/40 uppercase">
                        {m.round_name}
                      </span>

                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          isCompleted
                            ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300 flex items-center gap-1"
                            : "bg-amber-950/60 border-amber-500/40 text-amber-300"
                        }`}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Convalidato OCR</span>
                          </>
                        ) : (
                          "In Attesa"
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 items-center gap-2 py-1">
                      <div className="text-left min-w-0">
                        <span
                          className={`text-xs font-bold truncate block ${
                            isCompleted && winner === "player1" ? "text-amber-300" : "text-white"
                          }`}
                        >
                          {team1}
                        </span>
                        <span className="text-[10px] text-zinc-400">Team 1</span>
                      </div>

                      <div className="text-center shrink-0">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900/90 border border-zinc-800 rounded-xl">
                          <span className="text-sm font-black text-cyan-400">{m.score_player1}</span>
                          <span className="text-zinc-500 font-bold text-xs">-</span>
                          <span className="text-sm font-black text-rose-400">{m.score_player2}</span>
                        </div>
                      </div>

                      <div className="text-right min-w-0">
                        <span
                          className={`text-xs font-bold truncate block ${
                            isCompleted && winner === "player2" ? "text-amber-300" : "text-white"
                          }`}
                        >
                          {team2}
                        </span>
                        <span className="text-[10px] text-zinc-400">Team 2</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2.5 mt-2 border-t border-zinc-800/70 text-[11px]">
                      {m.screenshot_url ? (
                        <a
                          href={m.screenshot_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline flex items-center gap-1 text-[10px]"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>Vedi Screenshot Ufficiale</span>
                        </a>
                      ) : (
                        <span className="text-zinc-500 text-[10px]">Nessuno screenshot match</span>
                      )}

                      <button
                        onClick={() => setActiveMatchForOcr(m)}
                        className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
                          isCompleted
                            ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                            : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md"
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>{isCompleted ? "Rivedi OCR IA" : "Carica Screenshot (OCR IA)"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#121628]/90 border border-purple-900/30 rounded-2xl p-6 text-center space-y-3">
              <Swords className="w-8 h-8 text-purple-400 mx-auto" />
              <div>
                <h4 className="text-xs font-bold text-white">Nessun match ancora generato per questo torneo</h4>
                <p className="text-[11px] text-zinc-400 max-w-xs mx-auto mt-0.5">
                  Genera subito il tabellone di gara per avviare la competizione.
                </p>
              </div>
              <button
                onClick={handleCreateDefaultMatches}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Genera Incontri Tabellone</span>
              </button>
            </div>
          )}

          {/* General match room chat */}
          <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-md space-y-3 mt-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Bacheca Ufficiale della Stanza Match
                </h4>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>

            <div className="h-36 overflow-y-auto space-y-2 pr-1 text-xs">
              {liveMessages.length > 0 ? (
                liveMessages.map((msg, index) => (
                  <div key={msg.id || index} className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <span className="font-bold text-[10px] text-cyan-300 block mb-0.5">
                      {msg.profiles?.display_name || msg.profiles?.username || "Giocatore"}
                    </span>
                    <p className="text-[11px] text-zinc-200">{msg.message}</p>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500 text-xs italic">
                  Nessun messaggio generale. Comunica nella stanza match.
                </div>
              )}
            </div>

            <form onSubmit={handleSendGeneralMessage} className="flex gap-2 pt-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Scrivi un annuncio generale..."
                className="flex-1 px-3 py-2 bg-zinc-950/90 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="p-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 2: TEAM CHATS & KD VERIFICATION */}
      {activeRoomView === "team_chats" && (
        <div className="space-y-3">
          {selectedTeamChat ? (
            <TournamentTeamChatView
              chat={selectedTeamChat}
              tournament={selectedTournament}
              onBack={() => setSelectedTeamChat(null)}
              onRefreshChat={loadTeamChats}
            />
          ) : (
            <div className="space-y-3">
              {/* Header and Lobby Filters */}
              <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <span>Canali Squadra Dedicati ({teamChats.length})</span>
                  </h4>
                  <span className="text-[10px] text-zinc-400">
                    Ogni squadra ha una chat con l'organizzatore per verifica KD e invio risultati
                  </span>
                </div>

                {isDoubleLobby && (
                  <div className="flex items-center gap-1 bg-[#151a30] p-1 rounded-xl border border-zinc-800 text-xs">
                    <button
                      onClick={() => setLobbyFilter("all")}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors ${
                        lobbyFilter === "all" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Tutte
                    </button>
                    <button
                      onClick={() => setLobbyFilter("A")}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors ${
                        lobbyFilter === "A" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Lobby A
                    </button>
                    <button
                      onClick={() => setLobbyFilter("B")}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors ${
                        lobbyFilter === "B" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Lobby B
                    </button>
                  </div>
                )}
              </div>

              {/* User's quick team chat banner if registered */}
              {myRegistration && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/60 via-[#181f3d] to-cyan-950/40 border border-purple-500/50 shadow-md flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold text-cyan-300 uppercase tracking-wider block">
                        La Tua Chat di Squadra ({myRegistration.lobbies?.name || "Lobby A"})
                      </span>
                      <h4 className="text-xs font-black text-white truncate">{myRegistration.team_name}</h4>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedTeamChat(myRegistration)}
                    className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-extrabold text-xs flex items-center gap-1 shrink-0 shadow-md cursor-pointer"
                  >
                    <span>Apri Chat Squadra</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Team Chats List */}
              {isLoadingTeamChats ? (
                <div className="py-10 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Caricamento canali di squadra...</span>
                </div>
              ) : filteredTeamChats.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredTeamChats.map((c) => {
                    const lName = c.lobbies?.name || (c.lobby_id ? "Lobby A" : "Lobby Principale");
                    const isMy = c.user_id === currentUser?.id;

                    return (
                      <div
                        key={c.id}
                        className={`bg-[#121628]/95 border rounded-2xl p-3 space-y-2 hover:border-purple-500/50 transition-all shadow-sm ${
                          isMy ? "border-purple-500/40 bg-purple-950/10" : "border-zinc-800"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 uppercase">
                                {lName}
                              </span>

                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  c.status === "approved"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                    : c.status === "rejected"
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                }`}
                              >
                                {c.status === "approved"
                                  ? "Approvata"
                                  : c.status === "rejected"
                                  ? "Rifiutata"
                                  : "Verifica KD"}
                              </span>

                              {c.score_validation_status === "submitted" && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                                  Nuovi Risultati
                                </span>
                              )}
                            </div>

                            <h4 className="text-xs font-black text-white truncate flex items-center gap-1.5">
                              <span>{c.team_name}</span>
                              {isMy && (
                                <span className="text-[8px] font-bold text-purple-300 uppercase">
                                  (Tu)
                                </span>
                              )}
                            </h4>
                          </div>

                          {c.total_points > 0 && (
                            <span className="text-xs font-black text-amber-300 shrink-0">
                              {c.total_points} Pt
                            </span>
                          )}
                        </div>

                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                          <span className="text-[10px] text-zinc-400">
                            {c.kd_image_url ? "Screenshot KD allegato" : "Nessun KD inviato"}
                          </span>

                          <button
                            onClick={() => setSelectedTeamChat(c)}
                            className="py-1 px-3 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Entra nella Chat</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#121628]/90 border border-purple-900/30 rounded-2xl p-6 text-center space-y-2">
                  <Users className="w-8 h-8 text-zinc-600 mx-auto" />
                  <h4 className="text-xs font-bold text-white">Nessuna squadra ancora iscritta</h4>
                  <p className="text-[11px] text-zinc-400">
                    Iscrivi la tua squadra per creare il canale di comunicazione con l'organizzatore.
                  </p>
                  <button
                    onClick={() => setIsRegModalOpen(true)}
                    className="py-1.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Iscrivi Squadra Ora
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: LOBBY LEADERBOARDS */}
      {activeRoomView === "lobby_leaderboards" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 px-1">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Classifica Live per Lobby
              </h4>
            </div>

            {isDoubleLobby && (
              <div className="flex items-center gap-1 bg-[#151a30] p-1 rounded-xl border border-zinc-800 text-xs">
                <button
                  onClick={() => setLobbyFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors ${
                    lobbyFilter === "all" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Tutte le Lobby
                </button>
                <button
                  onClick={() => setLobbyFilter("A")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors ${
                    lobbyFilter === "A" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Lobby A
                </button>
                <button
                  onClick={() => setLobbyFilter("B")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-colors ${
                    lobbyFilter === "B" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Lobby B
                </button>
              </div>
            )}
          </div>

          {isLoadingLeaderboard ? (
            <div className="py-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              <span>Caricamento classifica...</span>
            </div>
          ) : filteredLeaderboards.length > 0 ? (
            <div className="space-y-2">
              {filteredLeaderboards.map((row, idx) => (
                <div
                  key={row.id || idx}
                  className="bg-[#121628]/95 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                        idx === 0
                          ? "bg-amber-400 text-black shadow-md shadow-amber-400/30"
                          : idx === 1
                          ? "bg-zinc-300 text-black"
                          : idx === 2
                          ? "bg-amber-700 text-white"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-xs">
                          {row.team_name}
                        </span>
                        {row.lobby_name && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 uppercase">
                            {row.lobby_name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                        <span className="flex items-center gap-0.5">
                          <Crosshair className="w-3 h-3 text-purple-400" />
                          {row.total_kills || 0} Kill
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Swords className="w-3 h-3 text-cyan-400" />
                          {row.matches_played || 0} Match
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-amber-300 block">
                      {row.total_score || 0}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-semibold uppercase">Punti</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#121628]/90 border border-purple-900/30 rounded-2xl p-6 text-center text-xs text-zinc-400">
              Nessun punteggio ancora convalidato per la lobby selezionata.
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* Match Screenshot OCR Modal */}
      {activeMatchForOcr && (
        <MatchScreenshotOcrModal
          isOpen={!!activeMatchForOcr}
          onClose={() => setActiveMatchForOcr(null)}
          match={activeMatchForOcr}
          tournamentRules={tournamentRulesText}
          onMatchUpdated={() => {
            loadMatches();
            loadLeaderboards();
          }}
        />
      )}

      {/* Tournament Registration Modal */}
      <TournamentRegistrationModal
        isOpen={isRegModalOpen}
        onClose={() => setIsRegModalOpen(false)}
        tournament={selectedTournament}
        onSuccess={() => {
          loadTeamChats();
          loadLeaderboards();
          setActiveRoomView("team_chats");
        }}
      />

      {/* Lobby Management & AI Balancing Modal */}
      {isLobbyModalOpen && (
        <LobbyManagementModal
          isOpen={isLobbyModalOpen}
          onClose={() => setIsLobbyModalOpen(false)}
          tournament={selectedTournament}
          onSuccess={() => {
            loadTeamChats();
            loadLeaderboards();
          }}
        />
      )}

      {/* Delete Tournament Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#121629] border border-rose-500/50 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-extrabold text-white">Eliminare il torneo?</h4>
              <p className="text-xs font-semibold text-rose-300">
                "{selectedTournament.title}"
              </p>
              <div className="text-[11px] text-zinc-300 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-left mt-2 space-y-1.5">
                <span className="font-bold text-white block">Rimborsi automatici garantiti:</span>
                <p>• <strong>100 SCoin</strong> rimborsati all'organizzatore.</p>
                <p className="text-[10px] text-zinc-400 italic pt-1">
                  I match, le chat di squadra, i dati delle lobby e le classifiche verranno rimossi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingTourn}
                onClick={() => setShowDeleteConfirm(false)}
                className="py-2.5 px-3 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={isDeletingTourn}
                onClick={handleConfirmDelete}
                className="py-2.5 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-lg cursor-pointer"
              >
                {isDeletingTourn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Elimina Torneo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
