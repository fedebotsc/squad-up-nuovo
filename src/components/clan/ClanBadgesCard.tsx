import React, { useState, useEffect } from "react";
import {
  Shield,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Flame,
  Heart,
  Trophy,
  Clock,
  AlertTriangle,
  Skull,
  Ban,
  Lock,
  Crown,
  Award,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import {
  CLAN_BADGES,
  BadgeDefinition,
  getClanBadgeCounts,
  toggleClanBadgeVote,
  isUserEligibleToVote,
} from "@/services/badgeRatingService";
import { ProPlusPromoModal } from "@/components/subscription/ProPlusPromoModal";
import { toast } from "@/components/ui/use-toast";

interface ClanBadgesCardProps {
  clanId: string;
  clanName?: string;
  clanTag?: string;
  onOpenSubscriptionModal?: () => void;
}

export const ClanBadgesCard: React.FC<ClanBadgesCardProps> = ({
  clanId,
  clanName = "Clan",
  clanTag = "TAG",
  onOpenSubscriptionModal,
}) => {
  const { currentUser, userProfile, isUniversalAdmin, openAuthModal, clanData } = useSquad();
  const [badgeData, setBadgeData] = useState<{
    counts: Record<string, number>;
    userVotes: string[];
  }>({ counts: {}, userVotes: [] });

  const [activeTab, setActiveTab] = useState<"positive" | "negative">("positive");
  const [showPromoModal, setShowPromoModal] = useState(false);

  useEffect(() => {
    if (clanId) {
      const data = getClanBadgeCounts(clanId);
      setBadgeData(data);
    }
  }, [clanId]);

  const hasProVoteAccess = isUserEligibleToVote(userProfile, currentUser, clanData, isUniversalAdmin);
  const isClanMember = clanData?.id === clanId;

  const handleVoteBadge = (badge: BadgeDefinition) => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    if (isClanMember) {
      toast({
        title: "Operazione non consentita",
        description: "Non puoi votare o assegnare badge al tuo stesso Clan.",
        variant: "destructive",
      });
      return;
    }

    // Restriction: Player Pro or Clan Pro/Elite only
    if (!hasProVoteAccess) {
      setShowPromoModal(true);
      return;
    }

    const result = toggleClanBadgeVote(clanId, badge.id, currentUser.id);
    setBadgeData({ counts: result.counts, userVotes: result.userVotes });

    if (result.hasVoted) {
      toast({
        title: `Badge Clan Assegnato: ${badge.name}`,
        description: `Hai votato ${badge.name} per [${clanTag}] ${clanName}!`,
      });
    } else {
      toast({
        title: "Voto revocato",
        description: `Hai rimosso il badge ${badge.name}.`,
      });
    }
  };

  const getBadgeIcon = (iconName: string, className = "w-4 h-4") => {
    switch (iconName) {
      case "CheckCircle2":
        return <CheckCircle2 className={className} />;
      case "Flame":
        return <Flame className={className} />;
      case "Heart":
        return <Heart className={className} />;
      case "Trophy":
        return <Trophy className={className} />;
      case "Clock":
        return <Clock className={className} />;
      case "AlertTriangle":
        return <AlertTriangle className={className} />;
      case "Skull":
        return <Skull className={className} />;
      case "Ban":
        return <Ban className={className} />;
      default:
        return <Award className={className} />;
    }
  };

  const positiveBadges = CLAN_BADGES.filter((b) => b.type === "positive");
  const negativeBadges = CLAN_BADGES.filter((b) => b.type === "negative");

  const totalPositive = positiveBadges.reduce(
    (acc, b) => acc + (badgeData.counts[b.id] || 0),
    0
  );
  const totalNegative = negativeBadges.reduce(
    (acc, b) => acc + (badgeData.counts[b.id] || 0),
    0
  );
  const grandTotal = totalPositive + totalNegative;
  const positivePercentage =
    grandTotal > 0 ? Math.round((totalPositive / grandTotal) * 100) : null;

  return (
    <div className="rounded-2xl bg-zinc-900/80 border border-cyan-900/40 p-3.5 space-y-3 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              Valutazioni Clan &amp; Badge
            </h4>
            <p className="text-[10px] text-zinc-400">
              Reputazione reale rilasciata dai membri Player Pro e Clan Pro
            </p>
          </div>
        </div>

        {/* Clan Score percentage pill */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-950/80 border border-zinc-800 text-right">
          {positivePercentage !== null ? (
            <>
              <span
                className={`text-xs font-black ${
                  positivePercentage >= 75
                    ? "text-emerald-400"
                    : positivePercentage >= 50
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {positivePercentage}%
              </span>
              <span className="text-[9px] font-bold text-zinc-500 uppercase">Fiducia</span>
            </>
          ) : (
            <span className="text-[10px] font-bold text-zinc-500">Nessun voto</span>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="grid grid-cols-2 p-1 bg-zinc-950/70 rounded-xl border border-zinc-800/80 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("positive")}
          className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "positive"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pregi ({totalPositive})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("negative")}
          className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "negative"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <ThumbsDown className="w-3.5 h-3.5 text-rose-400" />
          <span>Criticità ({totalNegative})</span>
        </button>
      </div>

      {/* Pro Notice if user is not Pro */}
      {!hasProVoteAccess && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
          <div className="flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Passa a <strong>Player Pro</strong> per votare questo Clan</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPromoModal(true)}
            className="text-[10px] font-black uppercase text-amber-300 hover:text-white underline cursor-pointer shrink-0"
          >
            Scopri
          </button>
        </div>
      )}

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(activeTab === "positive" ? positiveBadges : negativeBadges).map((badge) => {
          const count = badgeData.counts[badge.id] || 0;
          const hasVoted = badgeData.userVotes.includes(badge.id);

          return (
            <div
              key={badge.id}
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                hasVoted
                  ? "bg-cyan-950/50 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                  : `${badge.badgeBg} ${badge.badgeBorder}`
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg bg-zinc-950/70 border border-zinc-800 flex items-center justify-center ${badge.color} shrink-0`}
                >
                  {getBadgeIcon(badge.iconName)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">
                      {badge.name}
                    </span>
                    {hasVoted && (
                      <span className="text-[9px] font-black px-1 py-0.2 rounded bg-cyan-500/30 text-cyan-300 border border-cyan-400/40">
                        Votato
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate max-w-[140px]">
                    {badge.description}
                  </p>
                </div>
              </div>

              {/* Vote Count & Action Button */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded-lg bg-zinc-950/90 border border-zinc-800 ${
                    count > 0 ? badge.color : "text-zinc-500"
                  }`}
                >
                  {count}
                </span>

                {!isClanMember && (
                  <button
                    type="button"
                    onClick={() => handleVoteBadge(badge)}
                    title={
                      hasProVoteAccess
                        ? hasVoted
                          ? "Rimuovi il tuo voto"
                          : `Vota ${badge.name}`
                        : "Riservato a Player Pro e Clan Pro"
                    }
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      hasVoted
                        ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm"
                        : hasProVoteAccess
                        ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                        : "bg-zinc-900/60 text-zinc-500 border border-zinc-800 hover:text-amber-400"
                    }`}
                  >
                    {hasProVoteAccess ? (
                      <span className="text-xs font-black">{hasVoted ? "✓" : "+"}</span>
                    ) : (
                      <Lock className="w-3 h-3 text-amber-400/70" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal promozionale Player Pro Plus */}
      <ProPlusPromoModal
        isOpen={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        onOpenSubscriptionModal={onOpenSubscriptionModal}
        title="Vota i Clan con Player Pro o Clan Pro"
        description="Assegnare badge di reputazione ai Clan richiede un abbonamento Player Pro o Clan Pro/Elite attivo."
      />
    </div>
  );
};
