import React, { useState, useEffect } from "react";
import { useSquad } from "@/context/SquadContext";
import {
  Coins,
  Trophy,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  CreditCard,
  User,
  Gamepad2,
  LogOut,
  UserPlus,
  LogIn,
  Shield,
  Sparkles,
  Palette,
  Crown,
  Star,
  Plus,
  Zap,
  ShieldAlert,
  Award,
  ShoppingBag,
  UserCog,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProfileCustomizerModal } from "./ProfileCustomizerModal";
import { EditProfileModal } from "./EditProfileModal";
import { AVATAR_FRAMES } from "./cosmeticsData";
import { RewardsHub } from "@/components/rewards/RewardsHub";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";
import { PlayerReviewsModal } from "./PlayerReviewsModal";
import { UniversalAdminModal } from "@/components/admin/UniversalAdminModal";

export const ProfileSection: React.FC = () => {
  const {
    userProfile,
    sCoinBalance,
    transactions,
    clanData,
    currentUser,
    isUniversalAdmin,
    openAuthModal,
    signOut,
    followedUserIds,
    followedClanIds,
    setActiveTab: setSquadNavTab,
    openClanDetail,
  } = useSquad();

  const [followersCount, setFollowersCount] = useState<number>(0);

  useEffect(() => {
    if (!currentUser?.id) {
      setFollowersCount(0);
      return;
    }
    void supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_user_id", currentUser.id)
      .then(({ count, error }) => {
        if (error) {
          console.error(error);
          return;
        }
        if (typeof count === "number") {
          setFollowersCount(count);
        }
      });
  }, [currentUser?.id]);

  const [activeTab, setActiveTab] = useState<"wallet" | "stats" | "rewards">("wallet");

  // Modals state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [showUniversalAdmin, setShowUniversalAdmin] = useState(false);

  const rewards = [
    {
      id: "rw-1",
      title: "PlayStation Store Card 10€",
      cost: 1000,
      iconType: "psn",
      brandColor: "bg-blue-600/20 border-blue-500/50 text-blue-400",
      tag: "Codice Digitale Istantaneo",
    },
    {
      id: "rw-2",
      title: "Xbox Game Pass Ultimate 1 Mese",
      cost: 1200,
      iconType: "xbox",
      brandColor: "bg-emerald-600/20 border-emerald-500/50 text-emerald-400",
      tag: "Abbonamento Gaming",
    },
    {
      id: "rw-3",
      title: "Battle Pass Call of Duty",
      cost: 1100,
      iconType: "cod",
      brandColor: "bg-amber-600/20 border-amber-500/50 text-amber-400",
      tag: "1.100 COD Points",
    },
  ];

  const handleRedeem = (rewardTitle: string, cost: number) => {
    if (!currentUser) {
      openAuthModal("signup");
      toast({
        title: "Accesso Richiesto",
        description: "Accedi o registrati per riscattare i premi dal catalogo.",
      });
      return;
    }

    if (sCoinBalance < cost) {
      toast({
        title: "Saldo insufficiente",
        description: `Ti mancano ${cost - sCoinBalance} SCoin per riscattare questo premio. Partecipa a un torneo per guadagnarne altri!`,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Premio Riscattato",
      description: `Richiesta registrata per "${rewardTitle}".`,
    });
  };

  const hasStats = Boolean(
    userProfile.stats.matches > 0 ||
    userProfile.stats.kills > 0 ||
    userProfile.stats.kd !== null
  );

  const isPro = userProfile.subscriptionTier === "pro";
  const frameObj =
    (Array.isArray(AVATAR_FRAMES) &&
      AVATAR_FRAMES.find((f) => f.id === userProfile.avatarFrame)) ||
    AVATAR_FRAMES?.[0] || { borderClass: "border-purple-500", glowClass: "" };

  return (
    <div className="pb-24 md:pb-12 pt-3 max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto px-2 sm:px-4 space-y-5">
      {/* Unauthenticated Guest Banner */}
      {!currentUser && (
        <div className="rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-950/90 via-[#161a32] to-cyan-950/70 p-4 shadow-xl space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-cyan-300 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Unisciti a SquadUP</h3>
              <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                Registrati per personalizzare banner, equipaggiare cornici, gestire tornei e guadagnare SCoin!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => openAuthModal("signup")}
              className="py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registrati</span>
            </button>
            <button
              onClick={() => openAuthModal("login")}
              className="py-2 px-3 rounded-xl bg-[#14182a] hover:bg-[#1a2038] border border-purple-500/30 text-purple-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Accedi</span>
            </button>
          </div>
        </div>
      )}

      {/* Player Profile Card with Custom Banner & Frame */}
      <div className="relative rounded-3xl overflow-hidden border border-purple-500/50 bg-[#0d1022] shadow-2xl">
        {/* Profile Banner - Resized for optimal height and artwork display */}
        <div className="relative h-36 sm:h-48 md:h-56 w-full bg-gradient-to-r from-purple-900 to-indigo-950 overflow-hidden">
          {userProfile.bannerUrl ? (
            <img
              src={userProfile.bannerUrl}
              alt="Banner profilo"
              className="w-full h-full object-cover opacity-90"
            />
          ) : (
            <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-800/40 via-purple-950 to-[#0d1022]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1022] via-[#0d1022]/30 to-transparent" />

          {/* Quick Customizer Icon button on Banner */}
          {currentUser && (
            <button
              onClick={() => setShowCustomizer(true)}
              title="Personalizza Banner & Cornice"
              className="absolute top-2.5 right-2.5 p-1.5 sm:p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-lg"
            >
              <Palette className="w-3.5 h-3.5 text-cyan-300" />
              <span>Personalizza</span>
            </button>
          )}
        </div>

        {/* Profile Body Content */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 -mt-8 sm:-mt-10 md:-mt-12 relative">
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-end gap-3 sm:gap-4 min-w-0">
              {/* Avatar with Custom Frame & Glow */}
              <div className="relative shrink-0">
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-2xl overflow-hidden bg-purple-950/90 border-2 ${
                    frameObj.borderClass
                  } ${frameObj.glowClass || ""} shadow-xl ring-2 ring-[#0d1022]`}
                >
                  {userProfile.avatar ? (
                    <img
                      src={userProfile.avatar}
                      alt={userProfile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-purple-300">
                      <User className="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-cyan-500 border-2 border-[#121628] flex items-center justify-center text-[10px] sm:text-xs font-extrabold text-black shadow-md">
                  {userProfile.level}
                </span>
              </div>

              {/* Name & Title */}
              <div className="min-w-0 pb-0.5">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl md:text-2xl font-black text-white truncate max-w-xs sm:max-w-md">
                    {userProfile.name}
                  </h2>
                  {isUniversalAdmin ? (
                    <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                      GOD MODE
                    </span>
                  ) : isPro ? (
                    <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                      PRO
                    </span>
                  ) : null}
                  {clanData?.tag && (
                    <button
                      type="button"
                      onClick={() => openClanDetail(clanData.id)}
                      title={`Visualizza dettagli Clan [${clanData.tag}]`}
                      className="text-[10px] sm:text-xs font-black px-1.5 py-0.2 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-900/80 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      <Shield className="w-2.5 h-2.5 text-cyan-400" />
                      <span>[{clanData.tag}]</span>
                    </button>
                  )}
                  {userProfile.activeTitle && (
                    <span className="text-[10px] sm:text-xs font-mono font-black px-2 py-0.5 rounded bg-purple-950/90 text-purple-300 border border-purple-500/60 shadow-[0_0_8px_rgba(168,85,247,0.4)]">
                      [{userProfile.activeTitle}]
                    </span>
                  )}
                  {userProfile.activeBadge && (
                    <span className="text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                      🎖️ {userProfile.activeBadge}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-zinc-300 mt-0.5 flex-wrap">
                  <span className="text-cyan-400 font-semibold">{userProfile.rank}</span>
                  <span>•</span>
                  <span className="text-zinc-400">{userProfile.tag}</span>
                </div>

                {userProfile.activisionName && (
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 rounded-md px-2 py-0.5 mt-1 w-fit">
                    <Gamepad2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
                    <span className="truncate max-w-xs">COD: {userProfile.activisionName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Logout button */}
            {currentUser && (
              <button
                onClick={signOut}
                title="Disconnetti"
                className="p-2 rounded-xl bg-zinc-900/80 hover:bg-rose-500/20 border border-zinc-800 hover:border-rose-500/40 text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer shrink-0 mb-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Pulsante dedicato Modifica Dati Personali */}
          {currentUser && (
            <div className="pt-2.5 mt-2.5 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowEditProfile(true)}
                className="w-full py-2 px-3.5 rounded-xl bg-gradient-to-r from-purple-900/60 via-indigo-900/40 to-cyan-950/60 hover:from-purple-800/70 hover:to-cyan-900/70 border border-purple-500/50 hover:border-cyan-400 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md group"
              >
                <UserCog className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Modifica Dati Personali (ID App & Activision)</span>
              </button>
            </div>
          )}

          {/* Dynamic stat highlights */}
          {hasStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-zinc-800/80 text-center">
              <div className="bg-zinc-900/60 rounded-xl p-2.5 sm:p-3.5 border border-zinc-800">
                <span className="text-[10px] sm:text-xs uppercase font-bold text-zinc-400 block tracking-wider">K/D</span>
                <span className="text-sm sm:text-lg font-black text-cyan-300">{userProfile.stats.kd ?? "-"}</span>
              </div>
              <div className="bg-zinc-900/60 rounded-xl p-2.5 sm:p-3.5 border border-zinc-800">
                <span className="text-[10px] sm:text-xs uppercase font-bold text-zinc-400 block tracking-wider">Win Rate</span>
                <span className="text-sm sm:text-lg font-black text-emerald-400">{userProfile.stats.winRate ?? "-"}</span>
              </div>
              <div className="bg-zinc-900/60 rounded-xl p-2.5 sm:p-3.5 border border-zinc-800">
                <span className="text-[10px] sm:text-xs uppercase font-bold text-zinc-400 block tracking-wider">Match</span>
                <span className="text-sm sm:text-lg font-black text-white">{userProfile.stats.matches}</span>
              </div>
              <div className="bg-zinc-900/60 rounded-xl p-2.5 sm:p-3.5 border border-zinc-800">
                <span className="text-[10px] sm:text-xs uppercase font-bold text-zinc-400 block tracking-wider">Kill</span>
                <span className="text-sm sm:text-lg font-black text-purple-300">{userProfile.stats.kills}</span>
              </div>
            </div>
          ) : (
            <div className="pt-2 mt-2.5 border-t border-zinc-800/80 text-center">
              <span className="text-[11px] sm:text-xs text-zinc-400 italic">
                Gioca partite e tornei per registrare le tue statistiche
              </span>
            </div>
          )}
          {/* Social Follower & Following Row */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-2.5 sm:pt-3.5 mt-2.5 sm:mt-3.5 border-t border-zinc-800/80 text-center">
            <div className="bg-zinc-900/60 rounded-xl p-2.5 sm:p-3 border border-purple-900/30">
              <span className="text-[10px] sm:text-xs uppercase font-bold text-zinc-400 block tracking-wider">Follower</span>
              <span className="text-sm sm:text-base font-black text-cyan-300">{followersCount}</span>
            </div>
            <div className="bg-zinc-900/60 rounded-xl p-2.5 sm:p-3 border border-purple-900/30">
              <span className="text-[10px] sm:text-xs uppercase font-bold text-zinc-400 block tracking-wider">Seguiti</span>
              <span className="text-sm sm:text-base font-black text-purple-300">{followedUserIds.length}</span>
            </div>
            <div className="bg-zinc-900/60 rounded-xl p-2.5 sm:p-3 border border-purple-900/30">
              <span className="text-[10px] sm:text-xs uppercase font-bold text-zinc-400 block tracking-wider">Clan Seguiti</span>
              <span className="text-sm sm:text-base font-black text-amber-300">{followedClanIds.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Universal Admin Card for fedezdesimone@gmail.com */}
      {isUniversalAdmin && (
        <div className="bg-gradient-to-r from-amber-500/15 via-[#1a142e] to-purple-950/40 border border-amber-500/50 rounded-3xl p-4 sm:p-5 shadow-xl flex items-center justify-between gap-3 animate-fade-in">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-amber-300 font-black text-xs sm:text-sm">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Universal God Mode Attivo</span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-300 mt-0.5 leading-relaxed">
              Hai SCoin infiniti e puoi accreditare SCoin a qualsiasi utente o eliminare qualsiasi torneo con rimborso.
            </p>
          </div>

          <button
            onClick={() => setShowUniversalAdmin(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.4)] shrink-0 transition-all cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-black" />
            <span>Pannello God Mode</span>
          </button>
        </div>
      )}

      {/* QUICK ACTIONS GRID: SHOP, PRO, CUSTOMIZER, REVIEWS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Vai allo Shop Centrale */}
        <button
          onClick={() => setSquadNavTab("shop")}
          className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 via-[#14182c] to-[#0f1322] border border-amber-500/40 hover:border-amber-400 text-left transition-all cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-[10px] font-black text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10">
              SHOP UFFICIALE
            </span>
          </div>
          <span className="text-xs font-black text-white block group-hover:text-amber-300 transition-colors">
            Vai allo Shop
          </span>
          <span className="text-[10px] text-zinc-400">Ricariche SCoin e Pass</span>
        </button>

        {/* Abbonamenti Pro & Clan */}
        <button
          onClick={() => setSquadNavTab("shop")}
          className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/10 via-[#14182c] to-[#0f1322] border border-purple-500/40 hover:border-purple-400 text-left transition-all cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-[10px] font-extrabold text-purple-300 px-1.5 py-0.5 rounded bg-purple-500/10">
              PRO PASS
            </span>
          </div>
          <span className="text-xs font-black text-white block group-hover:text-purple-300 transition-colors">
            Piani Pro & Clan
          </span>
          <span className="text-[10px] text-zinc-400">Vantaggi, 2x coins & aura</span>
        </button>

        {/* Personalizzazione Aspetto */}
        <button
          onClick={() => setShowCustomizer(true)}
          className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-[#14182c] to-[#0f1322] border border-cyan-500/40 hover:border-cyan-400 text-left transition-all cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              <Palette className="w-4 h-4 text-cyan-300" />
            </div>
            <span className="text-[10px] font-bold text-cyan-300">ESTETICA</span>
          </div>
          <span className="text-xs font-black text-white block group-hover:text-cyan-300 transition-colors">
            Banner & Cornici
          </span>
          <span className="text-[10px] text-zinc-400">Personalizza il tuo stile</span>
        </button>

        {/* Recensioni & Reputazione */}
        <button
          onClick={() => setShowReviews(true)}
          className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-[#14182c] to-[#0f1322] border border-emerald-500/40 hover:border-emerald-400 text-left transition-all cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <Star className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            </div>
            <span className="text-[10px] font-bold text-emerald-300">TRUST</span>
          </div>
          <span className="text-xs font-black text-white block group-hover:text-emerald-300 transition-colors">
            Recensioni Operatore
          </span>
          <span className="text-[10px] text-zinc-400">Stelle e reputazione</span>
        </button>
      </div>

      {/* Profile Section Tabs */}
      <div className="bg-[#121628] p-1 rounded-2xl border border-purple-900/40 grid grid-cols-3 gap-1 shadow-inner">
        <button
          onClick={() => setActiveTab("wallet")}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "wallet"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>Wallet SCoin</span>
        </button>
        <button
          onClick={() => setActiveTab("rewards")}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "rewards"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>Premi & Fedeltà</span>
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "stats"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-cyan-400" />
          <span>Trofei</span>
        </button>
      </div>

      {/* Tab: WALLET */}
      {activeTab === "wallet" && (
        <div className="space-y-4 animate-fade-in">
          {/* Balance card with Shop CTA */}
          <div className="bg-gradient-to-r from-purple-950/80 via-[#151932] to-amber-950/40 border border-amber-500/40 rounded-2xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block mb-0.5">
                Saldo Squad Coins Disponibile
              </span>
              <div className="flex items-center gap-2">
                <Coins className="w-6 h-6 text-amber-400 animate-pulse" />
                <div className="text-2xl font-black text-white">
                  {isUniversalAdmin ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-3xl font-black text-amber-300 leading-none">∞</span>
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                        SC Infiniti (God Mode)
                      </span>
                    </div>
                  ) : (
                    <>
                      {sCoinBalance.toLocaleString()}{" "}
                      <span className="text-sm font-bold text-amber-300">SC</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSquadNavTab("shop")}
              className="py-2 px-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
            >
              <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Vai allo Shop</span>
            </button>
          </div>

          {/* Transactions list */}
          <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Storico Transazioni
                </h3>
              </div>
              <span className="text-[10px] text-zinc-400">sc_transactions</span>
            </div>

            {transactions.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {transactions.map((t) => {
                  const isPositive =
                    t.type === "reward" ||
                    t.type === "daily_bonus" ||
                    t.type === "shop_purchase" ||
                    t.amount > 0;

                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isPositive
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <span className="font-semibold text-zinc-200 block truncate max-w-[170px]">
                            {t.description || t.title}
                          </span>
                          <span className="text-[10px] text-zinc-400">{t.date}</span>
                        </div>
                      </div>

                      <span
                        className={`font-black shrink-0 ${
                          isPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isPositive ? `+${t.amount}` : `-${Math.abs(t.amount)}`} SC
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-zinc-400">
                Nessuna transazione registrata finora.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: REWARDS & ACHIEVEMENTS (AAA 3-TAB REWARDS HUB) */}
      {activeTab === "rewards" && (
        <div className="space-y-4 animate-fade-in">
          <RewardsHub
            initialTab="tenure"
            onNavigateToShop={() => setSquadNavTab("shop")}
            onNavigateToClan={() => setSquadNavTab("clan")}
          />
        </div>
      )}

      {/* Tab: STATS */}
      {activeTab === "stats" && (
        <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-6 text-center space-y-3 animate-fade-in shadow-md">
          <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
          <h4 className="text-sm font-bold text-white">Bacheca Trofei & Tornei</h4>
          <p className="text-xs text-zinc-400 break-words max-w-xs mx-auto">
            Iscriviti a un torneo competitivo per sbloccare trofei stagionali, montepremi e scalare la classifica nazionale.
          </p>
        </div>
      )}

      {/* ALL MODALS */}
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
      />

      <ProfileCustomizerModal
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
      />

      <SubscriptionModal
        isOpen={showSubscription}
        onClose={() => setShowSubscription(false)}
        defaultTab="player"
      />

      <PlayerReviewsModal
        isOpen={showReviews}
        onClose={() => setShowReviews(false)}
      />

      <UniversalAdminModal
        isOpen={showUniversalAdmin}
        onClose={() => setShowUniversalAdmin(false)}
      />
    </div>
  );
};
