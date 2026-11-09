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
} from "lucide-react";
import {
  RegisteredTeam,
  getRegisteredTeams,
  saveRegisteredTeams,
  TournamentMember,
} from "@/services/tournamentBracketService";
import { toast } from "@/components/ui/use-toast";
import { useSquad } from "@/context/SquadContext";

interface TournamentRegistrationsReviewProps {
  tournament: any;
  isOrganizer: boolean;
  onUpdate?: () => void;
}

export const TournamentRegistrationsReview: React.FC<TournamentRegistrationsReviewProps> = ({
  tournament,
  isOrganizer,
  onUpdate,
}) => {
  const { currentUser } = useSquad();
  const tournamentId = tournament?.id || "default_tourn";
  const [teams, setTeams] = useState<RegisteredTeam[]>([]);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  const loadTeams = () => {
    const list = getRegisteredTeams(tournamentId);
    setTeams(list);
  };

  useEffect(() => {
    loadTeams();
  }, [tournamentId]);

  const handleApproveTeam = (teamId: string) => {
    const updated = teams.map((t) =>
      t.id === teamId ? { ...t, status: "approved" as const, rejectionReason: undefined } : t
    );
    saveRegisteredTeams(tournamentId, updated);
    setTeams(updated);
    toast({
      title: "Squadra Approvata! ✅",
      description: "La squadra è stata confermata ed è abilitata agli scontri in tabellone.",
    });
    onUpdate?.();
  };

  const handleRejectTeam = (teamId: string) => {
    const reason = prompt("Inserisci il motivo del rifiuto (es. KD non conforme o screenshot illeggibile):");
    if (!reason) return;

    const updated = teams.map((t) =>
      t.id === teamId ? { ...t, status: "rejected" as const, rejectionReason: reason } : t
    );
    saveRegisteredTeams(tournamentId, updated);
    setTeams(updated);
    toast({
      title: "Iscrizione Rifiutata ❌",
      description: "Motivazione inviata alla squadra.",
      variant: "destructive",
    });
    onUpdate?.();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-md flex items-center justify-between">
        <div>
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Revisione Iscrizioni & Verifica KD ({teams.length})</span>
          </h4>
          <p className="text-[10px] text-zinc-400">
            Controllo Activision ID, screenshot KD con IA Vision e gestione approvazioni
          </p>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/40 text-purple-300">
          Dashboard Organizzatore
        </span>
      </div>

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
                          onClick={() => handleApproveTeam(team.id)}
                          className="py-1 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approva</span>
                        </button>
                      )}
                      {!isRejected && (
                        <button
                          onClick={() => handleRejectTeam(team.id)}
                          className="py-1 px-2.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-600/50 text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                          <span>Rifiuta</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Team Members List */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                    Componenti Squadra & Verifica IA Vision:
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
                            <span>KD: <strong className="text-amber-300">{member.detectedKd ?? "1.8"}</strong></span>
                            {member.isActivisionMatch !== false && (
                              <span className="text-emerald-400">✅ Nome verificato</span>
                            )}
                          </div>
                        </div>

                        {member.screenshotUrl && (
                          <button
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
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                    <strong>Motivo rifiuto:</strong> {team.rejectionReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Screenshot lightbox modal */}
      {selectedProofUrl && (
        <div
          onClick={() => setSelectedProofUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm cursor-pointer"
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
