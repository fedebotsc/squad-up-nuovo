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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSquad } from "@/context/SquadContext";
import { toast } from "@/components/ui/use-toast";
import {
  uploadTournamentProof,
  verifyKDProofWithAI,
  verifyPostGameProofWithAI,
  KDVerificationResult,
  PostGameVerificationResult,
} from "@/services/tournamentVerificationService";

export interface TeamChatData {
  id: string;
  tournament_id: string;
  lobby_id: string | null;
  registration_id: string | null;
  team_name: string;
  user_id: string;
  status: "pending_approval" | "approved" | "rejected";
  kd_image_url: string | null;
  placement_screenshot_url: string | null;
  kills_screenshot_url: string | null;
  reported_placement: number | null;
  reported_kills: number | null;
  verified_placement: number | null;
  verified_kills: number | null;
  total_points: number;
  score_validation_status: "none" | "submitted" | "verified" | "rejected";
  score_rejection_reason: string | null;
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
  const { currentUser, userProfile, isUniversalAdmin } = useSquad();
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
  const [showPostGameForm, setShowPostGameForm] = useState(false);
  const [placementFile, setPlacementFile] = useState<File | null>(null);
  const [killsFile, setKillsFile] = useState<File | null>(null);
  const [placementPreview, setPlacementPreview] = useState<string | null>(null);
  const [killsPreview, setKillsPreview] = useState<string | null>(null);
  const [isAnalyzingPostGame, setIsAnalyzingPostGame] = useState(false);
  const [postGameAnalysis, setPostGameAnalysis] = useState<PostGameVerificationResult | null>(null);
  const [isSubmittingPostGame, setIsSubmittingPostGame] = useState(false);

  // Organizer manual score validation state
  const [editPlacement, setEditPlacement] = useState<number>(chat.reported_placement || 1);
  const [editKills, setEditKills] = useState<number>(chat.reported_kills || 0);
  const [isValidatingScore, setIsValidatingScore] = useState(false);

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

