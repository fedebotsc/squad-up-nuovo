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
  Image as ImageIcon,
  X,
  FileCheck,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { analyzeDualMatchScreenshots } from "@/services/geminiVisionService";
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

  // Separate screenshots: Placement & Squad Kills
  const [placementFile, setPlacementFile] = useState<File | null>(null);
  const [placementPreview, setPlacementPreview] = useState<string | null>(null);

  const [killsFile, setKillsFile] = useState<File | null>(null);
  const [killsPreview, setKillsPreview] = useState<string | null>(null);

  const [scanResult, setScanResult] = useState<{
    kills: number;
    placement: number;
    damage: number;
    scoreAwarded: number;
    notes: string;
  } | null>(null);

  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const placementInputRef = useRef<HTMLInputElement>(null);
  const killsInputRef = useRef<HTMLInputElement>(null);

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

    // Add locally
    sendMatchMessage(text);

    // Save to Supabase tournament_messages
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

  const handleSelectPlacement = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPlacementFile(file);
      setPlacementPreview(URL.createObjectURL(file));
    }
  };

  const handleSelectKills = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setKillsFile(file);
      setKillsPreview(URL.createObjectURL(file));
    }
  };

  const handleStartVerification = async () => {
    if (!placementFile && !killsFile) {
      toast({
        title: "Screenshot mancante",
        description: "Carica almeno uno screenshot del posizionamento o delle kill di squadra.",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    setScanStatus("uploading");

    try {
      let uploadedPlacementUrl = "";
      let uploadedKillsUrl = "";

      // 1. Upload placement file if provided
      if (placementFile) {
        const ext = placementFile.name.split(".").pop() || "jpg";
        const path = `${currentUser.id}/placement_${selectedTournament?.id || "match"}_${Date.now()}.${ext}`;
        const { error: err } = await supabase.storage.from("social-media").upload(path, placementFile, { upsert: true });
        if (!err) {
          uploadedPlacementUrl = supabase.storage.from("social-media").getPublicUrl(path).data.publicUrl;
        }
      }

      // 2. Upload kills file if provided
      if (killsFile) {
        const ext = killsFile.name.split(".").pop() || "jpg";
        const path = `${currentUser.id}/kills_${selectedTournament?.id || "match"}_${Date.now()}.${ext}`;
        const { error: err } = await supabase.storage.from("social-media").upload(path, killsFile, { upsert: true });
        if (!err) {
          uploadedKillsUrl = supabase.storage.from("social-media").getPublicUrl(path).data.publicUrl;
        }
      }

      setScanStatus("analyzing");

      // 3. Gemini Vision Dual Analysis
      const rules = (selectedTournament as any)?.leaderboard_settings || {
        kill_points: 1,
        placement_points: { "1": 15, "2": 10, "3": 7, "4": 5, "5": 3, top10: 1 },
      };

      const visionData = await analyzeDualMatchScreenshots(placementFile, killsFile, rules);

      setScanResult({
        kills: visionData.kills,
        placement: visionData.placement,
        damage: visionData.damage,
        scoreAwarded: visionData.scoreAwarded,
        notes: visionData.notes,
      });

      // 4. Save to tournament_messages
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
        const primaryImage = uploadedPlacementUrl || uploadedKillsUrl;
        await supabase.from("tournament_messages").insert({
          match_chat_id: chatId,
          sender_id: currentUser.id,
          message: `Verifica IA completata: Piazzamento #${visionData.placement}, ${visionData.kills} Kill (+${visionData.scoreAwarded} pt).`,
          image_url: primaryImage,
          is_screenshot: true,
          ai_status: "verified",
          detected_kills: visionData.kills,
          detected_placement: visionData.placement,
          score_awarded: visionData.scoreAwarded,
          ai_raw_response: visionData.rawResponse,
        });
      }

      // 5. Update tournament_leaderboards
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
        title: "Screenshot Convalidati con Successo! 🎯",
        description: `Posizione #${visionData.placement} e ${visionData.kills} Kill accreditate alla squadra (+${visionData.scoreAwarded} pt).`,
      });
    } catch (err: any) {
      console.error("[MatchRoom] Errore verifica screenshot:", err);
      toast({
        title: "Errore durante la scansione",
        description: err.message || "Impossibile completare la verifica delle immagini.",
        variant: "destructive",
      });
      setScanStatus("idle");
    }
  };

  const handleResetScan = () => {
    setScanStatus("idle");
    setPlacementFile(null);
    setPlacementPreview(null);
    setKillsFile(null);
    setKillsPreview(null);
    setScanResult(null);
    if (placementInputRef.current) placementInputRef.current.value = "";
    if (killsInputRef.current) killsInputRef.current.value = "";
  };

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
              Per entrare in una Stanza Match e caricare gli screenshot delle kill e del piazzamento, seleziona prima un torneo attivo.
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
            <span className="text-[10px] text-zinc-400 block">Arbitro IA</span>
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

      {/* SECTION 1: GEMINI VISION DUAL SCREENSHOT VERIFIER */}
      <section
        aria-label="Verifica Screenshot Posizionamento e Kill Gemini Vision"
        className="bg-gradient-to-b from-[#141a33] to-[#0e1324] border-2 border-cyan-500/40 rounded-2xl p-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-[10px] font-bold text-cyan-300 uppercase tracking-wider mb-1">
              <Cpu className="w-3 h-3 text-cyan-400 animate-pulse" />
              Arbitraggio Automatico Gemini Vision
            </div>
            <h3 className="text-sm font-extrabold text-white">
              Verifica Posizionamento & Kill di Squadra
            </h3>
            <p className="text-[11px] text-zinc-300 mt-0.5 break-words">
              Carica separatamente la foto della schermata di posizionamento finale e la foto della tabella kill di squadra.
            </p>
          </div>
        </div>

        {/* Hidden inputs */}
        <input
          type="file"
          ref={placementInputRef}
          onChange={handleSelectPlacement}
          accept="image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={killsInputRef}
          onChange={handleSelectKills}
          accept="image/*"
          className="hidden"
        />

        {/* State: IDLE */}
        {scanStatus === "idle" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {/* Dropzone 1: Posizionamento */}
              <div
                onClick={() => placementInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[120px] ${
                  placementPreview
                    ? "border-emerald-500 bg-emerald-950/20"
                    : "border-cyan-500/40 hover:border-cyan-400 bg-cyan-950/20"
                }`}
              >
                {placementPreview ? (
                  <div className="space-y-1.5 w-full">
                    <img
                      src={placementPreview}
                      alt="Posizionamento"
                      className="w-full h-16 object-cover rounded-lg border border-emerald-500/40"
                    />
                    <span className="text-[10px] font-extrabold text-emerald-300 flex items-center justify-center gap-1">
                      <Check className="w-3 h-3" /> Foto Posizionamento
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mb-1.5">
                      <Trophy className="w-5 h-5 text-amber-400" />
                    </div>
                    <span className="text-[11px] font-bold text-white block">
                      1. Foto Posizione
                    </span>
                    <span className="text-[9px] text-zinc-400 block">
                      Vittoria / Piazzamento (#1, #2...)
                    </span>
                  </>
                )}
              </div>

              {/* Dropzone 2: Kill di Squadra */}
              <div
                onClick={() => killsInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[120px] ${
                  killsPreview
                    ? "border-purple-500 bg-purple-950/20"
                    : "border-purple-500/40 hover:border-purple-400 bg-purple-950/20"
                }`}
              >
                {killsPreview ? (
                  <div className="space-y-1.5 w-full">
                    <img
                      src={killsPreview}
                      alt="Kill di Squadra"
                      className="w-full h-16 object-cover rounded-lg border border-purple-500/40"
                    />
                    <span className="text-[10px] font-extrabold text-purple-300 flex items-center justify-center gap-1">
                      <Check className="w-3 h-3" /> Foto Kill Squadra
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300 mb-1.5">
                      <Target className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-[11px] font-bold text-white block">
                      2. Foto Kill Squadra
                    </span>
                    <span className="text-[9px] text-zinc-400 block">
                      Tabellone con Kills e Danni
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleStartVerification}
              disabled={!placementFile && !killsFile}
              className={`w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                placementFile || killsFile
                  ? "bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.35)]"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              <Sparkles className="w-4 h-4 text-cyan-200" />
              <span>Avvia Convalida Arbitrale con Gemini Vision</span>
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
                  ? "Caricamento screenshot nei bucket protetti..."
                  : "Analisi IA Gemini Vision in corso..."}
              </span>
              <span className="text-[11px] text-cyan-300/80 block mt-1">
                Verifica incrociata di piazzamento finale, danni e totale kill squadra...
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
                Punteggio Confermato
              </span>
            </div>

            {/* Thumbnail previews */}
            <div className="grid grid-cols-2 gap-2">
              {placementPreview && (
                <div className="h-24 rounded-lg overflow-hidden bg-black/60 border border-emerald-500/40 relative">
                  <img src={placementPreview} alt="Posizione" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.2 rounded text-[9px] font-bold text-emerald-300">
                    Posizione #{scanResult.placement}
                  </span>
                </div>
              )}
              {killsPreview && (
                <div className="h-24 rounded-lg overflow-hidden bg-black/60 border border-purple-500/40 relative">
                  <img src={killsPreview} alt="Kill" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.2 rounded text-[9px] font-bold text-purple-300">
                    Kill Squadra: {scanResult.kills}
                  </span>
                </div>
              )}
            </div>

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
              <span>Verifica Nuova Partita</span>
            </button>
          </div>
        )}
      </section>

      {/* SECTION 2: MATCH ROOM CHAT & TOURNAMENT MESSAGES */}
      <section
        aria-label="Chat Match e Arbitraggio Live"
        className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-md space-y-3"
      >
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Registro Chat Stanza Match
            </h4>
          </div>
          <span className="text-[10px] text-zinc-400">
            {liveMessages.length + matchChat.length} messaggi
          </span>
        </div>

        {/* Messages container */}
        <div className="h-48 overflow-y-auto space-y-2 pr-1">
          {liveMessages.map((msg) => (
            <div
              key={msg.id}
              className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-2.5 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400">
                  {msg.profiles?.display_name || msg.profiles?.username || "Operatore"}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-zinc-200 text-xs">{msg.message}</p>
              {msg.image_url && (
                <div className="mt-1 max-w-[200px] rounded-lg overflow-hidden border border-zinc-700">
                  <img src={msg.image_url} alt="Screenshot tabellone" className="w-full h-auto object-cover" />
                </div>
              )}
            </div>
          ))}

          {matchChat.map((msg) => (
            <div
              key={msg.id}
              className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-2.5 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-300">{msg.sender}</span>
                <span className="text-[10px] text-zinc-500">{msg.time}</span>
              </div>
              <p className="text-zinc-200 text-xs">{msg.text}</p>
            </div>
          ))}

          {liveMessages.length === 0 && matchChat.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500">
              Nessun messaggio nella stanza match. Scrivi o carica gli screenshot per iniziare.
            </div>
          )}
        </div>

        {/* Chat input */}
        <form onSubmit={handleSendMessage} className="flex gap-2 pt-1">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Comunica con l'arbitro o gli avversari..."
            className="flex-1 bg-zinc-900 text-zinc-200 text-xs rounded-xl px-3 py-2 border border-purple-900/40 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center justify-center transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </section>
    </div>
  );
};
