import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  XCircle,
  Trophy,
  Target,
  Swords,
  Layers,
  Image as ImageIcon,
  Loader2,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  User,
  Shield,
  Eye,
  RefreshCw,
  Plus,
  Flame,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSquad } from "@/context/SquadContext";
import { toast } from "@/components/ui/use-toast";
import {
  uploadTournamentProof,
  verifyKDProofWithAI,
  verifyPostGameProofsAndCalculateScore,
  calculateTournamentScore,
  commitPostGameScoreToDatabase,
  KDVerificationResult,
  PostGameVerificationResult,
  ERROR_POST_GAME_UPLOADED_FOR_KD,
  ERROR_KD_PROFILE_UPLOADED_FOR_POST_GAME,
} from "@/services/tournamentVerificationService";
import { recordGameSubmission } from "@/services/tournamentChampionshipService";

export interface TeamChatData {
  id: string;
  tournament_id: string;
  lobby_id: string | null;
  registration_id: string | null;
  team_name: string;
  user_id: string;
  status: "pending_approval" | "approved" | "rejected";
  kd_image_url: string | null;
  rejection_reason?: string | null;
  placement_screenshot_url: string | null;
  kills_screenshot_url: string | null;
  reported_placement: number | null;
  reported_kills: number | null;
  verified_placement: number | null;
  verified_kills: number | null;
  placement_score?: number;
  kills_score?: number;
  total_points: number;
  score_validation_status: "none" | "submitted" | "verified" | "rejected";
  score_details?: any;
  created_at: string;
  lobbies?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface TournamentTeamChatViewProps {
  chat: TeamChatData;
  tournament: any;
  onRefreshChat?: () => void;
  onBack?: () => void;
}

export const TournamentTeamChatView: React.FC<TournamentTeamChatViewProps> = ({
  chat,
  tournament,
  onRefreshChat,
  onBack,
}) => {
  const { currentUser, isUniversalAdmin } = useSquad();
  const rawTourn = tournament.raw || tournament;

  const isOrganizer =
    isUniversalAdmin ||
    (currentUser?.id && rawTourn.owner_id === currentUser.id) ||
    (Array.isArray(rawTourn.co_organizers) && rawTourn.co_organizers.includes(currentUser?.id));

  const isMyTeamChat = currentUser?.id === chat.user_id;

  const lobbyName = chat.lobbies?.name || (chat.lobby_id ? "Lobby A" : "Lobby Principale");

  // Chat messages
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // KD AI verification state
  const [isAnalyzingKd, setIsAnalyzingKd] = useState(false);
  const [kdAnalysisResult, setKdAnalysisResult] = useState<KDVerificationResult | null>(null);

  // Post-Game submission state
  const isChampionship = rawTourn.type === "leaderboard_championship" || Boolean(rawTourn.total_games);
  const totalChampionshipGames = rawTourn.total_games || 5;
  const [selectedGameNumber, setSelectedGameNumber] = useState<number>(rawTourn.current_game || 1);

  const [showPostGameForm, setShowPostGameForm] = useState(false);
  const [placementFile, setPlacementFile] = useState<File | null>(null);
  const [killsFile, setKillsFile] = useState<File | null>(null);
  const [placementPreview, setPlacementPreview] = useState<string | null>(null);
  const [killsPreview, setKillsPreview] = useState<string | null>(null);
  const [isAnalyzingPostGame, setIsAnalyzingPostGame] = useState(false);
  const [postGameAnalysis, setPostGameAnalysis] = useState<PostGameVerificationResult | null>(null);
  const [isSubmittingPostGame, setIsSubmittingPostGame] = useState(false);

  // Editable scores for adjustments
  const [editPlacement, setEditPlacement] = useState<number>(chat.reported_placement || 1);
  const [editKills, setEditKills] = useState<number>(chat.reported_kills || 0);

  // Load chat messages
  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("tournament_chat_messages")
        .select("*, profiles:sender_id(id, username, display_name, avatar_url)")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      console.warn("[TeamChat] Errore caricamento messaggi:", err);
    }
  };

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`team-chat-${chat.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tournament_chat_messages",
          filter: `chat_id=eq.${chat.id}`,
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chat.id]);

  // Send standard chat message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentUser) return;

    const content = messageInput.trim();
    setMessageInput("");
    setIsSending(true);

    try {
      const { error } = await supabase.from("tournament_chat_messages").insert({
        chat_id: chat.id,
        sender_id: currentUser.id,
        message_type: "text",
        content,
      });

      if (error) throw error;
      loadMessages();
    } catch (err: any) {
      toast({
        title: "Errore invio messaggio",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  /**
   * 1. VERIFICA KD STATS CON IA VISION:
   * Analizza l'immagine cercando esplicitamente la voce "K/D" o "Rapporto Kill/Morte".
   * Se non rispetta i limiti stabiliti o la foto è poco chiara -> status = 'rejected' con messaggio di rifiuto dettagliato.
   * Se è conforme -> status = 'approved' e sblocca l'accesso al torneo!
   */
  const handleUploadAndVerifyKd = async (file: File) => {
    setIsAnalyzingKd(true);
    try {
      const uploadedUrl = await uploadTournamentProof(file, "kd");

      const result = await verifyKDProofWithAI(file, {
        min_kd: rawTourn.min_kd_limit ? Number(rawTourn.min_kd_limit) : null,
        max_kd: rawTourn.max_kd_limit ? Number(rawTourn.max_kd_limit) : null,
      });

      setKdAnalysisResult(result);

      const newStatus = result.approved ? "approved" : "rejected";
      const rejectionReason = !result.approved ? result.reason : null;

      // Update tournament_team_chats
      await supabase
        .from("tournament_team_chats")
        .update({
          status: newStatus,
          kd_image_url: uploadedUrl,
          rejection_reason: rejectionReason,
        })
        .eq("id", chat.id);

      // Update tournament_registrations (unlocks or locks tournament view)
      if (chat.registration_id) {
        await supabase
          .from("tournament_registrations")
          .update({
            approval_status: newStatus,
            rejection_reason: rejectionReason,
            kd_ratio: result.kd_ratio,
            kd_screenshot_url: uploadedUrl,
          })
          .eq("id", chat.registration_id);
      }

      // Post official AI analysis message in chat
      let chatMessage = "";
      if (result.is_authentic_game_screenshot === false) {
        chatMessage = `❌ Immagine non valida: L'IA ha rilevato che la foto caricata non è uno screenshot delle statistiche di Call of Duty. Si prega di caricare lo screenshot corretto.\n\n• Esito: ❌ ISCRIZIONE BLOCCATA`;
      } else if (result.reason === ERROR_POST_GAME_UPLOADED_FOR_KD || result.error_message === ERROR_POST_GAME_UPLOADED_FOR_KD) {
        chatMessage =
          `⚠️ RIFIUTO RIGOROSO ARBITRO IA (SCHERMATA FINE PARTITA NON AMMESSA):\n` +
          `• ${ERROR_POST_GAME_UPLOADED_FOR_KD}\n\n` +
          `• Esito: ❌ ISCRIZIONE BLOCCATA\n` +
          `Carica la schermata del tuo Profilo / Statistiche Generali dove siano visibili la voce esplicita K/D e il tuo Activision ID.`;
      } else if (result.approved) {
        chatMessage =
          `🎯 Verifica KD APPROVATA dall'Arbitro IA!\n` +
          `• Voce K/D rilevata: ${result.kd_ratio.toFixed(2)} (${result.confidence}% confidenza)\n` +
          `• Esito: ✅ CONFORME AI LIMITI\n` +
          `🏆 L'iscrizione della squadra "${chat.team_name}" in ${lobbyName} è APPROVATA e l'accesso al torneo è SBLOCCATO!`;
      } else {
        chatMessage =
          `⚠️ Verifica KD RIFIUTATA dall'Arbitro IA:\n` +
          `• Motivo: ${result.reason}\n` +
          `• Esito: ❌ ISCRIZIONE RIFIUTATA\n\n` +
          `Carica uno screenshot nitido del tuo Profilo / Statistiche di Gioco che mostri chiaramente la voce 'K/D' o 'Rapporto Uccisioni/Morti' conforme ai limiti per richiedere una nuova revisione.`;
      }

      await supabase.from("tournament_chat_messages").insert({
        chat_id: chat.id,
        sender_id: currentUser?.id,
        message_type: "kd_verification",
        image_url: uploadedUrl,
        image_type: "kd_proof",
        content: chatMessage,
        ai_verification_result: result,
      });

      if (result.approved) {
        toast({
          title: "KD Approvato con Successo! 🏆",
          description: `Accesso al torneo sbloccato per ${chat.team_name}.`,
        });
      } else {
        toast({
          title:
            result.reason === ERROR_POST_GAME_UPLOADED_FOR_KD
              ? "Schermata Errata (Fine Partita)"
              : "Verifica KD Rifiutata",
          description: result.reason,
          variant: "destructive",
        });
      }

      onRefreshChat?.();
      loadMessages();
    } catch (err: any) {
      toast({
        title: "Errore verifica KD",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingKd(false);
    }
  };

  // Re-run AI KD check on already uploaded image
  const handleReanalyzeKd = async () => {
    if (!chat.kd_image_url) return;
    setIsAnalyzingKd(true);

    try {
      const response = await fetch(chat.kd_image_url);
      const blob = await response.blob();
      const file = new File([blob], "kd_proof.jpg", { type: blob.type || "image/jpeg" });
      await handleUploadAndVerifyKd(file);
    } catch (err: any) {
      toast({
        title: "Analisi IA non riuscita",
        description: err.message,
        variant: "destructive",
      });
      setIsAnalyzingKd(false);
    }
  };

  // Organizer manual approval / rejection of team
  const handleSetTeamStatus = async (status: "approved" | "rejected", reason?: string) => {
    try {
      await supabase
        .from("tournament_team_chats")
        .update({ status, rejection_reason: reason || null })
        .eq("id", chat.id);

      if (chat.registration_id) {
        await supabase
          .from("tournament_registrations")
          .update({
            approval_status: status,
            rejection_reason: reason || null,
          })
          .eq("id", chat.registration_id);
      }

      await supabase.from("tournament_chat_messages").insert({
        chat_id: chat.id,
        sender_id: currentUser?.id,
        message_type: "system_ai",
        content:
          status === "approved"
            ? `🛡️ L'organizzatore ha APPROVATO ufficialmente l'iscrizione del team "${chat.team_name}" in ${lobbyName}. Accesso sbloccato!`
            : `⚠️ L'organizzatore ha RIFIUTATO l'iscrizione del team "${chat.team_name}". ${reason || ""}`,
      });

      toast({
        title: status === "approved" ? "Squadra Approvata! 🏆" : "Iscrizione Rifiutata",
        description: `Stato aggiornato per ${chat.team_name}`,
      });

      onRefreshChat?.();
      loadMessages();
    } catch (err: any) {
      toast({
        title: "Errore aggiornamento stato",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  /**
   * 2. ANALISI SCREENSHOT POST-GAME E MOTORE CALCOLO PUNTEGGI
   * Legge Foto Posizione Finale (Placement) + Foto Kill di Squadra.
   * Recupera le regole del torneo (es. 1° = 10pt, 2° = 7pt, 1pt per kill).
   * Esegue la somma automatica: Punti Totali = Punti Posizionamento + Punti Kill.
   */
  const handleAnalyzePostGameWithAI = async () => {
    if (!placementFile && !killsFile) {
      toast({
        title: "Screenshot mancanti",
        description: "Carica la foto della posizione finale e/o delle kill per l'analisi IA.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzingPostGame(true);

    try {
      const scoringSettings = rawTourn.scoring_settings || rawTourn.leaderboard_settings || {
        kill_points: 1,
        placement_points: { "1": 15, "2": 10, "3": 7, "4": 5, "5": 3, top10: 1 },
      };

      const result = await verifyPostGameProofsAndCalculateScore(
        placementFile,
        killsFile,
        scoringSettings,
        rawTourn.rules
      );

      setPostGameAnalysis(result);
      setEditPlacement(result.placement);
      setEditKills(result.kills);

      toast({
        title: "Arbitro IA: Punteggio Calcolato! ⚡",
        description: result.summary_message,
      });
    } catch (err: any) {
      setPostGameAnalysis(null);
      const errMsg =
        err?.message ||
        "Immagine non valida: L'IA ha rilevato che la foto caricata non è uno screenshot delle statistiche di Call of Duty. Si prega di caricare lo screenshot corretto.";

      // Post rejection notification into the team chat
      try {
        await supabase.from("tournament_chat_messages").insert({
          chat_id: chat.id,
          sender_id: currentUser?.id,
          message_type: "system",
          content: `❌ ${errMsg}`,
        });
      } catch (e) {
        // ignore
      }

      const isKdMismatch =
        errMsg === ERROR_KD_PROFILE_UPLOADED_FOR_POST_GAME ||
        errMsg.toLowerCase().includes("profilo") ||
        errMsg.toLowerCase().includes("statistiche kd");

      toast({
        title: isKdMismatch
          ? "Schermata Errata (Profilo KD Rilevato)"
          : "Screenshot Rifiutato dall'Arbitro IA",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingPostGame(false);
    }
  };

  /**
   * 3. REGISTRAZIONE AUTOMATICA RISULTATO NEL DATABASE E AGGIORNAMENTO CLASSIFICA
   * Invia il resoconto automatico in chat e salva i punti nella classifica della lobby.
   */
  const handleConfirmAndCommitScore = async () => {
    if (!placementFile && !killsFile && !postGameAnalysis) return;

    setIsSubmittingPostGame(true);

    try {
      let placementUrl = chat.placement_screenshot_url || "";
      let killsUrl = chat.kills_screenshot_url || "";

      if (placementFile) {
        placementUrl = await uploadTournamentProof(placementFile, "placement");
      }
      if (killsFile) {
        killsUrl = await uploadTournamentProof(killsFile, "kills");
      }

      const scoringSettings = rawTourn.leaderboard_settings || {
        kill_points: 1,
        placement_points: { "1": 10, "2": 7, "3": 5, "4": 4, "5": 3, top10: 1 },
      };

      const finalRank = postGameAnalysis?.placement || editPlacement || 1;
      const finalKills = postGameAnalysis?.kills || editKills || 0;

      const calc = calculateTournamentScore(finalRank, finalKills, scoringSettings);

      await commitPostGameScoreToDatabase({
        chatId: chat.id,
        registrationId: chat.registration_id,
        tournamentId: rawTourn.id,
        teamName: chat.team_name,
        lobbyId: chat.lobby_id,
        lobbyName,
        placement: finalRank,
        kills: finalKills,
        placementPoints: calc.placementPoints,
        killPoints: calc.killPoints,
        totalPoints: calc.totalPoints,
        summaryMessage: isChampionship ? `[Game ${selectedGameNumber}] ${calc.summaryMessage}` : calc.summaryMessage,
        playerBreakdownText: postGameAnalysis?.player_breakdown_text,
        players: postGameAnalysis?.players,
        placementUrl,
        killsUrl,
        senderId: currentUser?.id,
        currentChatTotalPoints: chat.total_points || 0,
      });

      // If Championship format, record in Championship state
      if (isChampionship && rawTourn.id) {
        try {
          recordGameSubmission(rawTourn.id, chat.registration_id || chat.id, selectedGameNumber, {
            gameNumber: selectedGameNumber,
            placement: finalRank,
            kills: finalKills,
            placementPoints: calc.placementPoints,
            killPoints: calc.killPoints,
            totalPoints: calc.totalPoints,
            multiplierUsed: calc.multiplierUsed,
            placementProofUrl: placementUrl,
            killsProofUrl: killsUrl,
            submittedAt: new Date().toISOString(),
            verifiedByAi: true,
            breakdownText: postGameAnalysis?.player_breakdown_text,
            summaryMessage: calc.summaryMessage,
          });
        } catch (champErr) {
          console.warn("[TeamChat] Error saving championship game:", champErr);
        }
      }

      toast({
        title: isChampionship ? `Risultato Game ${selectedGameNumber} Registrato! 🏆` : "Punteggio Registrato con Successo! 🏆",
        description: `${calc.summaryMessage}. Classifica aggiornata.`,
      });

      setShowPostGameForm(false);
      setPlacementFile(null);
      setKillsFile(null);
      setPlacementPreview(null);
      setKillsPreview(null);
      setPostGameAnalysis(null);
      onRefreshChat?.();
      loadMessages();
    } catch (err: any) {
      toast({
        title: "Errore registrazione punteggio",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPostGame(false);
    }
  };

  return (
    <div className="bg-[#0f1324] border border-purple-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col h-[750px] max-h-[85vh] relative overflow-hidden">
      {/* Tactical Ambient Glow */}
      <div className="absolute top-0 right-0 w-72 h-36 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
            >
              ←
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-cyan-400" />
                {lobbyName}
              </span>

              {/* Status Badge */}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                  chat.status === "approved"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : chat.status === "rejected"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}
              >
                {chat.status === "approved" && <CheckCircle2 className="w-3 h-3" />}
                {chat.status === "rejected" && <XCircle className="w-3 h-3" />}
                {chat.status === "pending_approval" && <Clock className="w-3 h-3" />}
                <span>
                  {chat.status === "approved"
                    ? "Iscrizione Approvata"
                    : chat.status === "rejected"
                    ? "Iscrizione Rifiutata"
                    : "In Attesa di Approvazione"}
                </span>
              </span>

              {chat.total_points > 0 && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  {chat.total_points} PT Totali
                </span>
              )}
            </div>

            <h3 className="text-sm font-extrabold text-white truncate flex items-center gap-2">
              <span>{chat.team_name}</span>
              {isMyTeamChat && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                  Tua Squadra
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Action buttons: KD Upload / Post Game toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="py-1.5 px-3 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer">
            {isAnalyzingKd ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <Target className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Carica KD</span>
            <input
              type="file"
              accept="image/*"
              disabled={isAnalyzingKd}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadAndVerifyKd(f);
              }}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setShowPostGameForm(!showPostGameForm)}
            className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Risultati Post-Game</span>
          </button>
        </div>
      </div>

      {/* TOP CARDS: KD Verification HUD + Status Banner */}
      <div className="py-2.5 space-y-2 shrink-0 overflow-y-auto max-h-[220px]">
        {/* Rejection Alert Banner if rejected */}
        {chat.status === "rejected" && (
          <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <span className="font-extrabold text-rose-300 block">
                Iscrizione Rifiutata dall'Arbitro IA
              </span>
              <p className="text-[11px] text-zinc-300">
                {chat.rejection_reason ||
                  "Lo screenshot inviato non rispetta i limiti stabiliti dal torneo o non mostra chiaramente le statistiche K/D."}
              </p>
              <label className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold cursor-pointer transition-colors">
                <UploadCloud className="w-3 h-3" />
                <span>Carica Nuovo Screenshot KD Conforme</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isAnalyzingKd}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadAndVerifyKd(f);
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* KD Verification Card */}
        {chat.kd_image_url && (
          <div className="bg-[#121629] border border-amber-500/30 rounded-2xl p-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <a
                href={chat.kd_image_url}
                target="_blank"
                rel="noreferrer"
                className="relative w-12 h-12 rounded-xl overflow-hidden border border-amber-500/40 shrink-0 group"
              >
                <img
                  src={chat.kd_image_url}
                  alt="KD Proof"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-4 h-4 text-white" />
                </div>
              </a>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                  <Target className="w-3.5 h-3.5" />
                  <span>Screenshot Statistiche KD</span>
                </div>
                <p className="text-[10px] text-zinc-400 truncate">
                  {rawTourn.max_kd_limit ? `Max: ${rawTourn.max_kd_limit} KD • ` : ""}
                  {rawTourn.min_kd_limit ? `Min: ${rawTourn.min_kd_limit} KD • ` : ""}
                  Analisi visiva Arbitro IA attiva
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={isAnalyzingKd}
                onClick={handleReanalyzeKd}
                className="py-1 px-2.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                {isAnalyzingKd ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                )}
                <span>Rianalizza con IA</span>
              </button>

              {isOrganizer && chat.status !== "approved" && (
                <button
                  type="button"
                  onClick={() => handleSetTeamStatus("approved")}
                  className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-colors cursor-pointer"
                >
                  Approva KD
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* POST-GAME SUBMISSION FORM (Placement + Kills double photo) */}
      {showPostGameForm && (
        <div className="bg-[#151c36] border border-cyan-500/50 rounded-2xl p-3.5 my-2 space-y-3 shadow-xl shrink-0 animate-fade-in">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-white">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Verifica Screenshot Post-Game & Calcolo Punti ({lobbyName})</span>
            </div>
            <button
              onClick={() => setShowPostGameForm(false)}
              className="text-zinc-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Championship Game Selector */}
          {isChampionship && (
            <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-purple-500/40 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-extrabold text-cyan-300 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Seleziona Game di Gara per l'Invio Prove:</span>
                </span>
                <span className="text-[10px] text-zinc-400">
                  Game Selezionato: <strong className="text-white">Game {selectedGameNumber} di {totalChampionshipGames}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {Array.from({ length: totalChampionshipGames }, (_, i) => i + 1).map((gNum) => (
                  <button
                    key={gNum}
                    type="button"
                    onClick={() => setSelectedGameNumber(gNum)}
                    className={`py-1 px-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      selectedGameNumber === gNum
                        ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/30 ring-1 ring-cyan-400"
                        : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800"
                    }`}
                  >
                    Game {gNum}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-zinc-300 leading-snug">
            Carica le due foto di fine partita {isChampionship ? `per il Game ${selectedGameNumber}` : ""} per far calcolare automaticamente all'IA i punti in classifica:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Foto 1: Posizione Finale (Placement) */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-cyan-300 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>Foto 1: Posizione Finale (Placement)</span>
              </span>
              <label className="border border-dashed border-zinc-700 hover:border-cyan-400 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-zinc-900/60 hover:bg-zinc-900 text-center relative overflow-hidden h-24 transition-colors">
                {placementPreview ? (
                  <img
                    src={placementPreview}
                    alt="Piazzamento preview"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <UploadCloud className="w-5 h-5 text-cyan-400" />
                    <span className="text-[10px] font-semibold text-zinc-300 truncate max-w-[150px]">
                      {placementFile ? placementFile.name : "Carica Foto Piazzamento (#1, #3...)"}
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setPlacementFile(f);
                      setPlacementPreview(URL.createObjectURL(f));
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {/* Foto 2: Kill di Squadra */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-purple-300 flex items-center gap-1">
                <Target className="w-3 h-3 text-purple-400" />
                <span>Foto 2: Kill di Squadra Totali</span>
              </span>
              <label className="border border-dashed border-zinc-700 hover:border-purple-400 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-zinc-900/60 hover:bg-zinc-900 text-center relative overflow-hidden h-24 transition-colors">
                {killsPreview ? (
                  <img
                    src={killsPreview}
                    alt="Kill preview"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <UploadCloud className="w-5 h-5 text-purple-400" />
                    <span className="text-[10px] font-semibold text-zinc-300 truncate max-w-[150px]">
                      {killsFile ? killsFile.name : "Carica Foto Kill Totali Team"}
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setKillsFile(f);
                      setKillsPreview(URL.createObjectURL(f));
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* AI Pre-scan Button */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800">
            <button
              type="button"
              disabled={isAnalyzingPostGame || (!placementFile && !killsFile)}
              onClick={handleAnalyzePostGameWithAI}
              className="py-1.5 px-3 rounded-xl bg-purple-950/90 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isAnalyzingPostGame ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>Analizza Foto & Calcola Punti con IA</span>
            </button>

            {postGameAnalysis && (
              <span className="text-[10px] text-emerald-300 font-extrabold flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Calcolati: +{postGameAnalysis.total_points} PT Totali</span>
              </span>
            )}
          </div>

          {/* Live Breakdown Result Card */}
          {postGameAnalysis && (
            <div className="p-3.5 rounded-2xl bg-purple-950/50 border border-purple-500/50 space-y-2.5 animate-fade-in text-xs">
              <div className="flex items-center justify-between text-purple-200">
                <span className="font-extrabold flex items-center gap-1.5 text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Arbitro IA: Risultati Estratti (Warzone)</span>
                </span>
                <span className="font-black text-amber-300 text-sm px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  +{postGameAnalysis.total_points} PT Totali
                </span>
              </div>

              {/* Roster Breakdown (Uccisioni Effettive per giocatore) */}
              {postGameAnalysis.players && postGameAnalysis.players.length > 0 && (
                <div className="bg-black/50 p-2.5 rounded-xl border border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 pb-1 border-b border-zinc-800/80">
                    <span>Membro Squadra</span>
                    <span className="text-amber-400 font-black">Colonna "Uccisioni"</span>
                  </div>
                  {postGameAnalysis.players.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[11px] py-0.5"
                    >
                      <span className="font-semibold text-zinc-200 truncate max-w-[200px]">
                        {p.clan_tag ? (
                          <strong className="text-cyan-400 mr-1">{p.clan_tag}</strong>
                        ) : null}
                        {p.player_name}
                      </span>
                      <span className="font-black text-amber-300 bg-amber-950/60 px-2 py-0.2 rounded border border-amber-500/30">
                        {p.kills} Uccisioni
                      </span>
                    </div>
                  ))}

                  <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-bold">
                    <span className="text-zinc-300">⚔️ Somma Uccisioni Effettive:</span>
                    <span className="text-amber-300 font-extrabold">
                      {postGameAnalysis.kills} Uccisioni (escluse Eliminazioni)
                    </span>
                  </div>
                </div>
              )}

              {/* Summary message */}
              <p className="text-[11px] font-semibold text-zinc-200 bg-zinc-900/80 p-2 rounded-xl font-mono border border-zinc-800">
                {postGameAnalysis.summary_message}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center justify-between bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80">
                  <span className="text-zinc-400">Piazzamento:</span>
                  <span className="font-bold text-white">#{postGameAnalysis.placement} ({postGameAnalysis.placement_points} pt)</span>
                </div>
                <div className="flex items-center justify-between bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80">
                  <span className="text-zinc-400">Punti Uccisioni:</span>
                  <span className="font-bold text-purple-300">+{postGameAnalysis.kill_points} pt ({postGameAnalysis.kills} x {rawTourn.leaderboard_settings?.kill_points || 1}pt)</span>
                </div>
              </div>
            </div>
          )}

          {/* Confirm & Save Button */}
          <button
            type="button"
            disabled={isSubmittingPostGame || (!placementFile && !killsFile && !postGameAnalysis)}
            onClick={handleConfirmAndCommitScore}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-cyan-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 transition-all cursor-pointer"
          >
            {isSubmittingPostGame ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
            )}
            <span>Registra Punteggio Ufficiale in Classifica {lobbyName}</span>
          </button>
        </div>
      )}

      {/* MESSAGES LIST */}
      <div className="flex-1 overflow-y-auto space-y-2.5 p-2 bg-zinc-950/60 rounded-2xl border border-zinc-800/80 my-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 text-xs">
            <MessageSquare className="w-8 h-8 text-zinc-600 mb-2 opacity-50" />
            <p className="font-semibold text-zinc-400">Canale Ufficiale di Squadra ({lobbyName})</p>
            <p className="text-[11px] max-w-xs mt-1">
              Invia lo screenshot del KD per sbloccare l'accesso al torneo e carica i risultati post-partita per il calcolo automatico dei punti.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id;
            const isSystem =
              msg.message_type === "system_ai" ||
              msg.message_type === "kd_verification" ||
              msg.message_type === "post_game_submission";
            const senderName = msg.profiles?.display_name || msg.profiles?.username || "Giocatore";

            if (isSystem) {
              const isKd = msg.message_type === "kd_verification";
              const isPostGame = msg.message_type === "post_game_submission";

              return (
                <div
                  key={msg.id}
                  className={`p-3 rounded-2xl border text-xs space-y-1.5 my-1.5 animate-fade-in ${
                    isKd
                      ? msg.content.includes("APPROVATA")
                        ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                        : "bg-rose-950/30 border-rose-500/40 text-rose-200"
                      : isPostGame
                      ? "bg-cyan-950/30 border-cyan-500/40 text-cyan-200"
                      : "bg-purple-950/30 border-purple-500/30 text-purple-200"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <div className="flex items-center gap-1.5 text-cyan-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {isKd
                          ? "Arbitro IA • Verifica Statistiche KD"
                          : isPostGame
                          ? "Arbitro IA • Calcolo Risultati Partita"
                          : "Sistema Arbitrale SquadUP"}
                      </span>
                    </div>
                    <span className="text-[9px] text-zinc-400">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {msg.image_url && (
                    <a
                      href={msg.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block max-w-xs rounded-xl overflow-hidden border border-white/20 hover:scale-105 transition-transform"
                    >
                      <img
                        src={msg.image_url}
                        alt="Prova inviata"
                        className="max-h-36 w-full object-cover"
                      />
                    </a>
                  )}

                  <p className="whitespace-pre-line text-[11px] leading-relaxed text-zinc-100 font-medium">
                    {msg.content}
                  </p>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <span className="text-[9px] font-semibold text-zinc-500 px-1 mb-0.5">
                  {isMe ? "Tu" : senderName}
                </span>

                <div
                  className={`max-w-[85%] rounded-2xl p-2.5 text-xs shadow-sm ${
                    isMe
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none"
                      : "bg-[#181d33] border border-zinc-800 text-zinc-200 rounded-tl-none"
                  }`}
                >
                  {msg.image_url && (
                    <a
                      href={msg.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block mb-2 rounded-xl overflow-hidden border border-white/20"
                    >
                      <img
                        src={msg.image_url}
                        alt="Allegato"
                        className="max-h-48 w-full object-cover"
                      />
                    </a>
                  )}
                  <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT FORM */}
      <form onSubmit={handleSendMessage} className="pt-2 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder={`Scrivi un messaggio in ${lobbyName}...`}
          className="flex-1 bg-[#121628] border border-zinc-800 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={isSending || !messageInput.trim()}
          className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
};
