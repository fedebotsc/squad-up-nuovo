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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { ClanData } from "@/data/mockData";

interface ClanLoyaltyTabProps {
  clanData: ClanData;
  currentUser: any;
  userProfile: any;
  onRefresh: () => Promise<void>;
  onOpenUpgrade: () => void;
}

interface LoyaltyReward {
  months: number;
  title: string;
  subtitle: string;
  playerFrame: { name: string; style: string; borderClass: string; color: string };
  playerBanner: { name: string; bgGradient: string; description: string };
  clanFrame: { name: string; style: string; borderClass: string; color: string };
  clanBanner: { name: string; bgGradient: string; description: string };
}

const LOYALTY_TIERS: LoyaltyReward[] = [
  {
    months: 1,
    title: "1 Mese • Fedeltà Iniziale",
    subtitle: "Riconoscimento primo mese di servizio",
    playerFrame: {
      name: "Cornice Veteran Bronze",
      style: "border-2 border-amber-700 shadow-[0_0_8px_rgba(180,83,9,0.4)]",
      borderClass: "#B45309",
      color: "from-amber-700 to-amber-900",
    },
    playerBanner: {
      name: "Tactical Bronze Vanguard",
      bgGradient: "from-amber-950 via-stone-900 to-black",
      description: "Banner con rifiniture in bronzo spazzolato e mimetica tattica",
    },
    clanFrame: {
      name: "Stemma Iron Bastion",
      style: "border-2 border-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.3)]",
      borderClass: "#D97706",
      color: "from-amber-600 to-stone-800",
    },
    clanBanner: {
      name: "Fortezza di Bronzo",
      bgGradient: "from-[#20150d] via-[#141829] to-black",
      description: "Banner clan con stemma in bassorilievo e incisioni da combattimento",
    },
  },
  {
    months: 3,
    title: "3 Mesi • Operatore Costante",
    subtitle: "Fedeltà trimestrale consolidata",
    playerFrame: {
      name: "Cornice Silver Stryker",
      style: "border-2 border-slate-300 shadow-[0_0_12px_rgba(203,213,225,0.5)]",
      borderClass: "#CBD5E1",
      color: "from-slate-200 to-slate-500",
    },
    playerBanner: {
      name: "Chrome Cyber Assault",
      bgGradient: "from-slate-900 via-indigo-950 to-black",
      description: "Banner cromato con riflessi specchiati ad alta tecnologia",
    },
    clanFrame: {
      name: "Stemma Silver Legion",
      style: "border-2 border-slate-200 shadow-[0_0_14px_rgba(241,245,249,0.5)]",
      borderClass: "#E2E8F0",
      color: "from-slate-300 to-indigo-900",
    },
    clanBanner: {
      name: "Legione d'Acciaio Argentato",
      bgGradient: "from-[#111827] via-[#1e1b4b] to-black",
      description: "Stendardo della legione con emblema d'argento splendente",
    },
  },
  {
    months: 6,
    title: "6 Mesi • Veterano di Squadra",
    subtitle: "Mezzo anno di appartenenza d'élite",
    playerFrame: {
      name: "Cornice Golden Sovereign",
      style: "border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)] animate-pulse",
      borderClass: "#FBBF24",
      color: "from-amber-300 via-yellow-400 to-amber-600",
    },
    playerBanner: {
      name: "Golden Imperial Aura",
      bgGradient: "from-amber-950 via-yellow-950 to-black",
      description: "Banner con aura dorata pulsante e filigrana imperiale",
    },
    clanFrame: {
      name: "Stemma Golden Eagle Crest",
      style: "border-2 border-yellow-300 shadow-[0_0_16px_rgba(253,224,71,0.6)]",
      borderClass: "#FDE047",
      color: "from-yellow-300 to-amber-700",
    },
    clanBanner: {
      name: "Dominio Imperiale d'Oro",
      bgGradient: "from-[#2d1b00] via-[#171329] to-black",
      description: "Sfondo imperiale d'oro per la home page del clan",
    },
  },
  {
    months: 9,
    title: "9 Mesi • Comandante d'Élite",
    subtitle: "Tre trimestri di dedizione assoluta",
    playerFrame: {
      name: "Cornice Platinum Cyber Aegis",
      style: "border-2 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.7)]",
      borderClass: "#06B6D4",
      color: "from-cyan-300 via-teal-400 to-purple-600",
    },
    playerBanner: {
      name: "Nebula Pulse Platinum",
      bgGradient: "from-cyan-950 via-purple-950 to-black",
      description: "Onde cibernetiche neon con particelle quantiche in movimento",
    },
    clanFrame: {
      name: "Stemma Cyber Citadel",
      style: "border-2 border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.7)]",
      borderClass: "#22D3EE",
      color: "from-cyan-300 to-blue-900",
    },
    clanBanner: {
      name: "Cittadella Neon Sovrana",
      bgGradient: "from-[#042f2e] via-[#1e1b4b] to-black",
      description: "Banner clan futuristico con skyline neon e sigillo quantico",
    },
  },
  {
    months: 12,
    title: "12 Mesi • Leggenda Suprema (1 Anno)",
    subtitle: "Il rango più alto della community SquadUP",
    playerFrame: {
      name: "Cornice Mythic Obsidian Champion",
      style: "border-2 border-purple-500 shadow-[0_0_22px_rgba(168,85,247,0.8)] animate-pulse",
      borderClass: "#A855F7",
      color: "from-purple-400 via-pink-500 to-amber-300",
    },
    playerBanner: {
      name: "Cosmic Overlord Pantheon",
      bgGradient: "from-purple-950 via-indigo-950 to-black",
      description: "Banner cosmico con supernova e costellazioni animate",
    },
    clanFrame: {
      name: "Stemma Mythic Dragon Crest",
      style: "border-2 border-amber-300 shadow-[0_0_24px_rgba(252,211,77,0.9)] animate-pulse",
      borderClass: "#FCD34D",
      color: "from-amber-300 via-rose-500 to-purple-700",
    },
    clanBanner: {
      name: "Pantheon Supremo dei Draghi",
      bgGradient: "from-[#3b0764] via-[#1e1b4b] to-black",
      description: "Massimo prestigio per il clan: stendardo del drago dorato con fiamme viola",
    },
  },
];