  // Re-run AI KD check
  const handleReanalyzeKd = async () => {
    if (!chat.kd_image_url) return;
    setIsAnalyzingKd(true);

    try {
      // Fetch image and create blob
      const response = await fetch(chat.kd_image_url);
      const blob = await response.blob();
      const file = new File([blob], "kd_proof.jpg", { type: blob.type || "image/jpeg" });

      const result = await verifyKDProofWithAI(file, {
        min_kd: rawTourn.min_kd_limit ? Number(rawTourn.min_kd_limit) : null,
        max_kd: rawTourn.max_kd_limit ? Number(rawTourn.max_kd_limit) : null,
      });

      setKdAnalysisResult(result);

      // Post update message in chat
      await supabase.from("tournament_chat_messages").insert({
        chat_id: chat.id,
        sender_id: currentUser?.id,
        message_type: "system_ai",
        content: `🤖 Nuova Analisi Arbitro IA:\nKD Rilevato: ${result.kd_ratio.toFixed(2)} (${result.confidence}% confidenza).\nEsito: ${result.approved ? "✅ CONFORME" : "❌ NON CONFORME"}\n${result.reason}`,
        ai_verification_result: result,
      });

      if (result.approved) {
        toast({
          title: "KD Verificato dall'IA! 🎯",
          description: `Rapporto KD: ${result.kd_ratio.toFixed(2)}. Conforme alle regole.`,
        });
      } else {
        toast({
          title: "Attenzione KD",
          description: result.reason,
          variant: "destructive",
        });
      }

      loadMessages();
    } catch (err: any) {
      toast({
        title: "Analisi IA non riuscita",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingKd(false);
    }
  };

  // Organizer manual approval / rejection of KD & team
  const handleSetTeamStatus = async (status: "approved" | "rejected", reason?: string) => {
    try {
      await supabase
        .from("tournament_team_chats")
        .update({ status })
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
            ? `🛡️ L'organizzatore ha APPROVATO l'iscrizione del team "${chat.team_name}" in ${lobbyName}.`
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

  // Analyze Post-Game screenshots with AI
  const handleAnalyzePostGameWithAI = async () => {
    if (!placementFile && !killsFile) {
      toast({
        title: "Screenshot mancanti",
        description: "Carica almeno uno screenshot (posizione o kill) per avviare l'analisi IA.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzingPostGame(true);

    try {
      const targetFile = placementFile || killsFile!;
      const result = await verifyPostGameProofWithAI(
        targetFile,
        placementFile ? "placement" : "kills",
        rawTourn.rules
      );

      setPostGameAnalysis(result);
      setEditPlacement(result.placement);
      setEditKills(result.kills);

      toast({
        title: "Arbitro IA: Risultati Estratti! ⚡",
        description: `Piazzamento: #${result.placement} • Kill: ${result.kills}`,
      });
    } catch (err: any) {
      console.warn("[PostGame OCR] Fallback:", err);
    } finally {
      setIsAnalyzingPostGame(false);
    }
  };

  // Submit Post-Game screenshots to team chat
  const handleSubmitPostGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placementFile && !killsFile) return;

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

      const pRank = postGameAnalysis?.placement || editPlacement || 1;
      const kCount = postGameAnalysis?.kills || editKills || 0;

      // Update tournament_team_chats
      await supabase
        .from("tournament_team_chats")
        .update({
          placement_screenshot_url: placementUrl,
          kills_screenshot_url: killsUrl,
          reported_placement: pRank,
          reported_kills: kCount,
          score_validation_status: "submitted",
        })
        .eq("id", chat.id);

      // Post message with proofs in chat
      await supabase.from("tournament_chat_messages").insert({
        chat_id: chat.id,
        sender_id: currentUser?.id,
        message_type: "post_game_submission",
        image_url: placementUrl || killsUrl,
        image_type: "placement_proof",
        content:
          `📊 Nuovi Risultati Post-Game Inviati:\n` +
          `• Piazzamento Finale: #${pRank}\n` +
          `• Kill Totali Squadra: ${kCount}\n` +
          `• Stato: In attesa di convalida arbitro ${lobbyName}`,
        ai_verification_result: postGameAnalysis,
      });

      toast({
        title: "Screenshot Inviati con Successo! 🎮",
        description: "L'organizzatore della lobby convaliderà i punteggi per la classifica.",
      });

      setShowPostGameForm(false);
      setPlacementFile(null);
      setKillsFile(null);
      onRefreshChat?.();
      loadMessages();
    } catch (err: any) {
      toast({
        title: "Errore invio post-game",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPostGame(false);
    }
  };

  // Organizer validates and commits score into Leaderboard for this lobby
  const handleValidateAndAwardScore = async () => {
    setIsValidatingScore(true);

    try {
      const scoringSettings = rawTourn.leaderboard_settings || {};
      const killMultiplier = Number(scoringSettings.kill_points) || 1;
      const placementPointsMap = scoringSettings.placement_points || { "1": 15, "2": 10, "3": 7, "4": 5, "5": 3, top10: 1 };

      const finalRank = Number(editPlacement) || 1;
      const finalKills = Number(editKills) || 0;

      const placementPts = placementPointsMap[String(finalRank)] ?? (finalRank <= 10 ? (placementPointsMap.top10 ?? 1) : 0);
      const killPts = finalKills * killMultiplier;
      const totalPointsAwarded = placementPts + killPts;

      // 1. Update team chat status
      await supabase
        .from("tournament_team_chats")
        .update({
          verified_placement: finalRank,
          verified_kills: finalKills,
          total_points: (chat.total_points || 0) + totalPointsAwarded,
          score_validation_status: "verified",
        })
        .eq("id", chat.id);

      // 2. Upsert / increment tournament_leaderboards for that lobby
      const teamId = `team_${chat.team_name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

      const { data: existingLeaderboard } = await supabase
        .from("tournament_leaderboards")
        .select("*")
        .eq("tournament_id", rawTourn.id)
        .eq("team_id", teamId)
        .maybeSingle();

      const newKills = (existingLeaderboard?.total_kills || 0) + finalKills;
      const newScore = (existingLeaderboard?.total_score || 0) + totalPointsAwarded;
      const newMatches = (existingLeaderboard?.matches_played || 0) + 1;

      await supabase.from("tournament_leaderboards").upsert(
        {
          tournament_id: rawTourn.id,
          team_id: teamId,
          team_name: chat.team_name,
          lobby_id: chat.lobby_id,
          lobby_name: lobbyName,
          total_kills: newKills,
          total_score: newScore,
          matches_played: newMatches,
        },
        { onConflict: "tournament_id,team_id" }
      );

      // 3. Post official confirmation message in chat
      await supabase.from("tournament_chat_messages").insert({
        chat_id: chat.id,
        sender_id: currentUser?.id,
        message_type: "system_ai",
        content:
          `✅ PUNTEGGIO CONVALIDATO PER ${lobbyName.toUpperCase()}!\n` +
          `• Piazzamento verificato: #${finalRank} (+${placementPts} pt)\n` +
          `• Kill verificate: ${finalKills} (+${killPts} pt)\n` +
          `• Punti Totali Partita: +${totalPointsAwarded} SCoin/Punti Classifica!\n` +
          `La classifica live di ${lobbyName} è stata aggiornata.`,
      });

      toast({
        title: "Punteggio Convalidato! 🏆",
        description: `Assegnati +${totalPointsAwarded} pt alla squadra "${chat.team_name}" in ${lobbyName}.`,
      });

      onRefreshChat?.();
      loadMessages();
    } catch (err: any) {
      toast({
        title: "Errore convalida punteggio",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsValidatingScore(false);
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
              className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
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
                    ? "Approvata"
                    : chat.status === "rejected"
                    ? "Rifiutata"
                    : "In Attesa Approvazione"}
                </span>
              </span>
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

        {/* Action button: Post Game modal toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowPostGameForm(!showPostGameForm)}
            className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Risultati Post-Game</span>
          </button>
        </div>
      </div>

      {/* TOP CARDS: KD Verification HUD + Post-Game Banner */}
      <div className="py-2.5 space-y-2 shrink-0 overflow-y-auto max-h-[220px]">
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
                  {rawTourn.max_kd_limit ? `Limite Max: ${rawTourn.max_kd_limit} KD • ` : ""}
                  Foto inviata per verifica arbitrale
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
                <span>Analizza con IA</span>
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

        {/* Post-Game Results Validation Card (for Organizer) */}
        {chat.score_validation_status === "submitted" && (
          <div className="bg-[#121933] border border-cyan-500/40 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-cyan-300">
                <Swords className="w-3.5 h-3.5 text-cyan-400" />
                <span>Nuovi Risultati Partita Inviati ({lobbyName})</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                Da Convalidare
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {chat.placement_screenshot_url && (
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 block font-semibold">1. Piazzamento:</span>
                  <a
                    href={chat.placement_screenshot_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block h-16 rounded-xl overflow-hidden border border-zinc-800 hover:border-cyan-500 transition-colors"
                  >
                    <img
                      src={chat.placement_screenshot_url}
                      alt="Piazzamento"
                      className="w-full h-full object-cover"
                    />
                  </a>
                </div>
              )}

              {chat.kills_screenshot_url && (
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 block font-semibold">2. Kill Totali:</span>
                  <a
                    href={chat.kills_screenshot_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block h-16 rounded-xl overflow-hidden border border-zinc-800 hover:border-cyan-500 transition-colors"
                  >
                    <img
                      src={chat.kills_screenshot_url}
                      alt="Kill Screenshot"
                      className="w-full h-full object-cover"
                    />
                  </a>
                </div>
              )}
            </div>

            {/* If organizer: editable controls to validate */}
            {isOrganizer ? (
              <div className="bg-zinc-950/70 p-2 rounded-xl border border-zinc-800 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 block mb-0.5">Piazzamento (#)</label>
                    <input
                      type="number"
                      min={1}
                      max={150}
                      value={editPlacement}
                      onChange={(e) => setEditPlacement(Number(e.target.value))}
                      className="w-full p-1 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 block mb-0.5">Kill Totali</label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={editKills}
                      onChange={(e) => setEditKills(Number(e.target.value))}
                      className="w-full p-1 bg-zinc-900 border border-zinc-700 rounded-lg text-purple-300 text-xs font-bold text-center"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isValidatingScore}
                  onClick={handleValidateAndAwardScore}
                  className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  {isValidatingScore ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Convalida Punteggio per {lobbyName}</span>
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-zinc-400 italic">
                In attesa che l'organizzatore o il gestore di {lobbyName} convalidi i punti.
              </p>
            )}
          </div>
        )}
      </div>

      {/* POST-GAME SUBMISSION FORM (Modal/Drawer) */}
      {showPostGameForm && (
        <div className="bg-[#151c36] border border-cyan-500/50 rounded-2xl p-3.5 my-2 space-y-3 shadow-xl shrink-0 animate-fade-in">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-white">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Carica Screenshot Post-Game ({lobbyName})</span>
            </div>
            <button
              onClick={() => setShowPostGameForm(false)}
              className="text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-zinc-300 leading-snug">
            Carica le due foto ufficiali al termine della partita per calcolare i punti:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Foto 1: Piazzamento */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-300 block">
                1. Posizione Finale (Es. #1 Vittoria)
              </span>
              <label className="border border-dashed border-zinc-700 hover:border-cyan-400 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer bg-zinc-900/60 hover:bg-zinc-900 text-center">
                <UploadCloud className="w-5 h-5 text-cyan-400" />
                <span className="text-[10px] font-semibold text-zinc-200 truncate max-w-[120px]">
                  {placementFile ? placementFile.name : "Carica Piazzamento"}
                </span>
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

            {/* Foto 2: Kill Totali */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-300 block">
                2. Kill Totali del Team
              </span>
              <label className="border border-dashed border-zinc-700 hover:border-purple-400 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer bg-zinc-900/60 hover:bg-zinc-900 text-center">
                <UploadCloud className="w-5 h-5 text-purple-400" />
                <span className="text-[10px] font-semibold text-zinc-200 truncate max-w-[120px]">
                  {killsFile ? killsFile.name : "Carica Kill Totali"}
                </span>
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
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isAnalyzingPostGame || (!placementFile && !killsFile)}
              onClick={handleAnalyzePostGameWithAI}
              className="py-1.5 px-3 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isAnalyzingPostGame ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>Analizza Risultati con Arbitro IA</span>
            </button>

            {postGameAnalysis && (
              <span className="text-[10px] text-emerald-300 font-bold">
                ✓ Estratti: #{postGameAnalysis.placement} ({postGameAnalysis.kills} kill)
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            type="button"
            disabled={isSubmittingPostGame || (!placementFile && !killsFile)}
            onClick={handleSubmitPostGame}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            {isSubmittingPostGame ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Invia Risultati per la Verifica in {lobbyName}</span>
          </button>
        </div>
      )}

      {/* MESSAGES LIST */}
      <div className="flex-1 overflow-y-auto space-y-2.5 p-2 bg-zinc-950/60 rounded-2xl border border-zinc-800/80 my-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 text-xs">
            <MessageSquare className="w-8 h-8 text-zinc-600 mb-2 opacity-50" />
            <p className="font-semibold text-zinc-400">Canale di Squadra ({lobbyName})</p>
            <p className="text-[11px] max-w-xs mt-1">
              Comunica con l'organizzatore, invia chiarimenti sul KD e ricevi la convalida dei punteggi.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id;
            const isSystem = msg.message_type === "system_ai" || msg.message_type === "kd_verification";
            const senderName = msg.profiles?.display_name || msg.profiles?.username || "Giocatore";

            if (isSystem) {
              return (
                <div
                  key={msg.id}
                  className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 space-y-1 my-1"
                >
                  <div className="flex items-center gap-1.5 font-bold text-cyan-300 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sistema Arbitrale SquadUP</span>
                  </div>
                  <p className="whitespace-pre-line text-[11px] text-zinc-200 leading-relaxed">
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
          className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white transition-all cursor-pointer shrink-0"
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
