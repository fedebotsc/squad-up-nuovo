import React, { useState } from "react";
import {
  X,
  Trophy,
  Users,
  Gamepad2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Target,
  ArrowRight,
  Eye,
  Camera,
  RefreshCw,
  Check,
  AlertTriangle,
  User,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  uploadTournamentProof,
  verifyMemberKdScreenshotWithAI,
  KDVerificationResult,
  ERROR_POST_GAME_UPLOADED_FOR_KD,
} from "@/services/tournamentVerificationService";
import {
  RegisteredTeam,
  TournamentMember,
  getRegisteredTeams,
  saveRegisteredTeams,
} from "@/services/tournamentBracketService";

interface TournamentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: any;
  onSuccess?: () => void;
}

interface MemberInputState {
  index: number;
  activisionId: string;
  file: File | null;
  previewUrl: string | null;
  isVerifying: boolean;
  result: KDVerificationResult | null;
}

export const TournamentRegistrationModal: React.FC<TournamentRegistrationModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onSuccess,
}) => {
  const { currentUser, userProfile, openAuthModal, refreshUserData } = useSquad();

  if (!isOpen || !tournament) return null;

  const rawTourn = tournament.raw || tournament;
  const teamSize: number = rawTourn.team_size || 3;
  const isAiReferee = rawTourn.referee_mode !== "manual" && rawTourn.ai_referee_enabled !== false;
  const requireKd: boolean = Boolean(rawTourn.require_kd_verification);
  const minKdLimit = rawTourn.min_kd_limit ? Number(rawTourn.min_kd_limit) : null;
  const maxKdLimit = rawTourn.max_kd_limit ? Number(rawTourn.max_kd_limit) : null;
  const kdMode =
    minKdLimit && maxKdLimit
      ? "range"
      : minKdLimit
      ? "min_only"
      : maxKdLimit
      ? "max_only"
      : "open";

  const [teamName, setTeamName] = useState(() => {
    return userProfile.clanTag
      ? `[${userProfile.clanTag}] Team ${userProfile.name}`
      : `Team ${userProfile.name || "Squad"}`;
  });

  // State for members
  const [members, setMembers] = useState<MemberInputState[]>(() => {
    const arr: MemberInputState[] = [];
    for (let i = 0; i < teamSize; i++) {
      arr.push({
        index: i,
        activisionId: i === 0 ? userProfile.activisionId || "" : "",
        file: null,
        previewUrl: null,
        isVerifying: false,
        result: null,
      });
    }
    return arr;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleMemberIdChange = (idx: number, value: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.index === idx ? { ...m, activisionId: value } : m))
    );
  };

  const handleMemberScreenshot = async (idx: number, file: File) => {
    const preview = URL.createObjectURL(file);
    const member = members[idx];

    // If Tournament is in Manual Referee mode, save screenshot for organizer review without blocking with AI OCR
    if (!isAiReferee) {
      setMembers((prev) =>
        prev.map((m) =>
          m.index === idx
            ? {
                ...m,
                file,
                previewUrl: preview,
                isVerifying: false,
                result: {
                  approved: true,
                  kd_ratio: 0,
                  is_authentic_game_screenshot: true,
                  activision_id_matched: true,
                  confidence: 100,
                  reason: "Screenshot salvato per la valutazione manuale dello staff.",
                },
              }
            : m
        )
      );
      toast({
        title: `Screenshot Membro #${idx + 1} Caricato! 📸`,
        description: "Salvato per la revisione manuale dell'organizzatore o co-organizzatori.",
      });
      return;
    }

    setMembers((prev) =>
      prev.map((m) =>
        m.index === idx
          ? {
              ...m,
              file,
              previewUrl: preview,
              isVerifying: true,
              result: null,
            }
          : m
      )
    );

    try {
      const analysis = await verifyMemberKdScreenshotWithAI(file, member.activisionId || "Player", {
        min_kd: minKdLimit,
        max_kd: maxKdLimit,
        kd_mode: kdMode,
      });

      setMembers((prev) =>
        prev.map((m) =>
          m.index === idx
            ? {
                ...m,
                isVerifying: false,
                result: analysis,
              }
            : m
        )
      );

      if (!analysis.approved) {
        toast({
          title:
            analysis.reason === ERROR_POST_GAME_UPLOADED_FOR_KD
              ? "Schermata Errata (Fine Partita)"
              : `Verifica IA Membro #${idx + 1} Rifiutata`,
          description: analysis.reason,
          variant: "destructive",
        });
      } else {
        toast({
          title: `Membro #${idx + 1} Verificato! ✅`,
          description: `Nome Activision e KD (${analysis.kd_ratio}) conformi ai requisiti.`,
        });
      }
    } catch (err: any) {
      console.warn("[RegistrationModal] Errore verifica membro:", err);
      setMembers((prev) =>
        prev.map((m) => (m.index === idx ? { ...m, isVerifying: false } : m))
      );
    }
  };

  const handleReverifyMember = async (idx: number) => {
    const member = members[idx];
    if (!member.file) return;

    if (!isAiReferee) {
      toast({
        title: "Arbitraggio Manuale Attivo",
        description: "Lo screenshot è già registrato e verrà esaminato dallo staff.",
      });
      return;
    }

    setMembers((prev) =>
      prev.map((m) => (m.index === idx ? { ...m, isVerifying: true } : m))
    );

    try {
      const analysis = await verifyMemberKdScreenshotWithAI(member.file, member.activisionId || "Player", {
        min_kd: minKdLimit,
        max_kd: maxKdLimit,
        kd_mode: kdMode,
      });

      setMembers((prev) =>
        prev.map((m) =>
          m.index === idx
            ? {
                ...m,
                isVerifying: false,
                result: analysis,
              }
            : m
        )
      );
    } finally {
      setMembers((prev) =>
        prev.map((m) => (m.index === idx ? { ...m, isVerifying: false } : m))
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentUser) {
      openAuthModal("login");
      return;
    }

    const cleanTeamName = teamName.trim();
    if (!cleanTeamName) {
      setErrorMsg("Inserisci il nome della tua squadra.");
      return;
    }

    // Check all members have Activision IDs and screenshots
    for (let i = 0; i < members.length; i++) {
      if (!members[i].activisionId.trim()) {
        setErrorMsg(`Inserisci l'Activision ID per il Giocatore #${i + 1}.`);
        return;
      }
      if (requireKd && !members[i].file) {
        setErrorMsg(`Carica lo screenshot del KD per il Giocatore #${i + 1} (dove sia visibile anche il nome Activision).`);
        return;
      }
      // Anti-Fake security check (only for AI mode)
      if (isAiReferee && members[i].result && members[i].result?.is_authentic_game_screenshot === false) {
        setErrorMsg(
          `Immagine non valida per Giocatore #${i + 1}: L'IA ha rilevato che la foto caricata non è uno screenshot delle statistiche di Call of Duty. Si prega di caricare lo screenshot corretto.`
        );
        return;
      }
    }

    // Check if any member failed KD or Activision match in AI mode
    if (isAiReferee && requireKd) {
      const failedMember = members.find((m) => m.result && !m.result.approved);
      if (failedMember) {
        if (failedMember.result?.is_authentic_game_screenshot === false) {
          setErrorMsg(
            `Immagine non valida per Giocatore #${failedMember.index + 1}: L'IA ha rilevato che la foto caricata non è uno screenshot delle statistiche di Call of Duty. Si prega di caricare lo screenshot corretto.`
          );
        } else {
          setErrorMsg(
            `Attenzione: Il Giocatore #${failedMember.index + 1} (${failedMember.activisionId}) non ha superato la verifica IA: ${failedMember.result?.reason}`
          );
        }
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Upload screenshots in parallel
      const processedMembers: TournamentMember[] = [];

      for (const m of members) {
        let proofUrl = "";
        if (m.file) {
          try {
            proofUrl = await uploadTournamentProof(m.file, "kd");
          } catch {
            proofUrl = m.previewUrl || "";
          }
        }

        processedMembers.push({
          activisionId: m.activisionId.trim(),
          screenshotUrl: proofUrl,
          detectedActivisionId: m.result?.detected_activision_id || m.activisionId.trim(),
          detectedKd: m.result?.kd_ratio || 1.8,
          isActivisionMatch: m.result?.is_activision_match ?? true,
          isKdCompliant: m.result?.approved ?? true,
          aiStatus: isAiReferee ? (m.result?.approved ? "approved" : "rejected") : "approved",
          aiReason: isAiReferee
            ? (m.result?.reason || "Verificato con successo da IA Vision.")
            : "In attesa di valutazione manuale dello staff torneo.",
        });
      }

      const initialStatus: "approved" | "pending_approval" = isAiReferee ? "approved" : "pending_approval";

      const newTeam: RegisteredTeam = {
        id: `reg_${tournament.id}_${currentUser.id}_${Date.now()}`,
        tournamentId: tournament.id,
        teamName: cleanTeamName,
        captainUserId: currentUser.id,
        captainName: userProfile.name || "Capitano",
        members: processedMembers,
        status: initialStatus,
        createdAt: new Date().toISOString(),
      };

      // 2. Save in bracket storage & local storage
      const existing = getRegisteredTeams(tournament.id);
      saveRegisteredTeams(tournament.id, [...existing.filter((t) => t.captainUserId !== currentUser.id), newTeam]);

      // 3. Try saving in Supabase tournament_registrations & tournament_team_chats
      try {
        await supabase.from("tournament_registrations").insert({
          tournament_id: tournament.id,
          user_id: currentUser.id,
          team_name: cleanTeamName,
          activision_ids: members.map((m) => m.activisionId).join(", "),
          approval_status: initialStatus,
          kd_ratio: processedMembers[0]?.detectedKd || null,
        });

        await supabase.from("tournament_team_chats").insert({
          tournament_id: tournament.id,
          team_name: cleanTeamName,
          user_id: currentUser.id,
          status: initialStatus,
        });
      } catch (dbErr) {
        console.warn("[Registration] Supabase insert fallback:", dbErr);
      }

      toast({
        title: isAiReferee ? "Iscrizione Squadra Convalidata! 🎯⚡" : "Iscrizione Registrata! 📋",
        description: isAiReferee
          ? `La squadra "${cleanTeamName}" con ${teamSize} componenti è stata approvata dall'IA Vision.`
          : `La squadra "${cleanTeamName}" è stata registrata. L'organizzatore o i co-organizzatori valuteranno manualmente gli screenshot per accettare la squadra.`,
      });

      refreshUserData();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("[TournamentRegistration Error]:", err);
      setErrorMsg(err.message || "Errore durante l'invio dell'iscrizione.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end sm:justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fade-in">
      <div className="relative w-full max-w-lg h-[100dvh] sm:h-auto sm:max-h-[90dvh] bg-[#0f1322] border-0 sm:border border-purple-900/60 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-3.5 sm:p-5 border-b border-purple-950/80 bg-gradient-to-r from-purple-950/50 via-[#121628] to-[#121628]">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                <span>Iscrizione Squadra</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  isAiReferee
                    ? "bg-purple-950 text-purple-300 border-purple-500/40"
                    : "bg-cyan-950 text-cyan-300 border-cyan-500/40"
                }`}>
                  {isAiReferee ? "Arbitro IA Vision" : "Valutazione Manuale"}
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate">
                {tournament.title} • {teamSize} {teamSize === 1 ? "Giocatore" : "Giocatori per Squadra"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Requirements Banner */}
        <div className="shrink-0 p-2.5 sm:p-3.5 bg-zinc-950/70 border-b border-purple-950/50 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-300 min-w-0 truncate">
            <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-bold shrink-0">Regole KD:</span>
            <span className="text-zinc-400 truncate">
              {kdMode === "open"
                ? "Aperto a qualsiasi KD"
                : kdMode === "min_only"
                ? `KD Minimo >= ${minKdLimit}`
                : kdMode === "max_only"
                ? `KD Massimo <= ${maxKdLimit}`
                : `Range KD: ${minKdLimit} - ${maxKdLimit}`}
            </span>
          </div>

          <span className={`text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${
            isAiReferee
              ? "bg-cyan-950 border-cyan-500/40 text-cyan-300"
              : "bg-amber-950 border-amber-500/40 text-amber-300"
          }`}>
            {isAiReferee ? "Arbitro IA Attivo" : "Valutazione Staff"}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 scrollbar-thin">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Team Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Nome Ufficiale Squadra *
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Es. Cyber Wolves Esport"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700/80 focus:border-purple-500 text-white text-xs outline-none"
            />
          </div>

          {/* Members List */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Componenti Squadra ({teamSize}) & Screenshot KD
              </label>
              <span className="text-[10px] text-zinc-500">
                Nome Activision + KD visibili nello screenshot
              </span>
            </div>

            {members.map((member, idx) => {
              const isCaptain = idx === 0;
              const hasResult = Boolean(member.result);
              const isApproved = member.result?.approved;

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                    hasResult
                      ? isApproved
                        ? "bg-emerald-950/20 border-emerald-500/50"
                        : "bg-rose-950/20 border-rose-500/50"
                      : "bg-zinc-900/80 border-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-purple-400" />
                      <span>{isCaptain ? "Giocatore 1 (Capitano)" : `Giocatore ${idx + 1}`}</span>
                    </span>

                    {member.isVerifying ? (
                      <span className="text-[10px] font-bold text-cyan-300 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Analisi IA Vision...</span>
                      </span>
                    ) : hasResult ? (
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                          !isAiReferee
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                            : isApproved
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        }`}
                      >
                        {!isAiReferee ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Screenshot per Staff</span>
                          </>
                        ) : isApproved ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Approvato IA</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>Richiede Revisione</span>
                          </>
                        )}
                      </span>
                    ) : null}
                  </div>

                  {/* Activision ID input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">
                      Nome Activision ID Esatto (con tag # se presente)
                    </label>
                    <input
                      type="text"
                      value={member.activisionId}
                      onChange={(e) => handleMemberIdChange(idx, e.target.value)}
                      placeholder="Es. Ghost_Killa#98213"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700/80 text-white text-xs outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Screenshot upload & IA Scanner */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-zinc-400">
                        Screenshot Statistiche KD (con nome visibile):
                      </span>
                      {member.file && (
                        <button
                          type="button"
                          onClick={() => handleReverifyMember(idx)}
                          className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Rianalizza</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex-1 py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                        <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="truncate">
                          {member.file ? member.file.name : "Carica Screenshot KD"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleMemberScreenshot(idx, f);
                          }}
                          className="hidden"
                        />
                      </label>

                      {member.previewUrl && (
                        <a
                          href={member.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-300 hover:text-white"
                          title="Visualizza Screenshot"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* IA Vision or Manual Verification Card */}
                  {hasResult && member.result && (
                    <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-[11px] space-y-1.5 animate-fade-in">
                      {!isAiReferee ? (
                        <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-1.5 text-xs">
                            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span>Screenshot salvato per la valutazione manuale dello staff</span>
                          </span>
                          <span className="text-[10px] font-bold text-amber-300 uppercase px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30">
                            In Revisione
                          </span>
                        </div>
                      ) : !member.result.approved ? (
                        <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/50 space-y-1">
                          <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>
                              {member.result.reason === ERROR_POST_GAME_UPLOADED_FOR_KD
                                ? "Schermata Fine Partita Rifiutata"
                                : member.result.is_authentic_game_screenshot === false
                                ? "Immagine Non Valida (Anti-Fake)"
                                : "Verifica Statistiche Non Superata"}
                            </span>
                          </div>
                          <p className="text-[11px] text-rose-200 leading-relaxed font-medium">
                            {member.result.reason}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1">
                            <span className="text-zinc-400">Nome Activision Rilevato:</span>
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="text-white">{member.result.detected_activision_id || member.activisionId}</span>
                              {member.result.is_activision_match ? (
                                <span className="text-emerald-400 text-[10px]">✅ Corrisponde</span>
                              ) : (
                                <span className="text-rose-400 text-[10px]">❌ Discrepanza</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400">Rapporto KD Rilevato:</span>
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="text-amber-300 text-xs">{member.result.kd_ratio}</span>
                              <span className="text-emerald-400 text-[10px]">✅ Conforme</span>
                            </div>
                          </div>

                          <p className="text-[10px] text-zinc-400 italic pt-1 border-t border-zinc-800/60">
                            {member.result.reason}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          </div>

          {/* Action buttons (pinned at bottom with safe area) */}
          <div className="shrink-0 p-3 sm:p-4 border-t border-purple-950/80 bg-[#0d101d] flex items-center justify-end gap-2 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] py-2 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              Annulla
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[42px] py-2.5 px-5 sm:px-6 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-purple-900/40 disabled:opacity-50 cursor-pointer active:scale-95 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Invio Iscrizione...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Conferma Iscrizione Squadra</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
