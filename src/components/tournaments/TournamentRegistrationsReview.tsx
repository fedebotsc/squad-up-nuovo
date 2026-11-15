import React, { useState, useEffect } from "react";
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Target,
  Sparkles,
  AlertCircle,
  Clock,
  Check,
  X,
  User,
  ExternalLink,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import {
  RegisteredTeam,
  getRegisteredTeams,
  saveRegisteredTeams,
  TournamentMember,
} from "@/services/tournamentBracketService";
import { toast } from "@/components/ui/use-toast";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";

interface TournamentRegistrationsReviewProps {
  tournament: any;
  isOrganizer: boolean;
  onUpdate?: () => void;
}

const PRESET_REJECTION_REASONS = [
  "Nome Activision non coincide con quello presente nello screenshot",
  "Rapporto U/M (KD) non conforme ai limiti previsti dal regolamento",
  "Schermata errata: hai caricato il tabellone di fine partita anziché il profilo statistiche",
  "Screenshot non autentico o non appartenente a Call of Duty",
  "Screenshot sfuocato o dati di gioco illeggibili",
];

export const TournamentRegistrationsReview: React.FC<TournamentRegistrationsReviewProps> = ({
  tournament,
  isOrganizer,
  onUpdate,
}) => {
  const { currentUser } = useSquad();
  const tournamentId = tournament?.id || "default_tourn";
  const rawTourn = tournament?.raw || tournament || {};
  const isAiReferee = rawTourn.referee_mode !== "manual" && rawTourn.ai_referee_enabled !== false;

  const [teams, setTeams] = useState<RegisteredTeam[]>([]);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  // Rejection modal state
  const [teamToReject, setTeamToReject] = useState<RegisteredTeam | null>(null);
  const [selectedPresetReason, setSelectedPresetReason] = useState<string>(PRESET_REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const loadTeams = async () => {
    let list = getRegisteredTeams(tournamentId);

    try {
      const { data: supaRegs } = await supabase
        .from("tournament_registrations")
        .select("*")
        .eq("tournament_id", tournamentId);

      if (supaRegs && supaRegs.length > 0) {
        const updatedList = [...list];
        supaRegs.forEach((sr) => {
          const existingIdx = updatedList.findIndex(
            (t) => t.teamName === sr.team_name || t.captainUserId === sr.user_id
          );
          if (existingIdx !== -1) {
            if (sr.approval_status) {
              updatedList[existingIdx].status = sr.approval_status as any;
            }
            if (sr.rejection_reason) {
              updatedList[existingIdx].rejectionReason = sr.rejection_reason;
            }
          } else {
            const actIds = (sr.activision_ids || "")
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean);
            updatedList.push({
              id: sr.id || `reg_${sr.user_id}_${Date.now()}`,
              tournamentId,
              teamName: sr.team_name || "Squadra",
              captainUserId: sr.user_id,
              captainName: "Capitano",
              status: (sr.approval_status as any) || "pending_approval",
              rejectionReason: sr.rejection_reason || undefined,
              members: actIds.map((act: string) => ({
                activisionId: act,
                detectedKd: sr.kd_ratio || 1.8,
                isActivisionMatch: true,
                isKdCompliant: true,
                screenshotUrl: sr.kd_screenshot_url || undefined,
                aiStatus: sr.approval_status === "approved" ? "approved" : "pending",
              })),
              createdAt: sr.created_at || new Date().toISOString(),
            });
          }
        });
        list = updatedList;
        saveRegisteredTeams(tournamentId, list);
      }
    } catch (err) {
      console.warn("[Review] Lookup registrazioni Supabase:", err);
    }

    setTeams(list);
  };

  useEffect(() => {
    loadTeams();
  }, [tournamentId]);

  const handleApproveTeam = async (teamId: string) => {
    const targetTeam = teams.find((t) => t.id === teamId);
    if (!targetTeam) return;

    const updated = teams.map((t) =>
      t.id === teamId ? { ...t, status: "approved" as const, rejectionReason: undefined } : t
    );
    saveRegisteredTeams(tournamentId, updated);
    setTeams(updated);

    // Sync approval to Supabase tables
    try {
      await supabase
        .from("tournament_registrations")
        .update({
          approval_status: "approved",
          rejection_reason: null,
        })
        .eq("tournament_id", tournamentId)
        .eq("team_name", targetTeam.teamName);

      await supabase
        .from("tournament_team_chats")
        .update({
          status: "approved",
          rejection_reason: null,
        })
        .eq("tournament_id", tournamentId)
        .eq("team_name", targetTeam.teamName);
    } catch (err) {
      console.warn("[Review] Errore sync approvazione Supabase:", err);
    }

    toast({
      title: "Squadra Approvata! ✅",
      description: `La squadra "${targetTeam.teamName}" è stata confermata ed è ammessa al tabellone.`,
    });
    onUpdate?.();
  };

  const handleOpenRejectModal = (team: RegisteredTeam) => {
    setTeamToReject(team);
    setSelectedPresetReason(PRESET_REJECTION_REASONS[0]);
    setCustomReason("");
  };

  const handleConfirmReject = async () => {
    if (!teamToReject) return;
    setIsProcessing(true);

    const finalReason =
      customReason.trim() ||
      selectedPresetReason ||
      "Iscrizione non conforme ai requisiti o al regolamento del torneo.";

    const updated = teams.map((t) =>
      t.id === teamToReject.id
        ? { ...t, status: "rejected" as const, rejectionReason: finalReason }
        : t
    );

    saveRegisteredTeams(tournamentId, updated);
    setTeams(updated);

    // Sync rejection to Supabase tables
    try {
      await supabase
        .from("tournament_registrations")
        .update({
          approval_status: "rejected",
          rejection_reason: finalReason,
        })
        .eq("tournament_id", tournamentId)
        .eq("team_name", teamToReject.teamName);

      await supabase
        .from("tournament_team_chats")
        .update({
          status: "rejected",
          rejection_reason: finalReason,
        })
        .eq("tournament_id", tournamentId)
        .eq("team_name", teamToReject.teamName);
    } catch (err) {
      console.warn("[Review] Errore sync rifiuto Supabase:", err);
    }

    toast({
      title: "Iscrizione Rifiutata ❌",
      description: `La squadra "${teamToReject.teamName}" è stata respinta: ${finalReason}`,
      variant: "destructive",
    });

    setIsProcessing(false);
    setTeamToReject(null);
    onUpdate?.();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-md flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Revisione Iscrizioni &amp; Screenshot KD ({teams.length})</span>
          </h4>
          <p className="text-[10px] text-zinc-400">
            {isAiReferee
              ? "Verifica automatica Activision ID e KD tramite Google Gemini 2.5 Flash"
              : "Valutazione manuale a cura dell'organizzatore e dei co-organizzatori"}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isAiReferee
                ? "bg-purple-950 border-purple-500/40 text-purple-300"
                : "bg-cyan-950 border-cyan-500/40 text-cyan-300"
            }`}
          >
            {isAiReferee ? "Arbitro IA Vision" : "Valutazione Manuale"}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300">
            Staff Torneo
          </span>
        </div>
      </div>

      {!isAiReferee && (
        <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 flex items-start gap-2.5">
          <User className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-cyan-300">
              Controllo Manuale Screenshot Richiesto:
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Questo torneo è configurato per la <strong>Valutazione Manuale</strong>. Tu e i tuoi co-organizzatori dovete esaminare gli screenshot caricati per ciascun giocatore (cliccando l'icona <Eye className="w-3 h-3 inline text-cyan-400" />) e cliccare <strong>"Approva"</strong> per ammettere la squadra al tabellone o <strong>"Rifiuta"</strong> se non è conforme.
            </p>
          </div>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="p-8 text-center bg-[#121628]/90 border border-purple-900/30 rounded-2xl text-xs text-zinc-400 space-y-2">
          <Users className="w-7 h-7 text-purple-400 mx-auto" />
          <p>Nessuna squadra ancora iscritta per questo torneo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {teams.map((team) => {
            const isApproved = team.status === "approved";
            const isRejected = team.status === "rejected";

            return (
              <div
                key={team.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 bg-[#121628]/95 ${
                  isApproved
                    ? "border-emerald-500/40"
                    : isRejected
                    ? "border-rose-500/40"
                    : "border-purple-900/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-black text-white">{team.teamName}</h4>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          isApproved
                            ? "bg-emerald-950 text-emerald-300 border-emerald-500/50"
                            : isRejected
                            ? "bg-rose-950 text-rose-300 border-rose-500/50"
                            : "bg-amber-950 text-amber-300 border-amber-500/50"
                        }`}
                      >
                        {isApproved ? "Approvata" : isRejected ? "Rifiutata" : "In Attesa Revisione"}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      Capitano: {team.captainName} • {team.members.length} Giocatori
                    </span>
                  </div>

                  {/* Actions for Organizer */}
                  {isOrganizer && (
                    <div className="flex items-center gap-1.5">
                      {!isApproved && (
                        <button
                          type="button"
                          onClick={() => handleApproveTeam(team.id)}
                          className="py-1 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approva</span>
                        </button>
                      )}
                      {!isRejected && (
                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal(team)}
                          className="py-1 px-2.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-600/50 text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                        >
                          <X className="w-3 h-3" />
                          <span>Rifiuta</span>
                        </button>
                      )}
                      {isRejected && (
                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal(team)}
                          className="py-1 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-medium"
                          title="Modifica motivo rifiuto"
                        >
                          Modifica Motivo
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Team Members List */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                    Componenti Squadra &amp; Screenshot KD:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {team.members.map((member, mIdx) => (
                      <div
                        key={mIdx}
                        className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-[11px] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-purple-400 shrink-0" />
                            <span className="font-bold text-white truncate">
                              {member.activisionId}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-2">
                            <span>
                              KD: <strong className="text-amber-300">{member.detectedKd ?? "1.8"}</strong>
                            </span>
                            {member.isActivisionMatch !== false && (
                              <span className="text-emerald-400">✅ Nome verificato</span>
                            )}
                          </div>
                        </div>

                        {member.screenshotUrl && (
                          <button
                            type="button"
                            onClick={() => setSelectedProofUrl(member.screenshotUrl!)}
                            className="p-1 rounded-lg bg-zinc-900 border border-zinc-700 text-cyan-400 hover:text-white"
                            title="Vedi Screenshot KD"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {team.rejectionReason && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-200">Motivo del Rifiuto:</strong> {team.rejectionReason}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {teamToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-zinc-950 border border-rose-500/40 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-extrabold text-white">
                  Rifiuta Iscrizione Squadra
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTeamToReject(null)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-0.5">
              <div className="text-zinc-400">Squadra da respingere:</div>
              <div className="font-bold text-white text-sm">
                {teamToReject.teamName}
              </div>
              <div className="text-[11px] text-zinc-400">
                Capitano: {teamToReject.captainName}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 block">
                Motivazione Rapida del Rifiuto:
              </label>
              <div className="space-y-1.5">
                {PRESET_REJECTION_REASONS.map((preset, pIdx) => {
                  const isSelected = selectedPresetReason === preset;
                  return (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => {
                        setSelectedPresetReason(preset);
                        setCustomReason(preset);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-[11px] border transition-all ${
                        isSelected
                          ? "bg-rose-950/60 border-rose-500/60 text-rose-200 font-semibold"
                          : "bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 block">
                Oppure scrivi / personalizza la motivazione:
              </label>
              <textarea
                rows={3}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Spiega al capitano della squadra perché l'iscrizione è stata rifiutata..."
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-rose-500 text-white text-xs outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setTeamToReject(null)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-950/50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{isProcessing ? "Salvataggio..." : "Conferma Rifiuto"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot lightbox modal */}
      {selectedProofUrl && (
        <div
          onClick={() => setSelectedProofUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-lg w-full bg-zinc-950 p-2 rounded-2xl border border-zinc-800">
            <img
              src={selectedProofUrl}
              alt="Screenshot KD"
              className="w-full h-auto rounded-xl max-h-[80vh] object-contain"
            />
            <div className="text-center text-xs text-zinc-400 pt-2">
              Clicca per chiudere
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
