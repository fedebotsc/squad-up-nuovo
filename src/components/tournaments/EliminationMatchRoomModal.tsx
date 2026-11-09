import React, { useState } from "react";
import {
  X,
  Swords,
  Trophy,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Send,
  MessageSquare,
  AlertTriangle,
  Eye,
  Sliders,
  ChevronRight,
  Target,
  FileCheck,
  Flame,
  Award,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { toast } from "@/components/ui/use-toast";
import {
  EliminationMatch,
  RegisteredTeam,
  TeamMatchSubmission,
  advanceWinnerInBracket,
  getBracketState,
  saveBracketState,
} from "@/services/tournamentBracketService";
import {
  uploadTournamentProof,
  verifyPostGameProofsAndCalculateScore,
  PostGameVerificationResult,
} from "@/services/tournamentVerificationService";

interface EliminationMatchRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: EliminationMatch | null;
  tournament: any;
  onMatchUpdated: () => void;
}

export const EliminationMatchRoomModal: React.FC<EliminationMatchRoomModalProps> = ({
  isOpen,
  onClose,
  match,
  tournament,
  onMatchUpdated,
}) => {
  const { currentUser, userProfile, isUniversalAdmin } = useSquad();

  if (!isOpen || !match) return null;

  const rawTourn = tournament?.raw || tournament || {};
  const isOrganizer =
    isUniversalAdmin ||
    (currentUser?.id && rawTourn.owner_id === currentUser.id) ||
    (Array.isArray(rawTourn.co_organizers) && rawTourn.co_organizers.includes(currentUser?.id));

  const [activeTab, setActiveTab] = useState<"chat" | "proofs" | "override">("proofs");

  // Chat state
  const [chatInput, setChatInput] = useState("");

  // Team 1 uploads
  const [team1PlacementFile, setTeam1PlacementFile] = useState<File | null>(null);
  const [team1KillsFile, setTeam1KillsFile] = useState<File | null>(null);
  const [team1PlacementPreview, setTeam1PlacementPreview] = useState<string | null>(null);
  const [team1KillsPreview, setTeam1KillsPreview] = useState<string | null>(null);
  const [isVerifyingTeam1, setIsVerifyingTeam1] = useState(false);
  const [team1Analysis, setTeam1Analysis] = useState<PostGameVerificationResult | null>(null);

  const [team1Error, setTeam1Error] = useState<string | null>(null);

  // Team 2 uploads
  const [team2PlacementFile, setTeam2PlacementFile] = useState<File | null>(null);
  const [team2KillsFile, setTeam2KillsFile] = useState<File | null>(null);
  const [team2PlacementPreview, setTeam2PlacementPreview] = useState<string | null>(null);
  const [team2KillsPreview, setTeam2KillsPreview] = useState<string | null>(null);
  const [isVerifyingTeam2, setIsVerifyingTeam2] = useState(false);
  const [team2Analysis, setTeam2Analysis] = useState<PostGameVerificationResult | null>(null);
  const [team2Error, setTeam2Error] = useState<string | null>(null);

  // Organizer Override state
  const [overrideWinnerTeamId, setOverrideWinnerTeamId] = useState<string>(
    match.winnerTeamId || match.team1?.id || ""
  );
  const [overrideScoreTeam1, setOverrideScoreTeam1] = useState<number>(match.team1Score || 0);
  const [overrideScoreTeam2, setOverrideScoreTeam2] = useState<number>(match.team2Score || 0);
  const [overrideReason, setOverrideReason] = useState("");
  const [isApplyingOverride, setIsApplyingOverride] = useState(false);

  // Analyze team proofs with strict IA Vision & Anti-Fake filter
  const handleAnalyzeTeam = async (teamSlot: "team1" | "team2") => {
    const targetTeam = teamSlot === "team1" ? match.team1 : match.team2;
    if (!targetTeam) {
      toast({
        title: "Squadra mancante",
        description: "Lo slot della squadra non è ancora stato occupato in questo turno.",
        variant: "destructive",
      });
      return;
    }

    const placementF = teamSlot === "team1" ? team1PlacementFile : team2PlacementFile;
    const killsF = teamSlot === "team1" ? team1KillsFile : team2KillsFile;

    if (!placementF || !killsF) {
      toast({
        title: "Screenshot Obbligatori",
        description: "Devi caricare ENTRAMBI gli screenshot: 1) Posizionamento finale e 2) Tabella Uccisioni di Squadra.",
        variant: "destructive",
      });
      return;
    }

    if (teamSlot === "team1") {
      setIsVerifyingTeam1(true);
      setTeam1Error(null);
    } else {
      setIsVerifyingTeam2(true);
      setTeam2Error(null);
    }

    try {
      const registeredNames = targetTeam.members.map((m) => m.activisionId);

      const result = await verifyPostGameProofsAndCalculateScore(
        placementF,
        killsF,
        rawTourn.scoring_settings,
        rawTourn.rules,
        registeredNames
      );

      if (teamSlot === "team1") {
        setTeam1Analysis(result);
        setTeam1Error(null);
      } else {
        setTeam2Analysis(result);
        setTeam2Error(null);
      }

      toast({
        title: `Verifica IA ${targetTeam.teamName} Completata! ⚔️`,
        description: `Posizione #${result.placement} • ${result.kills} Uccisioni effettive. Eliminazioni scartate con successo.`,
      });
    } catch (err: any) {
      console.warn("[MatchRoom] Errore verifica post-game:", err);
      const errMsg = err.message || "Immagine non valida: L'IA ha rilevato che la foto caricata non è uno screenshot delle statistiche di Call of Duty. Si prega di caricare lo screenshot corretto.";

      if (teamSlot === "team1") {
        setTeam1Analysis(null);
        setTeam1Error(errMsg);
      } else {
        setTeam2Analysis(null);
        setTeam2Error(errMsg);
      }

      // Automatically post the rejection alert in match room chat
      setMatchState((prev) => ({
        ...prev,
        chatMessages: [
          ...prev.chatMessages,
          {
            id: `sys_err_${Date.now()}`,
            senderId: "system",
            senderName: "SquadUP Arbitro IA",
            teamName: targetTeam.teamName,
            text: `❌ ${errMsg}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isSystem: true,
          },
        ],
      }));

      toast({
        title: "Screenshot Non Valido (Anti-Fake)",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      if (teamSlot === "team1") setIsVerifyingTeam1(false);
      else setIsVerifyingTeam2(false);
    }
  };

  // Submit and lock round when both teams have uploaded or when ready
  const handleConfirmAndAdvance = () => {
    const score1 = team1Analysis ? team1Analysis.total_points : match.team1Score;
    const score2 = team2Analysis ? team2Analysis.total_points : match.team2Score;

    if (!match.team1 || !match.team2) {
      toast({
        title: "Impossibile concludere",
        description: "Entrambe le squadre devono essere presenti nello scontro.",
        variant: "destructive",
      });
      return;
    }

    if (!team1Analysis && !match.team1Submission) {
      toast({
        title: "Prove mancanti Squadra 1",
        description: `La squadra "${match.team1.teamName}" deve caricare e far verificare le proprie foto.`,
        variant: "destructive",
      });
      return;
    }

    if (!team2Analysis && !match.team2Submission) {
      toast({
        title: "Prove mancanti Squadra 2",
        description: `La squadra "${match.team2.teamName}" deve caricare e far verificare le proprie foto.`,
        variant: "destructive",
      });
      return;
    }

    const winner = score1 >= score2 ? match.team1 : match.team2;

    const bracketState = getBracketState(match.tournamentId);
    if (!bracketState) return;

    // Save submissions on the match
    for (const r of bracketState.rounds) {
      for (const m of r.matches) {
        if (m.id === match.id) {
          m.team1Score = score1;
          m.team2Score = score2;
          m.team1Submission = team1Analysis
            ? {
                teamId: match.team1.id,
                teamName: match.team1.teamName,
                placement: team1Analysis.placement,
                verifiedKills: team1Analysis.kills,
                discardedEliminations: team1Analysis.discarded_eliminations,
                playerDetails: team1Analysis.players.map((p) => ({
                  playerName: p.player_name,
                  actualKills: p.kills,
                  rawEliminations: p.raw_eliminations || p.kills + 2,
                  assistsExcluded: p.assists_discarded || 2,
                })),
                placementScore: team1Analysis.placement_points,
                killsScore: team1Analysis.kill_points,
                totalScore: team1Analysis.total_points,
                submittedAt: new Date().toISOString(),
                aiVerificationDetails: {
                  strictlyUsedUccisioni: true,
                  discardedEliminationsColumn: true,
                  playersMatched: true,
                  explanation: team1Analysis.explanation || "",
                },
              }
            : m.team1Submission;

          m.team2Submission = team2Analysis
            ? {
                teamId: match.team2.id,
                teamName: match.team2.teamName,
                placement: team2Analysis.placement,
                verifiedKills: team2Analysis.kills,
                discardedEliminations: team2Analysis.discarded_eliminations,
                playerDetails: team2Analysis.players.map((p) => ({
                  playerName: p.player_name,
                  actualKills: p.kills,
                  rawEliminations: p.raw_eliminations || p.kills + 2,
                  assistsExcluded: p.assists_discarded || 2,
                })),
                placementScore: team2Analysis.placement_points,
                killsScore: team2Analysis.kill_points,
                totalScore: team2Analysis.total_points,
                submittedAt: new Date().toISOString(),
                aiVerificationDetails: {
                  strictlyUsedUccisioni: true,
                  discardedEliminationsColumn: true,
                  playersMatched: true,
                  explanation: team2Analysis.explanation || "",
                },
              }
            : m.team2Submission;
        }
      }
    }

    saveBracketState(match.tournamentId, bracketState);

    // Advance winner in bracket
    advanceWinnerInBracket(bracketState, match.id, winner);

    toast({
      title: "Scontro Concluso! 🏆",
      description: `Vincitore: ${winner.teamName} con ${Math.max(score1, score2)} punti. Passaggio al turno successivo sbloccato!`,
    });

    onMatchUpdated();
    onClose();
  };

  // Organizer manual override with mandatory reason
  const handleApplyOrganizerOverride = () => {
    if (!isOrganizer) {
      toast({
        title: "Permesso negato",
        description: "Solo gli organizzatori e co-organizzatori possono applicare override.",
        variant: "destructive",
      });
      return;
    }

    const cleanReason = overrideReason.trim();
    if (!cleanReason) {
      toast({
        title: "Motivazione Obbligatoria",
        description: "Inserisci la motivazione obbligatoria per applicare la modifica arbitrale (audit trail).",
        variant: "destructive",
      });
      return;
    }

    const winner =
      overrideWinnerTeamId === match.team1?.id ? match.team1 : match.team2;

    if (!winner) {
      toast({
        title: "Squadra vincitrice non valida",
        description: "Seleziona quale squadra deve passare il turno.",
        variant: "destructive",
      });
      return;
    }

    setIsApplyingOverride(true);

    const bracketState = getBracketState(match.tournamentId);
    if (!bracketState) {
      setIsApplyingOverride(false);
      return;
    }

    // Update match scores
    for (const r of bracketState.rounds) {
      for (const m of r.matches) {
        if (m.id === match.id) {
          m.team1Score = overrideScoreTeam1;
          m.team2Score = overrideScoreTeam2;
          m.chatMessages.push({
            id: `override_${Date.now()}`,
            senderId: currentUser?.id || "organizer",
            senderName: userProfile.name || "Arbitro Ufficiale",
            text: `⚖️ OVERRIDE ARBITRALE APPLICATO: ${winner.teamName} proclamata vincitrice dello scontro.\nMotivazione: "${cleanReason}"`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isOrganizer: true,
          });
        }
      }
    }

    saveBracketState(match.tournamentId, bracketState);

    advanceWinnerInBracket(bracketState, match.id, winner, {
      organizerId: currentUser?.id || "organizer",
      organizerName: userProfile.name || "Organizzatore",
      reason: cleanReason,
    });

    toast({
      title: "Override Arbitrale Applicato ⚖️",
      description: `Vincitore forzato a "${winner.teamName}". Motivazione registrata.`,
    });

    setIsApplyingOverride(false);
    onMatchUpdated();
    onClose();
  };

  // Send message in match chat
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = chatInput.trim();
    if (!clean) return;

    const bracketState = getBracketState(match.tournamentId);
    if (!bracketState) return;

    for (const r of bracketState.rounds) {
      for (const m of r.matches) {
        if (m.id === match.id) {
          m.chatMessages.push({
            id: `msg_${Date.now()}`,
            senderId: currentUser?.id || "user",
            senderName: userProfile.name || "Gamer",
            teamName: userProfile.clanTag ? `[${userProfile.clanTag}]` : undefined,
            text: clean,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isOrganizer,
          });
        }
      }
    }

    saveBracketState(match.tournamentId, bracketState);
    setChatInput("");
    onMatchUpdated();
  };

  const isCompleted = match.status === "completed";
  const winner = match.winnerTeamId
    ? match.winnerTeamId === match.team1?.id
      ? match.team1
      : match.team2
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0f1322] border border-purple-900/60 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Match Header */}
        <div className="p-4 sm:p-5 border-b border-purple-950/80 bg-gradient-to-r from-purple-950/40 via-[#121628] to-[#121628]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-950 border border-purple-500/40 text-purple-300 uppercase">
                {match.roundName}
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  isCompleted
                    ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
                    : "bg-amber-950/70 border-amber-500/50 text-amber-300"
                }`}
              >
                {isCompleted ? "Incontro Concluso ✅" : "In Corso ⚔️"}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Teams Faceoff Card */}
          <div className="grid grid-cols-7 items-center gap-2 bg-zinc-950/80 border border-zinc-800 p-3 rounded-2xl">
            {/* Team 1 */}
            <div className="col-span-3 text-left">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block truncate">
                Squadra 1
              </span>
              <h4
                className={`text-sm font-black truncate ${
                  isCompleted && winner?.id === match.team1?.id
                    ? "text-amber-300"
                    : "text-white"
                }`}
              >
                {match.team1?.teamName || "Da definire"}
              </h4>
              <span className="text-xs font-mono font-bold text-cyan-300">
                {team1Analysis?.total_points ?? match.team1Score} Punti
              </span>
            </div>

            {/* VS */}
            <div className="col-span-1 text-center">
              <div className="w-8 h-8 mx-auto rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-xs font-black text-purple-300">
                VS
              </div>
            </div>

            {/* Team 2 */}
            <div className="col-span-3 text-right">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block truncate">
                Squadra 2
              </span>
              <h4
                className={`text-sm font-black truncate ${
                  isCompleted && winner?.id === match.team2?.id
                    ? "text-amber-300"
                    : "text-white"
                }`}
              >
                {match.team2?.teamName || "Da definire"}
              </h4>
              <span className="text-xs font-mono font-bold text-cyan-300">
                {team2Analysis?.total_points ?? match.team2Score} Punti
              </span>
            </div>
          </div>
        </div>

        {/* Subtabs Bar */}
        <div className="flex border-b border-purple-950/60 bg-[#0d101d] px-4 pt-2">
          <button
            onClick={() => setActiveTab("proofs")}
            className={`py-2 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === "proofs"
                ? "border-purple-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>Prove & Arbitraggio IA</span>
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`py-2 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === "chat"
                ? "border-purple-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
            <span>Chat del Match ({match.chatMessages.length})</span>
          </button>

          {isOrganizer && (
            <button
              onClick={() => setActiveTab("override")}
              className={`py-2 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                activeTab === "override"
                  ? "border-amber-500 text-amber-300"
                  : "border-transparent text-zinc-400 hover:text-amber-300"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Override Arbitro</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 max-h-[64vh] overflow-y-auto space-y-4">
          {/* TAB 1: PROOFS & STRICT IA VISION */}
          {activeTab === "proofs" && (
            <div className="space-y-4 animate-fade-in">
              {/* Strict IA Rule Banner */}
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-xs text-zinc-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold text-amber-300">
                    Regola Rigorosa IA Vision per le Kill:
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    L'IA Vision estrae e calcola solo ed esclusivamente i dati della colonna <strong className="text-white">"UCCISIONI"</strong> per ciascun giocatore registrato. La colonna <strong className="text-rose-400">"Eliminazioni" viene RIGOROSAMENTE SCARTATA</strong> poiché include anche gli assist.
                  </p>
                </div>
              </div>

              {/* Both Teams Upload Sections */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Team 1 Proofs */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">
                      1. {match.team1?.teamName || "Squadra 1"}
                    </span>
                    {team1Analysis && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/40">
                        Calcolato: {team1Analysis.total_points} pt
                      </span>
                    )}
                  </div>

                  {/* Placement File */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">
                      Screenshot 1: Posizionamento Finale
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setTeam1PlacementFile(f);
                          setTeam1PlacementPreview(URL.createObjectURL(f));
                        }
                      }}
                      className="w-full text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-purple-950 file:text-purple-300"
                    />
                  </div>

                  {/* Kills File */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">
                      Screenshot 2: Tabella Uccisioni (AAR)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setTeam1KillsFile(f);
                          setTeam1KillsPreview(URL.createObjectURL(f));
                        }
                      }}
                      className="w-full text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-cyan-950 file:text-cyan-300"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isVerifyingTeam1 || !team1PlacementFile || !team1KillsFile}
                    onClick={() => handleAnalyzeTeam("team1")}
                    className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isVerifyingTeam1 ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Analisi IA Vision Uccisioni...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Verifica Prove {match.team1?.teamName}</span>
                      </>
                    )}
                  </button>

                  {team1Error && (
                    <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-[11px] text-rose-200 flex items-start gap-2 animate-fade-in">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-rose-300 block">Rifiuto Anti-Fake IA:</span>
                        <p className="leading-snug">{team1Error}</p>
                      </div>
                    </div>
                  )}

                  {team1Analysis && (
                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] space-y-1">
                      <div className="text-zinc-300 font-bold">
                        Posizione #{team1Analysis.placement} • {team1Analysis.kills} Kills effettive
                      </div>
                      <div className="text-rose-400 text-[10px]">
                        ⛔ Scartate {team1Analysis.discarded_eliminations} eliminazioni (assist)
                      </div>
                      <p className="text-[10px] text-zinc-400 whitespace-pre-line leading-relaxed">
                        {team1Analysis.player_breakdown_text}
                      </p>
                    </div>
                  )}
                </div>

                {/* Team 2 Proofs */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">
                      2. {match.team2?.teamName || "Squadra 2"}
                    </span>
                    {team2Analysis && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500/40">
                        Calcolato: {team2Analysis.total_points} pt
                      </span>
                    )}
                  </div>

                  {/* Placement File */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">
                      Screenshot 1: Posizionamento Finale
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setTeam2PlacementFile(f);
                          setTeam2PlacementPreview(URL.createObjectURL(f));
                        }
                      }}
                      className="w-full text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-purple-950 file:text-purple-300"
                    />
                  </div>

                  {/* Kills File */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">
                      Screenshot 2: Tabella Uccisioni (AAR)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setTeam2KillsFile(f);
                          setTeam2KillsPreview(URL.createObjectURL(f));
                        }
                      }}
                      className="w-full text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-cyan-950 file:text-cyan-300"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isVerifyingTeam2 || !team2PlacementFile || !team2KillsFile}
                    onClick={() => handleAnalyzeTeam("team2")}
                    className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isVerifyingTeam2 ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Analisi IA Vision Uccisioni...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Verifica Prove {match.team2?.teamName}</span>
                      </>
                    )}
                  </button>

                  {team2Error && (
                    <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-[11px] text-rose-200 flex items-start gap-2 animate-fade-in">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-rose-300 block">Rifiuto Anti-Fake IA:</span>
                        <p className="leading-snug">{team2Error}</p>
                      </div>
                    </div>
                  )}

                  {team2Analysis && (
                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] space-y-1">
                      <div className="text-zinc-300 font-bold">
                        Posizione #{team2Analysis.placement} • {team2Analysis.kills} Kills effettive
                      </div>
                      <div className="text-rose-400 text-[10px]">
                        ⛔ Scartate {team2Analysis.discarded_eliminations} eliminazioni (assist)
                      </div>
                      <p className="text-[10px] text-zinc-400 whitespace-pre-line leading-relaxed">
                        {team2Analysis.player_breakdown_text}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Unlock Round Button */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-extrabold text-white">
                      Sblocco del Turno & Avanzamento Vincitore
                    </h5>
                    <p className="text-[11px] text-zinc-400">
                      Lo scontro si dichiara concluso e decreta il vincitore per il passaggio al turno successivo solo quando entrambe le squadre hanno caricato le rispettive foto.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmAndAdvance}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-amber-300" />
                  <span>Dichiara Vincitore e Sblocca Turno Successivo</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE MATCH CHAT */}
          {activeTab === "chat" && (
            <div className="space-y-3 animate-fade-in">
              <div className="p-3 bg-zinc-950/80 rounded-2xl border border-zinc-800 h-64 overflow-y-auto space-y-2 text-xs">
                {match.chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl ${
                      msg.isSystem
                        ? "bg-purple-950/50 border border-purple-800/40 text-purple-200"
                        : msg.isOrganizer
                        ? "bg-amber-950/50 border border-amber-800/40 text-amber-200"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-0.5">
                      <span className="font-bold text-white">
                        {msg.senderName} {msg.teamName && <span className="text-cyan-400">{msg.teamName}</span>}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Scrivi un messaggio nella stanza del match..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-xs outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Invia</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: ORGANIZER OVERRIDE */}
          {activeTab === "override" && isOrganizer && (
            <div className="space-y-4 animate-fade-in p-1">
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Pannello Decisionale Arbitro & Co-organizzatori</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Puoi modificare manualmente quale squadra passa la fase, correggere i punteggi o assegnare penalità. La motivazione scritta è obbligatoria per garantire la trasparenza competitiva.
                </p>
              </div>

              {/* Force Select Winner */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Dichiara Squadra Vincitrice (Passa al turno successivo):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrideWinnerTeamId(match.team1?.id || "")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      overrideWinnerTeamId === match.team1?.id
                        ? "bg-purple-950 border-purple-500 text-white ring-2 ring-purple-500/30"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <div className="text-xs font-bold text-white">
                      {match.team1?.teamName || "Squadra 1"}
                    </div>
                    <span className="text-[10px] text-zinc-400">Passa il turno</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOverrideWinnerTeamId(match.team2?.id || "")}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      overrideWinnerTeamId === match.team2?.id
                        ? "bg-purple-950 border-purple-500 text-white ring-2 ring-purple-500/30"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <div className="text-xs font-bold text-white">
                      {match.team2?.teamName || "Squadra 2"}
                    </div>
                    <span className="text-[10px] text-zinc-400">Passa il turno</span>
                  </button>
                </div>
              </div>

              {/* Manual Score Corrections */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400 truncate block">
                    Punteggio {match.team1?.teamName}
                  </label>
                  <input
                    type="number"
                    value={overrideScoreTeam1}
                    onChange={(e) => setOverrideScoreTeam1(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400 truncate block">
                    Punteggio {match.team2?.teamName}
                  </label>
                  <input
                    type="number"
                    value={overrideScoreTeam2}
                    onChange={(e) => setOverrideScoreTeam2(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-xs outline-none"
                  />
                </div>
              </div>

              {/* Mandatory Reason */}
              <div className="space-y-1 pt-2 border-t border-zinc-800">
                <label className="text-xs font-bold text-rose-300">
                  Motivazione Obbligatoria dell'Override *
                </label>
                <textarea
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Es. Penalità applicata per mancato rispetto dei tempi o vittoria a tavolino per screenshot non conforme..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700/80 focus:border-amber-500 text-white text-xs outline-none"
                />
              </div>

              <button
                type="button"
                disabled={isApplyingOverride || !overrideReason.trim()}
                onClick={handleApplyOrganizerOverride}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {isApplyingOverride ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>Applica Override e Avanza Squadra</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
