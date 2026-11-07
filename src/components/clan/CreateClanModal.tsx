import React, { useState } from "react";
import { Shield, Crown, Sparkles, Loader2, Check, AlertCircle, Info, Calendar } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateClanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  sCoinBalance: number;
  onSuccess: () => Promise<void>;
}

export const CreateClanModal: React.FC<CreateClanModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  sCoinBalance,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [tier, setTier] = useState<"base" | "pro" | "elite">("base");
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial custom roles for Pro / Elite
  const [initialRoles, setInitialRoles] = useState<string[]>(["Capitano", "Assaltatore", "Cecchino"]);
  const [newRoleInput, setNewRoleInput] = useState("");

  if (!isOpen) return null;

  // Monthly base pricing
  const MONTHLY_RATES: Record<string, number> = {
    base: 0,
    pro: 250,
    elite: 500,
  };

  // Duration discounts
  const DISCOUNT_MAP: Record<number, number> = {
    1: 0,
    3: 0.05,
    6: 0.1,
    9: 0.15,
    12: 0.2,
  };

  const monthlyPrice = MONTHLY_RATES[tier];
  const discountRate = tier === "base" ? 0 : DISCOUNT_MAP[durationMonths] || 0;
  const rawTotal = monthlyPrice * (tier === "base" ? 1 : durationMonths);
  const totalCost = Math.round(rawTotal * (1 - discountRate));

  const handleAddRole = () => {
    if (!newRoleInput.trim()) return;
    if (initialRoles.length >= (tier === "elite" ? 12 : 5)) {
      toast({
        title: "Limite ruoli raggiunto",
        description: `Il piano ${tier.toUpperCase()} consente al massimo ${tier === "elite" ? 12 : 5} ruoli.`,
        variant: "destructive",
      });
      return;
    }
    setInitialRoles((prev) => [...prev, newRoleInput.trim()]);
    setNewRoleInput("");
  };

  const handleRemoveRole = (index: number) => {
    setInitialRoles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const cleanName = name.trim();
    const cleanTag = tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);

    if (!cleanName || !cleanTag) {
      toast({
        title: "Dati incompleti",
        description: "Nome e Tag del clan sono obbligatori.",
        variant: "destructive",
      });
      return;
    }

    if (totalCost > sCoinBalance) {
      toast({
        title: "Saldo SCoin Insufficiente",
        description: `Ti servono ${totalCost} SCoin per fondare un Clan ${tier.toUpperCase()}. Il tuo saldo è di ${sCoinBalance} SCoin.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Calculate expiration date if paid
      const expiresAt =
        tier !== "base"
          ? new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString()
          : null;

      // 2. Insert Clan into Supabase
      const { data: newClan, error: clanErr } = await supabase
        .from("clans")
        .insert({
          name: cleanName,
          tag: cleanTag,
          description: description.trim() || "Squad competitiva COD Warzone",
          game_mode: "Warzone",
          region: "EU",
          owner_id: currentUser.id,
          is_recruiting: true,
          tier: tier,
          subscription_tier: tier === "base" ? "free" : tier,
          subscription_months: tier === "base" ? 1 : durationMonths,
          subscription_expires_at: expiresAt,
          clan_treasury_sc: 0,
        })
        .select()
        .single();

      if (clanErr) throw clanErr;

      // 3. Register transaction if paid tier
      if (totalCost > 0) {
        await supabase.from("sc_transactions").insert({
          user_id: currentUser.id,
          amount: -totalCost,
          transaction_type: "subscription",
          description: `Creazione Clan ${tier.toUpperCase()} [${cleanTag}] per ${durationMonths} mes${
            durationMonths === 1 ? "e" : "i"
          }`,
        });

        // Deduct from profile balance
        await supabase
          .from("profiles")
          .update({
            coins: Math.max(0, sCoinBalance - totalCost),
            schoins: Math.max(0, sCoinBalance - totalCost),
            balance: Math.max(0, sCoinBalance - totalCost),
          })
          .eq("id", currentUser.id);
      }

      // 4. If Pro or Elite, populate initial custom roles
      if (tier !== "base" && initialRoles.length > 0 && newClan) {
        const rolesToInsert = initialRoles.map((roleName, idx) => ({
          clan_id: newClan.id,
          name: roleName,
          color: idx === 0 ? "#F59E0B" : idx === 1 ? "#06B6D4" : "#A855F7",
          can_publish: idx === 0,
          can_moderate: idx === 0,
        }));

        await supabase.from("clan_custom_roles").insert(rolesToInsert);
      }

      toast({
        title: "Clan Fondato con Successo! 🛡️",
        description: `[${cleanTag}] ${cleanName} è ora attivo al livello ${tier.toUpperCase()}.`,
      });

      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error("[CreateClanModal] Errore creazione clan:", err);
      toast({
        title: "Errore Creazione Clan",
        description: err.message || "Impossibile creare il clan. Tag già in uso?",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="w-full max-w-md bg-[#0f1324] border border-purple-500/40 rounded-3xl p-5 shadow-2xl space-y-4 my-auto">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center text-cyan-300">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Fonda il tuo Clan Ufficiale</h3>
              <p className="text-[10px] text-zinc-400">Personalizza livello, durata e ruoli di squadra</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Clan Info */}
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                Nome del Clan <span className="text-purple-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="es. Cyber Knights"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#141930] border border-zinc-700/80 rounded-xl px-3 py-2 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                Tag del Clan (max 5 caratteri) <span className="text-purple-400">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={5}
                placeholder="es. CYBER"
                value={tag}
                onChange={(e) => setTag(e.target.value.toUpperCase())}
                className="w-full bg-[#141930] border border-zinc-700/80 rounded-xl px-3 py-2 text-white uppercase placeholder-zinc-500 text-xs tracking-wider focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                Descrizione & Obiettivi
              </label>
              <textarea
                rows={2}
                placeholder="Squad competitiva COD Warzone, tornei e ranking..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#141930] border border-zinc-700/80 rounded-xl p-2 text-white placeholder-zinc-500 text-xs resize-none focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Tier Selection */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-zinc-300">
              Scegli il Livello del Clan <span className="text-cyan-400">*</span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              {/* Base */}
              <button
                type="button"
                onClick={() => setTier("base")}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  tier === "base"
                    ? "bg-purple-900/30 border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                    : "bg-[#14182e]/80 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span>Base</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Gratuito</div>
                </div>
                <div className="text-[9px] text-zinc-400 mt-2">Max 10 membri</div>
              </button>

              {/* Pro */}
              <button
                type="button"
                onClick={() => setTier("pro")}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  tier === "pro"
                    ? "bg-purple-900/40 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                    : "bg-[#14182e]/80 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-purple-300 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-purple-400" />
                    <span>Clan Pro</span>
                  </div>
                  <div className="text-[10px] text-amber-300 font-semibold mt-0.5">250 SC / m</div>
                </div>
                <div className="text-[9px] text-zinc-400 mt-2">5 ruoli pers.</div>
              </button>

              {/* Elite */}
              <button
                type="button"
                onClick={() => setTier("elite")}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  tier === "elite"
                    ? "bg-amber-950/40 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)]"
                    : "bg-[#14182e]/80 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div>
                  <div className="text-xs font-extrabold text-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Elite</span>
                  </div>
                  <div className="text-[10px] text-amber-300 font-semibold mt-0.5">500 SC / m</div>
                </div>
                <div className="text-[9px] text-zinc-400 mt-2">12 ruoli pers.</div>
              </button>
            </div>
          </div>

          {/* Duration Selector (Only if Pro or Elite) */}
          {tier !== "base" && (
            <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-800/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  Durata Sottoscrizione Clan
                </span>
                {discountRate > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    -{discountRate * 100}% Sconto
                  </span>
                )}
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {[1, 3, 6, 9, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDurationMonths(m)}
                    className={`py-1.5 px-1 rounded-xl text-center font-bold text-[10px] transition-all border cursor-pointer ${
                      durationMonths === m
                        ? "bg-purple-600 border-purple-400 text-white shadow-sm"
                        : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <div>{m} M</div>
                    {DISCOUNT_MAP[m] > 0 && (
                      <span className="text-[8px] text-emerald-400 block">
                        -{DISCOUNT_MAP[m] * 100}%
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Roles Definition section for Pro / Elite */}
              <div className="pt-2 border-t border-purple-900/40 space-y-2">
                <label className="block text-[10px] font-bold text-zinc-300">
                  Ruoli Personalizzati Iniziali (Massimo {tier === "elite" ? 12 : 5}):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {initialRoles.map((role, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-[10px] font-semibold"
                    >
                      <span>{role}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(idx)}
                        className="text-zinc-400 hover:text-rose-400 text-xs ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Nuovo ruolo (es. Tattico)"
                    value={newRoleInput}
                    onChange={(e) => setNewRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddRole();
                      }
                    }}
                    className="flex-1 bg-zinc-900/90 border border-zinc-700 rounded-lg px-2 py-1 text-white text-[10px] placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddRole}
                    className="px-2.5 py-1 bg-purple-700 hover:bg-purple-600 text-white font-bold text-[10px] rounded-lg cursor-pointer"
                  >
                    + Aggiungi
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pricing & Balance summary */}
          <div className="p-3 rounded-2xl bg-[#141930] border border-zinc-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-zinc-400 block">Costo Fondazione Clan:</span>
              <div className="text-amber-300 font-black text-sm">
                {totalCost === 0 ? "Gratuito (0 SCoin)" : `${totalCost.toLocaleString()} SCoin`}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-zinc-400 block">Tuo Saldo:</span>
              <span
                className={`font-bold text-xs ${
                  sCoinBalance >= totalCost ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {sCoinBalance.toLocaleString()} SCoin
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || totalCost > sCoinBalance}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 disabled:opacity-40 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 text-cyan-300" />
            )}
            <span>
              {totalCost > sCoinBalance
                ? "Saldo SCoin Insufficiente"
                : `Fonda Clan ${tier.toUpperCase()}`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
