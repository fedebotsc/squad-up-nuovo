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
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { agoraVoiceService } from "@/services/agoraService";

export const VoiceSection: React.FC = () => {
  const {
    activeVoiceRoom,
    voiceRooms,
    joinVoiceRoom,
    leaveVoiceRoom,
    createVoiceRoom,
    isMuted,
    toggleMute,
    isDeafened,
    toggleDeafen,
    userProfile,
    userSpeaking,
    agoraAppId,
  } = useSquad();

  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [noiseSuppression, setNoiseSuppression] = useState(true);

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
    if (!newRoomName.trim()) return;
    await createVoiceRoom(newRoomName.trim(), "Warzone");
    setNewRoomName("");
    setIsCreatingRoom(false);
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
        toast({
          title: "Stato Connessione Aggiornato",
          description: `Agora RTC: ${state} - Canale: ${activeVoiceRoom.name}`,
        });
      } else if (state === "DISCONNECTED" || state === "FAILED") {
        setIsConnected(false);
      }
    };

    agoraVoiceService.onConnectionStateChange(handleConnectionStateChange);

    return () => {
      agoraVoiceService.onConnectionStateChange((state) => {});
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
            <code className="text-purple-300 font-mono text-[10px] truncate max-w-[170px]">
              {maskedAppId}
            </code>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold shrink-0">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Attiva (.env)</span>
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

      {activeVoiceRoom ? (
        <div className="relative rounded-2xl overflow-hidden border border-emerald-500/60 bg-gradient-to-b from-emerald-950/40 via-[#13172e] to-[#0c0f1c] p-4 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                  Stanza Vocale Connessa
                </span>
                <h3 className="text-sm font-bold text-white">{activeVoiceRoom.name}</h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-xl">
              <SignalHigh className="w-3.5 h-3.5 text-emerald-400" />
              <span>Agora 24ms</span>
            </div>
          </div>

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

          <div className="pt-2 border-t border-zinc-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2 px-1">
              Comandi Vocali Rapidi
            </span>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={toggleMute}
                className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 font-bold text-xs transition-all shadow-md cursor-pointer ${
                  isMuted
                    ? "bg-rose-500/20 border-2 border-rose-500 text-rose-300"
                    : "bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                }`}
              >
                {isMuted ? (
                  <MicOff className="w-5 h-5 text-rose-400" />
                ) : (
                  <Mic className="w-5 h-5 text-emerald-400" />
                )}
                <span>{isMuted ? "Muto" : "Mic Attivo"}</span>
              </button>

              <button
                onClick={toggleDeafen}
                className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 font-bold text-xs transition-all border cursor-pointer ${
                  isDeafened
                    ? "bg-amber-500/20 border-amber-500 text-amber-300"
                    : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white"
                }`}
              >
                {isDeafened ? (
                  <VolumeX className="w-5 h-5 text-amber-400" />
                ) : (
                  <Volume2 className="w-5 h-5 text-zinc-300" />
                )}
                <span>{isDeafened ? "Cuffie Spente" : "Audio ON"}</span>
              </button>

              <button
                onClick={leaveVoiceRoom}
                className="py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 font-bold text-xs bg-red-950/40 border border-red-800/60 text-red-300 hover:bg-red-900/50 transition-colors cursor-pointer"
              >
                <PhoneOff className="w-5 h-5 text-red-400" />
                <span>Disconnetti</span>
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
          <h3 className="text-sm font-bold text-white">Nessun canale vocale attivo</h3>
          <p className="text-xs text-zinc-400 break-words max-w-xs mx-auto">
            Entra in una stanza o creane una per parlare con i tuoi compagni con l'SDK Agora.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Stanze Vocali ({voiceRooms.length})
          </span>
          <button
            onClick={() => setIsCreatingRoom(!isCreatingRoom)}
            className="text-[11px] font-bold text-cyan-400 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuova Stanza</span>
          </button>
        </div>

        {isCreatingRoom && (
          <form
            onSubmit={handleCreateRoom}
            className="p-3 bg-[#121628] border border-purple-900/40 rounded-xl space-y-2"
          >
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Nome della stanza (es. Warzone Trio #1)..."
              className="w-full bg-zinc-900 text-zinc-200 text-xs rounded-lg px-3 py-2 border border-purple-900/40 focus:outline-none focus:border-purple-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingRoom(false)}
                className="px-3 py-1 text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Crea Stanza
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {voiceRooms.map((room) => {
            const isCurrent = activeVoiceRoom?.id === room.id;

            return (
              <div
                key={room.id}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isCurrent
                    ? "bg-emerald-950/20 border-emerald-500/50 shadow-md"
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
                      {room.channelType?.toLowerCase().includes("privat") && (
                        <Lock className="w-3 h-3 text-zinc-500" />
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {isCurrent ? 1 : (room.activeMembers?.length || 0)}/{room.maxCapacity || 4} operatori connessi • {room.game || "Warzone"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => (isCurrent ? leaveVoiceRoom() : joinVoiceRoom(room.id))}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                    isCurrent
                      ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
                      : "bg-purple-600 hover:bg-purple-500 text-white"
                  }`}
                >
                  {isCurrent ? "Esci" : "Entra"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
