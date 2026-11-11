import React, { useState } from "react";
import { useSquad, NavTab } from "@/context/SquadContext";
import {
  Coins,
  Flame,
  Volume2,
  UserPlus,
  User,
  Send,
  MessageCircle,
  Search,
  Bell,
  Home,
  Trophy,
  Users,
  Shield,
  ShoppingBag,
} from "lucide-react";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import { NotificationsDrawer } from "@/components/notifications/NotificationsDrawer";
import { AVATAR_FRAMES } from "@/components/profile/cosmeticsData";

export const TopHeader: React.FC = () => {
  const {
    sCoinBalance,
    activeTab,
    setActiveTab,
    activeVoiceRoomId,
    currentUser,
    userProfile,
    openAuthModal,
    unreadNotificationsCount,
  } = useSquad();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const frameBorder =
    (Array.isArray(AVATAR_FRAMES) &&
      AVATAR_FRAMES.find((f) => f.id === userProfile?.avatarFrame)?.borderClass) ||
    "border-purple-500/60";

  const navItems: { id: NavTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "tournaments", label: "Tornei", icon: Trophy, badge: "LIVE" },
    { id: "voice", label: "Cerca Team", icon: Users },
    { id: "clan", label: "Clan", icon: Shield },
    { id: "shop", label: "Shop", icon: ShoppingBag, badge: "HOT" },
    { id: "profile", label: "Profilo", icon: User },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0e17]/95 backdrop-blur-md border-b border-purple-900/40 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* SquadUP Logo & Brand */}
        <div
          onClick={() => setActiveTab("home")}
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none group shrink-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 p-0.5 shadow-[0_0_12px_rgba(139,92,246,0.5)]">
            <div className="w-full h-full bg-[#0e1220] rounded-[9px] flex items-center justify-center">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-black text-base sm:text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                SquadUP
              </span>
              <span className="text-[9px] px-1.5 py-0.5 font-bold uppercase rounded-md bg-purple-950/80 text-purple-300 border border-purple-700/50">
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Desktop & Tablet Top Navigation Menu (hidden on mobile, visible from md:) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                  isActive
                    ? "bg-purple-600/30 text-cyan-300 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-zinc-400"}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-rose-600 text-white uppercase leading-none">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Voice, SCoin Wallet Badge & Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Active Voice Pill */}
          {activeVoiceRoomId && (
            <button
              onClick={() => setActiveTab("voice")}
              title="Canale Vocale Connesso"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/60 transition-colors cursor-pointer"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] hidden sm:inline">Voice ON</span>
            </button>
          )}

          {/* Global Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            title="Cerca persone, clan e tornei"
            className="p-2 sm:p-2.5 rounded-xl bg-zinc-900/80 hover:bg-purple-950/60 border border-purple-900/40 text-zinc-300 hover:text-cyan-300 transition-colors cursor-pointer shadow-sm relative group"
          >
            <Search className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </button>

          {/* Notifications Bell Button */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            title="Centro Notifiche"
            className="p-2 sm:p-2.5 rounded-xl bg-zinc-900/80 hover:bg-purple-950/60 border border-purple-900/40 text-zinc-300 hover:text-amber-400 transition-colors cursor-pointer shadow-sm relative group"
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
            title="Direct Messages"
            className="p-2 sm:p-2.5 rounded-xl bg-zinc-900/80 hover:bg-purple-950/60 border border-purple-900/40 text-zinc-300 hover:text-cyan-300 transition-colors cursor-pointer shadow-sm relative"
          >
            <Send className="w-4 h-4 rotate-12 text-zinc-400 hover:text-cyan-400 transition-colors" />
          </button>

          {/* SCoin Wallet Chip (Redirects to Shop) */}
          <button
            onClick={() => setActiveTab("shop")}
            title="Vai allo Shop SquadUP"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-900/30 to-amber-500/10 border border-amber-500/30 text-amber-300 hover:border-amber-400/60 transition-all shadow-[0_0_10px_rgba(245,158,11,0.15)] cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold tracking-wide">
              {sCoinBalance.toLocaleString()}
            </span>
          </button>

          {/* User Status / Login Button */}
          {currentUser ? (
            <button
              onClick={() => setActiveTab("profile")}
              title={userProfile.name}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border-2 ${frameBorder} bg-purple-950 flex items-center justify-center text-purple-300 cursor-pointer shadow-sm hover:scale-105 transition-transform`}
            >
              {userProfile.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-purple-300" />
              )}
            </button>
          ) : (
            <button
              onClick={() => openAuthModal("signup")}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:from-purple-500 hover:to-cyan-500 shadow-[0_0_12px_rgba(168,85,247,0.4)] transition-all cursor-pointer flex items-center gap-1"
            >
              <UserPlus className="w-3 h-3" />
              <span className="hidden sm:inline">Accedi</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </header>
  );
};
