import React, { useState } from "react";
import {
  X,
  Crown,
  Shield,
  Check,
  Sparkles,
  Zap,
  Users,
  Trophy,
  Coins,
  Loader2,
  Star,
  Flame,
  ArrowRight,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "player" | "clan";
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  defaultTab = "player",
}) => {
  const {
    userProfile,
    sCoinBalance,
    clanData,
    currentUser,
    refreshUserData,
    openAuthModal,
  } = useSquad();

  const [activeTab, setActiveTab] = useState<"player" | "clan">(defaultTab);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  if (!isOpen) return null;

  const isPlayerPro = userProfile.subscriptionTier === "pro";
  const clanTier = clanData?.level && clanData.level >= 2 ? "elite" : "free"; // or check raw tier

  const handleSubscribePlayerPro = async () => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    const cost = 150;
    if (sCoinBalance < cost) {
      toast({
        title: "Saldo SCoin insufficiente",
        description: `Servono ${cost} SCoin per attivare Player Pro per 30 giorni. Ricarica il tuo wallet.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Try Supabase RPC
      const { data: expiryData, error: rpcErr } = await supabase.rpc("redeem_player_pro", {
        p_auto_renew: true,
      });

      if (rpcErr) {
        console.warn("[SubModal] RPC fallback a query diretta:", rpcErr);
        const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // Direct update
        await supabase
          .from("profiles")
          .update({
            subscription_tier: "pro",
            pro_expires_at: expiry,
            coins: Math.max(0, sCoinBalance - cost),
            balance: Math.max(0, sCoinBalance - cost),
            schoins: Math.max(0, sCoinBalance - cost),
          })
          .eq("id", currentUser.id);

        // Record transaction
        await supabase.from("sc_transactions").insert({
          user_id: currentUser.id,
          amount: cost,
          type: "reward",
          description: "Attivazione Abbonamento Player Pro (30 Giorni)",
        });
      }

      await refreshUserData();
      toast({
        title: "👑 Player Pro Attivato!",
        description: "Ora possiedi tutti i vantaggi esclusivi, badge verificato e 2x monete!",
      });
      onClose();
    } catch (err: any) {
      console.error("[SubModal] Errore abbonamento Pro:", err);
      toast({
        title: "Errore attivazione",
        description: err.message || "Impossibile completare l'abbonamento.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscribeClanTier = async (tier: "pro" | "elite") => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    if (!clanData) {
      toast({
        title: "Nessun Clan Attivo",
        description: "Devi fondare o appartenere a un clan per attivare questo piano.",
        variant: "destructive",
      });
      return;
    }

    const cost = tier === "pro" ? 250 : 500;
    if (sCoinBalance < cost) {
      toast({
        title: "Saldo SCoin insufficiente",
        description: `Servono ${cost} SCoin per il piano Clan ${tier.toUpperCase()}.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc("upgrade_clan_tier", {
        p_clan_id: clanData.id,
        p_tier: tier,
        p_pay_with_coins: true,
        p_auto_renew: true,
      });

      if (rpcErr) {
        console.warn("[SubModal] RPC fallback upgrade_clan_tier:", rpcErr);
        const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await supabase
          .from("clans")
          .update({
            subscription_tier: tier,
            subscription_expires_at: expiry,
            auto_renew: true,
          })
          .eq("id", clanData.id);

        await supabase
          .from("profiles")
          .update({
            coins: Math.max(0, sCoinBalance - cost),
            balance: Math.max(0, sCoinBalance - cost),
          })
          .eq("id", currentUser.id);

        await supabase.from("sc_transactions").insert({
          user_id: currentUser.id,
          recipient_id: clanData.ownerId,
          amount: cost,
          type: "clan_donation",
          description: `Upgrade Clan a ${tier.toUpperCase()} (30 giorni)`,
        });
      }

      await refreshUserData();
      toast({
        title: `🛡️ Clan ${tier.toUpperCase()} Attivato!`,
        description: `Il clan [${clanData.tag}] ${clanData.name} è ora potenziato con i vantaggi ${tier}!`,
      });
      onClose();
    } catch (err: any) {
      console.error("[SubModal] Errore upgrade clan:", err);
      toast({
        title: "Errore upgrade clan",
        description: err.message || "Impossibile attivare il piano per il clan.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0f1322] border border-amber-500/40 p-5 shadow-[0_0_40px_rgba(245,158,11,0.25)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Top ambient glow */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-gradient-to-r from-amber-500/30 to-purple-600/30 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center pb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/40 text-[10px] font-extrabold text-amber-300 uppercase tracking-wider mb-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            SquadUP Pass
          </div>
          <h3 className="text-lg font-black text-white">Sblocca il Potenziale PRO</h3>
          <p className="text-xs text-zinc-400">
            Vantaggi esclusivi, priorità tornei, cassa moltiplicata e prestigio
          </p>
        </div>

        {/* Switcher Tab */}
        <div className="grid grid-cols-2 p-1 bg-[#151a30] rounded-2xl border border-zinc-800 mb-4">
          <button
            onClick={() => setActiveTab("player")}
            className={`py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
              activeTab === "player"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Player Pro Plus
          </button>
          <button
            onClick={() => setActiveTab("clan")}
            className={`py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
              activeTab === "clan"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Piani Clan
          </button>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === "player" ? (
            <div className="space-y-4">
              {/* Player Pro Plan Card */}
              <div className="rounded-2xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-500/10 via-[#151930] to-[#0d1020] p-4 shadow-xl space-y-3.5 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">PLAYER PRO PLUS</h4>
                      <span className="text-[10px] text-amber-400 font-bold">
                        Piano Individuale Completo
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-white">150 SC</span>
                    <span className="text-[10px] text-zinc-400 block">/ 30 giorni (~1,50€)</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-zinc-800 text-xs text-zinc-300">
                  <div className="flex items-start gap-2 bg-amber-500/10 p-2 rounded-xl border border-amber-500/30">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-amber-200">
                      <strong className="text-white">Votazioni & Reputazione:</strong> Sblocca il potere di votare e assegnare badge ai giocatori e ai clan
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      <strong className="text-white">Badge Verificato PRO</strong> dorato sul
                      profilo e nella lobby
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      <strong className="text-white">2x SCoin Giornalieri:</strong> Riscatta 20 SC
                      al giorno anziché 10
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      <strong className="text-white">1 GB Storage Social</strong> per caricare clip
                      e screenshot ad alta risoluzione
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      <strong className="text-white">Priorità & Sconti</strong> nell'iscrizione ai
                      tornei ufficiali
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Cornice Golden Champion ed elementi estetici esclusivi</span>
                  </div>
                </div>

                <button
                  onClick={handleSubscribePlayerPro}
                  disabled={isProcessing || isPlayerPro}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-60 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Elaborazione...</span>
                    </>
                  ) : isPlayerPro ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Abbonamento Pro Attivo</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Attiva con 150 SCoin</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Clan Pro Plan */}
              <div className="rounded-2xl border border-purple-500/50 bg-gradient-to-b from-purple-950/40 via-[#151930] to-[#0d1020] p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-purple-300">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">CLAN PRO</h4>
                      <span className="text-[10px] text-purple-400 font-bold">Per Clan in crescita</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-white">250 SC</span>
                    <span className="text-[10px] text-zinc-400 block">/ 30 giorni (~2,50€)</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-zinc-800 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Roster esteso a <strong className="text-white">25 membri</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span><strong className="text-white">+10 SC al giorno</strong> nella cassaforte del clan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Fino a <strong className="text-white">5 ruoli personalizzati</strong> con titoli</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Badge Clan Pro Verificato</span>
                  </div>
                </div>

                <button
                  onClick={() => handleSubscribeClanTier("pro")}
                  disabled={isProcessing}
                  className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow cursor-pointer"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                  <span>Attiva Clan Pro (250 SC)</span>
                </button>
              </div>

              {/* Clan Elite Plan */}
              <div className="rounded-2xl border-2 border-cyan-400/60 bg-gradient-to-b from-cyan-950/40 via-[#151930] to-[#0d1020] p-4 shadow-xl space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">CLAN ELITE</h4>
                      <span className="text-[10px] text-cyan-400 font-bold">Organizzazioni & Esports</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-white">500 SC</span>
                    <span className="text-[10px] text-zinc-400 block">/ 30 giorni (~5,00€)</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-zinc-800 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Roster <strong className="text-white">Illimitato</strong> (Academy + Main Team)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span><strong className="text-white">+10 SC al giorno</strong> cassa clan + bonus vittorie</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Fino a <strong className="text-white">12 ruoli gerarchici custom</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Slot prioritari garantiti nei tornei SquadUP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Stemma con Aura Ciano & Oro nella classifica clan</span>
                  </div>
                </div>

                <button
                  onClick={() => handleSubscribeClanTier("elite")}
                  disabled={isProcessing}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
                  <span>Attiva Clan Elite (500 SC)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
