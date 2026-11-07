import React from "react";
import { useSquad, TournamentSubTab } from "@/context/SquadContext";
import { ActiveTournamentsTab } from "./ActiveTournamentsTab";
import { MatchRoomTab } from "./MatchRoomTab";
import { LeaderboardTab } from "./LeaderboardTab";
import { Trophy, Swords, BarChart3 } from "lucide-react";

export const TournamentsSection: React.FC = () => {
  const { tournamentSubTab, setTournamentSubTab } = useSquad();

  const tabs: { id: TournamentSubTab; label: string; icon: React.ElementType }[] = [
    { id: "active", label: "Tornei Attivi", icon: Trophy },
    { id: "match_room", label: "Stanza Match & Chat", icon: Swords },
    { id: "leaderboard", label: "Classifica Live", icon: BarChart3 },
  ];

  return (
    <div className="pb-24 pt-2 max-w-md mx-auto px-3.5 space-y-4">
      {/* Subtab Segmented Control */}
      <div className="bg-[#121628] p-1 rounded-2xl border border-purple-900/40 grid grid-cols-3 gap-1 shadow-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tournamentSubTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setTournamentSubTab(tab.id)}
              className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all select-none ${
                isActive
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/40"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate max-w-[95px] text-center leading-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Render the Active Subtab */}
      {tournamentSubTab === "active" && <ActiveTournamentsTab />}
      {tournamentSubTab === "match_room" && <MatchRoomTab />}
      {tournamentSubTab === "leaderboard" && <LeaderboardTab />}
    </div>
  );
};
