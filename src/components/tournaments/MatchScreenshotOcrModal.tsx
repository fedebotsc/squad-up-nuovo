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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSquad } from "@/context/SquadContext";
import { toast } from "@/components/ui/use-toast";
import {
  fileToBase64,
  analyzeMatchScreenshotWithAI,
  MatchScreenshotAnalysis,
} from "@/services/openRouterService";

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
  const [ocrResult, setOcrResult] = useState<MatchScreenshotAnalysis | null>(null);

  // Editable scores before saving
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
      setOcrResult(null);
    }
  };

  const handleAnalyzeScreenshot = async () => {
    if (!selectedFile) {
      toast({
        title: "Screenshot mancante",
        description: "Seleziona prima uno screenshot della schermata finale di gara.",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser) {
      openAuthModal("login");
      return;
    }

    setIsProcessing(true);

    try {
      const base64 = await fileToBase64(selectedFile);
      const mime = selectedFile.type || "image/jpeg";

      const analysis = await analyzeMatchScreenshotWithAI({
        imageBase64: base64,
        mimeType: mime,
        tournamentRules: tournamentRules || "Vince chi realizza più kill o gol.",
        matchInfo: {
          round_name: match.round_name,
          player1_name: player1Display,
          player2_name: player2Display,
          game_mode: gameMode || "Competitivo",
        },
      });

      setOcrResult(analysis);
      setScore1(analysis.score_player1);
      setScore2(analysis.score_player2);

      toast({
        title: "OCR IA Completato con Successo! 🎯",
        description: `Punteggio rilevato: ${player1Display} ${analysis.score_player1} - ${analysis.score_player2} ${player2Display} (Confidenza ${analysis.confidence}%).`,
      });
    } catch (err: any) {
      console.error("[MatchOCR] Errore analisi:", err);
      if (err.message && err.message.toLowerCase().includes("chiave")) {
        setIsKeyModalOpen(true);
      }
      toast({
        title: "Errore durante l'analisi OCR",
        description: err.message || "Impossibile analizzare l'immagine con Gemini Flash.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAndConfirmMatch = async () => {
    if (!match || !currentUser) return;

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

      const updatedParsedData = {
        ...(match.ai_parsed_data || {}),
        team1_name: player1Display,
        team2_name: player2Display,
        ocr_result: ocrResult,
        verified_by: userProfile.name,
        verified_at: new Date().toISOString(),
        winner: winnerKey,
      };

      // 2. Update tournament_matches row
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

      // 3. Update tournament_leaderboards in real-time for player1 / team1
      const team1Id = match.player1_id ? `player_${match.player1_id}` : `team_p1_${match.id.slice(0, 6)}`;
      const { data: existingTeam1 } = await supabase
        .from("tournament_leaderboards")
        .select("*")
        .eq("tournament_id", match.tournament_id)
        .eq("team_id", team1Id)
        .maybeSingle();

      const team1Kills = ocrResult?.player1_details?.kills ?? score1;
      const team1ScoreEarned = (winnerKey === "player1" ? 15 : 5) + team1Kills * 2;

      if (existingTeam1) {
        await supabase
          .from("tournament_leaderboards")
          .update({
            total_kills: (existingTeam1.total_kills || 0) + team1Kills,
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
          total_kills: team1Kills,
          total_score: team1ScoreEarned,
          matches_played: 1,
        });
      }

      // Update tournament_leaderboards for player2 / team2
      const team2Id = match.player2_id ? `player_${match.player2_id}` : `team_p2_${match.id.slice(0, 6)}`;
      const { data: existingTeam2 } = await supabase
        .from("tournament_leaderboards")
        .select("*")
        .eq("tournament_id", match.tournament_id)
        .eq("team_id", team2Id)
        .maybeSingle();

      const team2Kills = ocrResult?.player2_details?.kills ?? score2;
      const team2ScoreEarned = (winnerKey === "player2" ? 15 : 5) + team2Kills * 2;

      if (existingTeam2) {
        await supabase
          .from("tournament_leaderboards")
          .update({
            total_kills: (existingTeam2.total_kills || 0) + team2Kills,
            total_score: (existingTeam2.total_score || 0) + team2ScoreEarned,
            matches_played: (existingTeam2.matches_played || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingTeam2.id);
      } else {
        await supabase.from("tournament_leaderboards").insert({
          tournament_id: match.tournament_id,
          team_id: team2Id,
          team_name: player2Display,
          total_kills: team2Kills,
          total_score: team2ScoreEarned,
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
          message: `🏁 Risultato Ufficiale ${match.round_name}: ${player1Display} ${score1} - ${score2} ${player2Display}. Convalidato dall'Arbitro IA con screenshot.`,
          image_url: uploadedScreenshotUrl || null,
          is_screenshot: true,
          ai_status: "verified",
          detected_kills: team1Kills + team2Kills,
          detected_placement: winnerKey === "player1" ? 1 : 2,
          score_awarded: Math.max(team1ScoreEarned, team2ScoreEarned),
        });
      }

      toast({
        title: "Match Convalidato & Classifica Aggiornata! 🏆",
        description: `I punteggi (${score1} - ${score2}) e la classifica in tempo reale sono stati salvati su Supabase.`,
      });

      onMatchUpdated();
      onClose();
    } catch (err: any) {
      console.error("[MatchOCR] Errore salvataggio:", err);
      toast({
        title: "Errore durante il salvataggio",
        description: err.message || "Impossibile aggiornare il match su Supabase.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
        <div className="relative w-full max-w-lg rounded-3xl bg-[#0f1322] border border-purple-500/40 p-4 sm:p-6 shadow-[0_0_40px_rgba(139,92,246,0.3)] overflow-hidden max-h-[92vh] flex flex-col">
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
                <span>IA Arbitro Centralizzata</span>
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-extrabold text-white mt-1">
              Analisi Screenshot &amp; Risultato Match
            </h3>
            <p className="text-[11px] text-zinc-400">
              Carica lo screenshot finale: Gemini Flash estrarrà automaticamente gol, kill e vincitore convalidando la classifica.
            </p>
          </div>

          {/* Modal Scroll Body */}
          <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 text-xs">
            {/* Match Teams VS Banner */}
            <div className="bg-[#121628] border border-purple-900/40 rounded-2xl p-3 flex items-center justify-between">
              {/* Player 1 */}
              <div className="flex-1 text-center min-w-0">
                <span className="text-[10px] text-zinc-400 block font-medium">Giocatore/Squadra 1</span>
                <span className="text-xs sm:text-sm font-extrabold text-white truncate block">
                  {player1Display}
                </span>
                <span className="text-base sm:text-lg font-black text-cyan-400 mt-0.5 block">
                  {score1}
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
                <span className="text-[10px] text-zinc-400 block font-medium">Giocatore/Squadra 2</span>
                <span className="text-xs sm:text-sm font-extrabold text-white truncate block">
                  {player2Display}
                </span>
                <span className="text-base sm:text-lg font-black text-rose-400 mt-0.5 block">
                  {score2}
                </span>
              </div>
            </div>

            {/* Screenshot Upload Zone */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                <span>Screenshot Tabellone Finale o Vittoria:</span>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setOcrResult(null);
                    }}
                    className="text-[10px] text-rose-400 hover:underline"
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
                      className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs"
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
                      Clicca per caricare lo screenshot del match
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      PNG, JPG o WebP con tabellone dei punti, gol, kill o posizionamento
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Analyze Button */}
            {!ocrResult && selectedFile && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleAnalyzeScreenshot}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(139,92,246,0.35)] transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Gemini Flash sta eseguendo l'OCR del tabellone...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Esegui OCR con Gemini Flash (OpenRouter)</span>
                  </>
                )}
              </button>
            )}

            {/* OCR Extracted Result Box */}
            {ocrResult && (
              <div className="bg-[#121628] border border-emerald-500/50 rounded-2xl p-4 space-y-3 animate-fade-in shadow-md">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-extrabold text-emerald-300">
                      Risultato OCR Rilevato
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                    Confidenza {ocrResult.confidence}%
                  </span>
                </div>

                {/* Score Controls */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 block truncate">
                      Punteggio {player1Display}
                    </span>
                    <input
                      type="number"
                      value={score1}
                      onChange={(e) => setScore1(Number(e.target.value))}
                      className="w-full p-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-cyan-400 font-extrabold text-center"
                    />
                    {ocrResult.player1_details && (
                      <div className="text-[9px] text-zinc-400 space-y-0.5 pt-1">
                        {ocrResult.player1_details.kills !== undefined && (
                          <div>Kill: {ocrResult.player1_details.kills}</div>
                        )}
                        {ocrResult.player1_details.damage !== undefined && (
                          <div>Danno: {ocrResult.player1_details.damage}</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 block truncate">
                      Punteggio {player2Display}
                    </span>
                    <input
                      type="number"
                      value={score2}
                      onChange={(e) => setScore2(Number(e.target.value))}
                      className="w-full p-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-rose-400 font-extrabold text-center"
                    />
                    {ocrResult.player2_details && (
                      <div className="text-[9px] text-zinc-400 space-y-0.5 pt-1">
                        {ocrResult.player2_details.kills !== undefined && (
                          <div>Kill: {ocrResult.player2_details.kills}</div>
                        )}
                        {ocrResult.player2_details.damage !== undefined && (
                          <div>Danno: {ocrResult.player2_details.damage}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Winner Notice */}
                <div className="bg-amber-950/30 border border-amber-500/30 p-2 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-bold text-amber-200">
                      Vincitore designato:
                    </span>
                  </div>
                  <span className="font-extrabold text-white">
                    {score1 > score2
                      ? player1Display
                      : score2 > score1
                      ? player2Display
                      : "Pareggio"}
                  </span>
                </div>

                {/* Explanation */}
                {ocrResult.explanation && (
                  <p className="text-[10px] text-zinc-400 leading-relaxed italic bg-zinc-950/60 p-2 rounded-xl">
                    "{ocrResult.explanation}"
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer Save & Confirm Button */}
          <div className="pt-3 border-t border-zinc-800 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition-colors"
            >
              Chiudi
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSaveAndConfirmMatch}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Aggiornamento classifica in corso...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Conferma & Aggiorna Classifica Live</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
