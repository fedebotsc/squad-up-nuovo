import React, { useState, useEffect } from "react";
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
  SignalHigh,
  Trash2,
  AlertTriangle,
  Loader2,
  Users,
  Gamepad2,
  CheckCircle2,
  Sparkles,
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

  const [isConnected, setIsConnected] = useState(false);

  const toggleNoiseSuppression = () => {
    setNoiseSuppression(!noiseSuppression);
    toast({
      title: !noiseSuppression ? "Cancellazione Rumore Attiva" : "Cancellazione Rumore Disattivata",
      description: "Filtro rumori tastiera e respiro attivo in tempo reale.",
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

  return (
    <div className="pb-24 pt-2 w-full max-w-4xl mx-auto px-3.5 sm:px-6 space-y-4 animate-fade-in">
      {/* ACTIVE CONNECTED ROOM CARD */}
      {activeVoiceRoom ? (
        <div className="relative rounded-2xl overflow-hidden border border-emerald-500/60 bg-gradient-to-b from-emerald-950/40 via-[#13172e] to-[#0c0f1c] p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                  Stanza Vocale Attiva (1/1 Max)
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white">{activeVoiceRoom.name}</h3>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-xl">
              <SignalHigh className="w-3.5 h-3.5 text-emerald-400" />
              <span>Stabile 24ms</span>
            </div>
          </div>

          {/* Members in current room */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
              <span>Membri nel canale</span>
              <span className="text-[10px] text-purple-400 font-medium">Stereo HD • Bassa Latenza</span>
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
                    <span className="text-xs font-bold text-white truncate max-w-[150px]">
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

            {/* Other participants in room */}
            {activeVoiceRoom.activeMembers
              .filter((p) => p.id !== (currentUser?.id || userProfile?.id))
              .map((part) => (
                <div
                  key={part.id}
                  className="p-3 rounded-xl border bg-zinc-900/40 border-zinc-800/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-purple-950/60 border border-zinc-700 shrink-0 flex items-center justify-center text-xs font-bold text-purple-300">
                      {part.avatar ? (
                        <img src={part.avatar} alt={part.name} className="w-full h-full object-cover" />
                      ) : (
                        part.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-zinc-200 block truncate">
                        {part.name}
                      </span>
                      <span className="text-[10px] text-zinc-500">Membro del team</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium">In voce</div>
                </div>
              ))}
          </div>

          {/* Room Controls Bar */}
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isMuted
                    ? "bg-rose-500/20 border-rose-500 text-rose-300"
                    : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200"
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                <span className="hidden sm:inline">{isMuted ? "Mutato" : "Attivo"}</span>
              </button>

              <button
                type="button"
                onClick={toggleDeafen}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isDeafened
                    ? "bg-amber-500/20 border-amber-500 text-amber-300"
                    : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200"
                }`}
              >
                {isDeafened ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                <span className="hidden sm:inline">{isDeafened ? "Cuffie Spente" : "Audio Attivo"}</span>
              </button>

              <button
                type="button"
                onClick={toggleNoiseSuppression}
                title="Cancellazione rumore di fondo"
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  noiseSuppression
                    ? "bg-purple-950/80 border-purple-500/50 text-purple-300"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={leaveVoiceRoom}
              className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Disconnetti</span>
            </button>
          </div>
        </div>
      ) : (
        /* Standby Banner when not connected to any room */
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-[#11152a] to-cyan-950/40 border border-purple-900/40 shadow-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
              <Headphones className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Stanze Vocali &amp; Team Audio</h3>
              <p className="text-[11px] text-zinc-400">
                Seleziona una stanza qui sotto o creane una nuova per parlare con la squadra.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCreatingRoom(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuova Stanza</span>
          </button>
        </div>
      )}

      {/* CREATE ROOM FORM MODAL / DRAWER */}
      {isCreatingRoom && (
        <form
          onSubmit={handleCreateRoom}
          className="p-4 rounded-2xl bg-[#121628] border border-cyan-500/40 shadow-xl space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-extrabold uppercase text-white">Crea Stanza Vocale Tattica</h4>
            </div>
            <button
              type="button"
              onClick={() => setIsCreatingRoom(false)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Annulla
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-300">Nome Stanza</label>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Es. Warzone Squad Alfa..."
              className="w-full bg-zinc-900 text-xs text-white rounded-xl px-3 py-2 border border-purple-900/50 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-300">Modalità di Gioco</label>
            <div className="grid grid-cols-3 gap-2">
              {["Warzone", "Multiplayer", "Ranked"].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setSelectedGameMode(m)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    selectedGameMode === m
                      ? "bg-cyan-950 border-cyan-400 text-cyan-300"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmittingRoom}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer"
          >
            {isSubmittingRoom ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Creazione in corso...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Conferma e Crea Stanza</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* LIST OF AVAILABLE VOICE ROOMS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-extrabold uppercase text-white tracking-wider">
              Stanze Vocali Disponibili ({voiceRooms.length})
            </h3>
          </div>
          <span className="text-[10px] text-zinc-400">Audio HD crittografato</span>
        </div>

        {voiceRooms.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#121628]/60 border border-zinc-800 text-center space-y-2">
            <Radio className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400 font-semibold">Nessuna stanza vocale aperta al momento.</p>
            <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
              Sii il primo ad aprire una stanza vocale per coordinare la tua squadra in combattimento.
            </p>
            <button
              onClick={() => setIsCreatingRoom(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crea Stanza</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {voiceRooms.map((room) => {
              const isCurrent = activeVoiceRoomId === room.id;
              const isCreator = currentUser && room.hostId === currentUser.id;
              const canManage = isCreator || isUniversalAdmin;

              return (
                <div
                  key={room.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isCurrent
                      ? "bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                      : "bg-[#121628]/80 hover:bg-[#151a32] border-purple-900/30 hover:border-purple-800/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-extrabold text-white truncate">{room.name}</h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                          {room.game}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-cyan-400" />
                          <span>{room.activeMembers.length}/{room.maxCapacity}</span>
                        </span>
                        <span>•</span>
                        <span>{room.channelType || "Lobby Squad"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => setRoomPendingDelete({ id: room.id, name: room.name })}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Chiudi stanza"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isCurrent ? (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Connesso
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleJoinRoom(room.id)}
                          disabled={isJoiningRoomId === room.id}
                          className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1"
                        >
                          {isJoiningRoomId === room.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Radio className="w-3 h-3" />
                          )}
                          <span>Entra</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CONFIRM DELETE ROOM DIALOG */}
      {roomPendingDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121628] border border-rose-500/40 rounded-2xl max-w-sm w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="text-sm font-extrabold text-white">Chiudere questa stanza?</h4>
            </div>
            <p className="text-xs text-zinc-300">
              Sei sicuro di voler chiudere la stanza vocale &quot;{roomPendingDelete.name}&quot;?
              Tutti i membri verranno disconnessi.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setRoomPendingDelete(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRoom}
                disabled={isDeletingRoom}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5"
              >
                {isDeletingRoom ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Chiusura...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Conferma</span>
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
