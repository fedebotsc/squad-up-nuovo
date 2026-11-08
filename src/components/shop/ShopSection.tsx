import React, { useState } from "react";
import {
  ShoppingBag,
  Coins,
  Crown,
  Shield,
  Sparkles,
  Zap,
  Check,
  Plus,
  Loader2,
  Lock,
  Palette,
  Award,
  ArrowRight,
  Flame,
  Star,
  CheckCircle2,
  Users,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { BANNER_THEMES, AVATAR_FRAMES } from "@/components/profile/cosmeticsData";

type ShopCategory = "all" | "passes" | "coins" | "frames" | "banners" | "perks";

const SCOIN_PACKAGES = [
  {
    id: "sc-100",
    coins: 100,
    priceEur: 1.0,
    bonusText: "",
    badge: null,
    popular: false,
  },
  {
    id: "sc-250",
    coins: 250,
    priceEur: 2.5,
    bonusText: "Ideale per Clan Pro",
    badge: null,
    popular: false,
  },
  {
    id: "sc-550",
    coins: 550,
    priceEur: 5.0,
    bonusText: "+50 SCoin BONUS (+10%)",
    badge: "PIÙ POPOLARE",
    popular: true,
  },
  {
    id: "sc-1200",
    coins: 1200,
    priceEur: 10.0,
    bonusText: "+200 SCoin BONUS (+20%)",
    badge: "MIGLIOR VALORE",
    popular: false,
  },
  {
    id: "sc-2600",
    coins: 2600,
    priceEur: 20.0,
    bonusText: "+600 SCoin BONUS (+30%)",
    badge: "PACCHETTO ELITE",
    popular: false,
  },
];

const TACTICAL_PERKS = [
  {
    id: "perk-boost-2x",
    name: "Booster Guadagno 2x (7 Giorni)",
    description: "Raddoppia gli SCoin vinti in ogni torneo per una settimana intera.",
    costSC: 75,
    icon: Zap,
    gradient: "from-amber-600 to-yellow-500",
  },
  {
    id: "perk-rename",
    name: "Cambio Activision ID Istantaneo",
    description: "Modifica il tuo Activision ID e tag senza attendere il cooldown di 30 giorni.",
    costSC: 40,
    icon: Sparkles,
    gradient: "from-purple-600 to-indigo-600",
  },
  {
    id: "perk-clan-slots",
    name: "Slot Membri Clan Extra (+25)",
    description: "Aumenta la capienza massima del tuo Clan di 25 operatori aggiuntivi.",
    costSC: 120,
    icon: Users,
    gradient: "from-cyan-600 to-blue-600",
  },
];

export const ShopSection: React.FC = () => {
  const {
    userProfile,
    sCoinBalance,
    clanData,
    currentUser,
    refreshUserData,
    openAuthModal,
    isUniversalAdmin,
    setActiveTab,
  } = useSquad();

  const [activeCategory, setActiveCategory] = useState<ShopCategory>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isPlayerPro = userProfile.subscriptionTier === "pro" || isUniversalAdmin;
  const isClanPro = (clanData?.level && clanData.level >= 2) || isUniversalAdmin;
  const unlockedFrames = userProfile.unlockedFrames || [];
  const unlockedBanners = userProfile.unlockedBanners || [];
  const activeFrame = userProfile.activeFrame || userProfile.avatarFrame || "base";

  // Buy SCoin Package
  const handleBuyCoinPackage = async (pack: typeof SCOIN_PACKAGES[0]) => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    setProcessingId(`pack-${pack.id}`);
    try {
      // 1. Try RPC buy_squad_coins
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("buy_squad_coins", {
        p_coins: pack.coins,
        p_amount_eur: pack.priceEur,
        p_payment_method: "card",
      });

      if (rpcErr) {
        console.warn("[ShopSection] RPC fallback a query diretta:", rpcErr);
        await supabase
          .from("profiles")
          .update({
            coins: (sCoinBalance || 0) + pack.coins,
            balance: (sCoinBalance || 0) + pack.coins,
            schoins: (sCoinBalance || 0) + pack.coins,
          })
          .eq("id", currentUser.id);
      }

      // Record transaction
      await supabase.from("sc_transactions").insert({
        user_id: currentUser.id,
        amount: pack.coins,
        type: "shop_purchase",
        description: `Ricarica SCoin nello Shop (+${pack.coins} SC - ${pack.priceEur.toFixed(2)}€)`,
      });

      await refreshUserData();
      toast({
        title: "⚡ Ricarica SCoin Completata!",
        description: `Hai aggiunto con successo +${pack.coins} SCoin al tuo wallet.`,
      });
    } catch (err: any) {
      toast({
        title: "Errore transazione",
        description: err.message || "Impossibile completare l'acquisto.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Buy Player Pro Pass (150 SCoin)
  const handleBuyPlayerPro = async () => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    const cost = 150;
    if (sCoinBalance < cost && !isUniversalAdmin) {
      toast({
        title: "Saldo SCoin insufficiente",
        description: `Servono ${cost} SCoin per attivare Player Pro. Ricarica con un pacchetto qui nello Shop.`,
        variant: "destructive",
      });
      return;
    }

    setProcessingId("sub-player-pro");
    try {
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const newBal = Math.max(0, sCoinBalance - cost);
      await supabase
        .from("profiles")
        .update({
          subscription_tier: "pro",
          pro_expires_at: expiry,
          balance: newBal,
          coins: newBal,
          schoins: newBal,
        })
        .eq("id", currentUser.id);

      await supabase.from("sc_transactions").insert({
        user_id: currentUser.id,
        amount: cost,
        type: "reward",
        description: "Abbonamento Player Pro (30 Giorni) - SquadUP Shop",
      });

      await refreshUserData();
      toast({
        title: "👑 Player Pro Attivato con Successo!",
        description: "Ora possiedi tutti i vantaggi esclusivi, badge verificato e 2x monete per 30 giorni!",
      });
    } catch (err: any) {
      toast({
        title: "Errore attivazione",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Buy Clan Tier (Pro or Elite)
  const handleBuyClanTier = async (tier: "pro" | "elite") => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    if (!clanData) {
      toast({
        title: "Nessun Clan trovato",
        description: "Crea prima un Clan o unisciti a uno per poterne potenziare il livello.",
        variant: "destructive",
      });
      return;
    }

    const cost = tier === "pro" ? 250 : 500;
    if (sCoinBalance < cost && !isUniversalAdmin) {
      toast({
        title: "Saldo SCoin insufficiente",
        description: `Servono ${cost} SCoin per attivare il livello ${tier.toUpperCase()}.`,
        variant: "destructive",
      });
      return;
    }

    setProcessingId(`sub-clan-${tier}`);
    try {
      const newBal = Math.max(0, sCoinBalance - cost);
      await supabase
        .from("profiles")
        .update({ balance: newBal, coins: newBal, schoins: newBal })
        .eq("id", currentUser.id);

      await supabase
        .from("clans")
        .update({
          tier: tier,
          level: tier === "elite" ? 3 : 2,
          is_pro: true,
          badge: tier === "elite" ? "👑 ELITE" : "⭐ PRO",
        })
        .eq("id", clanData.id);

      await supabase.from("sc_transactions").insert({
        user_id: currentUser.id,
        recipient_id: clanData.ownerId,
        amount: cost,
        type: "clan_donation",
        description: `Potenziamento Clan ${clanData.name} al livello ${tier.toUpperCase()}`,
      });

      await refreshUserData();
      toast({
        title: `🛡️ Clan ${clanData.name} Potenziato a ${tier.toUpperCase()}!`,
        description: `Sbloccati nuovi slot per membri (${tier === "elite" ? "250" : "100"}), ruoli avanzati e vantaggi.`,
      });
    } catch (err: any) {
      toast({
        title: "Errore potenziamento clan",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Buy / Equip Frame
  const handleBuyOrEquipFrame = async (frame: typeof AVATAR_FRAMES[0]) => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    const isOwned = unlockedFrames.includes(frame.id) || !frame.requiresPro || isUniversalAdmin;

    if (isOwned) {
      // Just equip
      setProcessingId(`frame-${frame.id}`);
      try {
        await supabase
          .from("profiles")
          .update({ active_frame: frame.id })
          .eq("id", currentUser.id);

        await refreshUserData();
        toast({
          title: "Cornice Equipaggiata! ✨",
          description: `La cornice "${frame.name}" è ora attiva sul tuo avatar.`,
        });
      } finally {
        setProcessingId(null);
      }
      return;
    }

    // If locked behind Pro
    if (frame.requiresPro && !isPlayerPro) {
      toast({
        title: "Richiede Abbonamento Player Pro",
        description: "Attiva il Player Pro pass qui nello Shop per sbloccare questa cornice.",
      });
      return;
    }
  };

  // Buy / Equip Banner
  const handleBuyOrEquipBanner = async (theme: typeof BANNER_THEMES[0]) => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    const isOwned =
      theme.isFree ||
      unlockedBanners.includes(theme.id) ||
      isPlayerPro ||
      isUniversalAdmin;

    if (!isOwned && theme.costSC > 0) {
      if (sCoinBalance < theme.costSC && !isUniversalAdmin) {
        toast({
          title: "Saldo SCoin insufficiente",
          description: `Servono ${theme.costSC} SCoin per acquistare questo banner.`,
          variant: "destructive",
        });
        return;
      }

      setProcessingId(`banner-${theme.id}`);
      try {
        const newBal = Math.max(0, sCoinBalance - theme.costSC);
        const updatedBanners = Array.from(new Set([...unlockedBanners, theme.id]));

        await supabase
          .from("profiles")
          .update({
            unlocked_banners: updatedBanners,
            balance: newBal,
            coins: newBal,
            schoins: newBal,
            banner_url: theme.svgUrl || undefined,
            pro_theme: theme.id === "theme-gold" ? "gold" : "neon",
          })
          .eq("id", currentUser.id);

        await supabase.from("sc_transactions").insert({
          user_id: currentUser.id,
          amount: theme.costSC,
          type: "shop_purchase",
          description: `Acquisto Banner Shop: ${theme.name}`,
        });

        await refreshUserData();
        toast({
          title: "Banner Sbloccato ed Equipaggiato! 🖼️",
          description: `"${theme.name}" è ora attivo nel tuo profilo.`,
        });
      } finally {
        setProcessingId(null);
      }
      return;
    }

    // Direct equip if owned
    setProcessingId(`banner-${theme.id}`);
    try {
      if (theme.svgUrl) {
        await supabase
          .from("profiles")
          .update({ banner_url: theme.svgUrl })
          .eq("id", currentUser.id);
      } else {
        await supabase
          .from("profiles")
          .update({
            pro_theme: theme.id === "theme-gold" ? "gold" : "neon",
          })
          .eq("id", currentUser.id);
      }

      await refreshUserData();
      toast({
        title: "Banner Equipaggiato! 🖼️",
        description: `Lo stile "${theme.name}" è ora attivo sul tuo profilo.`,
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Buy Tactical Perk
  const handleBuyPerk = async (perk: typeof TACTICAL_PERKS[0]) => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    if (sCoinBalance < perk.costSC && !isUniversalAdmin) {
      toast({
        title: "Saldo SCoin insufficiente",
        description: `Servono ${perk.costSC} SCoin per questo vantaggio.`,
        variant: "destructive",
      });
      return;
    }

    setProcessingId(`perk-${perk.id}`);
    try {
      const newBal = Math.max(0, sCoinBalance - perk.costSC);
      await supabase
        .from("profiles")
        .update({ balance: newBal, coins: newBal, schoins: newBal })
        .eq("id", currentUser.id);

      await supabase.from("sc_transactions").insert({
        user_id: currentUser.id,
        amount: perk.costSC,
        type: "shop_purchase",
        description: `Acquisto Vantaggio: ${perk.name}`,
      });

      await refreshUserData();
      toast({
        title: `⚡ ${perk.name} Attivato!`,
        description: "Il vantaggio è ora operativo sul tuo account.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4 pb-20 pt-2 px-3 animate-fade-in">
      {/* Header & Live SCoin Balance */}
      <div className="rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-950/70 via-[#12162a] to-purple-950/80 p-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-extrabold text-amber-300 uppercase tracking-wider mb-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              SquadUP Official Shop
            </div>
            <h2 className="text-lg font-black text-white">Shop & Potenziamenti</h2>
            <p className="text-xs text-zinc-300">
              Pass Pro, ricariche SCoin, cornici e cosmetici esclusivi.
            </p>
          </div>

          <div className="text-right shrink-0 bg-[#0d101e]/80 border border-amber-500/30 p-2.5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">
              Il tuo Saldo
            </span>
            <div className="flex items-center gap-1.5 justify-end">
              <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-base font-black text-white">
                {isUniversalAdmin ? "∞" : sCoinBalance.toLocaleString()}{" "}
                <span className="text-xs text-amber-300 font-bold">SC</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveCategory("all")}
          className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeCategory === "all"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
              : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
          }`}
        >
          Tutto
        </button>
        <button
          onClick={() => setActiveCategory("passes")}
          className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
            activeCategory === "passes"
              ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md font-extrabold"
              : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
          }`}
        >
          <Crown className="w-3.5 h-3.5" />
          <span>Pass & Tier</span>
        </button>
        <button
          onClick={() => setActiveCategory("coins")}
          className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
            activeCategory === "coins"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
              : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
          }`}
        >
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>Pacchetti SCoin</span>
        </button>
        <button
          onClick={() => setActiveCategory("frames")}
          className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
            activeCategory === "frames"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
              : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Cornici Avatar</span>
        </button>
        <button
          onClick={() => setActiveCategory("banners")}
          className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
            activeCategory === "banners"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
              : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-pink-400" />
          <span>Banner Profilo</span>
        </button>
        <button
          onClick={() => setActiveCategory("perks")}
          className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
            activeCategory === "perks"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
              : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Vantaggi & Boost</span>
        </button>
      </div>

      {/* SECTION 1: PASSES & TIERS */}
      {(activeCategory === "all" || activeCategory === "passes") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Crown className="w-4 h-4" />
              Abbonamenti & Pass Ufficiali
            </h3>
            <span className="text-[10px] text-zinc-400 font-medium">30 Giorni di vantaggi</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* Player Pro Card */}
            <div className="relative rounded-2xl border border-amber-500/50 bg-gradient-to-r from-[#171305] via-[#12162a] to-[#1a122e] p-4 shadow-lg overflow-hidden">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-black font-black shrink-0 shadow-md">
                    <Crown className="w-5 h-5 fill-black stroke-black" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-black text-white">Player Pro Pass</h4>
                      <span className="text-[9px] font-black px-2 py-0.2 rounded-full bg-amber-500 text-black">
                        POPOLARE
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-300">
                      Raddoppia premi tornei, badge dorato e cornici esclusive
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-black text-amber-400">150 SC</div>
                  <span className="text-[9px] text-zinc-400">per 30 giorni</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                <ul className="text-[11px] text-zinc-300 space-y-1">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-amber-400" />
                    <span>Accesso garantito a tutti i Tornei Pro & Tornei con Montepremi</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-amber-400" />
                    <span>Accumulo anzianità per premi fedeltà (3, 6, 9, 12 Mesi)</span>
                  </li>
                </ul>

                <button
                  onClick={handleBuyPlayerPro}
                  disabled={processingId === "sub-player-pro" || isPlayerPro}
                  className={`py-2 px-3.5 rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                    isPlayerPro
                      ? "bg-zinc-800 text-zinc-400 cursor-default"
                      : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black shadow-md active:scale-98"
                  }`}
                >
                  {processingId === "sub-player-pro" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  ) : isPlayerPro ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Attivo ✓</span>
                    </>
                  ) : (
                    <>
                      <span>Attiva Pro</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Clan Tiers: Pro & Elite */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Clan Pro */}
              <div className="rounded-2xl border border-purple-500/40 bg-[#101426] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-400" />
                    <span className="text-xs font-bold text-white">Clan Tier Pro</span>
                  </div>
                  <span className="text-xs font-extrabold text-purple-300">250 SC</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Espande il Clan a 100 membri, sblocca il ruolo Co-Fondatore e crea stanze vocali permanenti.
                </p>
                <button
                  onClick={() => handleBuyClanTier("pro")}
                  disabled={processingId === "sub-clan-pro"}
                  className="w-full py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  {processingId === "sub-clan-pro" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span>Potenzia Clan (Pro)</span>
                  )}
                </button>
              </div>

              {/* Clan Elite */}
              <div className="rounded-2xl border border-cyan-500/40 bg-[#0d1624] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <span className="text-xs font-bold text-white">Clan Tier Elite</span>
                  </div>
                  <span className="text-xs font-extrabold text-cyan-300">500 SC</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Massima capienza fino a 250 membri, stemma olografico e creazione tornei interni illimitati.
                </p>
                <button
                  onClick={() => handleBuyClanTier("elite")}
                  disabled={processingId === "sub-clan-elite"}
                  className="w-full py-1.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  {processingId === "sub-clan-elite" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span>Potenzia Clan (Elite)</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: SCOIN PACKAGES */}
      {(activeCategory === "all" || activeCategory === "coins") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Coins className="w-4 h-4" />
              Pacchetti Ricarica Squad Coins
            </h3>
            <span className="text-[10px] text-zinc-400 font-medium">Accredito istantaneo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SCOIN_PACKAGES.map((pack) => {
              const isProcessingThis = processingId === `pack-${pack.id}`;

              return (
                <div
                  key={pack.id}
                  className={`relative p-3.5 rounded-2xl border transition-all bg-[#111528] flex items-center justify-between gap-3 ${
                    pack.popular
                      ? "border-amber-400/80 shadow-[0_0_18px_rgba(245,158,11,0.2)] bg-gradient-to-b from-[#181a30] to-[#1f1908]"
                      : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  {pack.badge && (
                    <span className="absolute -top-2.5 left-3 text-[9px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black uppercase tracking-wider shadow-sm">
                      {pack.badge}
                    </span>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black shrink-0">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-black text-white">
                          +{pack.coins.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-amber-300">SC</span>
                      </div>
                      {pack.bonusText ? (
                        <span className="text-[10px] font-bold text-emerald-400 block">
                          {pack.bonusText}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 block">
                          Ricarica standard
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleBuyCoinPackage(pack)}
                    disabled={isProcessingThis}
                    className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black font-extrabold text-xs shadow-md shrink-0 flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                  >
                    {isProcessingThis ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>{pack.priceEur.toFixed(2)}€</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: AVATAR FRAMES */}
      {(activeCategory === "all" || activeCategory === "frames") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Cornici per Foto Profilo
            </h3>
            <span className="text-[10px] text-zinc-400 font-medium">Bordi ed effetti avatar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {AVATAR_FRAMES.map((frame) => {
              const isEquipped = activeFrame === frame.id;
              const isOwned =
                unlockedFrames.includes(frame.id) ||
                !frame.requiresPro ||
                (frame.requiresPro && isPlayerPro) ||
                isUniversalAdmin;

              const isProcessingThis = processingId === `frame-${frame.id}`;

              return (
                <div
                  key={frame.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                    isEquipped
                      ? "border-cyan-400 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "border-zinc-800 bg-[#111528] hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${frame.previewColor} border-2 ${frame.borderClass} ${frame.glowClass} flex items-center justify-center font-extrabold text-black text-xs shrink-0`}
                    >
                      ★
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-xs truncate">
                          {frame.name}
                        </span>
                        {frame.isTenure && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                            {frame.tenureMilestone}
                          </span>
                        )}
                        {!frame.isTenure && frame.requiresPro && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
                            PRO
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 block truncate">
                        {frame.isTenure
                          ? `Premio Fedeltà ${frame.tenureMilestone}`
                          : frame.requiresPro
                          ? "Incluso con Player Pro"
                          : "Disponibile gratis"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleBuyOrEquipFrame(frame)}
                    disabled={isProcessingThis || isEquipped}
                    className={`py-1 px-2.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      isEquipped
                        ? "bg-zinc-800 text-zinc-400 cursor-default"
                        : isOwned
                        ? "bg-purple-600 hover:bg-purple-500 text-white"
                        : "bg-cyan-600 hover:bg-cyan-500 text-white"
                    }`}
                  >
                    {isProcessingThis ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isEquipped ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-extrabold text-[11px]">
                        <Check className="w-3 h-3" /> In uso
                      </span>
                    ) : isOwned ? (
                      <span>Equipaggia</span>
                    ) : (
                      <span>Sblocca Pro</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: BANNER THEMES */}
      {(activeCategory === "all" || activeCategory === "banners") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
              <Palette className="w-4 h-4" />
              Banner Profilo & Sfondi
            </h3>
            <span className="text-[10px] text-zinc-400 font-medium">Temi personalizzati</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {BANNER_THEMES.map((theme) => {
              const isOwned =
                theme.isFree ||
                unlockedBanners.includes(theme.id) ||
                isPlayerPro ||
                isUniversalAdmin;

              const isProcessingThis = processingId === `banner-${theme.id}`;

              return (
                <div
                  key={theme.id}
                  className="p-3 rounded-2xl border border-zinc-800 bg-[#111528] flex items-center justify-between gap-3 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {theme.svgUrl ? (
                      <div className="w-14 h-8 rounded-lg overflow-hidden border border-zinc-700 shrink-0">
                        <img
                          src={theme.svgUrl}
                          alt={theme.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className={`w-12 h-8 rounded-lg bg-gradient-to-r ${theme.gradient} border border-zinc-700 shrink-0`}
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs truncate">
                          {theme.name}
                        </span>
                        {theme.isTenure && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                            {theme.tenureMilestone}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 block truncate">
                        {theme.isTenure
                          ? `Premio Fedeltà ${theme.tenureMilestone}`
                          : theme.isFree
                          ? "Gratuito"
                          : `${theme.costSC} SCoin`}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleBuyOrEquipBanner(theme)}
                    disabled={isProcessingThis}
                    className="py-1 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shrink-0 cursor-pointer transition-all"
                  >
                    {isProcessingThis ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isOwned ? (
                      <span>Equipaggia</span>
                    ) : (
                      <span>{theme.costSC} SC</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 5: TACTICAL PERKS */}
      {(activeCategory === "all" || activeCategory === "perks") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              Vantaggi & Boost Tattici
            </h3>
            <span className="text-[10px] text-zinc-400 font-medium">Potenziamenti operatore</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {TACTICAL_PERKS.map((perk) => {
              const Icon = perk.icon;
              const isProcessingThis = processingId === `perk-${perk.id}`;

              return (
                <div
                  key={perk.id}
                  className="p-3.5 rounded-2xl border border-zinc-800 bg-[#111528] flex items-center justify-between gap-3 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${perk.gradient} flex items-center justify-center text-white shrink-0 shadow-md`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">
                        {perk.name}
                      </span>
                      <p className="text-[11px] text-zinc-400 leading-snug">
                        {perk.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleBuyPerk(perk)}
                    disabled={isProcessingThis}
                    className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black font-extrabold text-xs shrink-0 shadow-sm cursor-pointer transition-transform active:scale-95"
                  >
                    {isProcessingThis ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>{perk.costSC} SC</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
