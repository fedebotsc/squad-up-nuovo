import React, { useState } from "react";
import { useSquad } from "@/context/SquadContext";
import {
  Shield,
  Coins,
  Sparkles,
  Users,
  Lock,
  CheckCircle2,
  Gift,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export const ClanSection: React.FC = () => {
  const { clanVault, clanPerks, clanMembers, donateToClan, sCoinBalance } = useSquad();
  const [selectedDonation, setSelectedDonation] = useState<number>(100);
  const [customDonation, setCustomDonation] = useState<string>("");

  const handleDonate = () => {
    const amount = customDonation ? parseInt(customDonation, 10) : selectedDonation;
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Importo non valido",
        description: "Inserisci un numero positivo di SCoin da donare.",
        variant: "destructive",
      });
      return;
    }
    const success = donateToClan(amount);
    if (success) {
      setCustomDonation("");
    }
  };

  return (
    <div className="pb-24 pt-2 max-w-md mx-auto px-3.5 space-y-4">
      {/* Clan Hero Card */}
      <div className="relative rounded-2xl overflow-hidden border border-purple-500/50 bg-gradient-to-br from-purple-950/80 via-[#13172e] to-[#0c0f1c] p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-0.5 shadow-[0_0_15px_rgba(139,92,246,0.5)] shrink-0">
              <div className="w-full h-full bg-[#0d1120] rounded-[14px] flex items-center justify-center">
                <Shield className="w-7 h-7 text-cyan-400" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base font-extrabold text-white tracking-wide truncate max-w-[150px]">
                  NEXUS PRIME
                </h2>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-500/40">
                  [NXP]
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-300 mt-0.5">
                <span className="font-semibold text-purple-300">Livello 14</span>
                <span>•</span>
                <span className="text-zinc-400">Top 1% Clan Regionale</span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-zinc-400 block uppercase font-bold">
              Cassaforte Clan
            </span>
            <div className="flex items-center gap-1 text-amber-300 font-extrabold text-sm justify-end">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{clanVault.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Clan XP progress bar */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>Progresso Livello Clan (Lv. 14 → Lv. 15)</span>
            <span className="text-purple-300 font-bold">14.200 / 20.000 XP</span>
          </div>
          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
              style={{ width: "71%" }}
            />
          </div>
        </div>
      </div>

      {/* Quick Donation Card */}
      <section
        aria-label="Donazione SCoin Clan"
        className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-md space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Dona SCoin alla Cassaforte
            </h3>
          </div>
          <span className="text-[10px] text-zinc-400">
            Tuo saldo: <strong className="text-amber-300">{sCoinBalance} SCoin</strong>
          </span>
        </div>

        <p className="text-xs text-zinc-300 break-words leading-relaxed">
          Le donazioni sbloccano slot membri aggiuntivi, moltiplicatori XP e bonus premi per tutti i compagni del Clan.
        </p>

        {/* Donation chip presets */}
        <div className="grid grid-cols-4 gap-2">
          {[50, 100, 250, 500].map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => {
                setSelectedDonation(amount);
                setCustomDonation("");
              }}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border ${
                selectedDonation === amount && !customDonation
                  ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  : "bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:text-white"
              }`}
            >
              +{amount}
            </button>
          ))}
        </div>

        {/* Custom amount input + donate button */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="number"
            min="10"
            max={sCoinBalance}
            placeholder="Altro importo..."
            value={customDonation}
            onChange={(e) => setCustomDonation(e.target.value)}
            className="w-32 bg-zinc-900 text-zinc-200 text-xs rounded-xl px-3 py-2 border border-purple-900/40 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleDonate}
            className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all"
          >
            <Coins className="w-3.5 h-3.5 text-black" />
            <span>Dona Ora</span>
          </button>
        </div>
      </section>

      {/* Clan Perks Unlocks */}
      <section aria-label="Perk del Clan" className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Potenziamenti & Perk Sbloccabili
          </span>
          <span className="text-[10px] text-purple-400 font-semibold">
            Obiettivi Comuni
          </span>
        </div>

        <div className="space-y-2.5">
          {clanPerks.map((perk) => (
            <div
              key={perk.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                perk.isUnlocked
                  ? "bg-emerald-950/20 border-emerald-500/40"
                  : "bg-[#121628]/90 border-purple-900/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {perk.isUnlocked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    )}
                    <h4
                      className={`text-xs font-bold truncate max-w-[180px] ${
                        perk.isUnlocked ? "text-emerald-300" : "text-white"
                      }`}
                    >
                      {perk.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-zinc-300 break-words leading-relaxed">
                    {perk.description}
                  </p>
                </div>

                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                    perk.isUnlocked
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-purple-950/60 text-purple-300 border border-purple-700/40"
                  }`}
                >
                  {perk.isUnlocked ? "ATTIVO" : `${perk.progressPercent}%`}
                </span>
              </div>

              {!perk.isUnlocked && (
                <div className="mt-2.5 pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                    <span>Avanzamento fondo</span>
                    <span>
                      {perk.currentSCoin.toLocaleString()} / {perk.targetSCoin.toLocaleString()} SCoin
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
                      style={{ width: `${perk.progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Clan Members List */}
      <section aria-label="Membri del Clan" className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            Roster Membri ({clanMembers.length}/25)
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold">
            {clanMembers.filter((m) => m.isOnline).length} Online Ora
          </span>
        </div>

        <div className="bg-[#121628]/90 border border-purple-900/30 rounded-2xl divide-y divide-zinc-800/70 overflow-hidden shadow-md">
          {clanMembers.map((member) => (
            <div key={member.id} className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-9 h-9 rounded-xl object-cover border border-purple-500/40"
                  />
                  {member.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#121628]" />
                  )}
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block truncate max-w-[140px]">
                    {member.name}
                  </span>
                  <span className="text-[10px] font-semibold text-purple-400">
                    {member.role}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] font-extrabold text-amber-300 block">
                  {member.donatedSCoin.toLocaleString()} SCoin
                </span>
                <span className="text-[9px] text-zinc-500 uppercase">Donati</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
