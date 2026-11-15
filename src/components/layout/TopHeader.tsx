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
    unreadMessagesCount,
  } = useSquad();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [headerQuery, setHeaderQuery] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const customFrameUrl =
    userProfile?.avatarFrame &&
    (userProfile.avatarFrame.startsWith("http") ||
      userProfile.avatarFrame.startsWith("/") ||
      userProfile.avatarFrame.startsWith("data:"))
      ? userProfile.avatarFrame
      : null;

  const frameObj =
    Array.isArray(AVATAR_FRAMES)
      ? AVATAR_FRAMES.find((f) => f.id === userProfile?.avatarFrame)
      : null;

  const frameBorder = frameObj?.borderClass || "border-purple-500/60";
  const effectiveHeaderFrame = customFrameUrl || frameObj?.frameUrl;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchOpen(true);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0e17]/95 backdrop-blur-md border-b border-purple-900/40 overflow-x-clip">
      {/* Top Bar with Brand & Quick Action Controls */}
      <div className="w-full max-w-5xl mx-auto px-2 sm:px-6 h-13 sm:h-14 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* SquadUP Logo & Brand */}
        <div
          onClick={() => setActiveTab("home")}
          className="flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none group shrink-0"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 p-0.5 shadow-[0_0_12px_rgba(139,92,246,0.5)]">
            <div className="w-full h-full bg-[#0e1220] rounded-[7px] flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="font-extrabold text-sm sm:text-base tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
              SquadUP
            </span>
            <span className="hidden min-[380px]:inline-block text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.2 sm:py-0.5 font-bold uppercase rounded bg-purple-950/80 text-purple-300 border border-purple-700/50">
              PRO
            </span>
          </div>
        </div>

        {/* Quick Voice, SCoin Wallet Badge & Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Active Voice Pill */}
          {activeVoiceRoomId && (
            <button
              onClick={() => setActiveTab("voice")}
              title="Canale Vocale Attivo"
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/60 transition-colors cursor-pointer"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold hidden md:inline">In Voce</span>
            </button>
          )}

          {/* SCoin Wallet Chip (Redirects to Shop) */}
          <button
            onClick={() => setActiveTab("shop")}
            title="Armeria & Shop SCoin"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-purple-900/30 to-amber-500/15 border border-amber-500/40 text-amber-300 hover:border-amber-400/70 transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)] cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-[11px] sm:text-xs font-extrabold tracking-wide font-mono">
              {sCoinBalance > 99999 ? `${(sCoinBalance / 1000).toFixed(0)}k` : sCoinBalance.toLocaleString()}
            </span>
          </button>

          {/* Notifications Bell Button */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            title="Centro Notifiche"
            className="p-1.5 sm:p-2 rounded-full bg-zinc-900/90 hover:bg-purple-950/70 border border-purple-900/40 text-zinc-300 hover:text-amber-400 transition-colors cursor-pointer shadow-sm relative group shrink-0"
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-300 group-hover:text-amber-300 group-hover:scale-110 transition-transform" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] sm:min-w-[16px] h-3.5 sm:h-4 px-0.5 sm:px-1 rounded-full bg-rose-500 text-white text-[8px] sm:text-[9px] font-black flex items-center justify-center animate-pulse border-2 border-[#0b0e17] shadow-sm">
                {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Direct Messages Shortcut with Unread Badge */}
          <button
            onClick={() => setActiveTab("messages")}
            title="Messaggi Diretti"
            className="p-1.5 sm:p-2 rounded-full bg-zinc-900/90 hover:bg-purple-950/70 border border-purple-900/40 text-zinc-300 hover:text-cyan-300 transition-colors cursor-pointer shadow-sm relative group shrink-0"
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-12 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] sm:min-w-[16px] h-3.5 sm:h-4 px-0.5 sm:px-1 rounded-full bg-rose-500 text-white text-[8px] sm:text-[9px] font-black flex items-center justify-center animate-pulse border-2 border-[#0b0e17] shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
              </span>
            )}
          </button>

          {/* User Avatar / Login Button */}
          {currentUser ? (
            <button
              onClick={() => setActiveTab("profile")}
              title={userProfile.name}
              className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-purple-300 cursor-pointer shadow-sm hover:scale-105 transition-transform shrink-0"
            >
              {effectiveHeaderFrame && (
                <img
                  src={effectiveHeaderFrame}
                  alt="Cornice"
                  className="absolute -inset-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)] max-w-none pointer-events-none z-10 object-contain drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]"
                />
              )}
              <div
                className={`w-full h-full rounded-full overflow-hidden border-2 ${
                  effectiveHeaderFrame ? "border-transparent" : frameBorder
                } bg-purple-950 flex items-center justify-center`}
              >
                {userProfile.avatar ? (
                  <img
                    src={userProfile.avatar}
                    alt={userProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] sm:text-[11px] font-bold">
                    {userProfile.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            </button>
          ) : (
            <button
              onClick={() => openAuthModal("signup")}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)] transition-all cursor-pointer shrink-0"
            >
              <UserPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="text-[11px] sm:text-xs">Accedi</span>
            </button>
          )}
        </div>
      </div>

      {/* Sleek Aligned & Responsive Global Search Bar */}
      <div className="w-full max-w-5xl mx-auto px-2 sm:px-6 pb-2 sm:pb-3 pt-0.5 relative">
        <form onSubmit={handleSearchSubmit} className="w-full flex items-center gap-2">
          {/* Search Input Container */}
          <div
            className="relative flex-1 flex items-center min-w-0 rounded-xl bg-zinc-900/95 border border-purple-900/50 hover:border-cyan-500/50 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/40 text-xs shadow-inner transition-all group"
          >
            <Search className="w-4 h-4 text-cyan-400 ml-3 shrink-0 group-hover:scale-110 transition-transform" />
            <input
              type="text"
              value={headerQuery}
              onChange={(e) => {
                setHeaderQuery(e.target.value);
                if (!isSearchOpen) setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Cerca giocatori, tag clan [#TAG], tornei..."
              className="w-full bg-transparent py-2 sm:py-2.5 px-2.5 text-xs text-white placeholder-zinc-400 focus:outline-none"
            />
            {headerQuery && (
              <button
                type="button"
                onClick={() => setHeaderQuery("")}
                className="p-1.5 mr-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Cancella ricerca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Perfectly Aligned Search Action Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className="shrink-0 h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-bold shadow-[0_0_12px_rgba(139,92,246,0.35)] transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
          >
            {isSearchOpen ? (
              <>
                <X className="w-3.5 h-3.5 shrink-0" />
                <span>Chiudi</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span>Cerca</span>
              </>
            )}
          </button>
        </form>

        {/* Global Search Attached Dropdown View (Ancorato direttamente sotto la barra di ricerca) */}
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          searchQuery={headerQuery}
          setSearchQuery={setHeaderQuery}
        />
      </div>

      {/* Notifications Drawer (Supabase notifications) */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </header>
  );
};
