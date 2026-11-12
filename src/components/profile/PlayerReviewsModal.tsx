import React, { useState, useEffect } from "react";
import {
  X,
  Star,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Award,
  Loader2,
  Tag,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { isUserEligibleToVote } from "@/services/badgeRatingService";
import { ProPlusPromoModal } from "@/components/subscription/ProPlusPromoModal";

interface PlayerReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId?: string;
  targetUserName?: string;
  onOpenSubscriptionModal?: () => void;
}

const POSITIVE_TAGS = [
  "Mira Laser",
  "Comunicazione Chiara",
  "Clutch Player",
  "Team First",
  "Paziente & Tattico",
  "Supporto Eccellente",
];

const NEGATIVE_TAGS = [
  "Rage Quit",
  "Tossico / Flame",
  "Senza Microfono",
  "AFK a Metà Partita",
  "Non Segue le Chiamate",
];

export const PlayerReviewsModal: React.FC<PlayerReviewsModalProps> = ({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
  onOpenSubscriptionModal,
}) => {
  const { currentUser, userProfile, openAuthModal, clanData, isUniversalAdmin } = useSquad();

  // Target defaults to current user's profile if omitted
  const actualTargetId = targetUserId || currentUser?.id;
  const actualTargetName = targetUserName || userProfile.name;
  const isSelf = currentUser && currentUser.id === actualTargetId;
  const hasProVoteAccess = isUserEligibleToVote(userProfile, currentUser, clanData, isUniversalAdmin);

  const [summary, setSummary] = useState<any>({
    total_ratings: 0,
    positive_percentage: null,
    skill_avg: null,
    communication_avg: null,
    teamplay_avg: null,
    fair_play_avg: null,
    reputation_badge: "Nuovo Operatore",
  });

  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPromoModal, setShowPromoModal] = useState(false);

  // Submission form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [stars, setStars] = useState(5);
  const [isPositive, setIsPositive] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !actualTargetId) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch summary via RPC
        const { data: sumData } = await supabase.rpc("get_player_ratings_summary", {
          p_target_id: actualTargetId,
        });

        if (sumData) {
          setSummary(sumData);
        }

        // 2. Fetch recent ratings
        const { data: list } = await supabase
          .from("player_ratings")
          .select("*, reviewer:reviewer_id(id, username, display_name, avatar_url, subscription_tier)")
          .eq("target_id", actualTargetId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (list) {
          setReviewsList(list);
        }
      } catch (err) {
        console.warn("[PlayerReviews] Errore caricamento recensioni:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isOpen, actualTargetId]);

  if (!isOpen) return null;

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    if (isSelf) {
      toast({
        title: "Non consentito",
        description: "Non puoi valutare il tuo stesso profilo.",
        variant: "destructive",
      });
      return;
    }

    if (!hasProVoteAccess) {
      setShowPromoModal(true);
      return;
    }

    setIsSubmitting(true);
    const scoreVal = Math.min(100, Math.max(20, stars * 20));

    try {
      // 1. Try RPC submit_player_rating
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("submit_player_rating", {
        p_target_id: actualTargetId,
        p_skill: scoreVal,
        p_communication: scoreVal,
        p_teamplay: scoreVal,
        p_fair_play: scoreVal,
        p_is_positive: isPositive,
        p_comment: comment.trim(),
        p_negative_tags: isPositive ? [] : selectedTags,
      });

      if (rpcErr) {
        // Direct insert fallback
        await supabase.from("player_ratings").upsert({
          reviewer_id: currentUser.id,
          target_id: actualTargetId,
          skill_score: scoreVal,
          communication_score: scoreVal,
          teamplay_score: scoreVal,
          fair_play_score: scoreVal,
          is_positive: isPositive,
          comment: comment.trim(),
          negative_tags: isPositive ? [] : selectedTags,
          updated_at: new Date().toISOString(),
        });
      }

      toast({
        title: "Valutazione Registrata! ⭐",
        description: `Hai valutato con successo l'operatore ${actualTargetName}.`,
      });

      setShowReviewForm(false);
      setComment("");
      setSelectedTags([]);

      // Reload
      const { data: sumData } = await supabase.rpc("get_player_ratings_summary", {
        p_target_id: actualTargetId,
      });
      if (sumData) setSummary(sumData);
    } catch (err: any) {
      console.error("[PlayerReviews] Errore salvataggio valutazione:", err);
      toast({
        title: "Errore salvataggio",
        description: err.message || "Impossibile inviare la valutazione.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0f1322] border border-cyan-500/40 p-5 shadow-[0_0_35px_rgba(6,182,212,0.25)] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 bg-gradient-to-r from-cyan-500/30 to-purple-600/30 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center pb-3 border-b border-zinc-800">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-extrabold text-cyan-300 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Reputazione Operatore
          </div>
          <h3 className="text-base font-extrabold text-white">
            Valutazioni & Recensioni
          </h3>
          <p className="text-[11px] text-zinc-400">
            Profilo di <strong className="text-white">{actualTargetName}</strong>
          </p>
        </div>

        {/* Reputation Summary Card */}
        <div className="my-3 rounded-2xl bg-gradient-to-br from-[#13172e] to-[#0c0f1c] border border-purple-500/30 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
              {summary.reputation_badge || "Operatore"}
            </span>
            <div className="flex items-center gap-1 text-xs font-black text-emerald-400">
              {summary.positive_percentage !== null ? (
                <>
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{summary.positive_percentage}% Positivi</span>
                </>
              ) : (
                <span className="text-zinc-500 text-[10px]">In attesa di voti</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center pt-1 border-t border-zinc-800/80 text-[10px]">
            <div>
              <span className="text-zinc-500 block">Mira</span>
              <span className="font-extrabold text-white text-xs">
                {summary.skill_avg !== null ? `${summary.skill_avg}/100` : "—"}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">Comms</span>
              <span className="font-extrabold text-cyan-300 text-xs">
                {summary.communication_avg !== null ? `${summary.communication_avg}/100` : "—"}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">Team</span>
              <span className="font-extrabold text-purple-300 text-xs">
                {summary.teamplay_avg !== null ? `${summary.teamplay_avg}/100` : "—"}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">Fair Play</span>
              <span className="font-extrabold text-emerald-300 text-xs">
                {summary.fair_play_avg !== null ? `${summary.fair_play_avg}/100` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Content list or Review Form */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {!showReviewForm ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-400 text-[11px] uppercase tracking-wider">
                  Recensioni ({reviewsList.length})
                </span>

                {!isSelf && (
                  <button
                    onClick={() => {
                      if (!hasProVoteAccess) {
                        setShowPromoModal(true);
                        return;
                      }
                      setShowReviewForm(true);
                    }}
                    className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
                    <span>Scrivi Recensione</span>
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="py-6 text-center text-zinc-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Caricamento recensioni...</span>
                </div>
              ) : reviewsList.length > 0 ? (
                <div className="space-y-2">
                  {reviewsList.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">
                            {rev.reviewer?.display_name || rev.reviewer?.username || "Compagno"}
                          </span>
                          {rev.reviewer?.subscription_tier === "pro" && (
                            <span className="text-[9px] font-extrabold px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              PRO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.round((rev.skill_score || 80) / 20)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-zinc-600"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {rev.comment && (
                        <p className="text-zinc-300 text-xs leading-relaxed">
                          "{rev.comment}"
                        </p>
                      )}

                      {rev.negative_tags && rev.negative_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {rev.negative_tags.map((t: string) => (
                            <span
                              key={t}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-500/30 text-rose-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-zinc-400 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 p-4">
                  <p>Ancora nessuna recensione per questo operatore.</p>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Gioca con lui e lascia il primo feedback post-partita!
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Review Submission Form */
            <form onSubmit={handleSubmitRating} className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                <span className="font-bold text-white text-xs">Nuova Valutazione</span>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Annulla
                </button>
              </div>

              {/* Star Rating */}
              <div className="text-center py-1">
                <label className="text-[11px] font-bold text-zinc-300 block mb-1.5">
                  Voto Generale (Stelle)
                </label>
                <div className="flex items-center justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStars(s)}
                      className="p-1 cursor-pointer transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          s <= stars
                            ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                            : "text-zinc-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Positive or Negative switch */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPositive(true);
                    setSelectedTags([]);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isPositive
                      ? "border-emerald-500 bg-emerald-950/30 text-emerald-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400"
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Consigliato</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPositive(false);
                    setSelectedTags([]);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    !isPositive
                      ? "border-rose-500 bg-rose-950/30 text-rose-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400"
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>Sotto le Attese</span>
                </button>
              </div>

              {/* Reputation Tags */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                  Tag di Reputazione {isPositive ? "Positivi" : "Critici"}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(isPositive ? POSITIVE_TAGS : NEGATIVE_TAGS).map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                          active
                            ? isPositive
                              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                              : "bg-rose-500/20 border-rose-400 text-rose-300"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment text */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                  Commento (opzionale)
                </label>
                <textarea
                  rows={2}
                  placeholder="Scrivi un feedback costruttivo sulla partita..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-[#121629] border border-zinc-800 rounded-xl p-2.5 text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>Invia Valutazione</span>
              </button>
            </form>
          )}
        </div>

        {/* Pro Plus Promo Modal */}
        <ProPlusPromoModal
          isOpen={showPromoModal}
          onClose={() => setShowPromoModal(false)}
          onOpenSubscriptionModal={onOpenSubscriptionModal}
          title="Vota con Player Pro o Clan Pro"
          description="Rilasciare recensioni e badge di reputazione a giocatori o clan è riservato agli utenti in possesso di un abbonamento Player Pro o Clan Pro/Elite."
        />
      </div>
    </div>
  );
};
