import React from "react";
import { useSquad, NavTab } from "@/context/SquadContext";
import { Home, Trophy, Users, Shield, User, ShoppingBag, MessageCircle } from "lucide-react";

interface TabItem {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
  dotAlert?: boolean;
}

export const BottomNavbar: React.FC = () => {
  const { activeTab, setActiveTab, activeVoiceRoomId, isMuted } = useSquad();

  const tabs: TabItem[] = [
    {
      id: "home",
      label: "Home",
      icon: Home,
    },
    {
      id: "tournaments",
      label: "Tornei",
      icon: Trophy,
      badge: "LIVE",
    },
    {
      id: "voice",
      label: "Cerca Team",
      icon: Users,
      dotAlert: Boolean(activeVoiceRoomId && !isMuted),
    },
    {
      id: "clan",
      label: "Clan",
      icon: Shield,
    },
    {
      id: "shop",
      label: "Shop",
      icon: ShoppingBag,
      badge: "HOT",
    },
    {
      id: "profile",
      label: "Profilo",
      icon: User,
    },
  ];

  return (
    <nav
      aria-label="Navigazione Principale"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0e1220]/95 backdrop-blur-md border-t border-purple-900/40 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]"
    >
      <div className="max-w-md mx-auto px-2 flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 select-none ${
                isActive
                  ? "text-purple-400 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {/* Active neon highlight indicator */}
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full shadow-[0_0_10px_#8b5cf6]" />
              )}

              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]" : ""
                  }`}
                />

                {/* Badge (e.g. LIVE tournament) */}
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-3 text-[9px] font-bold px-1 py-0.2 bg-gradient-to-r from-rose-600 to-red-500 text-white rounded-full leading-tight uppercase animate-pulse">
                    {tab.badge}
                  </span>
                )}

                {/* Dot Alert for Voice connection */}
                {tab.dotAlert && (
                  <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0e1220] animate-ping" />
                )}
                {tab.dotAlert && (
                  <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0e1220]" />
                )}
              </div>

              <span className="text-[11px] mt-1 tracking-tight truncate max-w-[64px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
