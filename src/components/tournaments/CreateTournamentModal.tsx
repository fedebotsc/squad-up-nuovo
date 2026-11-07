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
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, userProfile, openAuthModal } = useSquad();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState(
    "1. Screenshot finale obbligatorio inviato nella Stanza Match entro 15 minuti.\n2. Vietato l'uso di hack o glitch.\n3. Squad composta da operatori registrati."
  );
  const [gameMode, setGameMode] = useState("Warzone Ritorno");
  const [teamLimit, setTeamLimit] = useState(16);
  const [entryFeeSC, setEntryFeeSC] = useState(0);
  const [prizeDescription, setPrizeDescription] = useState("1.000 SCoin + Badge Campioni");
  const [killPoints, setKillPoints] = useState(1);
  const [winPoints, setWinPoints] = useState(15);
  const [startsAt, setStartsAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(21, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    if (!title.trim()) {
      toast({ title: "Titolo richiesto", description: "Inserisci un nome per il torneo.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const parsedStartsAt = new Date(startsAt).toISOString();
      const prizeNumericMatch = prizeDescription.match(/\d+[\d.,]*/);
      const prizePoolNum = prizeNumericMatch ? parseInt(prizeNumericMatch[0].replace(/\D/g, "")) : 500;

      const leaderboardSettings = {
        kill_points: Number(killPoints) || 1,
        placement_points: {
          "1": Number(winPoints) || 15,
          "2": Math.round(Number(winPoints) * 0.7),
          "3": Math.round(Number(winPoints) * 0.5),
          "top5": Math.round(Number(winPoints) * 0.25),
        },
      };

      // 1. Insert into public.tournaments
      const { data: newTournament, error: tournErr } = await supabase
        .from("tournaments")
        .insert({
          name: title.trim(),
          game_mode: gameMode,
          starts_at: parsedStartsAt,
          team_limit: Number(teamLimit) || 16,
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
          room_name: `Stanza Arbitraggio & Chat Match: ${newTournament.name}`,
        });

        // 3. Insert initial tournament leaderboard entry for the organizer squad
        await supabase.from("tournament_leaderboards").insert({
          tournament_id: newTournament.id,
          team_id: `team_${currentUser.id.slice(0, 6)}`,
          team_name: userProfile.clanTag ? `[${userProfile.clanTag}] Squad` : `${userProfile.name}'s Squad`,
          total_kills: 0,
          total_score: 0,
          matches_played: 0,
        });
      }

      toast({
        title: "🏆 Torneo Creato con Successo!",
        description: `"${title}" è ora aperto alle iscrizioni e salvato su Supabase.`,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("[CreateTournament] Errore creazione torneo:", err);
      toast({
        title: "Errore creazione torneo",
        description: err.message || "Impossibile salvare il torneo su Supabase.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0f1322] border border-purple-500/40 p-5 shadow-[0_0_35px_rgba(139,92,246,0.3)] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 bg-gradient-to-r from-purple-600/30 to-cyan-500/30 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center pb-2 border-b border-zinc-800">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/70 border border-purple-500/40 text-[10px] font-extrabold text-purple-300 uppercase tracking-wider mb-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Arena Competitiva
          </div>
          <h3 className="text-base font-extrabold text-white">Crea Nuovo Torneo</h3>
          <p className="text-[11px] text-zinc-400">
            Definisci regole, punteggio kill e montepremi per la community
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-3 text-xs">
          {/* Titolo Torneo */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Nome Torneo <span className="text-purple-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="es. Warzone Resurgence Series #1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none"
            />
          </div>

          {/* Modalità di Gioco & Limite Squadre */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">Modalità</label>
              <select
                value={gameMode}
                onChange={(e) => setGameMode(e.target.value)}
                className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl px-2.5 py-2 text-white focus:outline-none"
              >
                <option value="Warzone Ritorno">Warzone Ritorno</option>
                <option value="Warzone Battle Royale">Warzone Battle Royale</option>
                <option value="MW3 Search & Destroy">MW3 Search & Destroy</option>
                <option value="Multiplayer 4v4 CDL">Multiplayer 4v4 CDL</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">Squadre Max</label>
              <select
                value={teamLimit}
                onChange={(e) => setTeamLimit(Number(e.target.value))}
                className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl px-2.5 py-2 text-white focus:outline-none"
              >
                <option value={8}>8 Squadre</option>
                <option value={16}>16 Squadre</option>
                <option value={32}>32 Squadre</option>
                <option value={64}>64 Squadre</option>
              </select>
            </div>
          </div>

          {/* Data e Ora Inizio */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Data e Ora Inizio
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Regole Punteggio (Punti per Kill e Punti per Vittoria) */}
          <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2">
            <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5 uppercase">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              Sistema Punteggio (Arbitraggio IA)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-400 font-semibold block mb-0.5">
                  Punti per Kill
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={killPoints}
                  onChange={(e) => setKillPoints(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 font-semibold block mb-0.5">
                  Punti 1° Posto (Win)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={winPoints}
                  onChange={(e) => setWinPoints(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
            </div>
          </div>

          {/* Quota Iscrizione & Montepremi */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                Entry Fee (SCoin)
              </label>
              <input
                type="number"
                min={0}
                step={10}
                value={entryFeeSC}
                onChange={(e) => setEntryFeeSC(Number(e.target.value))}
                placeholder="0 = Gratuito"
                className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                Montepremi / Prize
              </label>
              <input
                type="text"
                value={prizeDescription}
                onChange={(e) => setPrizeDescription(e.target.value)}
                placeholder="es. 1.000 SCoin"
                className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          {/* Regolamento */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Regolamento & Note
            </label>
            <textarea
              rows={3}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              className="w-full bg-[#121629] border border-zinc-800 focus:border-purple-500 rounded-xl p-2.5 text-white placeholder-zinc-500 resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvataggio su Supabase...</span>
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4 text-amber-300" />
                <span>Pubblica Torneo</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
