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
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MatchScreenshotOcrModal, TournamentMatchItem } from "./MatchScreenshotOcrModal";
import { OpenRouterKeyModal } from "@/components/common/OpenRouterKeyModal";
import { getOpenRouterApiKey } from "@/services/openRouterService";

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

  const [matches, setMatches] = useState<TournamentMatchItem[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [activeMatchForOcr, setActiveMatchForOcr] = useState<TournamentMatchItem | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingTourn, setIsDeletingTourn] = useState(false);

  // Live Chat state
  const [chatInput, setChatInput] = useState("");
  const [liveMessages, setLiveMessages] = useState<any[]>([]);

  // Load tournament matches from Supabase
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

      if (data && data.length > 0) {
        setMatches(data as any[]);
      } else {
        // If tournament table has matches in its JSON bracket/matches column, check that
        const rawTournament = (selectedTournament as any)?.raw;
        const initialBracket = rawTournament?.matches || rawTournament?.bracket || [];
        if (Array.isArray(initialBracket) && initialBracket.length > 0) {
          // Auto-seed into tournament_matches
          const toInsert = initialBracket.map((m: any, idx: number) => ({
            tournament_id: selectedTournament.id,
            round_name: m.round_name || `Incontro ${idx + 1}`,
            score_player1: 0,
            score_player2: 0,
            status: "pending",
            ai_parsed_data: {
              team1_name: m.player1_name || m.team1 || `Squadra ${idx * 2 + 1}`,
              team2_name: m.player2_name || m.team2 || `Squadra ${idx * 2 + 2}`,
            },
          }));

          const { data: inserted } = await supabase
            .from("tournament_matches")
            .insert(toInsert)
            .select();

          if (inserted) {
            setMatches(inserted as any[]);
          }
        } else {
          setMatches([]);
        }
      }
    } catch (err) {
      console.warn("[MatchRoom] Errore caricamento match:", err);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  // Load tournament messages from Supabase
  const loadMessages = async () => {
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
      console.warn("[MatchRoom] Errore caricamento messaggi:", err);
    }
  };

  useEffect(() => {
    if (!selectedTournament?.id) return;

    loadMatches();
    loadMessages();

    // Subscribe to tournament_matches changes
    const matchChannel = supabase
      .channel(`matches-${selectedTournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_matches",
          filter: `tournament_id=eq.${selectedTournament.id}`,
        },
        () => {
          loadMatches();
        }
      )
      .subscribe();

    // Subscribe to messages changes
    const msgChannel = supabase
      .channel(`messages-${selectedTournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tournament_messages",
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [selectedTournament?.id]);

  const handleCreateDefaultMatches = async () => {
    if (!selectedTournament?.id || !currentUser) return;

    try {
      const defaultMatches = [
        {
          tournament_id: selectedTournament.id,
          round_name: "Quarti di Finale - Match 1",
          score_player1: 0,
          score_player2: 0,
          status: "pending",
          ai_parsed_data: { team1_name: "Squad Alpha", team2_name: "Cyber Wolves" },
        },
        {
          tournament_id: selectedTournament.id,
          round_name: "Quarti di Finale - Match 2",
          score_player1: 0,
          score_player2: 0,
          status: "pending",
          ai_parsed_data: { team1_name: "Phantom Ghost", team2_name: "Viper Legion" },
        },
        {
          tournament_id: selectedTournament.id,
          round_name: "Quarti di Finale - Match 3",
          score_player1: 0,
          score_player2: 0,
          status: "pending",
          ai_parsed_data: { team1_name: "Titan Esports", team2_name: "Apex Striker" },
        },
        {
          tournament_id: selectedTournament.id,
          round_name: "Quarti di Finale - Match 4",
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

  const handleSendMessage = async (e: React.FormEvent) => {
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

  const hasApiKey = !!getOpenRouterApiKey();

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
              Per visualizzare gli incontri, caricare screenshot convalidati dall'arbitro IA e seguire la chat, seleziona prima un torneo.
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

  const rawTourn = (selectedTournament as any)?.raw || {};
  const tournamentRulesText = rawTourn.rules || selectedTournament.description || "";

  return (
    <div className="space-y-4">
      {/* Tournament Match Room Banner */}
      <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-start justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                STANZA MATCH UFFICIALE
              </span>
              <span className="text-[10px] text-purple-300 font-semibold bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-800/40">
                {selectedTournament.game}
              </span>
            </div>

            <h3 className="text-base font-bold text-white truncate">
              {selectedTournament.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all ${
                hasApiKey
                  ? "bg-purple-950/60 border-purple-500/40 text-purple-300"
                  : "bg-amber-950/60 border-amber-500/50 text-amber-300 animate-pulse"
              }`}
            >
              <Key className="w-3 h-3" />
              <span>{hasApiKey ? "IA OpenRouter" : "Configura Key"}</span>
            </button>

            {(isUniversalAdmin || (currentUser?.id && rawTourn.owner_id === currentUser.id)) && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/25 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
                title="Elimina Torneo con Rimborso SCoin"
              >
                <Trash2 className="w-3 h-3" />
                <span>Elimina</span>
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
      </div>

      {/* SECTION: TOURNAMENT MATCHES & OCR VALIDATION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
              Tabellone Incontri ({matches.length})
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTournamentSubTab("leaderboard")}
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

                    <div className="flex items-center gap-2">
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
                  </div>

                  {/* Match Score Display */}
                  <div className="grid grid-cols-3 items-center gap-2 py-1">
                    {/* Team 1 */}
                    <div className="text-left min-w-0">
                      <div className="flex items-center gap-1">
                        {isCompleted && winner === "player1" && (
                          <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                        )}
                        <span
                          className={`text-xs font-bold truncate block ${
                            isCompleted && winner === "player1"
                              ? "text-amber-300"
                              : "text-white"
                          }`}
                        >
                          {team1}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400">Squadra Alpha</span>
                    </div>

                    {/* Central Score */}
                    <div className="text-center shrink-0">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900/90 border border-zinc-800 rounded-xl">
                        <span className="text-sm font-black text-cyan-400">
                          {m.score_player1}
                        </span>
                        <span className="text-zinc-500 font-bold text-xs">-</span>
                        <span className="text-sm font-black text-rose-400">
                          {m.score_player2}
                        </span>
                      </div>
                    </div>

                    {/* Team 2 */}
                    <div className="text-right min-w-0">
                      <div className="flex items-center justify-end gap-1">
                        <span
                          className={`text-xs font-bold truncate block ${
                            isCompleted && winner === "player2"
                              ? "text-amber-300"
                              : "text-white"
                          }`}
                        >
                          {team2}
                        </span>
                        {isCompleted && winner === "player2" && (
                          <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400">Squadra Bravo</span>
                    </div>
                  </div>

                  {/* Action / Screenshot Row */}
                  <div className="flex items-center justify-between gap-2 pt-2.5 mt-2 border-t border-zinc-800/70 text-[11px]">
                    {m.screenshot_url ? (
                      <a
                        href={m.screenshot_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1 text-[10px]"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Visualizza Screenshot Ufficiale</span>
                      </a>
                    ) : (
                      <span className="text-zinc-500 text-[10px]">
                        Nessuno screenshot caricato
                      </span>
                    )}

                    <button
                      onClick={() => setActiveMatchForOcr(m)}
                      className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
                        isCompleted
                          ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                          : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-950/40"
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
                Genera subito il tabellone di gara iniziale per iniziare a convalidare i punteggi con l'arbitro IA.
              </p>
            </div>
            <button
              onClick={handleCreateDefaultMatches}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Genera Incontri del Tabellone</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION: LIVE CHAT & REFEREE ANNOUNCEMENTS */}
      <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
              Chat Stanza Match & Registro Arbitrale
            </h4>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>

        {/* Messages List */}
        <div className="h-44 sm:h-52 overflow-y-auto space-y-2 pr-1 text-xs">
          {liveMessages.length > 0 ? (
            liveMessages.map((msg, index) => {
              const isReferee = msg.is_screenshot || msg.ai_status === "verified";
              const senderName =
                msg.profiles?.display_name ||
                msg.profiles?.username ||
                "Operatore";

              return (
                <div
                  key={msg.id || index}
                  className={`p-2.5 rounded-xl border text-xs ${
                    isReferee
                      ? "bg-purple-950/40 border-purple-500/40 text-purple-200"
                      : "bg-zinc-900/80 border-zinc-800 text-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px] text-white flex items-center gap-1">
                      {isReferee && <Sparkles className="w-3 h-3 text-amber-400" />}
                      {senderName}
                    </span>
                    <span className="text-[9px] text-zinc-500">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="leading-relaxed text-[11px]">{msg.message}</p>

                  {msg.image_url && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-zinc-700 max-w-[200px]">
                      <img
                        src={msg.image_url}
                        alt="Screenshot Match"
                        className="w-full h-24 object-cover cursor-pointer"
                        onClick={() => window.open(msg.image_url, "_blank")}
                      />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500 text-xs italic">
              Nessun messaggio. Scrivi per comunicare con gli avversari o carica uno screenshot di match.
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="flex gap-2 pt-1">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Comunica nella stanza match..."
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

      {/* Match Screenshot OCR Modal */}
      {activeMatchForOcr && (
        <MatchScreenshotOcrModal
          isOpen={!!activeMatchForOcr}
          onClose={() => setActiveMatchForOcr(null)}
          match={activeMatchForOcr}
          tournamentRules={tournamentRulesText}
          gameMode={selectedTournament.game}
          onMatchUpdated={() => {
            loadMatches();
            loadMessages();
          }}
        />
      )}

      {/* OpenRouter Key Modal */}
      <OpenRouterKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
      />

      {/* Delete Tournament Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#121629] border border-rose-500/50 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-extrabold text-white">
                Eliminare questo torneo?
              </h4>
              <p className="text-xs font-semibold text-rose-300">
                "{selectedTournament.title}"
              </p>
              <div className="text-[11px] text-zinc-300 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-left mt-2 space-y-1.5">
                <span className="font-bold text-white block">Rimborsi automatici garantiti:</span>
                <p>• <strong>100 SCoin</strong> rimborsati all'organizzatore per il costo di creazione.</p>
                {selectedTournament.entryFeeSCoin > 0 && (
                  <p>• <strong>{selectedTournament.entryFeeSCoin} SCoin</strong> rimborsati a ciascun partecipante iscritto.</p>
                )}
                <p className="text-[10px] text-zinc-400 italic pt-1">
                  Tutti i match e i log di questa stanza verranno cancellati definitivamente.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingTourn}
                onClick={() => setShowDeleteConfirm(false)}
                className="py-2.5 px-3 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={isDeletingTourn}
                onClick={async () => {
                  setIsDeletingTourn(true);
                  try {
                    await deleteTournament(selectedTournament.id);
                    setShowDeleteConfirm(false);
                    setTournamentSubTab("active");
                  } catch (e) {
                    // error handled in context
                  } finally {
                    setIsDeletingTourn(false);
                  }
                }}
                className="py-2.5 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-rose-950/50 cursor-pointer"
              >
                {isDeletingTourn ? (
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