export const ClanLoyaltyTab: React.FC<ClanLoyaltyTabProps> = ({
  clanData,
  currentUser,
  userProfile,
  onRefresh,
  onOpenUpgrade,
}) => {
  const [activeCategory, setActiveCategory] = useState<"player" | "clan">("clan");
  const [claimedRewards, setClaimedRewards] = useState<string[]>([]);
  const [isEquipping, setIsEquipping] = useState<string | null>(null);

  // Calculate subscription tenure
  const clanMonths = clanData.subscriptionMonths || 1;
  const isClanProOrElite =
    clanData.tier === "pro" ||
    clanData.tier === "elite" ||
    clanData.subscriptionTier === "pro" ||
    clanData.subscriptionTier === "elite";

  const isPlayerPro = userProfile.subscription_tier === "pro" || userProfile.isPro;
  const playerMonths = isPlayerPro ? clanMonths : 0;

  // Load existing claimed rewards from user_rewards
  useEffect(() => {
    const fetchUserRewards = async () => {
      if (!currentUser) return;
      try {
        const { data, error } = await supabase
          .from("user_rewards")
          .select("*")
          .or(`user_id.eq.${currentUser.id},clan_id.eq.${clanData.id}`);

        if (!error && data) {
          const keys = data.map((r: any) => `${r.reward_type}_${r.months_tier}`);
          setClaimedRewards(keys);
        }
      } catch (err) {
        console.error("[ClanLoyaltyTab] Errore caricamento ricompense:", err);
      }
    };

    fetchUserRewards();
  }, [currentUser, clanData.id]);

  const handleClaimAndEquip = async (
    tierItem: LoyaltyReward,
    category: "player" | "clan"
  ) => {
    if (!currentUser) return;

    const rewardKey = `${category}_${tierItem.months}`;
    setIsEquipping(rewardKey);

    try {
      // 1. Save reward record in user_rewards table
      await supabase.from("user_rewards").insert({
        user_id: currentUser.id,
        clan_id: category === "clan" ? clanData.id : null,
        reward_type: category,
        months_tier: tierItem.months,
      });

      // 2. Apply to Profile or Clan
      if (category === "clan") {
        await supabase
          .from("clans")
          .update({
            clan_frame_url: tierItem.clanFrame.borderClass,
            clan_banner_url: tierItem.clanBanner.name,
          })
          .eq("id", clanData.id);

        toast({
          title: "Premio Clan Equipaggiato! 🛡️",
          description: `Hai applicato "${tierItem.clanFrame.name}" e il banner "${tierItem.clanBanner.name}" al clan!`,
        });
      } else {
        await supabase
          .from("profiles")
          .update({
            banner_url: tierItem.playerBanner.name,
          })
          .eq("id", currentUser.id);

        toast({
          title: "Premio Giocatore Equipaggiato! 👑",
          description: `Hai applicato "${tierItem.playerFrame.name}" al tuo profilo personale!`,
        });
      }

      setClaimedRewards((prev) => [...prev, rewardKey]);
      await onRefresh();
    } catch (err: any) {
      console.error("[ClanLoyaltyTab] Errore riscatto premio:", err);
      toast({
        title: "Errore Riscatto",
        description: err.message || "Impossibile applicare il premio.",
        variant: "destructive",
      });
    } finally {
      setIsEquipping(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Loyalty Header Banner */}
      <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                PROGRAMMA FEDELTÀ & ANZIANITÀ
              </h3>
              <p className="text-[10px] text-zinc-400">
                Sblocca cornici esclusive e banner per Giocatori e Clan (1 - 12 mesi)
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[9px] text-zinc-400 block uppercase font-bold">
              Anzianità Clan
            </span>
            <span className="text-amber-300 font-extrabold text-xs">
              {clanMonths} Mes{clanMonths === 1 ? "e" : "i"}
            </span>
          </div>
        </div>

        {/* Category Switcher: Giocatore vs Clan */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={() => setActiveCategory("clan")}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === "clan"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md border border-purple-400/50"
                : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-cyan-300" />
            <span>Premi Clan ({isClanProOrElite ? "Pro/Elite" : "Base"})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("player")}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === "player"
                ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-black shadow-md border border-amber-400/50"
                : "bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Premi Giocatore ({isPlayerPro ? "Pro" : "Free"})</span>
          </button>
        </div>
      </div>

      {/* Rewards Milestones List */}
      <div className="space-y-3">
        {LOYALTY_TIERS.map((tier) => {
          const isEligible =
            activeCategory === "clan"
              ? isClanProOrElite && clanMonths >= tier.months
              : isPlayerPro && playerMonths >= tier.months;

          const rewardKey = `${activeCategory}_${tier.months}`;
          const isClaimed = claimedRewards.includes(rewardKey);
          const isCurrentEquipping = isEquipping === rewardKey;

          const frameInfo =
            activeCategory === "clan" ? tier.clanFrame : tier.playerFrame;
          const bannerInfo =
            activeCategory === "clan" ? tier.clanBanner : tier.playerBanner;

          return (
            <div
              key={tier.months}
              className={`rounded-2xl border p-4 transition-all shadow-md ${
                isEligible
                  ? "bg-[#14182e] border-purple-500/40 hover:border-purple-400"
                  : "bg-[#0f1220]/80 border-zinc-800/80 opacity-75"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      isEligible
                        ? "bg-gradient-to-br from-amber-500 to-purple-600 text-white shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                        : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {tier.months}M
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-white">{tier.title}</h4>
                    <p className="text-[10px] text-zinc-400">{tier.subtitle}</p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isEligible ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      SBLOCCATO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                      <Lock className="w-2.5 h-2.5" />
                      {tier.months} Mesi
                    </span>
                  )}
                </div>
              </div>

              {/* Reward Showcase: Frame & Banner Preview */}
              <div className="grid grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-zinc-800/80">
                {/* Frame Showcase */}
                <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-2.5">
                  <div className="relative shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-zinc-950">
                    <div
                      className="absolute inset-0 rounded-xl"
                      style={{
                        border: `2px solid ${frameInfo.borderClass}`,
                        boxShadow: `0 0 8px ${frameInfo.borderClass}80`,
                      }}
                    />
                    {activeCategory === "clan" ? (
                      <Shield className="w-4 h-4 text-zinc-300" />
                    ) : (
                      <Crown className="w-4 h-4 text-zinc-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] text-zinc-400 block">Cornice</span>
                    <span className="text-[11px] font-bold text-white block truncate">
                      {frameInfo.name}
                    </span>
                  </div>
                </div>

                {/* Banner Showcase */}
                <div
                  className={`p-2.5 rounded-xl border border-zinc-800 bg-gradient-to-r ${bannerInfo.bgGradient} flex items-center gap-2`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] text-zinc-300/80 block">Banner Profilo</span>
                    <span className="text-[11px] font-bold text-white block truncate">
                      {bannerInfo.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-3">
                {isEligible ? (
                  <button
                    type="button"
                    onClick={() => handleClaimAndEquip(tier, activeCategory)}
                    disabled={isCurrentEquipping}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                  >
                    {isCurrentEquipping ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                    )}
                    <span>{isClaimed ? "Ri-equipaggia Ora" : "Riscatta & Equipaggia"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenUpgrade}
                    className="w-full py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-400 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-zinc-700/60 transition-colors cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Richiede Abbonamento {tier.months} Mesi</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
