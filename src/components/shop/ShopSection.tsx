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
  Crosshair,
  Terminal,
  Layers,
  ArrowUpRight,
  Radio,
  Eye,
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
    bonusText: "Cassa Base",
    badge: null,
    popular: false,
    rarity: "Standard",
    color: "from-zinc-800 to-zinc-950",
    border: "border-zinc-700",
  },
  {
    id: "sc-250",
    coins: 250,
    priceEur: 2.5,
    bonusText: "Ideale per Clan Pro",
    badge: null,
    popular: false,
    rarity: "Tattico",
    color: "from-blue-950/70 to-zinc-950",
    border: "border-blue-500/50",
  },
  {
    id: "sc-550",
    coins: 550,
    priceEur: 5.0,
    bonusText: "+50 SCoin BONUS (+10%)",
    badge: "PIÙ RICHIESTO",
    popular: true,
    rarity: "Special Ops",
    color: "from-cyan-950/80 to-zinc-950",
    border: "border-cyan-400",
  },
  {
    id: "sc-1200",
    coins: 1200,
    priceEur: 10.0,
    bonusText: "+200 SCoin BONUS (+20%)",
    badge: "MIGLIOR VALORE",
    popular: false,
    rarity: "Veterano",
    color: "from-amber-950/80 to-zinc-950",
    border: "border-amber-400",
  },
  {
    id: "sc-2600",
    coins: 2600,
    priceEur: 20.0,
    bonusText: "+600 SCoin BONUS (+30%)",
    badge: "PACCHETTO ELITE",
    popular: false,
    rarity: "Apex",
    color: "from-purple-950/80 to-zinc-950",
    border: "border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]",
  },
];

