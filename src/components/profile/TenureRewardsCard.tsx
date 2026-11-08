import React, { useState } from "react";
import {
  Award,
  Crown,
  Check,
  Lock,
  Sparkles,
  Shield,
  Clock,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Palette,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  TENURE_REWARDS,
  TenureMilestone,
  calculateTenureMonths,
} from "./tenureRewardsData";

export const TenureRewardsCard: React.FC = () => {
  const {
    userProfile,
    currentUser,
    isUniversalAdmin,
    openAuthModal,
    claimTenureReward,
    refreshUserData,
  } = useSquad();

  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const isPro = userProfile.subscriptionTier === "pro" || isUniversalAdmin;
  const tenureMonths = calculateTenureMonths(
    userProfile.subscriptionTier,
    userProfile.proExpiresAt,
    userProfile.createdAt,
    isUniversalAdmin
  );

  const claimedRewards = userProfile.claimedTenureRewards || [];
  const unlockedFrames = userProfile.unlockedFrames || [];
  const unlockedBanners = userProfile.unlockedBanners || [];
  const activeFrame = userProfile.activeFrame || userProfile.avatarFrame || "base";
  const activeBanner = userProfile.bannerUrl || "";

  // Progress percentage (max 12 months = 100%)
  const progressPercent = Math.min(100, Math.round((tenureMonths / 12) * 100));

  const handleClaim = async (milestone: TenureMilestone) => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }
    setLoadingAction(`claim-${milestone.months}`);
    try {
      await claimTenureReward(milestone.months);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEquipFrame = async (frameId: string, frameName: string) => {
    if (!currentUser) return;
    setLoadingAction(`frame-${frameId}`);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          active_frame: frameId,
        })
        .eq("id", currentUser.id);

      if (error) throw error;
      await refreshUserData();
      toast({
        title: "Cornice Avatar Equipaggiata! 🎨",
        description: `La cornice "${frameName}" è ora visibile sul tuo avatar.`,
      });
    } catch (err: any) {
      toast({
        title: "Errore equipaggiamento",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEquipBanner = async (milestone: TenureMilestone) => {
    if (!currentUser) return;
    setLoadingAction(`banner-${milestone.banner.id}`);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          banner_url: milestone.banner.svgUrl,
        })
        .eq("id", currentUser.id);

      if (error) throw error;
      await refreshUserData();
      toast({
        title: "Banner Profilo Equipaggiato! 🖼️",
        description: `Il banner "${milestone.banner.name}" è ora attivo sul tuo profilo.`,
      });
    } catch (err: any) {
      toast({
        title: "Errore salvataggio banner",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Card with Tenure Status */}
      <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-gradient-to-r from-amber-950/60 via-[#13172e] to-purple-950/70 p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-extrabold text-amber-300 uppercase tracking-wider">
              <Award className="w-3.5 h-3.5" />
              Premi Fedeltà Anzianità Abbonamento
            </div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              Traguardi 3, 6, 9 e 12 Mesi
              {isUniversalAdmin && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500 text-black">
                  God Mode
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-sm">
              Rimani abbonato per riscattare cornici animate esclusive per l'avatar e banner prestigiosi per il tuo profilo.
            </p>
          </div>

          {/* Current tenure indicator */}
          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">
              Anzianità Pro
            </span>
            <div className="text-xl font-black text-amber-400 leading-tight">
              {isUniversalAdmin ? "12+ Mesi" : `${tenureMonths} ${tenureMonths === 1 ? "Mese" : "Mesi"}`}
            </div>
            <span className="text-[10px] text-zinc-400 font-semibold">
              {isPro ? "Abbonamento Attivo" : "Nessun abbonamento"}
            </span>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400">
            <span className={tenureMonths >= 3 ? "text-amber-400" : ""}>3 Mesi</span>
            <span className={tenureMonths >= 6 ? "text-slate-200" : ""}>6 Mesi</span>
            <span className={tenureMonths >= 9 ? "text-amber-300" : ""}>9 Mesi</span>
            <span className={tenureMonths >= 12 ? "text-cyan-400" : ""}>12 Mesi (1 Anno)</span>
          </div>

          <div className="relative w-full h-2.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-cyan-400 transition-all duration-700 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4 Milestones Cards */}
      <div className="space-y-3.5">
        {TENURE_REWARDS.map((milestone) => {
          const isClaimed = claimedRewards.includes(milestone.id);
          const isEligible = isUniversalAdmin || tenureMonths >= milestone.months;
          const isFrameEquipped = activeFrame === milestone.frame.id;
          const isBannerEquipped = activeBanner === milestone.banner.svgUrl;
          const isFrameUnlocked = isClaimed || unlockedFrames.includes(milestone.frame.id) || isUniversalAdmin;
          const isBannerUnlocked = isClaimed || unlockedBanners.includes(milestone.banner.id) || isUniversalAdmin;

          const isClaiming = loadingAction === `claim-${milestone.months}`;
          const isEquippingFrame = loadingAction === `frame-${milestone.frame.id}`;
          const isEquippingBanner = loadingAction === `banner-${milestone.banner.id}`;

          return (
            <div
              key={milestone.id}
              className={`relative rounded-2xl border transition-all p-3.5 sm:p-4 bg-[#101426] shadow-lg overflow-hidden ${
                isClaimed
                  ? "border-emerald-500/40 bg-gradient-to-b from-[#101426] to-[#0c1a17]"
                  : isEligible
                  ? "border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.2)] bg-gradient-to-b from-[#14182e] to-[#1c1608]"
                  : "border-zinc-800/80 opacity-85"
              }`}
            >
              {/* Top Details */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${milestone.badgeColor}`}
                  >
                    {milestone.badgeLabel}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">
                    Rarità: <span className="text-white font-extrabold">{milestone.frame.rarity}</span>
                  </span>
                </div>

                {isClaimed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Riscattato
                  </span>
                ) : isEligible ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-300 bg-amber-950/80 border border-amber-400/50 px-2.5 py-0.5 rounded-full animate-pulse shadow-md">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Disponibile!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                    <Lock className="w-3 h-3" />
                    Bloccato ({milestone.months} Mesi)
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div className="mb-3">
                <h4 className="text-sm font-extrabold text-white">
                  {milestone.title}
                </h4>
                <p className="text-[11px] text-zinc-300 mt-0.5">
                  {milestone.description}
                </p>
              </div>

              {/* Visual Showcase: Frame + Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3.5">
                {/* Frame Showcase */}
                <div className="rounded-xl border border-zinc-800 bg-[#0a0d18] p-2.5 flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl bg-purple-950/90 border-2 shrink-0 flex items-center justify-center transition-all ${
                      milestone.frame.borderClass
                    } ${milestone.frame.glowClass || ""}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-800 to-indigo-600 flex items-center justify-center text-white font-black text-[10px]">
                      {milestone.months}M
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase block">
                      Cornice Avatar
                    </span>
                    <span className="text-xs font-bold text-white block truncate">
                      {milestone.frame.name}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Bordo & Bagliore Esclusivo
                    </span>
                  </div>
                </div>

                {/* Banner Showcase */}
                <div className="rounded-xl border border-zinc-800 bg-[#0a0d18] p-1.5 overflow-hidden flex flex-col justify-between">
                  <div className="relative h-12 w-full rounded-lg overflow-hidden border border-white/10">
                    <img
                      src={milestone.banner.svgUrl}
                      alt={milestone.banner.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="px-1 pt-1 flex items-center justify-between text-[10px]">
                    <span className="font-bold text-zinc-300 truncate">
                      {milestone.banner.name}
                    </span>
                    <span className="text-cyan-400 font-extrabold shrink-0">
                      Banner HD
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                {isClaimed || isFrameUnlocked ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Equip Frame Button */}
                    <button
                      onClick={() => handleEquipFrame(milestone.frame.id, milestone.frame.name)}
                      disabled={isEquippingFrame || isFrameEquipped}
                      className={`flex-1 sm:flex-initial py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isFrameEquipped
                          ? "bg-zinc-800 text-zinc-400 cursor-default"
                          : "bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
                      }`}
                    >
                      {isEquippingFrame ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isFrameEquipped ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Cornice in uso</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Equipaggia Cornice</span>
                        </>
                      )}
                    </button>

                    {/* Equip Banner Button */}
                    <button
                      onClick={() => handleEquipBanner(milestone)}
                      disabled={isEquippingBanner || isBannerEquipped}
                      className={`flex-1 sm:flex-initial py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isBannerEquipped
                          ? "bg-zinc-800 text-zinc-400 cursor-default"
                          : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm"
                      }`}
                    >
                      {isEquippingBanner ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isBannerEquipped ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Banner in uso</span>
                        </>
                      ) : (
                        <>
                          <Palette className="w-3.5 h-3.5 text-cyan-200" />
                          <span>Equipaggia Banner</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : isEligible ? (
                  <button
                    onClick={() => handleClaim(milestone)}
                    disabled={isClaiming}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all cursor-pointer active:scale-98"
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Riscatto in corso su Supabase...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-black fill-black" />
                        <span>Riscatta Cornice & Banner ({milestone.badgeLabel})</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-between text-xs text-zinc-400 bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      {isPro
                        ? `Mancano ${Math.max(1, milestone.months - tenureMonths)} mesi di abbonamento Pro`
                        : `Richiede abbonamento Player Pro attivo`}
                    </span>
                    {!isPro && (
                      <span className="text-[10px] font-bold text-amber-400">
                        Passa a Pro →
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
