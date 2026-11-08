import React, { useState, useEffect } from "react";
import {
  X,
  ShieldAlert,
  Coins,
  Crown,
  Search,
  CheckCircle2,
  Trash2,
  Users,
  Trophy,
  Loader2,
  Sparkles,
  ArrowRight,
  Flame,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSquad } from "@/context/SquadContext";
import { toast } from "@/components/ui/use-toast";

interface UniversalAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfileResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  balance: number;
}

export const UniversalAdminModal: React.FC<UniversalAdminModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    isUniversalAdmin,
    currentUser,
    tournaments,
    deleteTournament,
    refreshUserData,
  } = useSquad();

  const [searchQuery, setSearchQuery] = useState("");
  const [usersList, setUsersList] = useState<UserProfileResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfileResult | null>(null);
  const [amountToAdd, setAmountToAdd] = useState<number>(1000);
  const [creditReason, setCreditReason] = useState("Bonus Amministratore Universale");
  const [isCrediting, setIsCrediting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Tournament Deletion confirmation state
  const [deletingTournamentId, setDeletingTournamentId] = useState<string | null>(null);

  // Search users in Supabase
  const handleSearchUsers = async (queryText = searchQuery) => {
    setIsSearching(true);
    try {
      let req = supabase.from("profiles").select("id, username, display_name, avatar_url, balance").limit(20);

      if (queryText.trim()) {
        req = req.or(`username.ilike.%${queryText.trim()}%,display_name.ilike.%${queryText.trim()}%`);
      }

      const { data, error } = await req;
      if (error) throw error;
      setUsersList((data as UserProfileResult[]) || []);
    } catch (err) {
      console.warn("[UniversalAdmin] Errore ricerca utenti:", err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (isOpen && isUniversalAdmin) {
      handleSearchUsers("");
    }
  }, [isOpen, isUniversalAdmin]);

  if (!isOpen) return null;

  if (!isUniversalAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div className="bg-[#121628] border border-rose-500/40 rounded-2xl p-6 max-w-sm w-full text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-white">Accesso Riservato</h3>
          <p className="text-xs text-zinc-400">
            Questo pannello è riservato esclusivamente all'account universale fedezdesimone@gmail.com.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2 bg-zinc-800 text-white rounded-xl text-xs font-bold"
          >
            Chiudi
          </button>
        </div>
      </div>
    );
  }

  // Credit SCoin to selected user
  const handleCreditSCoin = async () => {
    if (!selectedUser) {
      toast({
        title: "Nessun utente selezionato",
        description: "Seleziona prima l'account a cui accreditare gli SCoin.",
        variant: "destructive",
      });
      return;
    }

    if (amountToAdd <= 0) {
      toast({
        title: "Importo non valido",
        description: "Inserisci un numero positivo di SCoin.",
        variant: "destructive",
      });
      return;
    }

    setIsCrediting(true);
    try {
      const newBalance = (selectedUser.balance || 0) + Number(amountToAdd);

      // 1. Update target profile balance in Supabase
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          balance: newBalance,
          coins: newBalance,
          schoins: newBalance,
        })
        .eq("id", selectedUser.id);

      if (profileErr) throw profileErr;

      // 2. Insert transaction
      await supabase.from("sc_transactions").insert({
        user_id: selectedUser.id,
        recipient_id: selectedUser.id,
        sender_id: currentUser?.id || null,
        amount: Number(amountToAdd),
        type: "admin_credit",
        description: creditReason.trim() || "Accredito Amministratore Universale",
      });

      // Update local state
      setSelectedUser((prev) => (prev ? { ...prev, balance: newBalance } : null));
      setUsersList((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, balance: newBalance } : u))
      );

      if (currentUser?.id === selectedUser.id) {
        await refreshUserData();
      }

      toast({
        title: "SCoin Accreditati con Successo! ⚡",
        description: `Assegnati +${amountToAdd.toLocaleString()} SCoin a @${
          selectedUser.username
        }. Nuovo saldo: ${newBalance.toLocaleString()} SCoin.`,
      });
    } catch (err: any) {
      console.error("[UniversalAdmin] Errore accredito:", err);
      toast({
        title: "Errore durante l'accredito",
        description: err.message || "Impossibile aggiornare il saldo dell'utente.",
        variant: "destructive",
      });
    } finally {
      setIsCrediting(false);
    }
  };

  // Delete Tournament with full refunds
  const handleConfirmDeleteTournament = async (tournamentId: string) => {
    setDeletingTournamentId(tournamentId);
    try {
      const success = await deleteTournament(tournamentId);
      if (success) {
        toast({
          title: "Torneo Eliminato & Utenti Rimborsati 🏆",
          description: "La quota di iscrizione e il costo di creazione sono stati rimborsati integralmente.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Errore eliminazione torneo",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeletingTournamentId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0d1022] border border-amber-500/50 p-4 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white bg-zinc-900/90 transition-colors z-10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="pb-3 border-b border-zinc-800">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/40 text-[10px] font-black text-amber-300 uppercase tracking-wider mb-1">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            Universal God Mode • fedezdesimone@gmail.com
          </div>
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <span>Pannello Amministratore Globale</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-extrabold border border-cyan-500/30">
              SCoin Infiniti (∞)
            </span>
          </h3>
          <p className="text-[11px] text-zinc-400">
            Accredita SCoin a qualsiasi utente, elimina tornei con rimborsi istantanei e gestisci ogni aspetto di SquadUP.
          </p>
        </div>

        {/* Scroll Body */}
        <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 text-xs">
          {/* SECTION 1: ACCREDITA SCOIN A QUALSIASI ACCOUNT */}
          <div className="bg-[#121628] border border-purple-900/40 rounded-2xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Accredita SCoin a Utente
                </h4>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium">Database Supabase</span>
            </div>

            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Cerca per username o nome..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearchUsers(e.target.value);
                  }}
                  className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
              </div>
              <button
                type="button"
                onClick={() => handleSearchUsers()}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-colors"
              >
                Cerca
              </button>
            </div>

            {/* Users Select list */}
            <div className="max-h-36 overflow-y-auto space-y-1 bg-zinc-950/80 p-1.5 rounded-xl border border-zinc-800">
              {isSearching ? (
                <div className="py-4 text-center text-zinc-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Ricerca account...</span>
                </div>
              ) : usersList.length > 0 ? (
                usersList.map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUser(u)}
                      className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-500/20 border border-amber-500/50 text-white"
                          : "hover:bg-zinc-900 border border-transparent text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.username}
                            className="w-6 h-6 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-purple-900 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-xs truncate block">
                            {u.display_name || u.username}
                          </span>
                          <span className="text-[10px] text-zinc-500 block truncate">
                            @{u.username}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-black text-amber-400 block">
                          {(u.balance || 0).toLocaleString()} SC
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-extrabold text-amber-300 uppercase">
                            Selezionato ✓
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-4 text-center text-zinc-500 italic">
                  Nessun profilo trovato.
                </div>
              )}
            </div>

            {/* Selected User Details & Amount Input */}
            {selectedUser && (
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white">
                    Destinatario: <strong className="text-amber-300">@{selectedUser.username}</strong>
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Saldo attuale: {selectedUser.balance || 0} SC
                  </span>
                </div>

                {/* Amount presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[500, 1000, 2500, 5000, 10000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmountToAdd(preset)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition-all ${
                        amountToAdd === preset
                          ? "bg-amber-500 text-black border-amber-400 shadow-sm"
                          : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500"
                      }`}
                    >
                      +{preset.toLocaleString()} SC
                    </button>
                  ))}
                </div>

                {/* Custom Amount & Reason */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">
                      Importo SCoin da aggiungere
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={amountToAdd}
                      onChange={(e) => setAmountToAdd(Number(e.target.value))}
                      className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-black text-xs focus:outline-none focus:border-amber-400 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">
                      Motivo Accredito
                    </label>
                    <input
                      type="text"
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                      className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isCrediting}
                  onClick={handleCreditSCoin}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCrediting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>Accredito su Supabase in corso...</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-3.5 h-3.5 text-black" />
                      <span>Conferma Accredito +{amountToAdd.toLocaleString()} SCoin</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: GESTIONE & ELIMINAZIONE GLOBALE TORNEI */}
          <div className="bg-[#121628] border border-purple-900/40 rounded-2xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Eliminazione Globale Tornei ({tournaments.length})
                </h4>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium">Con Rimborso SCoin</span>
            </div>

            {tournaments.length > 0 ? (
              <div className="space-y-2">
                {tournaments.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-white text-xs block truncate">
                        {t.title}
                      </span>
                      <span className="text-[10px] text-zinc-400 block">
                        {t.game} • Quota: {t.entryFeeSCoin} SC • Iscritti: {t.teamsJoined}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={deletingTournamentId === t.id}
                      onClick={() => handleConfirmDeleteTournament(t.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                    >
                      {deletingTournamentId === t.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Elimina & Rimborsa</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-3 text-center text-zinc-500 italic">
                Nessun torneo attivo al momento.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors"
          >
            Chiudi Pannello
          </button>
        </div>
      </div>
    </div>
  );
};