const TACTICAL_PERKS = [
  {
    id: "perk-boost-2x",
    name: "Booster Guadagno 2x (7 Giorni)",
    description: "Raddoppia gli SCoin vinti in ogni torneo ufficiale per una settimana intera.",
    costSC: 75,
    icon: Zap,
    rarity: "Special Ops",
    border: "border-amber-500/60",
    gradient: "from-amber-500/20 via-zinc-900 to-black",
  },
  {
    id: "perk-rename",
    name: "Cambio Activision ID Istantaneo",
    description: "Modifica il tuo Activision ID e tag senza attendere il cooldown di 30 giorni.",
    costSC: 40,
    icon: Sparkles,
    rarity: "Tattico",
    border: "border-cyan-500/60",
    gradient: "from-cyan-500/20 via-zinc-900 to-black",
  },
  {
    id: "perk-clan-slots",
    name: "Slot Membri Clan Extra (+25)",
    description: "Aumenta la capienza massima del tuo Clan di 25 operatori aggiuntivi.",
    costSC: 120,
    icon: Users,
    rarity: "Apex",
    border: "border-purple-500/60",
    gradient: "from-purple-500/20 via-zinc-900 to-black",
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
  const isClanElite = (clanData?.tier === "elite") || isUniversalAdmin;
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
      const { error: rpcErr } = await supabase.rpc("buy_squad_coins", {
        p_coins: pack.coins,
        p_amount_eur: pack.priceEur,
        p_payment_method: "card",
      });

      if (rpcErr) {
        await supabase
          .from("profiles")
          .update({
            coins: (sCoinBalance || 0) + pack.coins,
            balance: (sCoinBalance || 0) + pack.coins,
            schoins: (sCoinBalance || 0) + pack.coins,
          })
          .eq("id", currentUser.id);
      }

      await supabase.from("sc_transactions").insert({
        user_id: currentUser.id,
        amount: pack.coins,
        type: "shop_purchase",
        description: `Ricarica SCoin Armeria (+${pack.coins} SC - ${pack.priceEur.toFixed(2)}€)`,
      });

      await refreshUserData();
      toast({
        title: "⚡ Ricarica SCoin Autorizzata!",
        description: `Accreditati +${pack.coins} SCoin nel tuo caveau operativo.`,
      });
    } catch (err: any) {
      toast({
        title: "Errore transazione",
        description: err.message || "Impossibile completare l'operazione.",
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
        title: "SCoin Insufficienti",
        description: `Servono ${cost} SCoin per arruolare il pass Player Pro. Ricarica un pacchetto qui sotto.`,
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
        description: "Abbonamento Player Pro (30 Giorni) - Armeria Ufficiale",
      });

      await refreshUserData();
      toast({
        title: "👑 Player Pro Dispiegato!",
        description: "Status Pro attivo con badge dorato, moltiplicatore 2x e accesso alle ricompense d'anzianità.",
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
        title: "Nessun Clan Attivo",
        description: "Devi essere al comando di un Clan per poterne potenziare il tier.",
        variant: "destructive",
      });
      return;
    }

    const cost = tier === "pro" ? 250 : 500;
    if (sCoinBalance < cost && !isUniversalAdmin) {
      toast({
        title: "SCoin Insufficienti",
        description: `Servono ${cost} SCoin per l'upgrade a ${tier.toUpperCase()}.`,
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
          level: tier === "elite" ? Math.max(clanData.level || 1, 3) : Math.max(clanData.level || 1, 2),
          is_pro: true,
          badge: tier === "elite" ? "👑 ELITE" : "⭐ PRO",
        })
        .eq("id", clanData.id);

      await supabase.from("sc_transactions").insert({
        user_id: currentUser.id,
        recipient_id: clanData.ownerId,
        amount: cost,
        type: "clan_donation",
        description: `Upgrade Tier Clan ${clanData.name} -> ${tier.toUpperCase()}`,
      });

      await refreshUserData();
      toast({
        title: `🛡️ Clan ${clanData.name} Elevato a ${tier.toUpperCase()}!`,
        description: `Sbloccati nuovi slot membri, ruoli tattici e stemmi per tutta la squadra.`,
      });
    } catch (err: any) {
      toast({
        title: "Errore upgrade",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Equip or Buy Frame
  const handleEquipFrame = async (frame: typeof AVATAR_FRAMES[0]) => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    const isOwned = unlockedFrames.includes(frame.id) || !frame.requiresPro || isUniversalAdmin;

    if (isOwned) {
      setProcessingId(`frame-${frame.id}`);
      try {
        await supabase
          .from("profiles")
          .update({ active_frame: frame.id })
          .eq("id", currentUser.id);

        await refreshUserData();
        toast({
          title: "Cornice Avatar Equipaggiata! ✨",
          description: `La cornice "${frame.name}" è ora visibile sul tuo avatar.`,
        });
      } finally {
        setProcessingId(null);
      }
      return;
    }

    if (frame.requiresPro && !isPlayerPro) {
      toast({
        title: "Requisito Player Pro",
        description: "Attiva il pass Player Pro per sbloccare questa cornice tattica.",
      });
    }
  };

  // Equip or Buy Banner
  const handleEquipBanner = async (theme: typeof BANNER_THEMES[0]) => {
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
          title: "SCoin Insufficienti",
          description: `Servono ${theme.costSC} SCoin per requisire questo banner.`,
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
          description: `Acquisto Banner: ${theme.name}`,
        });

        await refreshUserData();
        toast({
          title: "Banner Requisito ed Equipaggiato! 🖼️",
          description: `"${theme.name}" è ora attivo sulla scheda profilo.`,
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
        title: "Banner Attivo! 🖼️",
        description: `Lo stile "${theme.name}" è ora equipaggiato.`,
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
        title: "SCoin Insufficienti",
        description: `Servono ${perk.costSC} SCoin per arruolare questo booster.`,
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
        description: `Booster Tattico: ${perk.name}`,
      });

      await refreshUserData();
      toast({
        title: `⚡ ${perk.name} Operativo!`,
        description: "Il booster è stato applicato alle tue credenziali di combattimento.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-24 pt-2 px-2 sm:px-4 max-w-7xl mx-auto animate-fade-in">
      {/* ========================================================
          TACTICAL HUD SHOP HEADER // CALL OF DUTY ARMORY
          ======================================================== */}
      <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-gradient-to-r from-[#06080e] via-[#09101d] to-[#04060b] p-5 sm:p-7 shadow-[0_0_35px_rgba(6,182,212,0.18)]">
        {/* HUD Military Crosshair Background Grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(6,182,212,0.25) 1px, transparent 1px)`,
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-cyan-950/80 border border-cyan-500/50 text-[10px] font-mono font-black text-cyan-300 tracking-wider uppercase">
                <Crosshair className="w-3 h-3 text-cyan-400 animate-spin-slow" />
                ARMORY // SQUADUP BLACK MARKET
              </span>
              <span className="text-[10px] font-mono text-zinc-300 hidden sm:inline">
                REQUISITIONS AUTHORIZED // TAC-SUPPLY
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <span>ARMERIA &amp; SHOP CENTRALE</span>
              <span className="text-xs px-2.5 py-1 rounded bg-amber-500 text-black font-extrabold tracking-widest uppercase shadow-[0_0_12px_rgba(245,158,11,0.6)]">
                ÉLITE
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-2xl font-medium">
              Centro unico per munizioni SCoin, tessere operative Pro, avanzamento clan,
              cornici avatar balistiche e camouflage widescreen per il profilo.
            </p>
          </div>

          {/* Realtime Vault SCoin Display */}
          <div className="p-4 rounded-xl bg-black/80 border-2 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center gap-4 self-start md:self-auto min-w-[200px] justify-between">
            <div>
              <div className="text-[10px] font-mono text-zinc-300 uppercase tracking-widest font-bold">
                CAVEAU OPERATIVO
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Coins className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="text-2xl font-black text-white font-mono tracking-tight">
                  {isUniversalAdmin ? "ILLIMITATI" : sCoinBalance.toLocaleString()}
                </span>
                <span className="text-xs font-black text-amber-400 font-mono">SC</span>
              </div>
            </div>

            <button
              onClick={() => setActiveCategory("coins")}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/50 text-[10px] font-mono font-black uppercase tracking-wider transition-all"
            >
              + RICARICA
            </button>
          </div>
        </div>

        {/* ========================================================
            MILITARY CATEGORY SELECTOR // COD HUD STYLE
            ======================================================== */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-6 pt-5 border-t border-zinc-800/80 scrollbar-none">
          {[
            { id: "all", label: "[00] TUTTI GLI ASSET", icon: ShoppingBag },
            { id: "passes", label: "[01] PASS & TIER", icon: Crown },
            { id: "coins", label: "[02] SC COIN PACK", icon: Coins },
            { id: "frames", label: "[03] CORNICI TATTICHE", icon: Sparkles },
            { id: "banners", label: "[04] BANNER WIDESCREEN", icon: Palette },
            { id: "perks", label: "[05] BOOSTER & PERKS", icon: Zap },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as ShopCategory)}
                className={`py-2 px-3.5 rounded-xl font-mono text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 shrink-0 border ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "bg-zinc-950/70 text-zinc-300 hover:text-zinc-200 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-200" : "text-zinc-300"}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          CATEGORY: PASS & TIERS OPERATIVI
          ======================================================== */}
      {(activeCategory === "all" || activeCategory === "passes") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-mono text-sm font-black">// SPEC 01</span>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">
                TESSERE OPERATIVE &amp; PASS UFFICIALI
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-300">DURATA: 30 GIORNI</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Player Pro Card */}
            <div className="relative rounded-2xl border border-amber-500/60 bg-gradient-to-b from-[#181005] via-[#0d0903] to-[#050401] p-5 shadow-[0_0_25px_rgba(245,158,11,0.2)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/60 text-[10px] font-mono font-black text-amber-300 uppercase">
                    OPERATORE SINGOLO
                  </span>
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>

                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                  PLAYER PRO PASS
                </h3>
                <div className="text-2xl font-black text-amber-400 font-mono my-2">
                  150 <span className="text-xs">SCoin / Mese</span>
                </div>

                <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
                  Sblocca il badge dorato verificato, moltiplicatore 2x premi torneo,
                  banner premium illimitati e cumulo anzianità per le ricompense d'élite.
                </p>

                <ul className="space-y-2 text-xs font-mono text-zinc-300 border-t border-amber-900/40 pt-3 mb-5">
                  <li className="flex items-center gap-2 text-amber-300">
                    <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
                    <span>Progressione Anzianità (3, 6, 9, 12 Mesi)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
                    <span>Tutti i Banner Profilo Tattici sbloccati</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
                    <span>Slot Prioritari nelle Squad Room</span>
                  </li>
                </ul>
              </div>

              {isPlayerPro ? (
                <div className="py-2.5 px-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-mono text-xs font-black uppercase text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>PASS ATTIVO SUL PROFILO</span>
                </div>
              ) : (
                <button
                  onClick={handleBuyPlayerPro}
                  disabled={processingId === "sub-player-pro"}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.5)] active:scale-95 transition-all"
                >
                  {processingId === "sub-player-pro" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <Zap className="w-4 h-4 text-black fill-black" />
                  )}
                  <span>ARROLATI (150 SC)</span>
                </button>
              )}
            </div>

            {/* 2. Clan Pro Card */}
            <div className="relative rounded-2xl border border-cyan-500/60 bg-gradient-to-b from-[#05131f] via-[#030910] to-[#010408] p-5 shadow-[0_0_25px_rgba(6,182,212,0.2)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/60 text-[10px] font-mono font-black text-cyan-300 uppercase">
                    CLAN LEVEL 2
                  </span>
                  <Shield className="w-5 h-5 text-cyan-400" />
                </div>

                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                  CLAN PRO SQUAD
                </h3>
                <div className="text-2xl font-black text-cyan-300 font-mono my-2">
                  250 <span className="text-xs">SCoin / Mese</span>
                </div>

                <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
                  Espande la capienza del Clan a 100 operatori, stemma [PRO] nei tabelloni,
                  chat vocale a bassa latenza e creazione ruoli personalizzati.
                </p>

                <ul className="space-y-2 text-xs font-mono text-zinc-300 border-t border-cyan-900/40 pt-3 mb-5">
                  <li className="flex items-center gap-2 text-cyan-300">
                    <Check className="w-3.5 h-3.5 text-cyan-400 stroke-[3]" />
                    <span>Capienza aumentata a 100 Operatori</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400 stroke-[3]" />
                    <span>Badge Clan Verificato PRO</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400 stroke-[3]" />
                    <span>Canale Vocale HQ Dedicato</span>
                  </li>
                </ul>
              </div>

              {isClanPro ? (
                <div className="py-2.5 px-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-mono text-xs font-black uppercase text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>CLAN PRO ATTIVO</span>
                </div>
              ) : (
                <button
                  onClick={() => handleBuyClanTier("pro")}
                  disabled={processingId === "sub-clan-pro"}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all"
                >
                  {processingId === "sub-clan-pro" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Shield className="w-4 h-4 text-cyan-200" />
                  )}
                  <span>UPGRADE PRO (250 SC)</span>
                </button>
              )}
            </div>

            {/* 3. Clan Elite Card */}
            <div className="relative rounded-2xl border border-purple-500/70 bg-gradient-to-b from-[#140624] via-[#090212] to-[#040108] p-5 shadow-[0_0_30px_rgba(168,85,247,0.25)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/70 text-[10px] font-mono font-black text-purple-300 uppercase">
                    CLAN LEVEL 3 SUPREME
                  </span>
                  <Award className="w-5 h-5 text-purple-400" />
                </div>

                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                  CLAN ELITE DIVISION
                </h3>
                <div className="text-2xl font-black text-purple-300 font-mono my-2">
                  500 <span className="text-xs">SCoin / Mese</span>
                </div>

                <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
                  Il vertice per i clan competitivi. Fino a 250 membri, gestione tornei
                  integrata, stemmi personalizzati ad alta risoluzione e supporto prioritaro.
                </p>

                <ul className="space-y-2 text-xs font-mono text-zinc-300 border-t border-purple-900/40 pt-3 mb-5">
                  <li className="flex items-center gap-2 text-purple-300">
                    <Check className="w-3.5 h-3.5 text-purple-400 stroke-[3]" />
                    <span>Capienza massima a 250 Operatori</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-purple-400 stroke-[3]" />
                    <span>Stemmi e Widescreen Camo Unici</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-purple-400 stroke-[3]" />
                    <span>Inviti automatici alle Squad War</span>
                  </li>
                </ul>
              </div>

              {isClanElite ? (
                <div className="py-2.5 px-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-mono text-xs font-black uppercase text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>CLAN ELITE ATTIVO</span>
                </div>
              ) : (
                <button
                  onClick={() => handleBuyClanTier("elite")}
                  disabled={processingId === "sub-clan-elite"}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.5)] active:scale-95 transition-all"
                >
                  {processingId === "sub-clan-elite" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Award className="w-4 h-4 text-purple-200" />
                  )}
                  <span>DISPIEGA ELITE (500 SC)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CATEGORY: PACCHETTI SC COIN MUNIZIONI
          ======================================================== */}
      {(activeCategory === "all" || activeCategory === "coins") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-sm font-black">// SPEC 02</span>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">
                RIFORNIMENTO SC COIN // MUNIZIONI WALLET
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-300">ACCREDITO ISTANTANEO</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {SCOIN_PACKAGES.map((pack) => {
              const isProcessing = processingId === `pack-${pack.id}`;

              return (
                <div
                  key={pack.id}
                  className={`relative p-5 rounded-2xl border bg-gradient-to-b ${pack.color} ${pack.border} flex flex-col justify-between transition-all hover:scale-[1.02]`}
                >
                  {pack.badge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-mono font-black text-[9px] uppercase tracking-wider shadow-md">
                      {pack.badge}
                    </span>
                  )}

                  <div>
                    <div className="text-[10px] font-mono text-zinc-300 uppercase tracking-widest font-bold mb-1">
                      {pack.rarity}
                    </div>

                    <div className="flex items-center gap-2 my-2">
                      <Coins className="w-6 h-6 text-amber-400 shrink-0" />
                      <div className="text-2xl font-black text-white font-mono tracking-tight">
                        +{pack.coins}
                      </div>
                    </div>

                    <div className="text-[11px] text-amber-300 font-mono font-bold mb-3 min-h-[18px]">
                      {pack.bonusText || "Ricarica rapida"}
                    </div>
                  </div>

                  <button
                    onClick={() => handleBuyCoinPackage(pack)}
                    disabled={isProcessing}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-black font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.4)] active:scale-95 transition-all"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                    ) : (
                      <span>ACQUISTA {pack.priceEur.toFixed(2)}€</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          CATEGORY: CORNICI TATTICHE AVATAR
          ======================================================== */}
      {(activeCategory === "all" || activeCategory === "frames") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-purple-400 font-mono text-sm font-black">// SPEC 03</span>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">
                CORNICI TATTICHE AVATAR // BEZEL METALLICI
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-300">COMPATIBILI MULTIPLAYER</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AVATAR_FRAMES.map((frame) => {
              const isEquipped = activeFrame === frame.id;
              const isOwned =
                unlockedFrames.includes(frame.id) ||
                !frame.requiresPro ||
                isUniversalAdmin;
              const isProcessing = processingId === `frame-${frame.id}`;

              return (
                <div
                  key={frame.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isEquipped
                      ? "bg-gradient-to-b from-[#120a22] to-[#080410] border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                      : "bg-[#080a12] border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {/* Live Avatar Preview */}
                    <div
                      className={`w-14 h-14 rounded-full border-2 overflow-hidden flex items-center justify-center shrink-0 ${
                        frame.borderClass
                      } ${frame.glowClass || ""}`}
                    >
                      <img
                        src={userProfile.avatar || "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=120&auto=format&fit=crop&q=80"}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-zinc-300 uppercase block font-bold">
                        {frame.rarity || (frame.requiresPro ? "Pro Tier" : "Standard")}
                      </span>
                      <h4 className="text-sm font-black text-white uppercase">
                        {frame.name}
                      </h4>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800">
                    {isEquipped ? (
                      <div className="py-2 px-3 rounded-lg bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-mono text-xs font-black uppercase text-center flex items-center justify-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                        <span>ATTIVA</span>
                      </div>
                    ) : isOwned ? (
                      <button
                        onClick={() => handleEquipFrame(frame)}
                        disabled={isProcessing}
                        className="w-full py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>EQUIPAGGIA</span>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleBuyPlayerPro}
                        className="w-full py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                      >
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>RICHIEDE PRO</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          CATEGORY: BANNER WIDESCREEN & MILITARY CAMO
          ======================================================== */}
      {(activeCategory === "all" || activeCategory === "banners") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-pink-400 font-mono text-sm font-black">// SPEC 04</span>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">
                BANNER WIDESCREEN // MIMETICHE PROFILO
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-300">ALTA RISOLUZIONE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {BANNER_THEMES.map((theme) => {
              const isEquipped =
                userProfile.bannerUrl === theme.svgUrl ||
                (!theme.svgUrl && userProfile.proTheme === (theme.id === "theme-gold" ? "gold" : "neon"));
              const isOwned =
                theme.isFree ||
                unlockedBanners.includes(theme.id) ||
                isPlayerPro ||
                isUniversalAdmin;
              const isProcessing = processingId === `banner-${theme.id}`;

              return (
                <div
                  key={theme.id}
                  className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all ${
                    isEquipped
                      ? "border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] bg-[#070b14]"
                      : "border-zinc-800 bg-[#06080e]"
                  }`}
                >
                  {/* Banner Preview */}
                  <div className="h-32 w-full bg-black relative overflow-hidden">
                    {theme.svgUrl ? (
                      <img
                        src={theme.svgUrl}
                        alt={theme.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-r ${theme.gradient}`} />
                    )}

                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-zinc-700 text-[10px] font-mono font-black text-white uppercase">
                      {theme.isFree ? "BASE" : theme.isTenure ? `TENURE: ${theme.tenureMilestone}` : `${theme.costSC} SC`}
                    </div>
                  </div>

                  <div className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">
                        {theme.name}
                      </h4>
                      <span className="text-[11px] font-mono text-zinc-300">
                        {theme.isTenure ? "Sblocco Anzianità Pro" : "Dotazione Tattica"}
                      </span>
                    </div>

                    <div>
                      {isEquipped ? (
                        <span className="py-1.5 px-3 rounded-lg bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-mono text-xs font-black uppercase flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                          ATTIVO
                        </span>
                      ) : isOwned ? (
                        <button
                          onClick={() => handleEquipBanner(theme)}
                          disabled={isProcessing}
                          className="py-1.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono text-xs font-bold uppercase transition-all active:scale-95"
                        >
                          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "EQUIPAGGIA"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEquipBanner(theme)}
                          disabled={isProcessing}
                          className="py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-black uppercase transition-all active:scale-95"
                        >
                          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `SBLOCCA (${theme.costSC} SC)`}
                        </button>
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
          CATEGORY: BOOSTER & VANTAGGI
          ======================================================== */}
      {(activeCategory === "all" || activeCategory === "perks") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-mono text-sm font-black">// SPEC 05</span>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">
                BOOSTER &amp; VANTAGGI SPECIALI
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-300">INNESTO IMMEDIATO</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TACTICAL_PERKS.map((perk) => {
              const Icon = perk.icon;
              const isProcessing = processingId === `perk-${perk.id}`;

              return (
                <div
                  key={perk.id}
                  className={`p-5 rounded-2xl border bg-gradient-to-b ${perk.gradient} ${perk.border} flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono font-black text-zinc-300 uppercase">
                        {perk.rarity}
                      </span>
                      <Icon className="w-5 h-5 text-amber-400" />
                    </div>

                    <h4 className="text-base font-black text-white uppercase tracking-tight">
                      {perk.name}
                    </h4>
                    <div className="text-xl font-black text-amber-400 font-mono my-2">
                      {perk.costSC} <span className="text-xs">SCoin</span>
                    </div>

                    <p className="text-xs text-zinc-300 mb-5 leading-relaxed">
                      {perk.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleBuyPerk(perk)}
                    disabled={isProcessing}
                    className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-mono font-black text-xs uppercase tracking-wider border border-zinc-700 flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>ACQUISTA BOOSTER</span>
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
