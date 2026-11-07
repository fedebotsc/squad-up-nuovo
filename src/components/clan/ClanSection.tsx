import React, { useState } from "react";
import { useSquad } from "@/context/SquadContext";
import {
  Shield,
  Coins,
  Users,
  Gift,
  PlusCircle,
  Search,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export const ClanSection: React.FC = () => {
  const { clanData, clanMembers, donateToClan, sCoinBalance } = useSquad();
  const [selectedDonation, setSelectedDonation] = useState<number>(50);
  const [customDonation, setCustomDonation] = useState<string>("");
  const [isDonating, setIsDonating] = useState<boolean>(false);

  const handleDonate = async () => {
    const amount = customDonation ? parseInt(customDonation, 10) : selectedDonation;
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Importo non valido",
        description: "Inserisci un numero positivo di SCoin da donare.",
        variant: "destructive",
      });
      return;
    }
    setIsDonating(true);
    const success = await donateToClan(amount);
    setIsDonating(false);
    if (success) {
      setCustomDonation("");
    }
  };

  // CLEAN EMPTY STATE IF USER HAS NO CLAN
  if (!clanData) {
    return (
      <div className="pb-24 pt-2 max-w-md mx-auto px-3.5 space-y-4">
        <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-6 text-center space-y-4 shadow-lg">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Shield className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Nessun clan trovato</h3>
            <p className="text-xs text-zinc-400 break-words max-w-xs mx-auto leading-relaxed">
              Non fai ancora parte di un clan. Unisciti a un team o fondane uno per competere nei tornei e condividere la cassaforte SCoin!
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() =>
                toast({
                  title: "Ricerca Clan",
                  description: "Esplora i clan disponibili tramite la barra di ricerca o chiedi un invito.",
                })
              }
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cerca Clan</span>
            </button>
            <button
              onClick={() =>
                toast({
                  title: "Crea un Clan",
                  description: "Puoi fondare il tuo clan ufficiale nella sezione impostazioni del profilo.",
                })
              }
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Fonda Clan</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTIC CLAN VIEW
  return (
    <div className="pb-24 pt-2 max-w-md mx-auto px-3.5 space-y-4">
      {/* Clan Hero Card */}
      <div className="relative rounded-2xl overflow-hidden border border-purple-500/50 bg-gradient-to-br from-purple-950/80 via-[#13172e] to-[#0c0f1c] p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-0.5 shadow-[0_0_15px_rgba(139,92,246,0.5)] shrink-0">
              <div className="w-full h-full bg-[#0d1120] rounded-[14px] flex items-center justify-center overflow-hidden">
                {clanData.avatarUrl ? (
                  <img src={clanData.avatarUrl} alt={clanData.name} className="w-full h-full object-cover" />
                ) : (
                  <Shield className="w-7 h-7 text-cyan-400" />
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base font-extrabold text-white tracking-wide truncate max-w-[150px]">
                  {clanData.name}
                </h2>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-500/40">
                  [{clanData.tag}]
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-300 mt-0.5">
                <span className="font-semibold text-purple-300">{clanData.gameMode}</span>
                <span>•</span>
                <span className="text-zinc-400">{clanData.region}</span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-zinc-400 block uppercase font-bold">
              Cassaforte Clan
            </span>
            <div className="flex items-center gap-1 text-amber-300 font-extrabold text-sm justify-end">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{clanData.treasurySC.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {clanData.description && (
          <p className="mt-3 text-xs text-zinc-300 border-t border-zinc-800/80 pt-2.5 break-words">
            {clanData.description}
          </p>
        )}
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

        {/* Donation chip presets */}
        <div className="grid grid-cols-4 gap-2">
          {[25, 50, 100, 200].map((amount) => (
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
            min="1"
            max={sCoinBalance}
            placeholder="Altro importo..."
            value={customDonation}
            onChange={(e) => setCustomDonation(e.target.value)}
            className="w-32 bg-zinc-900 text-zinc-200 text-xs rounded-xl px-3 py-2 border border-purple-900/40 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleDonate}
            disabled={isDonating || sCoinBalance <= 0}
            className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 disabled:opacity-40 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all"
          >
            <Coins className="w-3.5 h-3.5 text-black" />
            <span>{isDonating ? "Invio..." : "Dona Ora"}</span>
          </button>
        </div>
      </section>

      {/* Clan Members List */}
      <section aria-label="Membri del Clan" className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            Roster Membri ({clanMembers.length})
          </span>
        </div>

        {clanMembers.length > 0 ? (
          <div className="bg-[#121628]/90 border border-purple-900/30 rounded-2xl divide-y divide-zinc-800/70 overflow-hidden shadow-md">
            {clanMembers.map((member) => (
              <div key={member.id} className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-9 h-9 rounded-xl object-cover border border-purple-500/40"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-purple-950 flex items-center justify-center border border-purple-700/40 text-purple-300 font-bold text-xs">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
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
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#121628]/90 border border-purple-900/30 rounded-2xl p-6 text-center text-xs text-zinc-400">
            Nessun membro trovato nel clan.
          </div>
        )}
      </section>
    </div>
  );
};
