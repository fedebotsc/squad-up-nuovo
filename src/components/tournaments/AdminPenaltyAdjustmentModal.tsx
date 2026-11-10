import React, { useState } from "react";
import {
  X,
  Scale,
  AlertTriangle,
  Plus,
  Minus,
  CheckCircle2,
  FileText,
  Shield,
  Clock,
  History,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  ChampionshipTeamProgress,
  applyAdminPointAdjustment,
} from "@/services/tournamentChampionshipService";

interface AdminPenaltyAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  team: ChampionshipTeamProgress | null;
  adminName: string;
  adminId: string;
  onSuccess?: () => void;
}

export const AdminPenaltyAdjustmentModal: React.FC<AdminPenaltyAdjustmentModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  team,
  adminName,
  adminId,
  onSuccess,
}) => {
  const [pointsDelta, setPointsDelta] = useState<number>(-5);
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !team) return null;

  const quickPresets = [
    { label: "-10 pt (Penalità Grave)", val: -10 },
    { label: "-5 pt (Penalità Media)", val: -5 },
    { label: "-2 pt (Ritardo Minore)", val: -2 },
    { label: "+2 pt (Ricalcolo Kill)", val: 2 },
    { label: "+5 pt (Bonus / Ripristino)", val: 5 },
  ];

  const handleApply = () => {
    const cleanReason = reason.trim();
    if (!cleanReason) {
      toast({
        title: "Motivazione Obbligatoria",
        description: "Devi inserire obbligatoriamente una nota con la motivazione della correzione/penalità.",
        variant: "destructive",
      });
      return;
    }

    if (cleanReason.length < 5) {
      toast({
        title: "Motivazione Troppo Breve",
        description: "Spiega con chiarezza la motivazione della modifica (almeno 5 caratteri).",
        variant: "destructive",
      });
      return;
    }

    if (pointsDelta === 0) {
      toast({
        title: "Valore Nullo",
        description: "Inserisci una variazione di punti diversa da zero.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = applyAdminPointAdjustment(
        tournamentId,
        team.teamId,
        pointsDelta,
        cleanReason,
        adminName,
        adminId
      );

      toast({
        title: "Modifica Applicata con Successo! ⚖️",
        description: res.message,
      });

      setReason("");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast({
        title: "Errore applicazione",
        description: err.message || "Impossibile applicare la penalità.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewNewTotal = Math.round((team.totalPoints + pointsDelta) * 10) / 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0f1322] border border-purple-900/60 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-purple-950/80 bg-gradient-to-r from-purple-950/50 via-[#121628] to-[#121628]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                Penalità &amp; Correzioni Admin
              </h3>
              <p className="text-[11px] text-zinc-400">
                Squadra: <strong className="text-cyan-300">{team.teamName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Current Score Summary */}
          <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-zinc-400 block">Punteggio Attuale:</span>
              <span className="text-base font-extrabold text-white">
                {team.totalPoints} pt
              </span>
              <span className="text-[10px] text-zinc-500 block">
                ({team.totalKills} kill in {team.gamesPlayed} game)
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-zinc-400 block">Nuovo Punteggio Stimato:</span>
              <span
                className={`text-base font-black ${
                  pointsDelta < 0 ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {previewNewTotal} pt
              </span>
              <span className="text-[10px] text-zinc-400 block">
                ({pointsDelta > 0 ? `+${pointsDelta}` : pointsDelta} pt)
              </span>
            </div>
          </div>

          {/* Quick Delta Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <span>Seleziona Variazione Punti:</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {quickPresets.map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setPointsDelta(preset.val)}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all text-left ${
                    pointsDelta === preset.val
                      ? preset.val < 0
                        ? "bg-rose-950/70 border-rose-500 text-rose-200 ring-1 ring-rose-500/40"
                        : "bg-emerald-950/70 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/40"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-zinc-400">Valore personalizzato:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPointsDelta((p) => p - 1)}
                  className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  value={pointsDelta}
                  onChange={(e) => setPointsDelta(Number(e.target.value) || 0)}
                  className="w-16 px-2 py-1 text-center bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-bold text-white outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setPointsDelta((p) => p + 1)}
                  className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Mandatory Reason Note */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Motivazione della Modifica (OBBLIGATORIA)*</span>
              </label>
              <span className="text-[10px] text-zinc-500">
                {reason.trim().length} caratteri
              </span>
            </div>

            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Es. Penalità -5 pt per ritardo di 12 minuti nella lobby del Game 2; oppure Ricalcolo +2 pt per kill non registrata."
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs placeholder:text-zinc-600 outline-none focus:border-amber-400 transition-colors"
            />
            <p className="text-[10px] text-zinc-400 italic">
              * La motivazione sarà archiviata nel registro ufficiale e mostrata pubblicamente per trasparenza.
            </p>
          </div>

          {/* Audit History of Previous Adjustments */}
          {team.penaltyAdjustments && team.penaltyAdjustments.length > 0 && (
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <History className="w-3 h-3 text-cyan-400" />
                <span>Storico Modifiche Applicate ({team.penaltyAdjustments.length})</span>
              </span>
              <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                {team.penaltyAdjustments.map((adj) => (
                  <div
                    key={adj.id}
                    className="p-2 rounded-lg bg-zinc-900/70 border border-zinc-800 text-[10px] flex items-start justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-zinc-200 block">
                        {adj.reason}
                      </span>
                      <span className="text-zinc-500 text-[9px]">
                        Da {adj.adminName} • {new Date(adj.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span
                      className={`font-black shrink-0 ${
                        adj.pointsDelta < 0 ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {adj.pointsDelta > 0 ? `+${adj.pointsDelta}` : adj.pointsDelta} pt
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Annulla
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={isSubmitting || !reason.trim() || reason.trim().length < 5}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
                !reason.trim() || reason.trim().length < 5
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : pointsDelta < 0
                  ? "bg-gradient-to-r from-rose-600 to-amber-600 text-white hover:brightness-110 cursor-pointer"
                  : "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:brightness-110 cursor-pointer"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Conferma Modifica</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
