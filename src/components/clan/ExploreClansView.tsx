import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  Search,
  UserPlus,
  UserCheck,
  Sparkles,
  Users,
  Trophy,
  Filter,
  Flame,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";

interface ClanItem {
  id: string;
  name: string;
  tag: string;
  description: string | null;
  game_mode: string | null;
  avatar_url: string | null;
  clan_frame_url: string | null;
  tier: "base" | "pro" | "elite" | string;
  subscription_tier?: string;
  is_recruiting: boolean;
  tournaments_won: number;
  level: number;
  owner_id: string | null;
  member_count?: number;
}

interface ExploreClansViewProps {
  onSelectClan?: (clan: ClanItem) => void;
}

export const ExploreClansView: React.FC<ExploreClansViewProps> = () => {
  const {
    currentUser,
    clanData,
    isFollowingClan,
    followClan,
    unfollowClan,
    openAuthModal,
    openClanDetail,
  } = useSquad();

  const [clans, setClans] = useState<ClanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [followingActionId, setFollowingActionId] = useState<string | null>(null);

  // Fetch all clans from Supabase
  const fetchClans = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("clans")
        .select(`
          id,
          name,
          tag,
          description,
          game_mode,
          avatar_url,
          clan_frame_url,
          tier,
          subscription_tier,
          is_recruiting,
          tournaments_won,
          level,
          owner_id
        `)
        .order("tournaments_won", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filter out user's own clan so it only shows other clans to explore
      const currentClanId = clanData?.id;
      const otherClans = (data || []).filter((c) => c.id !== currentClanId);
      setClans(otherClans as ClanItem[]);
    } catch (err) {
      console.warn("[ExploreClansView] Errore caricamento clan:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClans();
  }, [clanData?.id]);

  const handleToggleFollow = async (clanId: string) => {
    if (!currentUser) {
      openAuthModal("signup");
      return;
    }

    setFollowingActionId(clanId);
    try {
      if (isFollowingClan(clanId)) {
        await unfollowClan(clanId);
      } else {
        await followClan(clanId);
      }
    } finally {
      setFollowingActionId(null);
    }
  };

  // Filtered clans list
  const filteredClans = useMemo(() => {
    return clans.filter((clan) => {
      const matchesSearch =
        searchQuery === "" ||
        clan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clan.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (clan.description && clan.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesGame =
        selectedGame === "all" ||
        (clan.game_mode && clan.game_mode.toLowerCase().includes(selectedGame.toLowerCase()));

      return matchesSearch && matchesGame;
    });
  }, [clans, searchQuery, selectedGame]);

  const gameFilters = [
    { id: "all", label: "Tutti i Giochi" },
    { id: "warzone", label: "Warzone" },
    { id: "cdl", label: "COD CDL" },
    { id: "fc", label: "EA FC" },
    { id: "valorant", label: "Valorant" },
  ];

  return (
    <div className="space-y-3.5">
      {/* Search & Filter Header */}
      <div className="bg-[#121628]/95 border border-purple-900/40 rounded-2xl p-3.5 space-y-3 shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>Esplora Clan SquadUP</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
              {filteredClans.length} Disponibili
            </span>
          </div>

          <span className="text-[10px] text-zinc-400">Segui e resta aggiornato</span>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per nome clan, tag [TAG] o stile di gioco..."
            className="w-full pl-9 pr-3 py-2 bg-black/40 border border-purple-900/50 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {gameFilters.map((gf) => (
            <button
              key={gf.id}
              onClick={() => setSelectedGame(gf.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                selectedGame === gf.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-sm"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              {gf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clans List */}
      {isLoading ? (
        <div className="bg-[#121628]/80 border border-purple-900/30 rounded-2xl p-8 text-center space-y-2">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
          <p className="text-xs text-zinc-400">Caricamento clan della community...</p>
        </div>
      ) : filteredClans.length === 0 ? (
        <div className="bg-[#121628]/80 border border-purple-900/30 rounded-2xl p-8 text-center space-y-2">
          <Shield className="w-8 h-8 text-zinc-500 mx-auto" />
          <p className="text-xs font-bold text-zinc-300">Nessun clan trovato</p>
          <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
            {searchQuery
              ? `Nessun risultato per "${searchQuery}". Prova con un tag o nome diverso.`
              : "Non ci sono ancora altri clan registrati. Fonda il tuo adesso!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredClans.map((clan) => {
            const isFollowing = isFollowingClan(clan.id);
            const isActionBusy = followingActionId === clan.id;
            const isElite = clan.tier === "elite" || clan.subscription_tier === "elite";
            const isPro = clan.tier === "pro" || clan.subscription_tier === "pro";

            return (
              <div
                key={clan.id}
                className="bg-[#121628]/90 border border-purple-900/30 hover:border-purple-600/50 rounded-2xl p-3.5 space-y-2.5 transition-all shadow-md group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    onClick={() => openClanDetail(clan.id)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                    title="Visualizza dettagli completi del clan"
                  >
                    {/* Clan Emblem / Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center overflow-hidden text-purple-300 font-black text-sm"
                        style={
                          clan.clan_frame_url
                            ? {
                                borderColor: clan.clan_frame_url.startsWith("#")
                                  ? clan.clan_frame_url
                                  : "#06B6D4",
                                borderWidth: 2,
                              }
                            : {}
                        }
                      >
                        {clan.avatar_url ? (
                          <img
                            src={clan.avatar_url}
                            alt={clan.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{clan.tag?.slice(0, 3) || "CLAN"}</span>
                        )}
                      </div>
                    </div>

                    {/* Clan Names & Badges */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-extrabold text-white truncate group-hover:text-cyan-300 transition-colors">
                          {clan.name}
                        </h4>
                        <span className="text-[11px] font-black text-cyan-400">
                          [{clan.tag}]
                        </span>

                        {isElite && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-black uppercase tracking-wider">
                            Elite
                          </span>
                        )}
                        {isPro && !isElite && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black uppercase tracking-wider">
                            Pro
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400">
                        <span>{clan.game_mode || "Warzone"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-amber-300 font-bold">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          {clan.tournaments_won || 0} Vittorie
                        </span>
                        {clan.is_recruiting && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-semibold">Recluta</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Follow Clan Button */}
                  <button
                    onClick={() => handleToggleFollow(clan.id)}
                    disabled={isActionBusy}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                      isFollowing
                        ? "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700/80"
                        : "bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-600/50 hover:text-white shadow-sm"
                    }`}
                  >
                    {isActionBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Seguito</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Segui</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Clan Bio/Description */}
                {clan.description && (
                  <p className="text-[11px] text-zinc-300/90 leading-relaxed border-t border-zinc-800/60 pt-2 break-words">
                    {clan.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
