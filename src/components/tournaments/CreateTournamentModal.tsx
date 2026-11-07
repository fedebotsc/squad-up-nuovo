import React, { useState } from "react";
import {
  X,
  Trophy,
  Swords,
  Calendar,
  Users,
  Coins,
  ShieldAlert,
  Loader2,
  Sparkles,
  FileText,
  Target,
  Sliders,
  User,
  Clock,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const GAME_MODES = [
  "Warzone Ritorno (Resurgence)",
  "Warzone Battle Royale",
  "MW3 Cerca e Distruggi (S&D)",
  "MW3 CDL Variante Competitiva",
  "Black Ops 6 Gunfight 2v2",
];

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, userProfile, openAuthModal } = useSquad();

  // Basic Tournament Info
  const [title, setTitle] = useState("");
  const [tournamentType, setTournamentType] = useState<"teams" | "solo">("teams");
  const [gameMode, setGameMode] = useState(GAME_MODES[0]);
  const [teamLimit, setTeamLimit] = useState<number>(10);
  const [entryFeeSC, setEntryFeeSC] = useState<number>(0);
  const [prizeDescription, setPrizeDescription] = useState("1.000 SCoin + Badge Campioni");
  const [rules, setRules] = useState(
    "1. Carica gli screenshot del posizionamento e delle kill nella Stanza Match entro 15 minuti dal termine.\n2. Vietato l'uso di hack o exploit.\n3. Squad composta da operatori registrati."
  );

  // Free 24h Date & Time
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [startHour, setStartHour] = useState("21:00");

  // Advanced Scoring Configuration
  const [killPoints, setKillPoints] = useState<number>(1);
  const [points1st, setPoints1st] = useState<number>(15);
  const [points2nd, setPoints2nd] = useState<number>(10);
  const [points3rd, setPoints3rd] = useState<number>(7);
  const [points4th, setPoints4th] = useState<number>(5);
  const [points5th, setPoints5th] = useState<number>(3);
  const [pointsTop10, setPointsTop10] = useState<number>(1);

  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Titolo richiesto",
        description: "Inserisci un nome per il torneo.",
        variant: "destructive",
      });
      return;
    }

    const numTeams = Number(teamLimit);
    if (isNaN(numTeams) || numTeams < 2) {
      toast({
        title: "Numero partecipanti non valido",
        description: "Inserisci almeno 2 squadre o giocatori.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Assemble full timestamp from date + 24h hour
      const fullDateStr = `${startDate}T${startHour}:00`;
      const parsedStartsAt = new Date(fullDateStr).toISOString();

      const leaderboardSettings = {
        format: tournamentType,
        kill_points: Number(killPoints) || 1,
        placement_points: {
          "1": Number(points1st) || 15,
          "2": Number(points2nd) || 10,
          "3": Number(points3rd) || 7,
          "4": Number(points4th) || 5,
          "5": Number(points5th) || 3,
          top10: Number(pointsTop10) || 1,
        },
      };

      // 1. Insert into public.tournaments
      const { data: newTournament, error: tournErr } = await supabase
        .from("tournaments")
        .insert({
          name: title.trim(),
          game_mode: `${gameMode} (${tournamentType === "solo" ? "Singolo" : "A Squadre"})`,
          starts_at: parsedStartsAt,
          team_limit: numTeams,
          prize_description: prizeDescription.trim(),
          rules: rules.trim(),
          entry_fee_sc: Number(entryFeeSC) || 0,
          creation_cost_sc: 0,
          owner_id: currentUser.id,
          owner_name: userProfile.name,
          leaderboard_settings: leaderboardSettings,
          status: "upcoming",
          bracket: [],
          teams: [],
          matches: [],
        })
        .select()
        .single();

      if (tournErr) throw tournErr;

      // 2. Automatically create match chat room for this tournament
      if (newTournament) {
        await supabase.from("tournament_match_chats").insert({
          tournament_id: newTournament.id,
          team_id: "general",
          room_name: `Stanza Arbitraggio & Match: ${newTournament.name}`,
        });

        // 3. Insert initial tournament leaderboard entry for the organizer squad
        await supabase.from("tournament_leaderboards").insert({
          tournament_id: newTournament.id,
          team_id: `team_${currentUser.id.slice(0, 6)}`,
          team_name: userProfile.clanTag
            ? `[${userProfile.clanTag}] ${userProfile.name}`
            : `${userProfile.name}'s Squad`,
          total_kills: 0,
          total_score: 0,
          matches_played: 0,
        });
      }

      toast({
        title: "Torneo Pubblicato con Successo! 🏆",
        description: `"${title}" (${tournamentType === "solo" ? "Singolo" : "Squadre"}, ${numTeams} posti) è ora attivo nella lobby.`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("[CreateTournament] Errore salvataggio:", err);
      toast({
        title: "Errore durante la creazione",
        description: err.message || "Impossibile salvare il torneo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-[#0f1322] border border-purple-500/40 p-4 sm:p-5 shadow-[0_0_40px_rgba(139,92,246,0.3)] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Ambient Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-24 bg-gradient-to-r from-purple-600/30 via-cyan-500/20 to-amber-500/20 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-900 transition-colors z-10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center pb-3 border-b border-zinc-800">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-[10px] font-extrabold text-purple-300 uppercase tracking-wider mb-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Organizza Competizione
          </div>
          <h3 className="text-base font-extrabold text-white">Crea Nuovo Torneo</h3>
          <p className="text-[11px] text-zinc-400">
            Imposta regole personalizzate, orario libero e punteggio IA per i partecipanti
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3.5 py-3 pr-1 text-xs">
          {/* Format: Solo vs Teams */}
          <div>
            <label className="text-[11px] font-bold text-zinc-300 block mb-1.5">
              Modalità Partecipazione
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTournamentType("teams")}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  tournamentType === "teams"
                    ? "border-purple-500 bg-purple-950/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Users className="w-4 h-4 text-purple-400" />
                <span>A Squadre (Team)</span>
              </button>

              <button
                type="button"
                onClick={() => setTournamentType("solo")}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  tournamentType === "solo"
                    ? "border-cyan-500 bg-cyan-950/50 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <User className="w-4 h-4 text-cyan-400" />
                <span>Singolo (Solo / 1v1)</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-[11px] font-bold text-zinc-300 block mb-1">
              Nome Torneo *
            </label>
            <input
              type="text"
              required
              placeholder="es. Warzone Elite Cup #4, Summer Championship..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#121628] border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 text-xs"
            />
          </div>

          {/* Game Mode */}
          <div>
            <label className="text-[11px] font-bold text-zinc-300 block mb-1">
              Gioco / Modalità
            </label>
            <select
              value={gameMode}
              onChange={(e) => setGameMode(e.target.value)}
              className="w-full bg-[#121628] border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-xs cursor-pointer"
            >
              {GAME_MODES.map((mode) => (
                <option key={mode} value={mode} className="bg-zinc-900 text-white">
                  {mode}
                </option>
              ))}
            </select>
          </div>

          {/* Free Number of Teams Input (No rigid limits) */}
          <div className="bg-[#121629] p-3 rounded-2xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>Numero {tournamentType === "solo" ? "Giocatori" : "Squadre"} (Libero)</span>
              </label>
              <span className="text-[10px] text-zinc-400">Qualsiasi valore (min. 2)</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={2}
                max={500}
                value={teamLimit}
                onChange={(e) => setTeamLimit(Math.max(2, parseInt(e.target.value) || 2))}
                className="w-24 bg-zinc-900 border border-purple-500/40 rounded-xl px-3 py-2 text-white font-extrabold text-sm focus:outline-none focus:border-purple-400 text-center"
              />

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1 flex-1">
                {[4, 7, 10, 12, 15, 20, 32].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTeamLimit(preset)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      teamLimit === preset
                        ? "bg-purple-600 border-purple-400 text-white"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Free 24h Date & Time Selection (00:00 - 24:00) */}
          <div className="bg-[#121629] p-3 rounded-2xl border border-zinc-800 space-y-2">
            <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Data e Orario di Inizio (Formato 24 Ore Libero)</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-zinc-400 block mb-0.5">Giorno Torneo</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-purple-500 text-xs"
                />
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 block mb-0.5">Orario (00:00 - 24:00)</span>
                <input
                  type="time"
                  step="300"
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-purple-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Entry Fee & Prize */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                Entry Fee (SCoin)
              </label>
              <input
                type="number"
                min={0}
                step={50}
                placeholder="0 = Gratuito"
                value={entryFeeSC}
                onChange={(e) => setEntryFeeSC(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-[#121628] border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                Montepremi (Descrizione)
              </label>
              <input
                type="text"
                placeholder="es. 1.000 SCoin + Badge"
                value={prizeDescription}
                onChange={(e) => setPrizeDescription(e.target.value)}
                className="w-full bg-[#121628] border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 text-xs"
              />
            </div>
          </div>

          {/* Advanced Points Configuration (Kill + 1°, 2°, 3°, 4°, 5°, Top 10) */}
          <div className="bg-[#121629] p-3 rounded-2xl border border-purple-900/40 space-y-2.5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
              <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-purple-400" />
                Punteggi Avanzati IA & Piazzamento
              </span>
              <span className="text-[10px] text-zinc-400">Punti assegnati</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-zinc-400 block mb-0.5">Punti per Kill</span>
                <input
                  type="number"
                  min={1}
                  value={killPoints}
                  onChange={(e) => setKillPoints(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-white text-center font-bold text-xs"
                />
              </div>

              <div>
                <span className="text-[10px] text-amber-400 block mb-0.5">1° Posto (Win)</span>
                <input
                  type="number"
                  min={1}
                  value={points1st}
                  onChange={(e) => setPoints1st(Math.max(1, parseInt(e.target.value) || 15))}
                  className="w-full bg-zinc-900 border border-amber-500/40 rounded-xl px-2 py-1.5 text-amber-300 text-center font-black text-xs"
                />
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 block mb-0.5">2° Posto</span>
                <input
                  type="number"
                  min={0}
                  value={points2nd}
                  onChange={(e) => setPoints2nd(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-white text-center font-bold text-xs"
                />
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 block mb-0.5">3° Posto</span>
                <input
                  type="number"
                  min={0}
                  value={points3rd}
                  onChange={(e) => setPoints3rd(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-white text-center font-bold text-xs"
                />
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 block mb-0.5">4° Posto</span>
                <input
                  type="number"
                  min={0}
                  value={points4th}
                  onChange={(e) => setPoints4th(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-white text-center font-bold text-xs"
                />
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 block mb-0.5">5° Posto (Top 5)</span>
                <input
                  type="number"
                  min={0}
                  value={points5th}
                  onChange={(e) => setPoints5th(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-white text-center font-bold text-xs"
                />
              </div>
            </div>
          </div>

          {/* Rules Text */}
          <div>
            <label className="text-[11px] font-bold text-zinc-300 block mb-1">
              Regolamento del Torneo
            </label>
            <textarea
              rows={3}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              className="w-full bg-[#121628] border border-zinc-800 rounded-xl p-2.5 text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-purple-500 text-xs"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Pubblicazione in corso...</span>
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4 text-amber-300" />
                <span>Pubblica Torneo Ufficiale</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
