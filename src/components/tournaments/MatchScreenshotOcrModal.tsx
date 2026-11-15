import React, { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  Trophy,
  Swords,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Eye,
  Camera,
  Coins,
  ArrowRight,
  Flame,
  Crosshair,
  UserCheck,
  Ban,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSquad } from "@/context/SquadContext";
import { toast } from "@/components/ui/use-toast";
import {
  arbitrateTournamentScreenshotWithGemini,
  GeminiTournamentRefereeResult,
  fetchUserAndClanTournamentContext,
  getGeminiTournamentApiKey,
} from "@/services/geminiTournamentRefereeService";
import { MatchScreenshotAnalysis } from "@/services/openRouterService";

export interface TournamentMatchItem {
  id: string;
  tournament_id: string;
  round_name: string;
  player1_id?: string | null;
  player2_id?: string | null;
  score_player1: number;
  score_player2: number;
  status: "pending" | "in_progress" | "completed" | "disputed";
  screenshot_url?: string | null;
  ai_parsed_data?: any;
  played_at?: string | null;
  player1_name?: string;
  player2_name?: string;
}

interface MatchScreenshotOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: TournamentMatchItem | null;
  tournamentRules?: string;
  gameMode?: string;
  onMatchUpdated: () => void;
}

export const MatchScreenshotOcrModal: React.FC<MatchScreenshotOcrModalProps> = ({
  isOpen,
  onClose,
  match,
  tournamentRules,
  gameMode,
  onMatchUpdated,
}) => {
  const { currentUser, userProfile, openAuthModal } = useSquad();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Gemini 2.5 Flash strict referee result & rejection state
  const [refereeResult, setRefereeResult] = useState<GeminiTournamentRefereeResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Editable extracted statistics
  const [extractedPlacement, setExtractedPlacement] = useState<number | null>(null);
  const [score1, setScore1] = useState<number>(0);
  const [score2, setScore2] = useState<number>(0);

  if (!isOpen || !match) return null;

  const player1Display =
    match.player1_name ||
    match.ai_parsed_data?.team1_name ||
    "Giocatore / Squadra 1";

  const player2Display =
    match.player2_name ||
    match.ai_parsed_data?.team2_name ||
    "Giocatore / Squadra 2";

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setRefereeResult(null);
      setValidationError(null);
      setExtractedPlacement(null);
    }
  };

  /**
   * Arbitrage screenshot using Google Gemini 2.5 Flash with strict rules:
   * 1. Identity Check (username, Activision ID, Clan members from Supabase)
   * 2. Eliminazioni vs Assist (clean kills only)
   * 3. Authentic post-match COD screen
   */
  const handleAnalyzeScreenshot = async () => {
    if (!selectedFile) {
      toast({
        title: "Screenshot mancante",
        description: "Seleziona prima uno screenshot della schermata finale del match di Call of Duty.",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser) {
      openAuthModal("login");
      return;
    }

    setIsProcessing(true);
    setValidationError(null);

    try {
      // 1. Fetch dynamic Supabase user & clan context and teammates
      const userContext = await fetchUserAndClanTournamentContext(currentUser.id, [
        player1Display,
        player2Display,
      ]);

      // 2. Call Google Gemini 2.5 Flash REST endpoint
      const result = await arbitrateTournamentScreenshotWithGemini({
        file: selectedFile,
        userId: currentUser.id,
        extraTeammates: [player1Display, player2Display],
      });

      // 3. Evaluate strict validation result
      if (!result.valid) {
        // BLOCK IMMEDIATELY: clear any score or placement
        setRefereeResult(result);
        setValidationError(result.reason);
        setExtractedPlacement(null);
        setScore1(0);
        setScore2(0);

        toast({
          title: "Arbitraggio Rifiutato dall'Arbitro IA",
          description: result.reason,
          variant: "destructive",
        });
        return;
      }

      // VALID: populate extracted placement & kills
      setRefereeResult(result);
      setValidationError(null);

      const parsedPlacement = result.placement !== null && result.placement !== undefined ? result.placement : 1;
      const parsedKills = result.kills !== null && result.kills !== undefined ? result.kills : 0;

      setExtractedPlacement(parsedPlacement);
      setScore1(parsedKills);
      setScore2(0);

      toast({
        title: "Screenshot Convalidato dall'Arbitro IA! 🎯",
        description: `Identità verificata (${result.matched_player || player1Display}). Piazzamento #${parsedPlacement} • ${parsedKills} Kill pulite registrate.`,
      });
    } catch (err: any) {
      console.error("[MatchOCR] Errore analisi Gemini 2.5 Flash:", err);
      const msg = err.message || "Impossibile analizzare l'immagine con Gemini 2.5 Flash.";
      setValidationError(msg);
      setRefereeResult(null);
      setExtractedPlacement(null);
      setScore1(0);
      setScore2(0);

      toast({
        title: "Errore Arbitraggio Gemini 2.5 Flash",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Save extracted placement & kills to Supabase database.
   * STRICT BLOCK: If valid is false or missing, abort immediately!
   */
  const handleSaveAndConfirmMatch = async () => {
    if (!match || !currentUser) return;

    // RIGOROUS BLOCK: valid must be true
    if (!refereeResult || refereeResult.valid !== true) {
      toast({
        title: "Invio Bloccato da Supabase",
        description:
          validationError ||
          refereeResult?.reason ||
          "Lo screenshot non è stato approvato dall'arbitro IA. È obbligatorio uno screenshot valido prima del salvataggio.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      let uploadedScreenshotUrl = match.screenshot_url || "";

      // 1. Upload screenshot to Supabase Storage if a new file was provided
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop() || "jpg";
        const storagePath = `tournament_matches/${match.tournament_id}/${match.id}_${Date.now()}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from("social-media")
          .upload(storagePath, selectedFile, { upsert: true });

        if (!uploadErr) {
          const { data: pubData } = supabase.storage
            .from("social-media")
            .getPublicUrl(storagePath);
          uploadedScreenshotUrl = pubData.publicUrl;
        } else {
          console.warn("[MatchOCR] Upload storage warning:", uploadErr);
        }
      }

      const winnerKey =
        score1 > score2 ? "player1" : score2 > score1 ? "player2" : "draw";

      const verifiedPlacement = extractedPlacement ?? refereeResult.placement ?? 1;
      const verifiedKills = refereeResult.kills ?? score1;

      const updatedParsedData = {
        ...(match.ai_parsed_data || {}),
        team1_name: player1Display,
        team2_name: player2Display,
        referee_gemini_2_5_flash: refereeResult,
        placement: verifiedPlacement,
        kills: verifiedKills,
        matched_player: refereeResult.matched_player,
        referee_reason: refereeResult.reason,
        verified_by: userProfile.name,
        verified_at: new Date().toISOString(),
        winner: winnerKey,
      };

      // 2. Update tournament_matches row in Supabase with verified fields
      const { error: updateMatchErr } = await supabase
        .from("tournament_matches")
        .update({
          score_player1: score1,
          score_player2: score2,
          status: "completed",
          screenshot_url: uploadedScreenshotUrl || null,
          ai_parsed_data: updatedParsedData,
          played_at: new Date().toISOString(),
        })
        .eq("id", match.id);

      if (updateMatchErr) throw updateMatchErr;

      // 3. Update tournament_leaderboards in real-time with extracted kills and placement points
      const team1Id = match.player1_id ? `player_${match.player1_id}` : `team_p1_${match.id.slice(0, 6)}`;
      const { data: existingTeam1 } = await supabase
        .from("tournament_leaderboards")
        .select("*")
        .eq("tournament_id", match.tournament_id)
        .eq("team_id", team1Id)
        .maybeSingle();

      const placementScore = verifiedPlacement === 1 ? 15 : verifiedPlacement === 2 ? 10 : verifiedPlacement <= 5 ? 5 : 1;
      const team1ScoreEarned = placementScore + verifiedKills * 2;

      if (existingTeam1) {
        await supabase
          .from("tournament_leaderboards")
          .update({
            total_kills: (existingTeam1.total_kills || 0) + verifiedKills,
            total_score: (existingTeam1.total_score || 0) + team1ScoreEarned,
            matches_played: (existingTeam1.matches_played || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingTeam1.id);
      } else {
        await supabase.from("tournament_leaderboards").insert({
          tournament_id: match.tournament_id,
          team_id: team1Id,
          team_name: player1Display,
          total_kills: verifiedKills,
          total_score: team1ScoreEarned,
          matches_played: 1,
        });
      }

      // 4. Send official verification announcement in match room chat
      const { data: chats } = await supabase
        .from("tournament_match_chats")
        .select("id")
        .eq("tournament_id", match.tournament_id)
        .limit(1);

      if (chats && chats.length > 0) {
        await supabase.from("tournament_messages").insert({
          match_chat_id: chats[0].id,
          sender_id: currentUser.id,
          message: `🏁 Risultato Ufficiale ${match.round_name}: ${player1Display} (Piazzamento #${verifiedPlacement}, ${verifiedKills} Kill). Convalidato dall'Arbitro IA Google Gemini 2.5 Flash [Identità confermata: ${refereeResult.matched_player || player1Display}].`,
          image_url: uploadedScreenshotUrl || null,
          is_screenshot: true,
          ai_status: "verified",
          detected_kills: verifiedKills,
          detected_placement: verifiedPlacement,
          score_awarded: team1ScoreEarned,
        });
      }

      toast({
        title: "Match Convalidato & Classifica Aggiornata! 🏆",
        description: `Piazzamento #${verifiedPlacement} e ${verifiedKills} Kill registrati con successo nel database Supabase.`,
      });

      onMatchUpdated();
      onClose();
    } catch (err: any) {
      console.error("[MatchOCR] Errore salvataggio Supabase:", err);
      toast({
        title: "Errore durante il salvataggio",
        description: err.message || "Impossibile aggiornare il match su Supabase.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isGeminiApproved = refereeResult?.valid === true;
  const isGeminiRejected = refereeResult !== null && refereeResult.valid === false;

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
        <div className="relative w-full max-w-lg rounded-3xl bg-[#0f1322] border border-purple-500/40 p-4 sm:p-6 shadow-[0_0_40px_rgba(139,92,246,0.3)] overflow-hidden max-h-[92dvh] flex flex-col">
          {/* Top Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-900/90 transition-colors z-10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="pb-3 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 uppercase tracking-wider">
                {match.round_name}
              </span>
              <span className="text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Gemini 2.5 Flash Arbitro</span>
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-extrabold text-white mt-1">
              Arbitraggio Screenshot &amp; Risultati Match
            </h3>
            <p className="text-[11px] text-zinc-400">
              Verifica inflessibile: Identità giocatore/team, estrazione Kill pulite (senza assist) e validità schermata post-match.
            </p>
          </div>

          {/* Modal Scroll Body */}
          <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 text-xs">
            {/* Match Teams VS Banner */}
            <div className="bg-[#121628] border border-purple-900/40 rounded-2xl p-3 flex items-center justify-between">
              {/* Player 1 */}
              <div className="flex-1 text-center min-w-0">
                <span className="text-[10px] text-zinc-400 block font-medium">Giocatore/Squadra</span>
                <span className="text-xs sm:text-sm font-extrabold text-white truncate block">
                  {player1Display}
                </span>
                <span className="text-base sm:text-lg font-black text-cyan-400 mt-0.5 block">
                  {score1} <span className="text-xs font-semibold text-zinc-400">Kill</span>
                </span>
              </div>

              <div className="px-3 shrink-0 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400">
                  <Swords className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-[9px] font-extrabold text-zinc-500 uppercase mt-1">VS</span>
              </div>

              {/* Player 2 */}
              <div className="flex-1 text-center min-w-0">
                <span className="text-[10px] text-zinc-400 block font-medium">Avversario / Lobby</span>
                <span className="text-xs sm:text-sm font-extrabold text-white truncate block">
                  {player2Display}
                </span>
                <span className="text-base sm:text-lg font-black text-rose-400 mt-0.5 block">
                  {extractedPlacement !== null ? `#${extractedPlacement}` : "Piazz."}
                </span>
              </div>
            </div>

            {/* Screenshot Upload Zone */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                <span>Screenshot Schermata Finale Call of Duty:</span>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setRefereeResult(null);
                      setValidationError(null);
                      setExtractedPlacement(null);
                    }}
                    className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                  >
                    Rimuovi
                  </button>
                )}
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleSelectFile}
                className="hidden"
              />

              {previewUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-purple-500/50 group bg-black/60">
                  <img
                    src={previewUrl}
                    alt="Screenshot Match"
                    className="w-full max-h-48 sm:max-h-56 object-contain mx-auto"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs cursor-pointer"
                    >
                      Cambia Immagine
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-900/60 hover:border-purple-500/60 rounded-2xl p-6 text-center cursor-pointer transition-all bg-purple-950/20 hover:bg-purple-950/30 space-y-2"
                >
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-900/40 flex items-center justify-center text-purple-300">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Clicca per caricare la schermata post-partita
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Schermata di fine match CoD con colonna Eliminazioni pulite e Posizionamento
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Analyze Button */}
            {selectedFile && !isGeminiApproved && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleAnalyzeScreenshot}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(139,92,246,0.35)] transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Gemini 2.5 Flash sta eseguendo l'arbitraggio inflessibile...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Esegui Arbitraggio con Gemini 2.5 Flash</span>
                  </>
                )}
              </button>
            )}

            {/* 1. SEVERE REJECTION ALERT BOX (valid: false) */}
            {(isGeminiRejected || validationError) && (
              <div className="bg-rose-950/40 border border-rose-500/60 rounded-2xl p-4 space-y-2 animate-fade-in shadow-xl">
                <div className="flex items-center gap-2">
                  <Ban className="w-5 h-5 text-rose-400 shrink-0" />
                  <span className="text-xs font-black text-rose-300 uppercase tracking-wide">
                    Arbitraggio Rifiutato (Invio a Supabase Bloccato)
                  </span>
                </div>
                <div className="text-xs text-rose-200 leading-relaxed font-medium bg-black/40 p-3 rounded-xl border border-rose-900/50">
                  {validationError || refereeResult?.reason}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Lo screenshot non rispetta i requisiti di identità, schermata autentica o conteggio kill. Carica una schermata conforme per procedere.
                  </span>
                </div>
              </div>
            )}

            {/* 2. SUCCESS APPROVAL BOX (valid: true) */}
            {isGeminiApproved && refereeResult && (
              <div className="bg-[#121628] border border-emerald-500/60 rounded-2xl p-4 space-y-3 animate-fade-in shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-extrabold text-emerald-300">
                      Screenshot Ufficiale Convalidato
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                    gemini-2.5-flash: APPROVED
                  </span>
                </div>

                {/* Extracted Player Identity & Match Data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-cyan-400" />
                      Giocatore Verificato:
                    </span>
                    <span className="font-extrabold text-white block truncate">
                      {refereeResult.matched_player || "Nome Utente Riconosciuto"}
                    </span>
                  </div>

                  <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      Piazzamento Finale:
                    </span>
                    <span className="font-extrabold text-amber-300 block">
                      #{extractedPlacement !== null ? extractedPlacement : "N/D"}
                    </span>
                  </div>
                </div>

                {/* Score Controls */}
                <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-300">
                      Eliminazioni Pulite Rilevate (Senza Assist):
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                      Assist Esclusi
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={score1}
                      onChange={(e) => setScore1(Number(e.target.value))}
                      className="w-24 p-2 bg-zinc-950 border border-zinc-700 rounded-lg text-base text-cyan-400 font-black text-center"
                    />
                    <span className="text-[11px] text-zinc-400">
                      Kill effettive assegnate a <strong className="text-white">{player1Display}</strong> per la classifica.
                    </span>
                  </div>
                </div>

                {/* Reason explanation text */}
                {refereeResult.reason && (
                  <div className="text-[11px] text-zinc-300 italic bg-black/40 p-2.5 rounded-xl border border-zinc-800">
                    "{refereeResult.reason}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Save & Confirm Button */}
          <div className="pt-3 border-t border-zinc-800 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Chiudi
            </button>

            <button
              type="button"
              disabled={isProcessing || !isGeminiApproved}
              onClick={handleSaveAndConfirmMatch}
              className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isGeminiApproved
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60"
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Salvataggio su Supabase in corso...</span>
                </>
              ) : isGeminiApproved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Salva Risultati Estratti su Supabase</span>
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 text-zinc-500" />
                  <span>Invio Bloccato (Richiede Arbitraggio Approvato)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
