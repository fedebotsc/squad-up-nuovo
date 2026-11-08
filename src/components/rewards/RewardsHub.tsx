import React, { useState, useEffect } from "react";
import {
  Award,
  Crown,
  Shield,
  Sparkles,
  CheckCircle2,
  Lock,
  ChevronRight,
  Flame,
  Loader2,
  Calendar,
  Zap,
  Crosshair,
  Terminal,
  Layers,
  Radio,
  Eye,
  Check,
  Palette,
  Users,
  Trophy,
  Swords,
  Target,
  ArrowUpRight,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  TENURE_REWARDS_DATA,
  CLAN_MILESTONES_DATA,
  PLAYER_ACHIEVEMENTS_DATA,
  TenureRewardItem,
  ClanMilestoneItem,
  PlayerAchievementItem,
} from "./rewardsData";
import { calculateTenureMonths } from "@/components/profile/tenureRewardsData";

export type RewardsTab = "tenure" | "clan" | "player";

interface RewardsHubProps {
  initialTab?: RewardsTab;
  onNavigateToShop?: () => void;
  onNavigateToClan?: () => void;
}

export const RewardsHub: React.FC<RewardsHubProps> = ({
  initialTab = "tenure",
  onNavigateToShop,
  onNavigateToClan,
}) => {
  const {
    userProfile,
    currentUser,
    clanData,
    isUniversalAdmin,
    openAuthModal,
    claimTenureReward,
    refreshUserData,
    setActiveTab,
  } = useSquad();

  const [activeTab, setActiveTabState] = useState<RewardsTab>(initialTab);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Player real stats from DB
  const [playerStats, setPlayerStats] = useState<{
    tournamentsCount: number;
    postsCount: number;
    tournamentsWon: number;
  }>({
    tournamentsCount: 0,
    postsCount: 0,
    tournamentsWon: 0,
  });

  // Calculate current tenure
  const isSuper = currentUser?.email?.toLowerCase() === "fedezdesimone@gmail.com" || isUniversalAdmin;
  const tenureMonths = calculateTenureMonths(
    userProfile.subscriptionTier,
    userProfile.proExpiresAt,
    userProfile.createdAt,
    isSuper
  );

  const claimedTenure = userProfile.claimedTenureRewards || [];
  const unlockedFrames = userProfile.unlockedFrames || [];
  const unlockedBanners = userProfile.unlockedBanners || [];
  const activeFrame = userProfile.activeFrame || userProfile.avatarFrame || "base";
  const activeBanner = userProfile.bannerUrl || "";

  // Player Profile Achievements custom state from profiles
  const unlockedTitles = (userProfile as any).unlockedTitles || [];
  const activeTitle = (userProfile as any).activeTitle || null;
  const unlockedBadges = (userProfile as any).unlockedBadges || [];
  const activeBadge = (userProfile as any).activeBadge || null;

  // Clan stats
  const isClanOwnerOrFounder =
    clanData && currentUser && (clanData.ownerId === currentUser.id || isSuper);
  const clanLevel = clanData?.level || 1;
  const clanTreasury = clanData?.treasurySC || 0;
  const clanTourneysWon = (clanData as any)?.tournamentsWon || 0;
  const unlockedClanRewards = (clanData as any)?.unlockedClanRewards || [];
  const activeClanBadge = (clanData as any)?.activeClanBadge || null;
  const activeClanTitle = (clanData as any)?.activeClanTitle || null;

  // Fetch real statistics for achievements
  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      if (!currentUser) return;
      try {
        // 1. Tournaments registered
        const { count: tournCount } = await supabase
          .from("tournament_registrations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", currentUser.id);

        // 2. Posts published
        const { count: postsCount } = await supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", currentUser.id);

        // 3. Tournaments won from profile
        const wonCount = isSuper ? 5 : (userProfile as any).tournamentsWon || 0;

        if (isMounted) {
          setPlayerStats({
            tournamentsCount: isSuper ? 10 : tournCount || 0,
            postsCount: isSuper ? 15 : postsCount || 0,
            tournamentsWon: wonCount,
          });
        }
      } catch (err) {
        console.error("[RewardsHub] Errore caricamento statistiche:", err);
      }
    }

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [currentUser, isSuper, userProfile]);

  // Handle Tab 1: Tenure Claim
  const handleClaimTenure = async (milestone: TenureRewardItem) => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }
    setLoadingAction(`claim-tenure-${milestone.months}`);
    try {
      await claimTenureReward(milestone.months);
    } finally {
      setLoadingAction(null);
    }
  };

  // Equip Frame
  const handleEquipFrame = async (frameId: string, frameName: string) => {
    if (!currentUser) return;
    setLoadingAction(`frame-${frameId}`);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ active_frame: frameId })
        .eq("id", currentUser.id);

      if (error) throw error;
      await refreshUserData();
      toast({
        title: "Cornice Avatar Attiva ⚡",
        description: `Hai equipaggiato la cornice "${frameName}".`,
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

  // Equip Banner
  const handleEquipBanner = async (bannerSvg: string, bannerName: string) => {
    if (!currentUser) return;
    setLoadingAction(`banner-${bannerName}`);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ banner_url: bannerSvg })
        .eq("id", currentUser.id);

      if (error) throw error;
      await refreshUserData();
      toast({
        title: "Banner Profilo Attivo 🖼️",
        description: `Hai equipaggiato il banner "${bannerName}".`,
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

  // Handle Tab 2: Clan Milestone Claim
  const handleClaimClanReward = async (milestone: ClanMilestoneItem) => {
    if (!currentUser || !clanData) return;
    if (!isClanOwnerOrFounder) {
      toast({
        title: "Accesso Riservato ai Fondatori",
        description: "Solo il fondatore o gli ufficiali del clan possono riscattare i traguardi di squadra.",
        variant: "destructive",
      });
      return;
    }

    setLoadingAction(`clan-claim-${milestone.id}`);
    try {
      const updatedRewards = Array.from(new Set([...unlockedClanRewards, milestone.id]));

      const { error } = await supabase
        .from("clans")
        .update({
          unlocked_clan_rewards: updatedRewards,
          clan_banner_url: milestone.bannerSvg,
          active_clan_badge: milestone.crestName,
          active_clan_title: milestone.chatTitle,
        })
        .eq("id", clanData.id);

      if (error) throw error;
      await refreshUserData();

      toast({
        title: "Traguardo Clan Sbloccato! 🛡️",
        description: `Il clan ha sbloccato "${milestone.title}". Banner e stemmi equipaggiati!`,
      });
    } catch (err: any) {
      toast({
        title: "Errore sblocco clan",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle Tab 3: Player Achievement Claim & Equip
  const handleClaimPlayerAchievement = async (achievement: PlayerAchievementItem) => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    setLoadingAction(`achieve-claim-${achievement.id}`);
    try {
      const newTitles = Array.from(new Set([...unlockedTitles, achievement.profileTitle]));
      const newBadges = Array.from(new Set([...unlockedBadges, achievement.badgeName]));
      const newBanners = Array.from(new Set([...unlockedBanners, achievement.profileThemeName]));

      const { error } = await supabase
        .from("profiles")
        .update({
          unlocked_titles: newTitles,
          active_title: achievement.profileTitle,
          unlocked_badges: newBadges,
          active_badge: achievement.badgeName,
          unlocked_banners: newBanners,
          banner_url: achievement.profileThemeSvg,
        })
        .eq("id", currentUser.id);

      if (error) throw error;
      await refreshUserData();

      toast({
        title: "Traguardo Operatore Riscattato! 🎖️",
        description: `Hai sbloccato il titolo "${achievement.profileTitle}" e lo sfondo "${achievement.profileThemeName}".`,
      });
    } catch (err: any) {
      toast({
        title: "Errore riscatto",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Equip Title
  const handleEquipTitle = async (title: string) => {
    if (!currentUser) return;
    setLoadingAction(`title-${title}`);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ active_title: title })
        .eq("id", currentUser.id);

      if (error) throw error;
      await refreshUserData();
      toast({
        title: "Titolo Operatore Attivato! 🏷️",
        description: `Titolo attivo: "${title}".`,
      });
    } catch (err: any) {
      toast({
        title: "Errore",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Equip Badge
  const handleEquipBadge = async (badge: string) => {
    if (!currentUser) return;
    setLoadingAction(`badge-${badge}`);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ active_badge: badge })
        .eq("id", currentUser.id);

      if (error) throw error;
      await refreshUserData();
      toast({
        title: "Distintivo Attivato! 🛡️",
        description: `Distintivo attivo: "${badge}".`,
      });
    } catch (err: any) {
      toast({
        title: "Errore",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* ========================================================
          TACTICAL MILITARY HUD HEADER // CALL OF DUTY STYLE
          ======================================================== */}
      <div className="relative rounded-2xl overflow-hidden border border-cyan-500/25 bg-gradient-to-b from-[#090d16] via-[#06080e] to-[#040508] p-5 md:p-7 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
        {/* HUD Crosshairs & Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(6,182,212,0.2) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />

        {/* Ambient Glow Ribbons */}
        <div className="absolute top-0 right-0 w-80 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono font-black text-cyan-300 tracking-wider uppercase">
                <Crosshair className="w-3 h-3 text-cyan-400 animate-spin-slow" />
                TACTICAL SPEC // REWARDS ARMORY
              </span>
              <span className="text-[10px] font-mono text-zinc-300 hidden sm:inline">
                STATUS: ENCRYPTED // TAC-CLEARANCE: {isSuper ? "OMEGA FOUNDER" : userProfile.subscriptionTier.toUpperCase()}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <span>RICOMPENSE D'ÉLITE</span>
              <span className="text-xs px-2.5 py-1 rounded-sm bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold tracking-widest uppercase shadow-[0_0_12px_rgba(245,158,11,0.6)]">
                AAA MIL-SPEC
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-2xl font-medium">
              Centro approvvigionamenti e traguardi operativi. Sblocca cornici metalliche realistiche,
              banner widescreen in stile Warzone, stemmi aggressivi di clan e titoli d'onore.
            </p>
          </div>

          {/* Quick HUD Metrics & Shop Shortcut */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="px-3.5 py-2 rounded-lg bg-zinc-900/90 border border-zinc-700/60 font-mono text-right">
              <div className="text-[10px] text-zinc-300 uppercase tracking-wider">ANZIANITÀ PRO</div>
              <div className="text-base font-black text-amber-400">
                {tenureMonths} {tenureMonths === 1 ? "Mese" : "Mesi"}
              </div>
            </div>

            <button
              onClick={() => {
                if (onNavigateToShop) onNavigateToShop();
                else setActiveTab("shop");
              }}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-mono text-xs font-black tracking-wider uppercase flex items-center gap-2 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-200 fill-cyan-200" />
              <span>SHOP UFFICIALE</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-cyan-200" />
            </button>
          </div>
        </div>

        {/* ========================================================
            3 RIGOROUSLY DISTINCT TABS
            ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-6 pt-5 border-t border-zinc-800/80">
          {/* TAB 1 */}
          <button
            onClick={() => setActiveTabState("tenure")}
            className={`relative p-3.5 rounded-xl border text-left transition-all overflow-hidden ${
              activeTab === "tenure"
                ? "bg-amber-950/40 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {activeTab === "tenure" && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600 shadow-[0_0_10px_#f59e0b]" />
            )}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-widest font-black text-amber-400 uppercase">
                TAB 01 // VETERANI
              </span>
              <Crown className={`w-4 h-4 ${activeTab === "tenure" ? "text-amber-400" : "text-zinc-300"}`} />
            </div>
            <div className="text-sm font-black text-white uppercase tracking-tight mt-1">
              Anzianità Abbonamento
            </div>
            <div className="text-[11px] text-zinc-300 font-mono mt-0.5">
              3, 6, 9, 12 Mesi • Cornici & Banner
            </div>
          </button>

          {/* TAB 2 */}
          <button
            onClick={() => setActiveTabState("clan")}
            className={`relative p-3.5 rounded-xl border text-left transition-all overflow-hidden ${
              activeTab === "clan"
                ? "bg-cyan-950/40 border-cyan-500/80 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {activeTab === "clan" && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 shadow-[0_0_10px_#06b6d4]" />
            )}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-widest font-black text-cyan-300 uppercase">
                TAB 02 // SQUADRA
              </span>
              <Shield className={`w-4 h-4 ${activeTab === "clan" ? "text-cyan-300" : "text-zinc-300"}`} />
            </div>
            <div className="text-sm font-black text-white uppercase tracking-tight mt-1">
              Livelli & Ricompense Clan
            </div>
            <div className="text-[11px] text-zinc-300 font-mono mt-0.5">
              Stemmi, Widescreen Camo & Titoli
            </div>
          </button>

          {/* TAB 3 */}
          <button
            onClick={() => setActiveTabState("player")}
            className={`relative p-3.5 rounded-xl border text-left transition-all overflow-hidden ${
              activeTab === "player"
                ? "bg-purple-950/40 border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.25)]"
                : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {activeTab === "player" && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-500 shadow-[0_0_10px_#a855f7]" />
            )}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-widest font-black text-purple-300 uppercase">
                TAB 03 // OPERATORE
              </span>
              <Award className={`w-4 h-4 ${activeTab === "player" ? "text-purple-300" : "text-zinc-300"}`} />
            </div>
            <div className="text-sm font-black text-white uppercase tracking-tight mt-1">
              Traguardi Profilo Giocatore
            </div>
            <div className="text-[11px] text-zinc-300 font-mono mt-0.5">
              Distintivi Rilievo, Titoli & Sfondi
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB 1: ANZIANITÀ ABBONAMENTO (TENURE REWARDS)
          ======================================================== */}
      {activeTab === "tenure" && (
        <div className="space-y-6">
          {/* Progress Tracker Bar */}
          <div className="p-4 md:p-5 rounded-xl bg-[#0a0d16] border border-amber-600/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400">
                <Crown className="w-5 h-5 fill-amber-400/30" />
              </div>
              <div>
                <div className="text-sm font-black text-white uppercase tracking-wide">
                  Stato Avanzamento Fedeltà Pro
                </div>
                <div className="text-xs text-zinc-300 font-mono">
                  Anzianità registrata: <span className="text-amber-400 font-bold">{tenureMonths} Mesi</span> / 12 Mesi Massimi
                </div>
              </div>
            </div>

            {/* Segmented Timeline */}
            <div className="w-full md:w-80">
              <div className="flex justify-between text-[10px] font-mono text-zinc-300 mb-1.5 font-bold">
                <span className={tenureMonths >= 3 ? "text-amber-400" : "text-zinc-300"}>3M</span>
                <span className={tenureMonths >= 6 ? "text-cyan-300" : "text-zinc-300"}>6M</span>
                <span className={tenureMonths >= 9 ? "text-yellow-400" : "text-zinc-300"}>9M</span>
                <span className={tenureMonths >= 12 ? "text-purple-300" : "text-zinc-300"}>12M PRESTIGIO</span>
              </div>
              <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 via-cyan-400 to-purple-500 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                  style={{ width: `${Math.min(100, (tenureMonths / 12) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Cards Grid: 3, 6, 9, 12 Months */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {TENURE_REWARDS_DATA.map((milestone) => {
              const isUnlocked = tenureMonths >= milestone.months || isSuper;
              const isClaimed = claimedTenure.includes(milestone.id);
              const isFrameEquipped = activeFrame === milestone.frame.id;
              const isBannerEquipped = activeBanner === milestone.banner.svgUrl;
              const isProcessing = loadingAction?.includes(milestone.id) || loadingAction?.includes(milestone.frame.id);

              return (
                <div
                  key={milestone.id}
                  className={`relative rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                    isClaimed
                      ? `${milestone.borderColor} bg-gradient-to-b from-[#0c121e] to-[#070910] ${milestone.glowClass}`
                      : isUnlocked
                      ? "border-amber-400/80 bg-[#0c101a] shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                      : "border-zinc-800/80 bg-[#07090f]/90 opacity-90"
                  }`}
                >
                  {/* Top HUD Banner Preview */}
                  <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-black border-b border-zinc-800">
                    <img
                      src={milestone.banner.svgUrl}
                      alt={milestone.banner.name}
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    />

                    {/* Rarity & Codename Pill */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded bg-black/85 backdrop-blur-md border border-zinc-700 text-[10px] font-mono font-black text-white uppercase tracking-wider">
                        {milestone.codename}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                          milestone.frame.rarity === "Mitico"
                            ? "bg-purple-950/80 text-purple-300 border-purple-500/70 shadow-[0_0_8px_#c084fc]"
                            : milestone.frame.rarity === "Leggendario"
                            ? "bg-yellow-950/80 text-yellow-300 border-yellow-500/70"
                            : milestone.frame.rarity === "Epico"
                            ? "bg-cyan-950/80 text-cyan-300 border-cyan-500/70"
                            : "bg-amber-950/80 text-amber-300 border-amber-600/70"
                        }`}
                      >
                        {milestone.frame.rarity}
                      </span>
                    </div>

                    {/* Unlock Status Stamp */}
                    <div className="absolute top-3 right-3">
                      {isClaimed ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/90 border border-emerald-500 text-emerald-300 text-[10px] font-mono font-black">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          RISCATTATO
                        </span>
                      ) : isUnlocked ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/90 border border-amber-400 text-amber-300 text-[10px] font-mono font-black animate-pulse">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          PRONTO AL RISCATTO
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900/90 border border-zinc-700 text-zinc-300 text-[10px] font-mono font-black">
                          <Lock className="w-3.5 h-3.5 text-zinc-300" />
                          BLOCCATO ({milestone.months}M)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Title & Metal Finish */}
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="text-xs font-mono font-bold tracking-wider uppercase text-amber-400">
                            {milestone.tierLabel}
                          </div>
                          <h3 className="text-xl font-black text-white tracking-tight uppercase">
                            {milestone.name}
                          </h3>
                        </div>

                        {/* Interactive Frame Mini-Preview */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-12 h-12 rounded-full border-2 overflow-hidden flex items-center justify-center bg-zinc-900 ${milestone.frame.styleClass}`}
                          >
                            <img
                              src={userProfile.avatar || "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=120&auto=format&fit=crop&q=80"}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-[9px] font-mono text-zinc-300 mt-1 uppercase">CORNICE</span>
                        </div>
                      </div>

                      {/* Description & Finish details */}
                      <p className="text-xs text-zinc-300 leading-relaxed mb-4">
                        {milestone.finishDescription}
                      </p>

                      {/* Tactical Specs List */}
                      <div className="space-y-1.5 mb-5 p-3 rounded-lg bg-black/40 border border-zinc-800/80 font-mono text-[11px] text-zinc-300">
                        {milestone.details.map((detail, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-amber-500 font-bold">›</span>
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="pt-3 border-t border-zinc-800/80">
                      {isClaimed ? (
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            onClick={() => handleEquipFrame(milestone.frame.id, milestone.frame.name)}
                            disabled={isProcessing}
                            className={`py-2 px-3 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                              isFrameEquipped
                                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 active:scale-95"
                            }`}
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isFrameEquipped ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                <span>CORNICE ATTIVA</span>
                              </>
                            ) : (
                              <>
                                <Palette className="w-3.5 h-3.5 text-amber-400" />
                                <span>EQUIP. CORNICE</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleEquipBanner(milestone.banner.svgUrl, milestone.banner.name)}
                            disabled={isProcessing}
                            className={`py-2 px-3 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                              isBannerEquipped
                                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 active:scale-95"
                            }`}
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isBannerEquipped ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                <span>BANNER ATTIVO</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                                <span>EQUIP. BANNER</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleClaimTenure(milestone)}
                          disabled={isProcessing}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-black font-mono font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.6)] transition-all active:scale-95"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-black" />
                              <span>SBLOCCO IN CORSO...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-black fill-black" />
                              <span>RISCATTA &amp; EQUIPAGGIA TUTTO</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                          <span className="text-xs font-mono text-zinc-300 flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-zinc-300" />
                            Richiede {milestone.months} mesi di abbonamento Pro attivo
                          </span>
                          <button
                            onClick={() => {
                              if (onNavigateToShop) onNavigateToShop();
                              else setActiveTab("shop");
                            }}
                            className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold hover:bg-amber-500/30 uppercase"
                          >
                            Attiva Pro
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: RICOMPENSE E LIVELLI CLAN
          ======================================================== */}
      {activeTab === "clan" && (
        <div className="space-y-6">
          {/* Clan Status Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0a1220] via-[#091526] to-[#060d17] border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-cyan-950/80 border-2 border-cyan-400 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                {clanData?.avatarUrl ? (
                  <img src={clanData.avatarUrl} alt="Clan Logo" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span>🛡️</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold uppercase">
                    [{clanData?.tag || "NESSUN CLAN"}]
                  </span>
                  <span className="text-xs font-mono text-zinc-300">
                    LIVELLO CLAN {clanLevel}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                  {clanData?.name || "Nessun Clan Attivo"}
                </h2>
                <div className="text-xs text-zinc-300 font-mono mt-0.5">
                  Cassa Clan: <span className="text-amber-400 font-bold">{clanTreasury} SC</span> • Tornei vinti: <span className="text-cyan-300 font-bold">{clanTourneysWon}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!clanData ? (
                <button
                  onClick={() => {
                    if (onNavigateToClan) onNavigateToClan();
                    else setActiveTab("clan");
                  }}
                  className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-black uppercase tracking-wider shadow-lg"
                >
                  Crea o Unisciti a un Clan
                </button>
              ) : (
                <div className="text-right">
                  <div className="text-[10px] font-mono text-zinc-300 uppercase">RUOLO OPERATIVO</div>
                  <div className="text-xs font-mono font-black text-cyan-300">
                    {isClanOwnerOrFounder ? "FONDATORE / ADMIN" : "MEMBRO ATTIVO"}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Clan Milestones Grid */}
          <div className="space-y-4">
            {CLAN_MILESTONES_DATA.map((milestone) => {
              const isLevelReached = clanLevel >= milestone.levelRequired;
              const isTreasuryReached = clanTreasury >= milestone.treasuryRequiredSC;
              const isTourneyReached = !milestone.tournamentsRequired || clanTourneysWon >= milestone.tournamentsRequired;
              const isEligible = isSuper || (isLevelReached && isTreasuryReached && isTourneyReached);
              const isUnlocked = isSuper || unlockedClanRewards.includes(milestone.id);
              const isProcessing = loadingAction === `clan-claim-${milestone.id}`;

              return (
                <div
                  key={milestone.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isUnlocked
                      ? "bg-gradient-to-r from-[#0d1627] via-[#09111f] to-[#060b14] border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                      : isEligible
                      ? "bg-[#0b101d] border-amber-500/60"
                      : "bg-[#070a12] border-zinc-800/80 opacity-80"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Left Details */}
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-700 flex flex-col items-center justify-center flex-shrink-0 text-3xl shadow-inner">
                        <span>{milestone.crestSvg}</span>
                        <span className="text-[8px] font-mono font-bold text-zinc-300 mt-0.5">STEMMA</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-mono font-bold text-zinc-300">
                            {milestone.codename}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-[10px] font-mono font-black text-cyan-300">
                            {milestone.rarity}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border ${milestone.chatTitleColor}`}>
                            CHAT: {milestone.chatTitle}
                          </span>
                        </div>

                        <h3 className="text-lg font-black text-white uppercase tracking-tight">
                          {milestone.title}
                        </h3>

                        <p className="text-xs text-zinc-300 max-w-xl">
                          {milestone.description}
                        </p>

                        <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-3 pt-1">
                          <span>Requisito: Livello {milestone.levelRequired}</span>
                          {milestone.treasuryRequiredSC > 0 && (
                            <span>• Cassa: {milestone.treasuryRequiredSC} SC</span>
                          )}
                          {milestone.tournamentsRequired && (
                            <span>• {milestone.tournamentsRequired} Torneo Vinto</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Action & Widescreen Preview */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
                      {/* Mini Widescreen Banner Thumb */}
                      <div className="w-48 h-16 rounded-lg overflow-hidden border border-zinc-700 bg-black hidden sm:block relative">
                        <img src={milestone.bannerSvg} alt="Banner Preview" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-mono font-bold text-zinc-300 uppercase">
                          Camo Widescreen
                        </span>
                      </div>

                      {/* Action Button */}
                      {isUnlocked ? (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-2 rounded-lg bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-mono font-black flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            SBLOCCATO DAL CLAN
                          </span>
                        </div>
                      ) : isEligible ? (
                        <button
                          onClick={() => handleClaimClanReward(milestone)}
                          disabled={isProcessing}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-mono font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.5)] active:scale-95 transition-all"
                        >
                          {isProcessing ? (
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-black" />
                          )}
                          <span>RISCATTA PER IL CLAN</span>
                        </button>
                      ) : (
                        <div className="px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-zinc-300" />
                          <span>TRAGUARDO NON RAGGIUNTO</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: TRAGUARDI PROFILO GIOCATORE (PLAYER ACHIEVEMENTS)
          ======================================================== */}
      {activeTab === "player" && (
        <div className="space-y-6">
          {/* Player Live Real Stats Card */}
          <div className="p-5 rounded-2xl bg-[#090d18] border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-[0_0_25px_rgba(168,85,247,0.15)]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-purple-950/80 border-2 border-purple-400 flex items-center justify-center text-purple-300 text-2xl shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                🎖️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold uppercase">
                    PROFILO OPERATORE
                  </span>
                  <span className="text-xs font-mono text-zinc-300">
                    TITOLO ATTIVO: <span className="text-purple-300 font-bold">{activeTitle || "NESSUNO"}</span>
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                  Statistiche Operatore Warzone
                </h2>
                <div className="text-xs text-zinc-300 font-mono mt-0.5">
                  Tornei giocati: <span className="text-purple-400 font-bold">{playerStats.tournamentsCount}</span> • Post briefing: <span className="text-cyan-400 font-bold">{playerStats.postsCount}</span> • Tornei vinti: <span className="text-amber-400 font-bold">{playerStats.tournamentsWon}</span>
                </div>
              </div>
            </div>

            {/* Active Badge Display */}
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-2 rounded-xl bg-black/60 border border-zinc-800 text-right font-mono">
                <div className="text-[10px] text-zinc-300 uppercase">DISTINTIVO ATTIVO</div>
                <div className="text-xs font-black text-purple-300">
                  {activeBadge || "Nessun Distintivo"}
                </div>
              </div>
            </div>
          </div>

          {/* Achievements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PLAYER_ACHIEVEMENTS_DATA.map((achieve) => {
              // Calculate condition
              let currentValue = 0;
              if (achieve.statType === "tournaments") {
                currentValue = Math.max(playerStats.tournamentsCount, playerStats.postsCount);
              } else if (achieve.statType === "wins") {
                currentValue = playerStats.tournamentsWon;
              }

              const isEligible = isSuper || currentValue >= achieve.targetValue;
              const isClaimed =
                isSuper ||
                unlockedTitles.includes(achieve.profileTitle) ||
                unlockedBadges.includes(achieve.badgeName);
              const isTitleActive = activeTitle === achieve.profileTitle;
              const isBadgeActive = activeBadge === achieve.badgeName;
              const isProcessing = loadingAction?.includes(achieve.id);

              return (
                <div
                  key={achieve.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isClaimed
                      ? "bg-gradient-to-b from-[#100c22] via-[#0b0817] to-[#06040e] border-purple-500/70 shadow-[0_0_20px_rgba(168,85,247,0.25)]"
                      : isEligible
                      ? "bg-[#0f0b1e] border-amber-400/70"
                      : "bg-[#080612] border-zinc-800/80 opacity-80"
                  }`}
                >
                  <div>
                    {/* Header: Badge & Titles */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 border-2 shadow-lg ${
                            achieve.badgeMetalFinish === "heavy_gold"
                              ? "bg-gradient-to-b from-yellow-900 to-amber-950 border-yellow-400 text-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                              : achieve.badgeMetalFinish === "carbon_amber"
                              ? "bg-gradient-to-b from-amber-950 to-stone-900 border-amber-500 text-amber-300"
                              : achieve.badgeMetalFinish === "titanium_cyan"
                              ? "bg-gradient-to-b from-cyan-950 to-slate-900 border-cyan-400 text-cyan-300"
                              : "bg-gradient-to-b from-slate-800 to-zinc-900 border-slate-400 text-slate-200"
                          }`}
                        >
                          <span>{achieve.badgeSvg}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-zinc-300">
                              {achieve.codename}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/50 text-[10px] font-mono font-black text-purple-300 uppercase">
                              {achieve.rarity}
                            </span>
                          </div>
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">
                            {achieve.title}
                          </h3>
                        </div>
                      </div>

                      {/* Title Pill */}
                      <div className="px-3 py-1.5 rounded-lg bg-black/80 border border-purple-400/60 font-mono text-xs font-black text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                        [{achieve.profileTitle}]
                      </div>
                    </div>

                    {/* Lore & Details */}
                    <p className="text-xs text-zinc-300 mb-3">
                      {achieve.loreText}
                    </p>

                    {/* Requirement Progress */}
                    <div className="p-3 rounded-lg bg-black/50 border border-zinc-800 text-xs font-mono space-y-1.5 mb-4">
                      <div className="flex justify-between text-[11px] text-zinc-300">
                        <span>{achieve.requirementText}</span>
                        <span className={isEligible ? "text-emerald-400 font-bold" : "text-zinc-300"}>
                          {Math.min(currentValue, achieve.targetValue)} / {achieve.targetValue}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (currentValue / achieve.targetValue) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-3 border-t border-zinc-800/80">
                    {isClaimed ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleEquipTitle(achieve.profileTitle)}
                          className={`py-2 px-3 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                            isTitleActive
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                              : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700"
                          }`}
                        >
                          {isTitleActive ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                              <span>TITOLO ATTIVO</span>
                            </>
                          ) : (
                            <span>EQUIP. TITOLO</span>
                          )}
                        </button>

                        <button
                          onClick={() => handleEquipBadge(achieve.badgeName)}
                          className={`py-2 px-3 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                            isBadgeActive
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                              : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700"
                          }`}
                        >
                          {isBadgeActive ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                              <span>DISTINTIVO ATTIVO</span>
                            </>
                          ) : (
                            <span>EQUIP. BADGE</span>
                          )}
                        </button>
                      </div>
                    ) : isEligible ? (
                      <button
                        onClick={() => handleClaimPlayerAchievement(achieve)}
                        disabled={isProcessing}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.5)] active:scale-95 transition-all"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span>RISCATTA TRAGUARDO &amp; SFONDO</span>
                      </button>
                    ) : (
                      <div className="p-2 rounded bg-zinc-900 text-center font-mono text-xs text-zinc-300 border border-zinc-800 flex items-center justify-center gap-2">
                        <Lock className="w-3.5 h-3.5" />
                        <span>REQUISITO NON SODDISFATTO</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
