import React, { useState, useEffect, useRef } from "react";
import { useSquad } from "@/context/SquadContext";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Radio,
  Plus,
  Lock,
  Headphones,
  SlidersHorizontal,
  KeyRound,
  CheckCircle2,
  SignalHigh,
  Activity,
  Play,
  Square,
  Trash2,
  AlertTriangle,
  Loader2,
  Users,
  ShieldAlert,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { agoraVoiceService } from "@/services/agoraService";

export const VoiceSection: React.FC = () => {
  const {
    activeVoiceRoomId,
    voiceRooms,
    joinVoiceRoom,
    leaveVoiceRoom,
    createVoiceRoom,
    deleteVoiceRoom,
    isMuted,
    toggleMute,
    isDeafened,
    toggleDeafen,
    userProfile,
    userSpeaking,
    agoraAppId,
    currentUser,
    isUniversalAdmin,
  } = useSquad();

  const activeVoiceRoom = voiceRooms.find((r) => r.id === activeVoiceRoomId) || null;

  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [selectedGameMode, setSelectedGameMode] = useState("Warzone");
  const [isSubmittingRoom, setIsSubmittingRoom] = useState(false);
  const [isJoiningRoomId, setIsJoiningRoomId] = useState<string | null>(null);
  const [noiseSuppression, setNoiseSuppression] = useState(true);

  // Manual room closure confirmation state
  const [roomPendingDelete, setRoomPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);

  // Agora Settings state (App ID & Dynamic Token)
  const [isAgoraConfigOpen, setIsAgoraConfigOpen] = useState(false);
  const [customAppIdInput, setCustomAppIdInput] = useState(agoraVoiceService.getAppId());
  const [isTestingEdgeToken, setIsTestingEdgeToken] = useState(false);
  const [edgeTokenTestResult, setEdgeTokenTestResult] = useState<{
    success: boolean;
    token?: string;
    error?: string;
    source: string;
    channel: string;
    uid: number;
  } | null>(null);

  const handleTestEdgeFunction = async () => {
    setIsTestingEdgeToken(true);
    setEdgeTokenTestResult(null);
    try {
      const res = await agoraVoiceService.testEdgeFunctionToken();
      setEdgeTokenTestResult(res);
      if (res.success) {
        toast({
          title: "Edge Function Online! 🟢",
          description: `Token generato per canale "${res.channel}" (UID: ${res.uid}). L'app è pronta per le chiamate vocali.`,
        });
      } else {
        toast({
          title: "Verifica Edge Function",
          description: res.error || "Nessun token restituito.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Errore Verifica",
        description: e?.message || "Impossibile contattare la funzione.",
        variant: "destructive",
      });
    } finally {
      setIsTestingEdgeToken(false);
    }
  };

  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const testStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [isConnected, setIsConnected] = useState(false);

  const toggleNoiseSuppression = () => {
    setNoiseSuppression(!noiseSuppression);
    toast({
      title: !noiseSuppression ? "Cancellazione Rumore IA Attiva" : "Cancellazione Rumore Disattivata",
      description: "Filtro rumori tastiera e respiro Agora RTC.",
    });
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) {
      toast({
        title: "Nome stanza richiesto",
        description: "Inserisci un nome per la tua stanza vocale.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingRoom(true);
    try {
      await createVoiceRoom(newRoomName.trim(), selectedGameMode);
      setNewRoomName("");
      setIsCreatingRoom(false);
    } catch (err: any) {
      console.error("[VoiceSection] Errore creazione stanza:", err);
      toast({
        title: "Errore Creazione Stanza",
        description: err?.message || "Impossibile creare la stanza vocale.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRoom(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    setIsJoiningRoomId(roomId);
    try {
      await joinVoiceRoom(roomId);
    } catch (err: any) {
      console.error("[VoiceSection] Errore ingresso stanza:", err);
    } finally {
      setIsJoiningRoomId(null);
    }
  };

  const handleConfirmDeleteRoom = async () => {
    if (!roomPendingDelete) return;
    setIsDeletingRoom(true);
    try {
      await deleteVoiceRoom(roomPendingDelete.id);
      setRoomPendingDelete(null);
    } catch (err: any) {
      console.error("[VoiceSection] Errore eliminazione stanza:", err);
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      testStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      setIsTestingMic(true);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err: any) {
      toast({
        title: "Accesso al microfono negato",
        description: "Controlla i permessi del browser per testare l'audio.",
        variant: "destructive",
      });
    }
  };

  const stopMicTest = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach((t) => t.stop());
      testStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsTestingMic(false);
    setMicLevel(0);
    agoraVoiceService.closeLocalAudioTrack();
  };

  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, []);

  useEffect(() => {
    const handleConnectionStateChange = (state: string) => {
      if (state === "CONNECTED" && activeVoiceRoom) {
        setIsConnected(true);
      } else if (state === "DISCONNECTED" || state === "FAILED") {
        setIsConnected(false);
      }
    };

    agoraVoiceService.onConnectionStateChange(handleConnectionStateChange);

    return () => {
      agoraVoiceService.onConnectionStateChange(() => {});
    };
  }, [activeVoiceRoom]);

  useEffect(() => {
    if (!activeVoiceRoom) {
      setIsConnected(false);
    }
  }, [activeVoiceRoom]);

  const maskedAppId =
    agoraAppId && agoraAppId.length > 8
      ? `${agoraAppId.slice(0, 6)}••••••••••••${agoraAppId.slice(-4)}`
      : agoraAppId || "Non configurata";

  return (
    <div className="pb-24 pt-2 max-w-md mx-auto px-3.5 space-y-4">
      {/* Agora Technical Info Card */}
      <div className="bg-[#121628]/90 border border-purple-900/40 rounded-2xl p-3.5 shadow-md space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-zinc-200">AGORA WEB SDK (RTC 4.24+)</span>
          </div>
          <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full">
            Opus HD • 64kbps
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] bg-zinc-950/60 border border-purple-900/30 rounded-xl px-2.5 py-1.5 text-zinc-300">
          <div className="flex items-center gap-1.5 truncate">
            <KeyRound className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-zinc-400">App ID:</span>
            <code className="text-purple-300 font-mono text-[10px] truncate max-w-[125px]">
              {maskedAppId}
            </code>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-1.5 py-0.5 rounded-md flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-cyan-400" />
              Token Dinamico Obbligatorio
            </span>
            <button
              onClick={() => {
                setCustomAppIdInput(agoraVoiceService.getAppId());
                setIsAgoraConfigOpen(true);
              }}
              className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <span>Info</span>
            </button>
          </div>
        </div>

        <div className="pt-1 border-t border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-zinc-300">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold">Test Microfono & Audio Agora</span>
            </div>
            <button
              onClick={isTestingMic ? stopMicTest : startMicTest}
              className={`py-1 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isTestingMic
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30"
              }`}
            >
              {isTestingMic ? (
                <>
                  <Square className="w-3 h-3 fill-rose-300" />
                  <span>Ferma Test</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-cyan-300" />
                  <span>Avvia Test</span>
                </>
              )}
            </button>
          </div>

          {isTestingMic && (
            <div className="mt-2 space-y-1.5 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>Livello Input Microfono:</span>
                <span className="font-bold text-cyan-300">{micLevel}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-purple-500 transition-all duration-75"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
              <span className="text-[9px] text-emerald-400 font-medium block">
                ✓ Tracce audio sincronizzate con cancellazione eco Agora.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ACTIVE CONNECTED ROOM CARD */}
      {activeVoiceRoom ? (
        <div className="relative rounded-2xl overflow-hidden border border-emerald-500/60 bg-gradient-to-b from-emerald-950/40 via-[#13172e] to-[#0c0f1c] p-4 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                  Stanza Vocale Attiva (1/1 Max)
                </span>
                <h3 className="text-sm font-bold text-white">{activeVoiceRoom.name}</h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-xl">
              <SignalHigh className="w-3.5 h-3.5 text-emerald-400" />
              <span>Agora 24ms</span>
            </div>
          </div>

          {/* Members in current room */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
              <span>Membri nel canale</span>
              <span className="text-[10px] text-purple-400">Microfoni Stereo</span>
            </div>

            <div className="p-3 rounded-xl border bg-zinc-900/70 border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  {userProfile.avatar ? (
                    <img
                      src={userProfile.avatar}
                      alt={userProfile.name}
                      className={`w-10 h-10 rounded-xl object-cover border-2 transition-all ${
                        userSpeaking && !isMuted ? "border-cyan-400 scale-105" : "border-zinc-700"
                      }`}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-purple-950 flex items-center justify-center font-bold text-xs text-purple-300 border border-zinc-700">
                      {userProfile.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {userSpeaking && !isMuted && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 flex items-center justify-center animate-ping" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[120px]">
                      {userProfile.name} (Tu)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                    {userSpeaking && !isMuted ? (
                      <span className="text-cyan-400 font-semibold flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5 animate-spin" />
                        Sta parlando...
                      </span>
                    ) : (
                      <span>In ascolto</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {isMuted ? (
                  <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                    <MicOff className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400">
                    <Mic className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Voice Controls */}
          <div className="pt-2 border-t border-zinc-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2 px-1">
              Comandi Vocali Rapidi
            </span>

            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={toggleMute}
                className={`py-2.5 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-[11px] transition-all shadow-md cursor-pointer ${
                  isMuted
                    ? "bg-rose-500/20 border-2 border-rose-500 text-rose-300"
                    : "bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                }`}
              >
                {isMuted ? (
                  <MicOff className="w-4 h-4 text-rose-400" />
                ) : (
                  <Mic className="w-4 h-4 text-emerald-400" />
                )}
                <span>{isMuted ? "Muto" : "Mic ON"}</span>
              </button>

              <button
                onClick={toggleDeafen}
                className={`py-2.5 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-[11px] transition-all border cursor-pointer ${
                  isDeafened
                    ? "bg-amber-500/20 border-amber-500 text-amber-300"
                    : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white"
                }`}
              >
                {isDeafened ? (
                  <VolumeX className="w-4 h-4 text-amber-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-zinc-300" />
                )}
                <span>{isDeafened ? "Cuffie OFF" : "Audio ON"}</span>
              </button>

              <button
                onClick={leaveVoiceRoom}
                className="py-2.5 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-[11px] bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Lascia la stanza"
              >
                <PhoneOff className="w-4 h-4 text-amber-400" />
                <span>Esci</span>
              </button>

              {/* Dedicated manual room close & delete button */}
              <button
                onClick={() => setRoomPendingDelete({ id: activeVoiceRoom.id, name: activeVoiceRoom.name })}
                className="py-2.5 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-[11px] bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/50 transition-colors cursor-pointer"
                title="Chiudi ed elimina la stanza per tutti"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Chiudi Stanza</span>
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="font-bold text-white block">Cancellazione Rumore IA</span>
                  <span className="text-[10px] text-zinc-400">Elimina rumori di fondo</span>
                </div>
              </div>
              <button
                onClick={toggleNoiseSuppression}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  noiseSuppression
                    ? "bg-purple-600 text-white shadow-[0_0_10px_rgba(139,92,246,0.4)]"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {noiseSuppression ? "ATTIVA" : "OFF"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-6 text-center space-y-3 shadow-md">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Headphones className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-white">Nessuna stanza vocale attiva</h3>
          <p className="text-xs text-zinc-400 break-words max-w-xs mx-auto">
            Crea o seleziona una stanza vocale per comunicare con il tuo team con audio HD a bassissima latenza.
          </p>
          <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-900/40 text-[10px] text-cyan-300 flex items-center justify-center gap-1.5 max-w-xs mx-auto">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Regola: Max 1 stanza attiva. Le stanze vuote si auto-eliminano.</span>
          </div>
        </div>
      )}

      {/* Voice Rooms List & Creation Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
              Stanze Vocali & Cerca Team ({voiceRooms.length})
            </span>
            <span className="text-[10px] text-zinc-500">
              Pulizia automatica all'uscita di tutti i membri
            </span>
          </div>
          <button
            onClick={() => setIsCreatingRoom(!isCreatingRoom)}
            className="text-[11px] font-bold text-cyan-400 flex items-center gap-1 hover:underline cursor-pointer bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crea Stanza</span>
          </button>
        </div>

        {/* Room Creation Form */}
        {isCreatingRoom && (
          <form
            onSubmit={handleCreateRoom}
            className="p-3.5 bg-[#121628] border border-purple-900/50 rounded-2xl space-y-3 shadow-lg"
          >
            <div>
              <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                Nome Stanza Vocale
              </label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Es. Warzone Trio Competitivo #1..."
                className="w-full bg-zinc-900 text-zinc-200 text-xs rounded-xl px-3 py-2 border border-purple-900/40 focus:outline-none focus:border-purple-500"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                Modalità di Gioco
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {["Warzone", "Multiplayer", "Zombie"].map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    onClick={() => setSelectedGameMode(mode)}
                    className={`py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedGameMode === mode
                        ? "bg-purple-600 text-white shadow-md shadow-purple-950/40"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {activeVoiceRoomId && (
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Creando questa stanza verrai disconnesso da quella attuale in automatico.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsCreatingRoom(false)}
                disabled={isSubmittingRoom}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isSubmittingRoom}
                className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-950/40"
              >
                {isSubmittingRoom ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Creazione...</span>
                  </>
                ) : (
                  <span>Crea & Entra</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Room List */}
        <div className="space-y-2">
          {voiceRooms.length === 0 ? (
            <div className="p-6 text-center bg-[#121628]/60 border border-zinc-800/80 rounded-2xl text-xs text-zinc-400">
              Nessuna stanza vocale aperta al momento. Creane una tu per iniziare!
            </div>
          ) : (
            voiceRooms.map((room) => {
              const isCurrent = activeVoiceRoom?.id === room.id;
              const isJoining = isJoiningRoomId === room.id;
              const isHostOrAdmin =
                isUniversalAdmin ||
                (currentUser?.id && room.hostId === currentUser.id) ||
                (room.activeMembers?.some((m) => m.id === currentUser?.id));

              return (
                <div
                  key={room.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? "bg-emerald-950/20 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30"
                      : "bg-[#121628]/90 border-purple-900/30 hover:border-purple-700/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isCurrent
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-purple-950/60 text-purple-300 border border-purple-500/30"
                      }`}
                    >
                      <Headphones className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-white truncate max-w-[150px]">
                          {room.name}
                        </h4>
                        {isCurrent && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                            Attiva
                          </span>
                        )}
                        {room.channelType?.toLowerCase().includes("privat") && (
                          <Lock className="w-3 h-3 text-zinc-500 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 block">
                        {isCurrent ? 1 : (room.activeMembers?.length || 0)}/{room.maxCapacity || 4} operatori • {room.game || "Warzone"}
                      </span>
                    </div>
                  </div>

                  {/* Room action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isCurrent ? (
                      <>
                        <button
                          onClick={leaveVoiceRoom}
                          className="py-1.5 px-3 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-pointer transition-colors"
                          title="Lascia la stanza vocale"
                        >
                          Esci
                        </button>
                        <button
                          onClick={() => setRoomPendingDelete({ id: room.id, name: room.name })}
                          className="py-1.5 px-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 flex items-center gap-1 cursor-pointer transition-all"
                          title="Chiudi ed elimina la stanza per tutti"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-[11px]">Chiudi</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleJoinRoom(room.id)}
                          disabled={isJoining}
                          className="py-1.5 px-3.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-md shadow-purple-950/40 transition-all flex items-center gap-1"
                        >
                          {isJoining ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : null}
                          <span>Entra</span>
                        </button>

                        {/* Dedicated closure control if user is creator/host, admin or if empty */}
                        {isHostOrAdmin && (
                          <button
                            onClick={() => setRoomPendingDelete({ id: room.id, name: room.name })}
                            className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
                            title="Chiudi ed elimina stanza"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MANUAL ROOM CLOSURE CONFIRMATION MODAL */}
      {roomPendingDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121628] border border-rose-600/50 rounded-2xl max-w-sm w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white">Chiudi Stanza Vocale</h4>
                <span className="text-[10px] text-zinc-400">Azione irreversibile</span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Sei sicuro di voler chiudere ed eliminare la stanza vocale{" "}
              <strong className="text-white font-bold">"{roomPendingDelete.name}"</strong>?
              Tutti i partecipanti connessi verranno disconnessi e la stanza sarà cancellata definitivamente.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setRoomPendingDelete(null)}
                disabled={isDeletingRoom}
                className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRoom}
                disabled={isDeletingRoom}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-rose-950/50"
              >
                {isDeletingRoom ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminazione...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Conferma Chiusura</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AGORA CONFIGURATION MODAL (APP ID & TOKEN) */}
      {isAgoraConfigOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121628] border border-cyan-500/50 rounded-2xl max-w-sm w-full p-4 space-y-3.5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-cyan-400">
              <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40">
                <KeyRound className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white">Configurazione Agora RTC</h4>
                <span className="text-[10px] text-zinc-400">App ID & Token di Autenticazione</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Agora App ID (Attivo: {agoraVoiceService.getAppId()})
                </label>
                <input
                  type="text"
                  value={customAppIdInput}
                  onChange={(e) => setCustomAppIdInput(e.target.value)}
                  placeholder="App ID Agora..."
                  className="w-full bg-zinc-900 text-zinc-200 text-xs rounded-xl px-3 py-2 border border-purple-900/40 focus:outline-none focus:border-cyan-500 font-mono"
                  readOnly
                />
              </div>

              {/* SUPABASE EDGE FUNCTION TOKEN STATUS */}
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 space-y-2 text-[11px] text-zinc-300">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Supabase Edge Function: generate-agora-token
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  L'app genera automaticamente un token RTC firmato tramite la Supabase Edge Function prima di ogni connessione al canale vocale.
                </p>

                {/* Test Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleTestEdgeFunction}
                    disabled={isTestingEdgeToken}
                    className="w-full py-1.5 px-2.5 rounded-lg text-[10px] font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isTestingEdgeToken ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Verifica Edge Function in corso...</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-3 h-3 text-cyan-400" />
                        <span>Verifica Generazione Token in Tempo Reale</span>
                      </>
                    )}
                  </button>

                  {edgeTokenTestResult && (
                    <div className={`mt-2 p-2 rounded-lg text-[9px] font-mono break-all ${
                      edgeTokenTestResult.success
                        ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-300"
                        : "bg-rose-950/40 border border-rose-500/30 text-rose-300"
                    }`}>
                      {edgeTokenTestResult.success ? (
                        <>
                          <div className="font-bold text-emerald-400 mb-0.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Token Generato ({edgeTokenTestResult.source}):
                          </div>
                          <div className="text-[9px] text-zinc-400">
                            Channel: {edgeTokenTestResult.channel} | UID: {edgeTokenTestResult.uid}
                          </div>
                          <div className="text-[9px] text-emerald-200 truncate mt-0.5">
                            {edgeTokenTestResult.token?.slice(0, 32)}...
                          </div>
                        </>
                      ) : (
                        <div className="text-rose-400">
                          {edgeTokenTestResult.error || "Errore nella generazione del token"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
              <span className="text-[10px] text-zinc-500">
                Token dinamici RTC v2 • No static keys
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAgoraConfigOpen(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
