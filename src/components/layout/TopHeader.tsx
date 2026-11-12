import React, { useState } from "react";
import { useSquad } from "@/context/SquadContext";
import { Coins, Flame, Volume2, UserPlus, Send, Search, Bell, X } from "lucide-react";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import { NotificationsDrawer } from "@/components/notifications/NotificationsDrawer";
import { AVATAR_FRAMES } from "@/components/profile/cosmeticsData";

export const TopHeader: React.FC = () => {
  const {
    sCoinBalance,
    setActiveTab,
    activeVoiceRoomId,
    currentUser,
    userProfile,
    openAuthModal,
    unreadNotificationsCount,
  } = useSquad();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [headerQuery, setHeaderQuery] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const frameBorder =
    (Array.isArray(AVATAR_FRAMES) &&
      AVATAR_FRAMES.find((f) => f.id === userProfile?.avatarFrame)?.borderClass) ||
    "border-purple-500/60";

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchOpen(true);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0e17]/95 backdrop-blur-md border-b border-purple-900/40">
      {/* Top Bar with Brand & Quick Action Controls */}
      <div className="w-full max-w-5xl mx-auto px-3.5 sm:px-6 h-14 flex items-center justify-between gap-2">
        {/* SquadUP Logo & Brand */}
        <div
          onClick={() => setActiveTab("home")}
          className="flex items-center gap-2 cursor-pointer select-none group shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 p-0.5 shadow-[0_0_12px_rgba(139,92,246,0.5)]">
            <div className="w-full h-full bg-[#0e1220] rounded-[7px] flex items-center justify-center">
              <Flame className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
              SquadUP
            </span>
            <span className="text-[9px] px-1.5 py-0.5 font-bold uppercase rounded bg-purple-950/80 text-purple-300 border border-purple-700/50">
              PRO
            </span>
          </div>
        </div>

        {/* Quick Voice, SCoin Wallet Badge & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Active Voice Pill */}
          {activeVoiceRoomId && (
            <button
              onClick={() => setActiveTab("voice")}
              title="Canale Vocale Attivo"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/60 transition-colors cursor-pointer"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold hidden sm:inline">In Voce</span>
            </button>
          )}

          {/* SCoin Wallet Chip (Redirects to Shop) */}
          <button
            onClick={() => setActiveTab("shop")}
            title="Armeria & Shop SCoin"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-purple-900/30 to-amber-500/15 border border-amber-500/40 text-amber-300 hover:border-amber-400/70 transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)] cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-xs font-extrabold tracking-wide font-mono">
              {sCoinBalance.toLocaleString()}
            </span>
          </button>

          {/* Notifications Bell Button */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            title="Centro Notifiche"
            className="p-2 rounded-full bg-zinc-900/90 hover:bg-purple-950/70 border border-purple-900/40 text-zinc-300 hover:text-amber-400 transition-colors cursor-pointer shadow-sm relative group"
          >
            <Bell className="w-4 h-4 text-zinc-300 group-hover:text-amber-300 group-hover:scale-110 transition-transform" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse border-2 border-[#0b0e17] shadow-sm">
                {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Direct Messages Shortcut */}
          <button
            onClick={() => setActiveTab("messages")}
            title="Messaggi Diretti"
            className="p-2 rounded-full bg-zinc-900/90 hover:bg-purple-950/70 border border-purple-900/40 text-zinc-300 hover:text-cyan-300 transition-colors cursor-pointer shadow-sm"
          >
            <Send className="w-4 h-4 rotate-12 text-zinc-400 hover:text-cyan-400 transition-colors" />
          </button>

          {/* User Avatar / Login Button */}
          {currentUser ? (
            <button
              onClick={() => setActiveTab("profile")}
              title={userProfile.name}
              className={`w-8 h-8 rounded-full overflow-hidden border-2 ${frameBorder} bg-purple-950 flex items-center justify-center text-purple-300 cursor-pointer shadow-sm hover:scale-105 transition-transform`}
            >
              {userProfile.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[11px] font-bold">
                  {userProfile.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => openAuthModal("signup")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)] transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="text-xs">Accedi</span>
            </button>
          )}
        </div>
      </div>

      {/* Sleek Aligned & Responsive Global Search Bar */}
      <div className="w-full max-w-5xl mx-auto px-3.5 sm:px-6 pb-3 pt-0.5">
        <form onSubmit={handleSearchSubmit} className="w-full flex items-center gap-2">
          {/* Search Input Container */}
          <div
            onClick={() => setIsSearchOpen(true)}
            className="relative flex-1 flex items-center min-w-0 rounded-xl bg-zinc-900/95 border border-purple-900/50 hover:border-cyan-500/50 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/40 text-xs shadow-inner transition-all group cursor-pointer"
          >
            <Search className="w-4 h-4 text-cyan-400 ml-3 shrink-0 group-hover:scale-110 transition-transform" />
            <input
              type="text"
              value={headerQuery}
              onChange={(e) => setHeaderQuery(e.target.value)}
              onClick={(e) => {
                e.stopPropagation();
                setIsSearchOpen(true);
              }}
              placeholder="Cerca giocatori, tag clan [#TAG], tornei..."
              className="w-full bg-transparent py-2 sm:py-2.5 px-2.5 text-xs text-white placeholder-zinc-400 focus:outline-none cursor-pointer"
              readOnly
            />
            {headerQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setHeaderQuery("");
                }}
                className="p-1.5 mr-1 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Perfectly Aligned Search Action Button */}
          <button
            type="submit"
            onClick={() => setIsSearchOpen(true)}
            className="shrink-0 h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-bold shadow-[0_0_12px_rgba(139,92,246,0.35)] transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span>Cerca</span>
          </button>
        </form>
      </div>

      {/* Global Search Modal (Persone, Clan, Tornei) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        initialQuery={headerQuery}
      />

      {/* Notifications Drawer (Supabase notifications) */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </header>
  );
};
