import React, { useState, useRef } from "react";
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
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export const MatchRoomTab: React.FC = () => {
  const {
    selectedTournament,
    setTournamentSubTab,
    matchChat,
    sendMatchMessage,
    aiScanStatus,
    aiScanImage,
    aiScanResult,
    startAiKillScan,
    resetAiKillScan,
    userProfile,
  } = useSquad();

  const [chatInput, setChatInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMatchMessage(chatInput.trim());
    setChatInput("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      startAiKillScan(file);
    }
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
              className="py-2.5 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-all shadow-md"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Scegli un Torneo</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE MATCH ROOM VIEW
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
            <span className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              IA Attiva
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-300 bg-zinc-900/50 rounded-xl p-2.5 border border-zinc-800">
          <span>Tuo Giocatore: <strong>{userProfile.name}</strong></span>
          <span className="text-purple-400 font-medium">Formato: {selectedTournament.mode}</span>
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
              Carica lo screenshot del tabellone di fine partita. L'IA convalida kill e piazzamento effettivi.
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
        {aiScanStatus === "idle" && (
          <div className="space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/30 rounded-xl p-6 text-center cursor-pointer transition-all group"
            >
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-zinc-200 block">
                Seleziona o scatta lo screenshot del match
              </span>
              <span className="text-[10px] text-zinc-400 mt-1 block">
                Supporta JPG, PNG • Verifica OCR tabellone
              </span>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
            >
              <Sparkles className="w-4 h-4 text-cyan-200" />
              Carica Immagine Scoreboard
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
                  ? "Caricamento screenshot in corso..."
                  : "Analisi OCR del tabellone in corso..."}
              </span>
              <span className="text-[11px] text-cyan-300/80 block mt-1">
                Scansione grafica dei valori di kill e piazzamento...
              </span>
            </div>

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
                  ANALISI COMPLETATA
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200 border border-emerald-500/40">
                Verificato
              </span>
            </div>

            {aiScanImage && (
              <div className="w-full h-36 rounded-xl overflow-hidden bg-black/50 border border-emerald-500/30">
                <img src={aiScanImage} alt="Uploaded match scoreboard" className="w-full h-full object-contain" />
              </div>
            )}

            <p className="text-xs text-zinc-300 leading-relaxed break-words">
              {aiScanResult.notes}
            </p>

            <button
              onClick={resetAiKillScan}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-zinc-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Carica Altro Screenshot
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
              Chat della Stanza Match
            </h3>
          </div>
          <span className="text-[10px] text-zinc-400">Canale Ufficiale</span>
        </div>

        {/* Chat Messages Log */}
        {matchChat.length > 0 ? (
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
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
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-zinc-400">
            Nessun messaggio nella stanza match. Invia un messaggio per coordinarti con gli altri partecipanti.
          </div>
        )}

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
            className="p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </section>
    </div>
  );
};
