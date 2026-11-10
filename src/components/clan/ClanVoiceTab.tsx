import React, { useState, useEffect } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneCall,
  PhoneOff,
  Radio,
  Users,
  Shield,
  Sparkles,
  Wifi,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { ClanData, ClanMember } from "@/data/mockData";
import { toast } from "@/components/ui/use-toast";
import { agoraVoiceService } from "@/services/agoraService";

interface ClanVoiceTabProps {
  clanData: ClanData;
  clanMembers: ClanMember[];
  currentUser: any;
}

export const ClanVoiceTab: React.FC<ClanVoiceTabProps> = ({
  clanData,
  clanMembers,
  currentUser,
}) => {
  const {
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen,
    userSpeaking,
    userProfile,
    agoraAppId,
    activeVoiceRoomId,
    leaveVoiceRoom,
  } = useSquad();

  const clanChannelName = `Clan_${clanData.tag}_${clanData.id.slice(0, 8)}`;
  const [isConnected, setIsConnected] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [remoteCount, setRemoteCount] = useState(0);

  const [activeParticipants, setActiveParticipants] = useState<
    { id: string; name: string; avatar?: string; isSpeaking: boolean; role?: string }[]
  >([]);

  useEffect(() => {
    const sanitized = clanChannelName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
    if (agoraVoiceService.getCurrentChannel() === sanitized) {
      setIsConnected(true);
      setRemoteCount(agoraVoiceService.getConnectedUsersCount());
    }

    agoraVoiceService.onRemoteUserChange((count) => {
      setRemoteCount(count);
    });

    return () => {
      agoraVoiceService.onRemoteUserChange((count) => {
        setRemoteCount(count);
      });
    };
  }, [clanChannelName]);

  useEffect(() => {
    if (isConnected && currentUser) {
      setActiveParticipants([
        {
          id: currentUser.id,
          name: userProfile.name,
          avatar: userProfile.avatar,
          isSpeaking: userSpeaking,
          role: clanData.ownerId === currentUser.id ? "Leader" : "Membro",
        },
      ]);
    } else {
      setActiveParticipants([]);
    }
  }, [isConnected, currentUser, userSpeaking, userProfile, clanData.ownerId]);

  const handleJoinClanVoice = async () => {
    if (!currentUser) {
      toast({
        title: "Accesso Richiesto",
        description: "Accedi o registrati per entrare nella stanza vocale del clan.",
        variant: "destructive",
      });
      return;
    }

    // Controllo preventivo permessi audio e disponibilità microfono
    const micCheck = await agoraVoiceService.checkMicrophonePermission();
    if (!micCheck.granted) {
      toast({
        title: "Microfono Richiesto 🎙️",
        description: micCheck.error || "È necessario consentire l'accesso al microfono per entrare nella chat vocale del clan.",
        variant: "destructive",
      });
      return;
    }

    // Single instance: disconnect from standard squad room first if connected
    if (activeVoiceRoomId) {
      toast({
        title: "Cambio Stanza Vocale",
        description: "Disconnessione dalla stanza vocale della lobby per entrare nella vocale del clan...",
      });
      await leaveVoiceRoom();
    }

    setIsJoining(true);
    try {
      const res = await agoraVoiceService.joinVoiceChannel(clanChannelName, currentUser.id);
      if (res.success) {
        setIsConnected(true);
        toast({
          title: "Canale Vocale Clan Connesso 🎙️",
          description: `Sei ora in voce con i membri del clan [${clanData.tag}] con tecnologia Agora RTC.`,
        });
      } else {
        throw new Error(res.error || "Impossibile connettersi al canale Agora.");
      }
    } catch (err: any) {
      console.error("[ClanVoiceTab] Errore connessione Agora:", err);
      toast({
        title: "Errore Connessione Vocale",
        description: err.message || "Impossibile collegarsi al canale Agora del clan.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveClanVoice = async () => {
    try {
      await agoraVoiceService.leaveVoiceChannel();
      setIsConnected(false);
      toast({
        title: "Disconnesso dalla Vocale Clan",
        description: "Hai lasciato la stanza vocale riservata del clan.",
      });
    } catch (err) {
      console.error("[ClanVoiceTab] Errore disconnessione:", err);
    }
  };

  return (
    <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-xl space-y-4">
      <div className="relative rounded-2xl p-4 bg-gradient-to-r from-purple-950/80 via-[#151a32] to-cyan-950/50 border border-purple-500/30 overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isConnected
                  ? "bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse"
                  : "bg-purple-900/50 border border-purple-500/40 text-purple-300"
              }`}
            >
              <Radio className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-white tracking-wide">
                  Stanza Vocale Clan [{clanData.tag}]
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  Agora RTC
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {isConnected
                  ? "Audio attivo • Bassa latenza 24ms • Eco cancellato"
                  : "Canale vocale ad alta fedeltà esclusivo per i membri del clan"}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            {isConnected ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                CONNESSO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-bold">
                STANDBY
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-2">
          {!isConnected ? (
            <button
              onClick={handleJoinClanVoice}
              disabled={isJoining}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{isJoining ? "Connessione in corso..." : "Entra nella Vocale del Clan"}</span>
            </button>
          ) : (
            <div className="w-full flex items-center justify-between gap-2">
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
                  <span>{isMuted ? "Mutato" : "Attivo"}</span>
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
                  <span>{isDeafened ? "Cuffie Off" : "Audio On"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleLeaveClanVoice}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Esci</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            Membri in Canale ({activeParticipants.length})
          </span>
          {isConnected && (
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              Canale Protetto
            </span>
          )}
        </div>

        {activeParticipants.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {activeParticipants.map((p) => (
              <div
                key={p.id}
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                  p.isSpeaking && !isMuted
                    ? "bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : "bg-[#14182e] border-zinc-800"
                }`}
              >
                <div className="relative shrink-0">
                  {p.avatar ? (
                    <img
                      src={p.avatar}
                      alt={p.name}
                      className="w-8 h-8 rounded-lg object-cover border border-purple-500/40"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-purple-950 text-purple-300 font-bold text-xs flex items-center justify-center border border-purple-700/40">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {p.isSpeaking && !isMuted && (
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black animate-ping" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-white block truncate">{p.name}</span>
                  <span className="text-[10px] text-zinc-400 block truncate">
                    {p.role || "Operatore"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-[#14182e]/80 border border-zinc-800/70 text-center space-y-1.5">
            <p className="text-xs text-zinc-300 font-semibold">Nessun membro attualmente connesso</p>
            <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
              Premi il pulsante sopra per iniziare la trasmissione vocale crittografata con il tuo clan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
