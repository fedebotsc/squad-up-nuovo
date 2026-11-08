import React, { useState } from "react";
import { useSquad } from "@/context/SquadContext";
import {
  Shield,
  Coins,
  Users,
  Gift,
  PlusCircle,
  Crown,
  Heart,
  Loader2,
  Trash2,
  AlertTriangle,
  Zap,
  Flame,
  MessageSquare,
  Radio,
  Target,
  Layers,
  Sparkles,
  Palette,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";
import { CreateClanModal } from "./CreateClanModal";
import { ClanChatTab } from "./ClanChatTab";
import { ClanVoiceTab } from "./ClanVoiceTab";
import { ClanRolesTab } from "./ClanRolesTab";
import { DailyQuestsTab } from "./DailyQuestsTab";
import { ClanCustomizerModal } from "./ClanCustomizerModal";

export const ClanSection: React.FC = () => {
  const {
    clanData,
    clanMembers,
    sCoinBalance,
    donateToClan,
    currentUser,
    userProfile,
    refreshUserData,
    openAuthModal,
  } = useSquad();

  const [activeTab, setActiveTab] = useState<"overview" | "chat" | "voice" | "roles" | "quests">("overview");

  const [selectedDonation, setSelectedDonation] = useState<number>(50);
  const [customDonation, setCustomDonation] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingClan, setIsDeletingClan] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showCreateClan, setShowCreateClan] = useState(false);
  const [showClanCustomizer, setShowClanCustomizer] = useState(false);

  const handleDonate = async () => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    const amount = customDonation ? parseFloat(customDonation) : selectedDonation;
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Importo non valido",
        description: "Inserisci un importo valido di SCoin da donare.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const success = await donateToClan(amount);
    setIsSubmitting(false);

    if (success) {
      setCustomDonation("");
    }
  };

  const isOwner = Boolean(currentUser && clanData && currentUser.id === clanData.ownerId);
  const isClanAdminOrOwner = Boolean(
    currentUser &&
      clanData &&
      (clanData.ownerId === currentUser.id ||
        clanMembers.some(
          (m) =>
            (m.userId === currentUser.id || m.id === currentUser.id) &&
            (m.role === "Leader" || m.role === "Co-Leader" || m.role === "admin" || m.role === "founder")
        ))
  );

  const handleDeleteClan = async () => {
    if (!clanData || !currentUser || !isOwner) return;

    setIsDeletingClan(true);
    try {
      const { error } = await supabase
        .from("clans")
        .delete()
        .eq("id", clanData.id)
        .eq("owner_id", currentUser.id);

      if (error) throw error;

      await refreshUserData();
      toast({
        title: "Clan Eliminato",
        description: `Il clan [${clanData.tag}] ${clanData.name} è stato rimosso definitivamente da Supabase.`,
      });
      setShowDeleteConfirm(false);
    } catch (err: any) {
      console.error("[ClanSection] Errore eliminazione clan:", err);
      toast({
        title: "Errore eliminazione clan",
        description: err.message || "Impossibile eliminare il clan.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingClan(false);
    }
  };

  // EMPTY STATE (NOT IN A CLAN)
  if (!clanData) {
    return (
      <div className="pb-24 pt-2 max-w-md mx-auto px-3.5 space-y-4">
        <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-8 text-center space-y-4 shadow-lg">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Shield className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Nessun Clan Trovato</h3>
            <p className="text-xs text-zinc-400 break-words max-w-xs mx-auto leading-relaxed">
              Non fai ancora parte di un clan attivo su SquadUP. Fonda la tua squadra con scelta livello (Base, Pro, Elite) o unisciti a una legione!
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => {
                if (!currentUser) {
                  openAuthModal("signup");
                } else {
                  setShowCreateClan(true);
                }
              }}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-cyan-300" />
              <span>Fonda un Nuovo Clan (Base, Pro o Elite)</span>
            </button>
          </div>
        </div>

        {/* Modal Fonda Clan */}
        <CreateClanModal
          isOpen={showCreateClan}
          onClose={() => setShowCreateClan(false)}
          currentUser={currentUser}
          sCoinBalance={sCoinBalance}
          onSuccess={refreshUserData}
        />
      </div>
    );
  }

  const isProOrElite =
    clanData.tier === "pro" ||
    clanData.tier === "elite" ||
    clanData.subscriptionTier === "pro" ||
    clanData.subscriptionTier === "elite";

  const clanBanner = clanData.clanBannerUrl || clanData.bannerUrl;
  const isImageBanner = clanBanner && (clanBanner.startsWith("http") || clanBanner.startsWith("/"));

  // AUTHENTIC CLAN VIEW
  return (
    <div className="pb-24 pt-2 max-w-md mx-auto px-3.5 space-y-3.5">
      {/* Clan Hero Card with Custom Banner */}
      <div
        className={`relative rounded-3xl overflow-hidden border border-purple-500/50 p-4 shadow-xl ${
          isImageBanner
            ? "bg-[#0d1020]"
            : clanBanner && clanBanner.includes("from-")
            ? `bg-gradient-to-r ${clanBanner}`
            : "bg-gradient-to-br from-purple-950/90 via-[#13172e] to-[#0c0f1c]"
        }`}
      >
        {/* If image banner, display with dark overlay for readability */}
        {isImageBanner && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${clanBanner})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e1224] via-[#0e1224]/80 to-[#0e1224]/50" />
          </div>
        )}

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {/* Equipped Clan Frame around Logo */}
              {clanData.clanFrameUrl && (
                <div
                  className="absolute -inset-1.5 rounded-2xl pointer-events-none z-10 border-2"
                  style={{
                    borderColor: clanData.clanFrameUrl.startsWith("#") ? clanData.clanFrameUrl : "#06B6D4",
                    boxShadow: `0 0 12px ${clanData.clanFrameUrl.startsWith("#") ? clanData.clanFrameUrl : "#06B6D4"}90`,
                  }}
                />
              )}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-0.5 shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                <div className="w-full h-full bg-[#0d1120] rounded-[14px] flex items-center justify-center overflow-hidden">
                  {clanData.avatarUrl ? (
                    <img src={clanData.avatarUrl} alt={clanData.name} className="w-full h-full object-cover" />
                  ) : (
                    <Shield className="w-7 h-7 text-cyan-400" />
                  )}
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base font-extrabold text-white tracking-wide truncate max-w-[140px]">
                  {clanData.name}
                </h2>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-900/80 text-purple-300 border border-purple-500/40">
                  [{clanData.tag}]
                </span>

                {/* Tier Badge */}
                {clanData.tier === "elite" || clanData.subscriptionTier === "elite" ? (
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/50 flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                    ELITE
                  </span>
                ) : clanData.tier === "pro" || clanData.subscriptionTier === "pro" ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-400/50 flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5 text-purple-400" />
                    PRO
                  </span>
                ) : (
                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    BASE
                  </span>
                )}

                {isOwner && (
                  <span className="text-[9px] font-extrabold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    LEADER
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-300 mt-0.5">
                <span className="font-semibold text-purple-300">{clanData.gameMode}</span>
                <span>•</span>
                <span className="text-zinc-400">{clanData.region}</span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-zinc-300/80 block uppercase font-bold">
              Cassaforte Clan
            </span>
            <div className="flex items-center gap-1 text-amber-300 font-extrabold text-sm justify-end">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{clanData.treasurySC.toLocaleString()} SC</span>
            </div>
          </div>
        </div>

        {clanData.description && (
          <p className="relative z-10 mt-3 text-xs text-zinc-200 border-t border-zinc-800/80 pt-2.5 break-words">
            {clanData.description}
          </p>
        )}

        {/* Action Controls in Hero: Personalizza Clan (Pro/Elite) or Upgrade */}
        <div className="relative z-10 mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2 flex-wrap">
          {isClanAdminOrOwner && (
            <button
              onClick={() => setShowClanCustomizer(true)}
              className="py-1 px-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 text-white font-bold text-[11px] rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <Palette className="w-3.5 h-3.5 text-cyan-300" />
              <span>Personalizza Grafica Clan</span>
            </button>
          )}

          {!isProOrElite ? (
            <button
              onClick={() => setShowSubModal(true)}
              className="py-1 px-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[11px] font-extrabold rounded-xl shadow-sm cursor-pointer ml-auto"
            >
              Passa a Pro o Elite
            </button>
          ) : (
            <span className="text-[11px] text-zinc-300 ml-auto flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              Piano {clanData.tier?.toUpperCase()} attivo
            </span>
          )}
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="grid grid-cols-5 gap-1 bg-[#101426] p-1 rounded-2xl border border-purple-900/30">
        <button
          onClick={() => setActiveTab("overview")}
          className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
            activeTab === "overview"
              ? "bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Roster</span>
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
            activeTab === "chat"
              ? "bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-cyan-300" />
          <span>Chat</span>
        </button>

        <button
          onClick={() => setActiveTab("voice")}
          className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
            activeTab === "voice"
              ? "bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          <span>Vocale</span>
        </button>

        <button
          onClick={() => setActiveTab("roles")}
          className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
            activeTab === "roles"
              ? "bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-amber-300" />
          <span>Ruoli</span>
        </button>

        <button
          onClick={() => setActiveTab("quests")}
          className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
            activeTab === "quests"
              ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Target className="w-3.5 h-3.5 text-cyan-300" />
          <span>Obiettivi</span>
        </button>
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Quick Voice Access Banner */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#151a32] to-cyan-950/40 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Stanza Vocale Clan Agora</span>
                <span className="text-[10px] text-zinc-400">Canale crittografato Agora per il clan</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("voice")}
              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
            >
              <span>Entra</span>
            </button>
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
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
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
                className="flex-1 bg-zinc-900 text-zinc-200 text-xs rounded-xl px-3 py-2 border border-zinc-700/60 focus:outline-none focus:border-amber-400"
              />

              <button
                type="button"
                onClick={handleDonate}
                disabled={isSubmitting || sCoinBalance <= 0}
                className="py-2 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Invio...</span>
                  </>
                ) : (
                  <>
                    <Heart className="w-3.5 h-3.5 fill-black" />
                    <span>Dona</span>
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Real Clan Members Roster */}
          <section
            aria-label="Membri del Clan"
            className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-4 shadow-md space-y-3"
          >
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Roster Clan ({clanMembers.length})
                </h3>
              </div>
              <span className="text-[10px] text-zinc-400">Attivi su Supabase</span>
            </div>

            {clanMembers.length > 0 ? (
              <div className="space-y-2">
                {clanMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/70"
                  >
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
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-purple-400">
                            {member.role}
                          </span>
                          {member.customRoleTitle && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                              ★ {member.customRoleTitle}
                            </span>
                          )}
                        </div>
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

          {/* CLAN OWNER MANAGEMENT & DELETION SECTION */}
          {isOwner && (
            <section className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Zona Amministrativa Owner Clan</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                In qualità di fondatore del clan, hai il controllo totale delle impostazioni. Se desideri sciogliere la squadra, puoi eliminare il clan definitivamente.
              </p>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Elimina Clan Definitivamente</span>
              </button>
            </section>
          )}
        </div>
      )}

      {/* TAB CONTENT: CHAT */}
      {activeTab === "chat" && (
        <ClanChatTab
          clanId={clanData.id}
          clanTag={clanData.tag}
          currentUser={currentUser}
          clanMembers={clanMembers}
        />
      )}

      {/* TAB CONTENT: VOICE */}
      {activeTab === "voice" && (
        <ClanVoiceTab
          clanData={clanData}
          clanMembers={clanMembers}
          currentUser={currentUser}
        />
      )}

      {/* TAB CONTENT: ROLES */}
      {activeTab === "roles" && (
        <ClanRolesTab
          clanData={clanData}
          clanMembers={clanMembers}
          currentUser={currentUser}
          onRefresh={refreshUserData}
          onOpenUpgrade={() => setShowSubModal(true)}
        />
      )}

      {/* TAB CONTENT: DAILY QUESTS */}
      {activeTab === "quests" && (
        <DailyQuestsTab
          clanData={clanData}
          currentUser={currentUser}
          userProfile={userProfile}
          onRefresh={refreshUserData}
        />
      )}

      {/* Clan Deletion Modal Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xs bg-[#121629] border border-rose-500/50 rounded-2xl p-5 shadow-2xl space-y-3.5 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-white">Eliminare il Clan?</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Stai per sciogliere il clan <strong className="text-white">[{clanData.tag}] {clanData.name}</strong>.
                Tutti i membri verranno rimossi e la cassaforte verrà chiusa su Supabase. L'azione è irreversibile.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeletingClan}
                className="py-2 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleDeleteClan}
                disabled={isDeletingClan}
                className="py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md cursor-pointer"
              >
                {isDeletingClan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Elimina Clan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clan Customizer Modal for Logo, Frame & Banner */}
      <ClanCustomizerModal
        isOpen={showClanCustomizer}
        onClose={() => setShowClanCustomizer(false)}
        clanData={clanData}
        currentUser={currentUser}
        onRefresh={refreshUserData}
        onOpenUpgrade={() => setShowSubModal(true)}
      />

      {/* Subscription Modal for Clan Upgrade */}
      <SubscriptionModal
        isOpen={showSubModal}
        onClose={() => setShowSubModal(false)}
        defaultTab="clan"
      />
    </div>
  );
};
