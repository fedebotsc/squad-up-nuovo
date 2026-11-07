import React, { useState } from "react";
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
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export const ProfileSection: React.FC = () => {
  const { userProfile, sCoinBalance, transactions, clanData } = useSquad();
  const [activeTab, setActiveTab] = useState<"wallet" | "stats" | "rewards">("wallet");

  const rewards = [
    {
      id: "rw-1",
      title: "PlayStation Store Card 10€",
      cost: 1000,
      image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80",
      tag: "Codice Digitale Istantaneo",
    },
    {
      id: "rw-2",
      title: "Xbox Game Pass Ultimate 1 Mese",
      cost: 1200,
      image: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=300&auto=format&fit=crop&q=80",
      tag: "Abbonamento Gaming",
    },
    {
      id: "rw-3",
      title: "Battle Pass Call of Duty",
      cost: 1100,
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80",
      tag: "1.100 COD Points",
    },
  ];

  const handleRedeem = (rewardTitle: string, cost: number) => {
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

  return (
    <div className="pb-24 pt-2 max-w-md mx-auto px-3.5 space-y-4">
      {/* Player Profile Card */}
      <div className="relative rounded-2xl overflow-hidden border border-purple-500/50 bg-gradient-to-br from-purple-950/80 via-[#13172e] to-[#0d1022] p-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            {userProfile.avatar ? (
              <img
                src={userProfile.avatar}
                alt={userProfile.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-purple-950/80 border-2 border-purple-500 flex items-center justify-center text-purple-300">
                <User className="w-8 h-8" />
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 border-2 border-[#121628] flex items-center justify-center text-[10px] font-extrabold text-black">
              {userProfile.level}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-base font-extrabold text-white truncate max-w-[150px]">
                {userProfile.name}
              </h2>
              {clanData?.tag && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-300 border border-purple-500/40">
                  [{clanData.tag}]
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-300 mt-1">
              <span className="text-cyan-400 font-semibold">{userProfile.rank}</span>
              <span>•</span>
              <span className="text-zinc-400">{userProfile.tag}</span>
            </div>
          </div>
        </div>

        {/* Dynamic stat highlights or placeholder */}
        {hasStats ? (
          <div className="grid grid-cols-4 gap-2 pt-4 mt-3 border-t border-zinc-800/80 text-center">
            <div className="bg-zinc-900/60 rounded-xl p-2 border border-zinc-800">
              <span className="text-[9px] uppercase font-bold text-zinc-400 block">K/D</span>
              <span className="text-xs font-extrabold text-cyan-300">{userProfile.stats.kd ?? "-"}</span>
            </div>
            <div className="bg-zinc-900/60 rounded-xl p-2 border border-zinc-800">
              <span className="text-[9px] uppercase font-bold text-zinc-400 block">Win Rate</span>
              <span className="text-xs font-extrabold text-emerald-400">{userProfile.stats.winRate ?? "-"}</span>
            </div>
            <div className="bg-zinc-900/60 rounded-xl p-2 border border-zinc-800">
              <span className="text-[9px] uppercase font-bold text-zinc-400 block">Match</span>
              <span className="text-xs font-extrabold text-white">{userProfile.stats.matches}</span>
            </div>
            <div className="bg-zinc-900/60 rounded-xl p-2 border border-zinc-800">
              <span className="text-[9px] uppercase font-bold text-zinc-400 block">Kill</span>
              <span className="text-xs font-extrabold text-purple-300">{userProfile.stats.kills}</span>
            </div>
          </div>
        ) : (
          <div className="pt-3 mt-3 border-t border-zinc-800/80 text-center">
            <span className="text-[11px] text-zinc-400 italic">
              Partecipa a un torneo per vedere le statistiche
            </span>
          </div>
        )}
      </div>

      {/* Profile Section Tabs */}
      <div className="bg-[#121628] p-1 rounded-2xl border border-purple-900/40 grid grid-cols-3 gap-1 shadow-inner">
        <button
          onClick={() => setActiveTab("wallet")}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
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
          className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "rewards"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Gift className="w-3.5 h-3.5 text-pink-400" />
          <span>Riscatto Premi</span>
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "stats"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-cyan-400" />
          <span>Statistiche</span>
        </button>
      </div>

      {/* WALLET TAB */}
      {activeTab === "wallet" && (
        <div className="space-y-4">
          {/* SCoin Wallet Balance Card */}
          <div className="bg-gradient-to-br from-amber-500/10 via-[#161a30] to-purple-900/20 border-2 border-amber-500/40 rounded-2xl p-4 shadow-[0_0_20px_rgba(245,158,11,0.15)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                Saldo Disponibile
              </span>
              <span className="text-[10px] font-semibold text-zinc-400">
                1 SCoin = 0,01€
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {sCoinBalance.toLocaleString()}
              </span>
              <span className="text-base font-bold text-amber-400">SCoin</span>
              <span className="text-xs text-zinc-400 ml-2">
                (~{(sCoinBalance * 0.01).toFixed(2)}€)
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() =>
                  toast({
                    title: "Ricarica SCoin",
                    description: "Seleziona un pacchetto di SCoin per ricaricare il tuo wallet.",
                  })
                }
                className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow transition-all"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Ricarica Saldo
              </button>
              <button
                onClick={() => setActiveTab("rewards")}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Gift className="w-3.5 h-3.5 text-purple-400" />
                Spendi nei Premi
              </button>
            </div>
          </div>

          {/* Transactions History */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-purple-400" />
                Transazioni Recenti
              </span>
            </div>

            {transactions.length > 0 ? (
              <div className="bg-[#121628]/90 border border-purple-900/30 rounded-2xl divide-y divide-zinc-800/70 overflow-hidden shadow-md">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          tx.isPositive
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                        }`}
                      >
                        {tx.isPositive ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-zinc-200 block truncate max-w-[170px]">
                          {tx.title}
                        </span>
                        <span className="text-[10px] text-zinc-500 block">{tx.date}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs font-extrabold ${
                          tx.isPositive ? "text-emerald-400" : "text-zinc-300"
                        }`}
                      >
                        {tx.isPositive ? `+${tx.amount}` : `-${tx.amount}`} SCoin
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#121628]/90 border border-purple-900/30 rounded-2xl p-6 text-center text-xs text-zinc-400">
                Nessuna transazione registrata nel wallet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* REWARDS STORE TAB */}
      {activeTab === "rewards" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Premi Disponibili
            </span>
            <span className="text-[10px] text-amber-300 font-bold">
              Tuo Saldo: {sCoinBalance} SCoin
            </span>
          </div>

          <div className="space-y-3">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className="bg-[#121628]/90 border border-purple-900/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={reward.image}
                    alt={reward.title}
                    className="w-14 h-14 rounded-xl object-cover border border-purple-500/30 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase block">
                      {reward.tag}
                    </span>
                    <h4 className="text-xs font-extrabold text-white truncate max-w-[150px]">
                      {reward.title}
                    </h4>
                    <span className="text-xs font-bold text-amber-300 block mt-0.5">
                      {reward.cost.toLocaleString()} SCoin
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleRedeem(reward.title, reward.cost)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-bold rounded-xl shrink-0 shadow-sm transition-all"
                >
                  Riscatta
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATS TAB */}
      {activeTab === "stats" && (
        <div className="space-y-3">
          <div className="bg-[#121628]/90 border border-purple-900/40 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Statistiche Giocatore</h4>
            <p className="text-xs text-zinc-400 break-words max-w-xs mx-auto">
              Partecipa a un torneo per vedere le statistiche di gioco, K/D e win rate aggiornate.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
