import React, { useState } from "react";
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
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export const MatchRoomTab: React.FC = () => {
  const {
    matchChat,
    sendMatchMessage,
    aiScanStatus,
    aiScanImage,
    aiScanResult,
    startAiKillScan,
    resetAiKillScan,
  } = useSquad();

  const [chatInput, setChatInput] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMatchMessage(chatInput.trim());
    setChatInput("");
  };

  const handleQuickChat = (text: string) => {
    sendMatchMessage(text);
  };

  return (
    <div className="space-y-4">
      {/* Match Header Card */}
      <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-md">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                LIVE MATCH #WZ-884
              </span>
              <span className="text-[10px] text-zinc-400">Warzone Trios</span>
            </div>
            <h3 className="text-sm font-bold text-white mt-1 truncate">
              CyberReapers [NXP] <span className="text-cyan-400">vs</span> Vortex Gaming [VTX]
            </h3>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-zinc-400 block">Stato Arbitrale</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              IA Attiva
            </span>
          </div>
        </div>

        {/* Versus Teams Details */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-purple-950/30 border border-purple-800/30 rounded-xl p-2.5">
            <span className="text-[10px] font-bold text-purple-300 uppercase block mb-1">
              Il Tuo Team
            </span>
            <span className="font-extrabold text-white block truncate">
              CyberReapers
            </span>
            <span className="text-[11px] text-zinc-400">3/3 Giocatori Connessi</span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
              Team Avversario
            </span>
            <span className="font-extrabold text-zinc-200 block truncate">
              Vortex Gaming
            </span>
            <span className="text-[11px] text-zinc-400">3/3 Giocatori Connessi</span>
          </div>
        </div>
      </div>

      {/* ISOLATED SECTION 1: AI KILL SCREENSHOT VERIFIER */}
      <section
        aria-label="Verifica Screenshot Kill IA"
        className="bg-gradient-to-b from-[#141a33] to-[#0e1324] border-2 border-cyan-500/40 rounded-2xl p-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-[10px] font-bold text-cyan-300 uppercase tracking-wider mb-1">
              <Cpu className="w-3 h-3 text-cyan-400 animate-pulse" />
              Arbitro Digitale IA
            </div>
            <h3 className="text-sm font-extrabold text-white">
              Verifica Kill & Score Screenshot
            </h3>
            <p className="text-[11px] text-zinc-300 mt-0.5 break-words">
              Carica lo screenshot del tabellone di fine partita. L'algoritmo OCR convalida kill e assegna i punti ufficiali.
            </p>
          </div>
        </div>

        {/* State: IDLE */}
        {aiScanStatus === "idle" && (
          <div className="space-y-3">
            <div
              onClick={() => startAiKillScan()}
              className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/30 rounded-xl p-5 text-center cursor-pointer transition-all group"
            >
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-zinc-200 block">
                Tocca per caricare lo screenshot di vittoria/kill
              </span>
              <span className="text-[10px] text-zinc-400 mt-1 block">
                Supporta JPG, PNG fino a 15MB • Rilevamento OCR automatico
              </span>
            </div>

            <button
              onClick={() => startAiKillScan()}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
            >
              <Sparkles className="w-4 h-4 text-cyan-200" />
              Simula Scansione Screenshot Kill (19 Kill - Top 1)
            </button>
          </div>
        )}

        {/* State: UPLOADING or ANALYZING */}
        {(aiScanStatus === "uploading" || aiScanStatus === "analyzing") && (
          <div className="bg-zinc-950/80 border border-cyan-500/30 rounded-xl p-5 text-center space-y-3">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
              <Cpu className="w-5 h-5 text-cyan-300 absolute inset-0 m-auto animate-pulse" />
            </div>

            <div>
              <span className="text-xs font-bold text-white block">
                {aiScanStatus === "uploading"
                  ? "Caricamento immagine ad alta risoluzione..."
                  : "Scansione Neurale OCR in corso..."}
              </span>
              <span className="text-[11px] text-cyan-300/80 block mt-1">
                Verifica watermark match, conteggio eliminazioni e danni squadra...
              </span>
            </div>

            {/* Simulated OCR progress bar */}
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-700 ${
                  aiScanStatus === "uploading" ? "w-1/3" : "w-5/6"
                }`}
              />
            </div>
          </div>
        )}

        {/* State: VERIFIED */}
        {aiScanStatus === "verified" && aiScanResult && (
          <div className="bg-emerald-950/30 border border-emerald-500/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-extrabold text-emerald-300">
                  RISULTATO VALIDATO CON SUCCESSO
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200 border border-emerald-500/40">
                Confidenza {aiScanResult.confidence}%
              </span>
            </div>

            {/* Stat Cards Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-2">
                <div className="flex items-center justify-center gap-1 text-purple-400 mb-0.5">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Kill Squadra</span>
                </div>
                <span className="text-base font-extrabold text-white">
                  {aiScanResult.kills} Kill
                </span>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-2">
                <div className="flex items-center justify-center gap-1 text-rose-400 mb-0.5">
                  <Flame className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Danno Rilevato</span>
                </div>
                <span className="text-base font-extrabold text-white">
                  {aiScanResult.damage.toLocaleString()} DMG
                </span>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-2">
                <div className="flex items-center justify-center gap-1 text-amber-400 mb-0.5">
                  <Award className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Piazzamento</span>
                </div>
                <span className="text-base font-extrabold text-emerald-400">
                  #{aiScanResult.placement} Vittoria
                </span>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-2">
                <div className="flex items-center justify-center gap-1 text-cyan-400 mb-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Punti Torneo</span>
                </div>
                <span className="text-base font-extrabold text-cyan-300">
                  +{aiScanResult.pointsEarned} Punti
                </span>
              </div>
            </div>

            {/* Wallet Reward Announcement */}
            <div className="p-2.5 bg-gradient-to-r from-amber-500/10 to-purple-600/10 border border-amber-500/40 rounded-lg flex items-center justify-between text-xs">
              <span className="text-amber-200 font-semibold truncate">
                Premio accreditato al tuo Wallet:
              </span>
              <span className="font-extrabold text-amber-400 shrink-0">
                +{aiScanResult.sCoinReward} SCoin
              </span>
            </div>

            <button
              onClick={resetAiKillScan}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-zinc-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Carica Nuovo Screenshot per il Round Successivo
            </button>
          </div>
        )}
      </section>

      {/* ISOLATED SECTION 2: MATCH ROOM CHAT */}
      <section
        aria-label="Chat della Stanza Match"
        className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-md space-y-3"
      >
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Chat Ufficiale di Match
            </h3>
          </div>
          <span className="text-[10px] text-zinc-400">Canale Criptato SquadUP</span>
        </div>

        {/* Quick Chat Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {["Lobby pronta ✅", "Score inviato all'IA 📸", "GG a tutti! 🔥", "Riavvio host 🔄"].map(
            (quickText) => (
              <button
                key={quickText}
                onClick={() => handleQuickChat(quickText)}
                className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 shrink-0 transition-colors"
              >
                {quickText}
              </button>
            )
          )}
        </div>

        {/* Chat Messages Log */}
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          {matchChat.map((msg) => (
            <div
              key={msg.id}
              className={`p-2.5 rounded-xl text-xs space-y-1 ${
                msg.isReferee
                  ? "bg-cyan-950/40 border border-cyan-500/40"
                  : msg.isCaptain
                  ? "bg-purple-950/30 border border-purple-800/40"
                  : "bg-zinc-900/80 border border-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-bold truncate max-w-[130px] ${
                      msg.isReferee
                        ? "text-cyan-400"
                        : msg.isCaptain
                        ? "text-purple-300"
                        : "text-zinc-200"
                    }`}
                  >
                    {msg.sender}
                  </span>
                  <span className="text-[9px] font-semibold px-1 rounded bg-black/40 text-zinc-400">
                    {msg.team}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500">{msg.time}</span>
              </div>
              <p className="text-zinc-300 text-xs leading-relaxed break-words">
                {msg.text}
              </p>
            </div>
          ))}
        </div>

        {/* Chat input */}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Scrivi al team avversario o all'arbitro..."
            className="flex-1 bg-zinc-900 text-zinc-200 text-xs rounded-xl px-3 py-2 border border-purple-900/40 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </section>
    </div>
  );
};
