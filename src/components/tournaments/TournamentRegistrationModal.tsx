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
  Target,
  Layers,
  ArrowRight,
  Eye,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  uploadTournamentProof,
  verifyKDProofWithAI,
  KDVerificationResult,
} from "@/services/tournamentVerificationService";

interface TournamentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: any;
  onSuccess?: () => void;
}

export const TournamentRegistrationModal: React.FC<TournamentRegistrationModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onSuccess,
}) => {
  const { currentUser, userProfile, openAuthModal, sCoinBalance } = useSquad();

  const [teamName, setTeamName] = useState(() => {
    return userProfile.clanTag
      ? `[${userProfile.clanTag}] Team ${userProfile.name}`
      : `Team ${userProfile.name}`;
  });
  const [activisionIds, setActivisionIds] = useState(userProfile.activisionId || "");
  const [selectedLobby, setSelectedLobby] = useState<"A" | "B">("A");
  const [notes, setNotes] = useState("");

  // KD Verification Screenshot State
  const [kdFile, setKdFile] = useState<File | null>(null);
  const [kdPreviewUrl, setKdPreviewUrl] = useState<string | null>(null);
  const [isVerifyingKd, setIsVerifyingKd] = useState(false);
  const [kdAnalysis, setKdAnalysis] = useState<KDVerificationResult | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !tournament) return null;

  const rawTourn = tournament.raw || tournament;
  const isDoubleLobby = Boolean(rawTourn.double_lobby_enabled);
  const requireKd = Boolean(rawTourn.require_kd_verification);
  const maxKdLimit = rawTourn.max_kd_limit ? Number(rawTourn.max_kd_limit) : null;
  const minKdLimit = rawTourn.min_kd_limit ? Number(rawTourn.min_kd_limit) : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setKdFile(file);
    setKdPreviewUrl(URL.createObjectURL(file));
    setErrorMsg(null);

    // Auto-analyze KD with AI immediately
    setIsVerifyingKd(true);
    try {
      const result = await verifyKDProofWithAI(file, {
        min_kd: minKdLimit,
        max_kd: maxKdLimit,
      });
      setKdAnalysis(result);
      if (!result.approved) {
        setErrorMsg(result.reason);
      }
    } catch (err: any) {
      console.warn("[Registration] Errore verifica KD:", err);
    } finally {
      setIsVerifyingKd(false);
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

    if (requireKd && !kdFile) {
      setErrorMsg("Lo screenshot delle statistiche KD è obbligatorio per questo torneo.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload KD screenshot to storage if provided
      let uploadedKdUrl = "";
      if (kdFile) {
        uploadedKdUrl = await uploadTournamentProof(kdFile, "kd");
      }

      // Determine approval outcome from KD analysis
      const isApproved = requireKd ? Boolean(kdAnalysis?.approved) : true;
      const approvalStatus = isApproved ? "approved" : "rejected";
      const rejectionReason = !isApproved
        ? kdAnalysis?.reason ||
          "La foto non mostra chiaramente le statistiche di gioco o la voce K/D non rispetta i limiti stabiliti dal torneo."
        : null;
      if (kdFile) {
        uploadedKdUrl = await uploadTournamentProof(kdFile, "kd");
      }

      // 2. Resolve lobby id
      let targetLobbyId: string | null = null;
      let targetLobbyName = isDoubleLobby ? `Lobby ${selectedLobby}` : "Lobby Principale";

      const { data: lobbies } = await supabase
        .from("tournament_lobbies")
        .select("id, name, code")
        .eq("tournament_id", rawTourn.id);

      if (lobbies && lobbies.length > 0) {
        if (isDoubleLobby) {
          const matched = lobbies.find(
            (l) => l.code === selectedLobby || l.name.toUpperCase().includes(selectedLobby)
          );
          targetLobbyId = matched ? matched.id : lobbies[0].id;
          targetLobbyName = matched ? matched.name : `Lobby ${selectedLobby}`;
        } else {
          targetLobbyId = lobbies[0].id;
          targetLobbyName = lobbies[0].name;
        }
      }

      // 3. Insert into public.tournament_registrations
      const { data: regData, error: regError } = await supabase
        .from("tournament_registrations")
        .insert({
          tournament_id: rawTourn.id,
          user_id: currentUser.id,
          team_name: cleanTeamName,
          activision_ids: activisionIds.trim(),
          notes: notes.trim(),
          lobby_id: targetLobbyId,
          lobby_name: targetLobbyName,
          kd_ratio: kdAnalysis?.kd_ratio || null,
          kd_screenshot_url: uploadedKdUrl || null,
          approval_status: approvalStatus,
          rejection_reason: rejectionReason,
        })
        .select()
        .single();

      if (regError) {
        if (regError.code === "23505") {
          throw new Error("Sei già iscritto a questo torneo con il tuo account.");
        }
        throw regError;
      }

      // 4. Automatically create dedicated Team Chat with Lobby indication
      const { data: teamChat, error: chatError } = await supabase
        .from("tournament_team_chats")
        .insert({
          tournament_id: rawTourn.id,
          lobby_id: targetLobbyId,
          registration_id: regData?.id || null,
          team_name: cleanTeamName,
          user_id: currentUser.id,
          status: approvalStatus,
          rejection_reason: rejectionReason,
          kd_image_url: uploadedKdUrl || null,
        })
        .select()
        .single();

      if (chatError) {
        console.warn("[Registration] Errore creazione chat squadra:", chatError);
      }

      // 5. Post initial message in team chat with KD analysis
      if (teamChat) {
        const welcomeContent = requireKd
          ? isApproved
            ? `🎯 Verifica KD APPROVATA dall'Arbitro IA!\n` +
              `• Voce K/D rilevata: ${kdAnalysis?.kd_ratio ?? "N/D"}\n` +
              `• Esito: ✅ CONFORME AI LIMITI\n` +
              `🏆 L'iscrizione della squadra "${cleanTeamName}" in ${targetLobbyName} è APPROVATA e l'accesso al torneo è SBLOCCATO!`
            : `⚠️ Verifica KD RIFIUTATA dall'Arbitro IA:\n` +
              `• Motivo: ${rejectionReason}\n` +
              `• Esito: ❌ ISCRIZIONE RIFIUTATA\n\n` +
              `Puoi caricare uno screenshot nitido e conforme con la voce 'K/D' o 'Rapporto Kill/Morte' direttamente in questa chat per richiedere una nuova revisione.`
          : `🎮 Squadra "${cleanTeamName}" iscritta con successo in ${targetLobbyName}. Benvenuti nel torneo!`;

        await supabase.from("tournament_chat_messages").insert({
          chat_id: teamChat.id,
          sender_id: currentUser.id,
          message_type: requireKd ? "kd_verification" : "text",
          image_url: uploadedKdUrl || null,
          image_type: "kd_proof",
          content: welcomeContent,
          ai_verification_result: kdAnalysis ? { ...kdAnalysis, verified_at: new Date().toISOString() } : null,
        });
      }

      // 6. Seed into tournament_leaderboards for that lobby
      await supabase.from("tournament_leaderboards").upsert(
        {
          tournament_id: rawTourn.id,
          team_id: `team_${cleanTeamName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
          team_name: cleanTeamName,
          lobby_id: targetLobbyId,
          lobby_name: targetLobbyName,
          total_kills: 0,
          total_score: 0,
          matches_played: 0,
        },
        { onConflict: "tournament_id,team_id" }
      );

      toast({
        title: "Iscrizione Inviata con Successo! 🚀",
        description: `La squadra "${cleanTeamName}" è stata assegnata a ${targetLobbyName}. La chat dedicata è attiva.`,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("[Registration] Errore:", err);
      setErrorMsg(err.message || "Errore durante l'iscrizione. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#0f1322] border border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_40px_rgba(139,92,246,0.3)] my-6 max-h-[90vh] overflow-y-auto">
        {/* Ambient Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 bg-gradient-to-r from-purple-600/30 to-cyan-500/30 rounded-full blur-2xl pointer-events-none" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center pb-3">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-950/70 border border-purple-500/40 text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1.5">
            <Trophy className="w-3 h-3 text-amber-400" />
            Iscrizione Ufficiale
          </div>
          <h3 className="text-base font-black text-white">{rawTourn.name || rawTourn.title}</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configura la tua squadra e invia i dati per l'accesso al tabellone
          </p>
        </div>

        {/* Feedback error */}
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Team Name */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Nome Squadra / Team <span className="text-purple-400">*</span>
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Es. Ghost Recon Squad"
                className="w-full bg-[#13172c] border border-zinc-800 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Activision ID */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Activision ID Membri
            </label>
            <div className="relative">
              <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={activisionIds}
                onChange={(e) => setActivisionIds(e.target.value)}
                placeholder="Es. Cap#1234, Ghost#5678, Soap#9999"
                className="w-full bg-[#13172c] border border-zinc-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Double Lobby Selection (if enabled) */}
          {isDoubleLobby && (
            <div className="p-3 bg-[#13172c] border border-cyan-500/30 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Assegnazione Lobby</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-snug">
                Questo torneo prevede due lobby distinte. Seleziona la preferenza (l'organizzatore o l'IA possono bilanciarla in seguito).
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedLobby("A")}
                  className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedLobby === "A"
                      ? "bg-cyan-600/30 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span>Lobby A</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLobby("B")}
                  className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedLobby === "B"
                      ? "bg-purple-600/30 border-purple-400 text-purple-300 shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span>Lobby B</span>
                </button>
              </div>
            </div>
          )}

          {/* KD Verification Section */}
          {requireKd && (
            <div className="p-3 bg-[#13172c] border border-amber-500/30 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span>Verifica KD Obbligatoria</span>
                </div>
                {maxKdLimit && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Max KD: {maxKdLimit.toFixed(2)}
                  </span>
                )}
              </div>

              <p className="text-[10px] text-zinc-400 leading-snug">
                Carica uno screenshot nitido delle statistiche di gioco per verificare il tuo KD tramite l'Arbitro IA anti-smurf.
              </p>

              {/* Upload Input */}
              <label className="border-2 border-dashed border-zinc-700 hover:border-amber-400/60 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-zinc-900/60 hover:bg-zinc-900 transition-all text-center">
                <UploadCloud className="w-6 h-6 text-amber-400" />
                <span className="text-xs font-semibold text-zinc-200">
                  {kdFile ? kdFile.name : "Carica Foto Statistiche KD"}
                </span>
                <span className="text-[10px] text-zinc-500">PNG, JPG fino a 10MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Preview & AI Analysis Feedback */}
              {isVerifyingKd && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-300">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                  <span>Arbitro IA: scansione OCR del KD in corso...</span>
                </div>
              )}

              {kdAnalysis && !isVerifyingKd && (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                    kdAnalysis.approved
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}
                >
                  {kdAnalysis.approved ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-bold">
                      <span>KD Rilevato: {kdAnalysis.kd_ratio.toFixed(2)}</span>
                      <span className="text-[10px] opacity-75 font-normal">
                        ({kdAnalysis.confidence}% confidenza)
                      </span>
                    </div>
                    <p className="text-[11px] mt-0.5 opacity-90 leading-tight">
                      {kdAnalysis.reason}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Note per l'Organizzatore (Opzionale)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Es. Disponibili dalle 21:15"
              className="w-full bg-[#13172c] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || (requireKd && !kdFile) || (requireKd && kdAnalysis !== null && !kdAnalysis.approved)}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Iscrizione e creazione chat...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Conferma Iscrizione & Apri Chat di Squadra</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
