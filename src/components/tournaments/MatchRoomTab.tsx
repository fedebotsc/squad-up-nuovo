import React, { useState, useRef, useEffect } from "react";
import { useSquad } from "@/context/SquadContext";
import {
  UploadCloud,
  CheckCircle2,
  Cpu,
  Swords,
  Send,
  RotateCcw,
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
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { analyzeMatchScoreboard } from "@/services/geminiVisionService";
import { supabase } from "@/integrations/supabase/client";

export const MatchRoomTab: React.FC = () => {
  const {
    selectedTournament,
    setTournamentSubTab,
    matchChat,
    sendMatchMessage,
    userProfile,
    currentUser,
    openAuthModal,
  } = useSquad();

  const [chatInput, setChatInput] = useState("");
  const [scanStatus, setScanStatus] = useState<"idle" | "uploading" | "analyzing" | "verified">("idle");
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    kills: number;
    placement: number;
    damage: number;
    scoreAwarded: number;
    notes: string;
  } | null>(null);

  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load tournament messages from Supabase
  useEffect(() => {
    if (!selectedTournament) return;

    const loadMessages = async () => {
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
            .limit(30);

          if (messages) {
            setLiveMessages(messages);
          }
        }
      } catch (err) {
        console.warn("[MatchRoom] Errore caricamento messaggi:", err);
      }
    };

    loadMessages();
  }, [selectedTournament]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    const text = chatInput.trim();
    setChatInput("");

    // Add locally to matchChat
    sendMatchMessage(text);

    // Save to Supabase tournament_messages if match_chat exists
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    setScanStatus("uploading");
    const previewUrl = URL.createObjectURL(file);
    setScanImage(previewUrl);

    try {
      // 1. Upload to Supabase bucket 'social-media' with path `${userId}/${Date.now()}.${ext}`
      const fileExt = file.name.split(".").pop() || "jpg";
      const filePath = `${currentUser.id}/match_${selectedTournament?.id || "cod"}_${Date.now()}.${fileExt}`;

      let uploadedUrl = previewUrl;
      const { data: uploadRes, error: uploadErr } = await supabase.storage
        .from("social-media")
        .upload(filePath, file, { upsert: true });

      if (!uploadErr && uploadRes) {
        uploadedUrl = supabase.storage.from("social-media").getPublicUrl(filePath).data.publicUrl;
      }

      setScanStatus("analyzing");

      // 2. Call Gemini Vision Analyzer
      const rules = (selectedTournament as any)?.leaderboard_settings || {
        kill_points: 1,
        placement_points: { "1": 15, "2": 10, "3": 7, "top5": 4 },
      };

      const visionData = await analyzeMatchScoreboard(file, rules);

      setScanResult({
        kills: visionData.kills,
        placement: visionData.placement,
        damage: visionData.damage,
        scoreAwarded: visionData.scoreAwarded,
        notes: visionData.notes,
      });

      // 3. Insert into Supabase tournament_messages
      let chatId = null;
      const { data: chats } = await supabase
        .from("tournament_match_chats")
        .select("id")
        .eq("tournament_id", selectedTournament?.id)
        .limit(1);

      if (chats && chats.length > 0) {
        chatId = chats[0].id;
      } else {
        const { data: newChat } = await supabase
          .from("tournament_match_chats")
          .insert({
            tournament_id: selectedTournament?.id,
            team_id: "general",
            room_name: "Stanza Match Ufficiale",
          })
          .select("id")
          .single();
        chatId = newChat?.id;
      }

      if (chatId) {
        await supabase.from("tournament_messages").insert({
          match_chat_id: chatId,
          sender_id: currentUser.id,
          message: `Tabellone Match convalidato da Gemini Vision: ${visionData.kills} Kill, Piazzamento #${visionData.placement} (+${visionData.scoreAwarded} pt).`,
          image_url: uploadedUrl,
          is_screenshot: true,
          ai_status: "verified",
          detected_kills: visionData.kills,
          detected_placement: visionData.placement,
          score_awarded: visionData.scoreAwarded,
          ai_raw_response: visionData.rawResponse,
        });
      }

      // 4. Update tournament_leaderboards
      if (selectedTournament?.id) {
        const teamId = `team_${currentUser.id.slice(0, 8)}`;
        const teamName = userProfile.clanTag
          ? `[${userProfile.clanTag}] ${userProfile.name}`
          : `${userProfile.name}'s Squad`;

        const { data: existingLeaderboard } = await supabase
          .from("tournament_leaderboards")
          .select("*")
          .eq("tournament_id", selectedTournament.id)
          .eq("team_id", teamId)
          .maybeSingle();

        if (existingLeaderboard) {
          await supabase
            .from("tournament_leaderboards")
            .update({
              total_kills: (existingLeaderboard.total_kills || 0) + visionData.kills,
              total_score: (existingLeaderboard.total_score || 0) + visionData.scoreAwarded,
              matches_played: (existingLeaderboard.matches_played || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingLeaderboard.id);
        } else {
          await supabase.from("tournament_leaderboards").insert({
            tournament_id: selectedTournament.id,
            team_id: teamId,
            team_name: teamName,
            total_kills: visionData.kills,
            total_score: visionData.scoreAwarded,
            matches_played: 1,
          });
        }
      }

      setScanStatus("verified");
      toast({
        title: "Punteggio Convalidato con Successo! 🎯",
        description: `+${visionData.scoreAwarded} Punti e ${visionData.kills} Kill aggiornati nella classifica live.`,
      });
    } catch (err: any) {
      console.error("[MatchRoom] Errore verifica screenshot:", err);
      toast({
        title: "Errore scansione screenshot",
        description: err.message || "Impossibile completare l'analisi dell'immagine.",
        variant: "destructive",
      });
      setScanStatus("idle");
    }
  };

  const handleResetScan = () => {
    setScanStatus("idle");
    setScanImage(null);
    setScanResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // CLEAN EMPTY STATE IF NO TOURNAMENT SELECTED
  if (!selectedTournament) {
    return (
      <div className="space-y-4">
        <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-8 text-center space-y-4 shadow-lg">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Swords className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Nessun match attivo selezionato</h3>
            <p className="text-xs text-zinc-400 break-words max-w-xs mx-auto leading-relaxed">
              Per entrare in una Stanza Match e caricare gli screenshot delle kill con verifica IA, seleziona prima un torneo attivo.
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

  return (
    <div className="space-y-4">
      {/* Match Header Card */}
      <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-md">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                STANZA MATCH
              </span>
              <span className="text-[10px] text-zinc-400">{selectedTournament.game}</span>
            </div>
            <h3 className="text-sm font-bold text-white mt-1 truncate">
              {selectedTournament.title}
            </h3>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-zinc-400 block">Stato Arbitrale</span>
            <span className="text-xs font-bold text-cyan-400 flex items-center justify-end gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Gemini Vision
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-300 bg-zinc-900/50 rounded-xl p-2.5 border border-zinc-800">
          <span>Operatore: <strong className="text-white">{userProfile.name}</strong></span>
          <span className="text-purple-400 font-medium">Formato: {selectedTournament.mode}</span>
        </div>
      </div>

      {/* SECTION 1: GEMINI VISION SCREENSHOT VERIFIER */}
      <section
        aria-label="Verifica Screenshot Kill Gemini Vision"
        className="bg-gradient-to-b from-[#141a33] to-[#0e1324] border-2 border-cyan-500/40 rounded-2xl p-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-[10px] font-bold text-cyan-300 uppercase tracking-wider mb-1">
              <Cpu className="w-3 h-3 text-cyan-400 animate-pulse" />
              Arbitro Digitale (Gemini Vision)
            </div>
            <h3 className="text-sm font-extrabold text-white">
              Verifica Kill & Score Screenshot
            </h3>
            <p className="text-[11px] text-zinc-300 mt-0.5 break-words">
              Carica lo screenshot del tabellone di fine partita. L'IA convalida kill e piazzamento aggiornando la classifica live.
            </p>
          </div>
        </div>

        {/* Real file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {/* State: IDLE */}
        {scanStatus === "idle" && (
          <div className="space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/30 rounded-xl p-6 text-center cursor-pointer transition-all group"
            >
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-zinc-200 block">
                Seleziona o scatta lo screenshot del tabellone COD
              </span>
              <span className="text-[10px] text-zinc-400 mt-1 block">
                Supporta JPG, PNG • Analisi Gemini Vision & Aggiornamento Live
              </span>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-cyan-200" />
              Carica Immagine Scoreboard
            </button>
          </div>
        )}

        {/* State: UPLOADING or ANALYZING */}
        {(scanStatus === "uploading" || scanStatus === "analyzing") && (
          <div className="bg-zinc-950/80 border border-cyan-500/30 rounded-xl p-5 text-center space-y-3">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
              <Cpu className="w-5 h-5 text-cyan-300 absolute inset-0 m-auto animate-pulse" />
            </div>

            <div>
              <span className="text-xs font-bold text-white block">
                {scanStatus === "uploading"
                  ? "Caricamento screenshot nei bucket Supabase..."
                  : "Analisi Gemini Vision in corso..."}
              </span>
              <span className="text-[11px] text-cyan-300/80 block mt-1">
                Riconoscimento OCR delle kill, del danno e del piazzamento finale...
              </span>
            </div>

            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-700 ${
                  scanStatus === "uploading" ? "w-1/3" : "w-5/6"
                }`}
              />
            </div>
          </div>
        )}

        {/* State: VERIFIED */}
        {scanStatus === "verified" && scanResult && (
          <div className="bg-emerald-950/30 border border-emerald-500/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-extrabold text-emerald-300">
                  CONVALIDA ARBITRALE GEMINI COMPLETATA
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200 border border-emerald-500/40">
                Verificato
              </span>
            </div>

            {scanImage && (
              <div className="w-full h-36 rounded-xl overflow-hidden bg-black/50 border border-emerald-500/30">
                <img src={scanImage} alt="Scoreboard" className="w-full h-full object-contain" />
              </div>
            )}

            {/* Stats badges */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Kill Convalidate</span>
                <span className="text-sm font-extrabold text-cyan-300">{scanResult.kills}</span>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Piazzamento</span>
                <span className="text-sm font-extrabold text-amber-300">#{scanResult.placement}</span>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Punti Assegnati</span>
                <span className="text-sm font-extrabold text-emerald-400">+{scanResult.scoreAwarded} pt</span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed break-words">
              {scanResult.notes}
            </p>

            <button
              onClick={handleResetScan}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-zinc-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Carica Altro Tabellone
            </button>
          </div>
        )}
      </section>

      {/* SECTION 2: MATCH ROOM CHAT & TOURNAMENT MESSAGES */}
      <section
        aria-label="Chat della Stanza Match"
        className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-md space-y-3"
      >
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Chat della Stanza Match ({liveMessages.length + matchChat.length})
            </h3>
          </div>
          <span className="text-[10px] text-cyan-400 font-semibold">Canale Supabase</span>
        </div>

        {/* Live Messages Log */}
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          {liveMessages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2.5 rounded-xl text-xs space-y-1 border ${
                msg.is_screenshot
                  ? "bg-cyan-950/20 border-cyan-500/40"
                  : "bg-zinc-900/80 border-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-200 truncate max-w-[130px]">
                  {msg.profiles?.display_name || msg.profiles?.username || "Operatore"}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-zinc-300 text-xs leading-relaxed break-words">
                {msg.message}
              </p>
              {msg.image_url && (
                <div className="w-24 h-16 rounded-lg overflow-hidden border border-zinc-700 mt-1">
                  <img src={msg.image_url} alt="Screenshot" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          ))}

          {matchChat.map((msg) => (
            <div
              key={msg.id}
              className="p-2.5 rounded-xl text-xs space-y-1 bg-zinc-900/80 border border-zinc-800"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-200 truncate max-w-[130px]">
                  {msg.sender}
                </span>
                <span className="text-[10px] text-zinc-500">{msg.time}</span>
              </div>
              <p className="text-zinc-300 text-xs leading-relaxed break-words">
                {msg.text}
              </p>
            </div>
          ))}

          {liveMessages.length === 0 && matchChat.length === 0 && (
            <div className="py-4 text-center text-xs text-zinc-400">
              Nessun messaggio nella stanza match. Invia un messaggio per coordinarti o carica uno screenshot!
            </div>
          )}
        </div>

        {/* Chat input */}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Scrivi nella chat del match..."
            className="flex-1 bg-zinc-900 text-zinc-200 text-xs rounded-xl px-3 py-2 border border-purple-900/40 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </section>
    </div>
  );
};
