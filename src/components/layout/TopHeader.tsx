import React, { useState } from "react";
import { useSquad } from "@/context/SquadContext";
import { Coins, Flame, Volume2, UserPlus, User, Send, MessageCircle, Search, Bell } from "lucide-react";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import { NotificationsDrawer } from "@/components/notifications/NotificationsDrawer";
import { AVATAR_FRAMES } from "@/components/profile/ProfileCustomizerModal";

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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const frameBorder = AVATAR_FRAMES.find((f) => f.id === userProfile.avatarFrame)?.borderClass || "border-purple-500/60";

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0e17]/90 backdrop-blur-md border-b border-purple-900/30">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* SquadUP Logo & Brand */}
        <div
          onClick={() => setActiveTab("home")}
          className="flex items-center gap-2 cursor-pointer select-none group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 p-0.5 shadow-[0_0_12px_rgba(139,92,246,0.5)]">
            <div className="w-full h-full bg-[#0e1220] rounded-[7px] flex items-center justify-center">
              <Flame className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-base tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                SquadUP
              </span>
              <span className="text-[9px] px-1 py-0.5 font-bold uppercase rounded bg-purple-950/80 text-purple-300 border border-purple-700/50">
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Quick Voice, SCoin Wallet Badge & Auth */}
        <div className="flex items-center gap-2">
          {/* Active Voice Pill */}
          {activeVoiceRoomId && (
            <button
              onClick={() => setActiveTab("voice")}
              title="Canale Vocale Connesso"
              className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-emerald-950/50 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50 transition-colors cursor-pointer"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Volume2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] hidden sm:inline">Agora</span>
            </button>
          )}

          {/* Global Search Button (Persone, Clan, Tornei) */}
          <button
            onClick={() => setIsSearchOpen(true)}
            title="Cerca persone, clan e tornei"
            className="p-2 rounded-full bg-zinc-900/80 hover:bg-purple-950/60 border border-purple-900/40 text-zinc-300 hover:text-cyan-300 transition-colors cursor-pointer shadow-sm relative group"
          >
            <Search className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </button>

          {/* Notifications Bell Button */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            title="Centro Notifiche"
            className="p-2 rounded-full bg-zinc-900/80 hover:bg-purple-950/60 border border-purple-900/40 text-zinc-300 hover:text-amber-400 transition-colors cursor-pointer shadow-sm relative group"
          >
            <Bell className="w-4 h-4 text-zinc-300 group-hover:text-amber-300 group-hover:scale-110 transition-transform" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse border-2 border-[#0b0e17] shadow-sm">
                {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Direct Messages Shortcut (Instagram style) */}
          <button
            onClick={() => setActiveTab("messages")}
            title="Direct Messages"
            className="p-2 rounded-full bg-zinc-900/80 hover:bg-purple-950/60 border border-purple-900/40 text-zinc-300 hover:text-cyan-300 transition-colors cursor-pointer shadow-sm relative"
          >
            <Send className="w-4 h-4 rotate-12 text-zinc-400 hover:text-cyan-400 transition-colors" />
          </button>

          {/* SCoin Wallet Chip (Redirects to Shop) */}
          <button
            onClick={() => setActiveTab("shop")}
            title="Vai allo Shop SquadUP"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/10 via-purple-900/30 to-amber-500/10 border border-amber-500/30 text-amber-300 hover:border-amber-400/60 transition-all shadow-[0_0_10px_rgba(245,158,11,0.15)] cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold tracking-wide">
              {sCoinBalance.toLocaleString()}
            </span>
          </button>

          {/* User Status / Login Button */}
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
                <span className="text-xs font-bold">
                  {userProfile.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => openAuthModal("signup")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_10px_rgba(139,92,246,0.4)] transition-all cursor-pointer"
            >
              <UserPlus className="w-3 h-3" />
              <span className="text-[11px]">Accedi</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Search Modal (Persone, Clan, Tornei) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Notifications Drawer (Supabase notifications) */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </header>
  );
};
