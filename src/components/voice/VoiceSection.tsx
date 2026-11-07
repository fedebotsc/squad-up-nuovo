import React, { useState } from "react";
import { useSquad } from "@/context/SquadContext";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Signal,
  Radio,
  Headphones,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export const VoiceSection: React.FC = () => {
  const {
    voiceRooms,
    activeVoiceRoomId,
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen,
    joinVoiceRoom,
    leaveVoiceRoom,
  } = useSquad();

  const [noiseSuppression, setNoiseSuppression] = useState(true);

  const currentRoom = voiceRooms.find((r) => r.id === activeVoiceRoomId);

  const toggleNoiseSuppression = () => {
    setNoiseSuppression(!noiseSuppression);
    toast({
      title: !noiseSuppression ? "Cancellazione Rumore IA Attiva" : "Cancellazione Rumore Disattivata",
      description: "Filtro rumori tastiera e respiro Agora RTC.",
    });
  };

  return (
    <div className="pb-24 pt-2 max-w-md mx-auto px-3.5 space-y-4">
      {/* Agora Engine Banner */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-zinc-200">
            AGORA LOW-LATENCY VOICE
          </span>
        </div>
        <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full">
          Opus HD • 64kbps
        </span>
      </div>

      {/* Main Active Room or Disconnected View */}
      {currentRoom ? (
        <div className="bg-[#121628]/95 border-2 border-purple-500/50 rounded-2xl p-4 shadow-[0_0_25px_rgba(139,92,246,0.2)] space-y-4">
          {/* Room Title & Connection Status */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="min-w-0">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-600/40 uppercase">
                {currentRoom.channelType}
              </span>
              <h3 className="text-base font-extrabold text-white mt-1 truncate">
                {currentRoom.name}
              </h3>
              <p className="text-[11px] text-zinc-400 truncate">{currentRoom.game}</p>
            </div>

            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold justify-end">
                <Signal className="w-3.5 h-3.5" />
                <span>21ms</span>
              </div>
              <span className="text-[10px] text-zinc-400">Audio Spaziale 3D</span>
            </div>
          </div>

          {/* Connected Squad Members Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
              <span>Membri nel canale ({currentRoom.activeMembers.length}/{currentRoom.maxCapacity})</span>
              <span className="text-[10px] text-purple-400">Microfoni Stereo</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {currentRoom.activeMembers.map((member) => {
                const isUser = member.id === "vm-1";
                const isUserMuted = isUser ? isMuted : member.isMuted;
                const isSpeaking = isUser ? !isMuted && member.isSpeaking : member.isSpeaking;

                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isSpeaking
                        ? "bg-gradient-to-r from-purple-950/50 via-[#151c36] to-cyan-950/30 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                        : "bg-zinc-900/70 border-zinc-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar with speaking wave ring */}
                      <div className="relative shrink-0">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className={`w-10 h-10 rounded-xl object-cover border-2 transition-all ${
                            isSpeaking
                              ? "border-cyan-400 scale-105"
                              : "border-zinc-700"
                          }`}
                        />
                        {isSpeaking && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 flex items-center justify-center animate-ping" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate max-w-[120px]">
                            {member.name}
                          </span>
                          <span className="text-[9px] font-semibold px-1 rounded bg-purple-950 text-purple-300 border border-purple-800/50 shrink-0">
                            {member.role}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                          {isSpeaking ? (
                            <span className="text-cyan-400 font-semibold flex items-center gap-1">
                              <Radio className="w-2.5 h-2.5 animate-spin" />
                              Sta parlando...
                            </span>
                          ) : (
                            <span>In ascolto • {member.ping}ms</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Member Audio Icon */}
                    <div className="shrink-0">
                      {isUserMuted ? (
                        <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                          <MicOff className="w-4 h-4" />
                        </div>
                      ) : isSpeaking ? (
                        <div className="flex items-center gap-0.5 h-4">
                          <span className="w-1 bg-cyan-400 rounded-full h-2 animate-bounce" />
                          <span className="w-1 bg-cyan-400 rounded-full h-4 animate-bounce delay-75" />
                          <span className="w-1 bg-cyan-400 rounded-full h-3 animate-bounce delay-150" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400">
                          <Mic className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* VISIBLE MICROPHONE & AUDIO CONTROLS (PROMINENT & CLEAN) */}
          <div className="pt-2 border-t border-zinc-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2 px-1">
              Comandi Vocali Rapidi
            </span>

            <div className="grid grid-cols-3 gap-2">
              {/* Mic Toggle Button */}
              <button
                onClick={toggleMute}
                className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 font-bold text-xs transition-all shadow-md ${
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
                <span>{isMuted ? "Muto (Disattivo)" : "Mic Attivo"}</span>
              </button>

              {/* Deafen Toggle Button */}
              <button
                onClick={toggleDeafen}
                className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 font-bold text-xs transition-all border ${
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

              {/* Leave Room Button */}
              <button
                onClick={leaveVoiceRoom}
                className="py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 font-bold text-xs bg-red-950/40 border border-red-800/60 text-red-300 hover:bg-red-900/50 transition-colors"
              >
                <PhoneOff className="w-5 h-5 text-red-400" />
                <span>Disconnetti</span>
              </button>
            </div>

            {/* Noise suppression toggle */}
            <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="font-bold text-white block">Cancellazione Rumore IA</span>
                  <span className="text-[10px] text-zinc-400">Elimina click tastiera e rumori di fondo</span>
                </div>
              </div>
              <button
                onClick={toggleNoiseSuppression}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
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
        <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-6 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Headphones className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-white">Non sei in nessun canale vocale</h3>
          <p className="text-xs text-zinc-400 break-words max-w-xs mx-auto">
            Scegli una delle stanze di squadra qui sotto per comunicare in tempo reale con zero ritardo audio.
          </p>
        </div>
      )}

      {/* Available Voice Rooms List */}
      <div className="space-y-2.5">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1 block">
          Altre Stanze Vocali Disponibili
        </span>

        {voiceRooms.map((room) => {
          const isCurrent = room.id === activeVoiceRoomId;

          return (
            <div
              key={room.id}
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                isCurrent
                  ? "bg-purple-950/30 border-purple-500/50"
                  : "bg-[#121628]/80 border-purple-900/30 hover:border-purple-700/40"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate max-w-[150px]">
                    {room.name}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 rounded bg-zinc-800 text-zinc-300">
                    {room.activeMembers.length}/{room.maxCapacity}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 block truncate mt-0.5">
                  {room.game} • {room.channelType}
                </span>
              </div>

              <div>
                {isCurrent ? (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full">
                    Connesso
                  </span>
                ) : (
                  <button
                    onClick={() => joinVoiceRoom(room.id)}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                  >
                    Entra
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
