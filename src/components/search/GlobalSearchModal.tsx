import React, { useState, useEffect } from "react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  X,
  Users,
  Shield,
  Trophy,
  UserPlus,
  UserCheck,
  Crown,
  Sparkles,
  Gamepad2,
  Coins,
  ChevronRight,
} from "lucide-react";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchCategory = "all" | "players" | "clans" | "tournaments";

interface SearchedPlayer {
  id: string;
  name: string;
  username?: string;
  tag: string;
  avatar_url?: string;
  level: number;
  rank: string;
  activision_name?: string;
  subscription_tier?: string;
  bio?: string;
}

interface SearchedClan {
  id: string;
  name: string;
  tag: string;
  game_mode: string;
  avatar_url?: string;
  tier: string;
  members_count: number;
  description?: string;
}

interface SearchedTournament {
  id: string;
  name: string;
  game_mode: string;
  type: string;
  status: string;
  entry_fee_sc: number;
  prize_description?: string;
  starts_at: string;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentUser,
    userProfile,
    isFollowingUser,
    followUser,
    unfollowUser,
    isFollowingClan,
    followClan,
    unfollowClan,
    setActiveTab,
    setTournamentSubTab,
    setSelectedTournament,
    tournaments,
    openPublicProfile,
    openClanDetail,
  } = useSquad();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<SearchCategory>("all");
  const [isLoading, setIsLoading] = useState(false);

  const [players, setPlayers] = useState<SearchedPlayer[]>([]);
  const [clans, setClans] = useState<SearchedClan[]>([]);
  const [tournamentResults, setTournamentResults] = useState<SearchedTournament[]>([]);

  // Search logic querying Supabase & Local Fallbacks
  useEffect(() => {
    if (!isOpen) return;

    const term = searchQuery.trim();
    if (!term) {
      fetchSuggestions();
      return;
    }

    const timer = setTimeout(() => {
      runSearch(term);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      // 1. Suggested Players
      const { data: pData } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, activision_id, subscription_tier, bio")
        .limit(8);

      if (pData && pData.length > 0) {
        setPlayers(
          pData.map((p: any) => ({
            id: p.id,
            name: p.display_name || p.username || "Giocatore",
            username: p.username || "",
            tag: p.username ? `@${p.username}` : (p.activision_id ? `#${p.activision_id.split("#")[1] || "COD"}` : "#SQ"),
            avatar_url: p.avatar_url,
            level: p.subscription_tier === "pro" ? 50 : 15,
            rank: p.subscription_tier === "pro" ? "Pro Player" : "Competitor",
            activision_name: p.activision_id,
            subscription_tier: p.subscription_tier,
            bio: p.bio,
          }))
        );
      }

      // 2. Suggested Clans
      const { data: cData } = await supabase
        .from("clans")
        .select("id, name, tag, game_mode, avatar_url, tier, description")
        .limit(6);

      if (cData && cData.length > 0) {
        setClans(
          cData.map((c: any) => ({
            id: c.id,
            name: c.name,
            tag: c.tag,
            game_mode: c.game_mode || "Warzone",
            avatar_url: c.avatar_url,
            tier: c.tier || "base",
            members_count: 8,
            description: c.description,
          }))
        );
      }

      // 3. Suggested Tournaments (From DB or local state)
      const { data: tData } = await supabase
        .from("tournaments")
        .select("id, name, game_mode, type, status, entry_fee_sc, prize_description, starts_at")
        .limit(6);

      if (tData && tData.length > 0) {
        setTournamentResults(
          tData.map((t: any) => ({
            id: t.id,
            name: t.name,
            game_mode: t.game_mode,
            type: t.type,
            status: t.status,
            entry_fee_sc: t.entry_fee_sc,
            prize_description: t.prize_description,
            starts_at: t.starts_at,
          }))
        );
      } else if (tournaments && tournaments.length > 0) {
        setTournamentResults(
          tournaments.map((t) => ({
            id: t.id,
            name: t.title,
            game_mode: t.game,
            type: t.category,
            status: t.status,
            entry_fee_sc: t.entryFeeSCoin,
            prize_description: `${t.prizePoolSCoin} SCoin`,
            starts_at: t.startsAt,
          }))
        );
      }
    } catch (err) {
      console.warn("[GlobalSearch] Errore caricamento suggerimenti:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const runSearch = async (term: string) => {
    setIsLoading(true);
    try {
      // Clean query: remove leading @, #, or brackets
      const cleanTerm = term.trim().replace(/^[@#\[\]]/g, "").replace(/[\[\]]/g, "");
      const sanitized = `%${cleanTerm}%`;
      const rawSanitized = `%${term.trim()}%`;

      // 1. Search Players
      let foundPlayers: SearchedPlayer[] = [];
      try {
        const { data: pData, error: pError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, activision_id, subscription_tier, bio")
          .or(`username.ilike.${sanitized},display_name.ilike.${sanitized},activision_id.ilike.${sanitized},activision_id.ilike.${rawSanitized}`)
          .limit(20);

        if (!pError && pData) {
          foundPlayers = pData.map((p: any) => ({
            id: p.id,
            name: p.display_name || p.username || "Giocatore",
            username: p.username || "",
            tag: p.username ? `@${p.username}` : (p.activision_id ? `#${p.activision_id.split("#")[1] || "COD"}` : "#SQ"),
            avatar_url: p.avatar_url,
            level: p.subscription_tier === "pro" ? 50 : 12,
            rank: p.subscription_tier === "pro" ? "Pro Player" : "Competitor",
            activision_name: p.activision_id,
            subscription_tier: p.subscription_tier,
            bio: p.bio,
          }));
        }
      } catch (err) {
        console.warn("[GlobalSearch] Errore profiles:", err);
      }

      // Check current logged-in user match
      if (currentUser) {
        const cUsername = (currentUser.user_metadata?.username || (currentUser as any).username || "").toLowerCase();
        const cDisplayName = (userProfile?.name || currentUser.user_metadata?.display_name || "").toLowerCase();
        const cActivision = (userProfile?.activisionName || "").toLowerCase();
        const queryLower = cleanTerm.toLowerCase();
        if (
          (cUsername.includes(queryLower) || cDisplayName.includes(queryLower) || cActivision.includes(queryLower)) &&
          !foundPlayers.some((p) => p.id === currentUser.id)
        ) {
          foundPlayers.unshift({
            id: currentUser.id,
            name: userProfile?.name || cDisplayName || "Il Tuo Profilo",
            username: cUsername || undefined,
            tag: cUsername ? `@${cUsername}` : "#SQ",
            avatar_url: userProfile?.avatar || "",
            level: userProfile?.level || 15,
            rank: userProfile?.rank || "Competitor",
            activision_name: userProfile?.activisionName,
            subscription_tier: userProfile?.subscriptionTier,
            bio: userProfile?.bio,
          });
        }
      }
      setPlayers(foundPlayers);

      // 2. Search Clans
      try {
        const { data: cData } = await supabase
          .from("clans")
          .select("id, name, tag, game_mode, avatar_url, tier, description")
          .or(`name.ilike.${sanitized},tag.ilike.${sanitized},description.ilike.${sanitized}`)
          .limit(10);

        if (cData) {
          setClans(
            cData.map((c: any) => ({
              id: c.id,
              name: c.name,
              tag: c.tag,
              game_mode: c.game_mode || "Warzone",
              avatar_url: c.avatar_url,
              tier: c.tier || "base",
              members_count: 8,
              description: c.description,
            }))
          );
        } else {
          setClans([]);
        }
      } catch (err) {
        console.warn("[GlobalSearch] Errore clans:", err);
        setClans([]);
      }

      // 3. Search Tournaments (Supabase + Local fallback)
      let foundTournaments: SearchedTournament[] = [];
      try {
        const { data: tData } = await supabase
          .from("tournaments")
          .select("id, name, game_mode, type, status, entry_fee_sc, prize_description, starts_at")
          .or(`name.ilike.${sanitized},game_mode.ilike.${sanitized},prize_description.ilike.${sanitized}`)
          .limit(10);

        if (tData && tData.length > 0) {
          foundTournaments = tData.map((t: any) => ({
            id: t.id,
            name: t.name,
            game_mode: t.game_mode,
            type: t.type,
            status: t.status,
            entry_fee_sc: t.entry_fee_sc,
            prize_description: t.prize_description,
            starts_at: t.starts_at,
          }));
        }
      } catch (err) {
        console.warn("[GlobalSearch] Errore tournaments:", err);
      }

      // Fallback/merge with tournaments in state
      if (tournaments && tournaments.length > 0) {
        const qLow = cleanTerm.toLowerCase();
        tournaments.forEach((lt) => {
          if (
            (lt.title.toLowerCase().includes(qLow) ||
              lt.game.toLowerCase().includes(qLow) ||
              lt.category.toLowerCase().includes(qLow)) &&
            !foundTournaments.some((t) => t.id === lt.id)
          ) {
            foundTournaments.push({
              id: lt.id,
              name: lt.title,
              game_mode: lt.game,
              type: lt.category,
              status: lt.status,
              entry_fee_sc: lt.entryFeeSCoin,
              prize_description: `${lt.prizePoolSCoin} SCoin`,
              starts_at: lt.startsAt,
            });
          }
        });
      }
      setTournamentResults(foundTournaments);
    } catch (err) {
      console.warn("[GlobalSearch] Errore ricerca:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTournament = (tournId: string) => {
    const found = tournaments.find((t) => t.id === tournId);
    if (found) {
      setSelectedTournament(found);
    } else {
      const searched = tournamentResults.find((t) => t.id === tournId);
      if (searched) {
        setSelectedTournament({
          id: searched.id,
          title: searched.name,
          game: searched.game_mode || "Warzone",
          category: searched.type || "Battle Royale",
          status: (searched.status as any) || "iscrizioni",
          prizePoolSCoin: 500,
          entryFeeSCoin: searched.entry_fee_sc || 0,
          teamsJoined: 4,
          maxTeams: 16,
          startsAt: searched.starts_at || "Stasera 21:00",
          mode: searched.game_mode || "Warzone Resurgence",
          banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80",
          description: "Kill Race e Bracket ufficiale",
        });
      }
    }
    setActiveTab("tournaments");
    setTournamentSubTab("active");
    onClose();
  };

  const handleSelectClan = (clanId?: string) => {
    if (clanId) {
      openClanDetail(clanId);
    } else {
      setActiveTab("clan");
    }
    onClose();
  };

  const handleSelectPlayer = (playerId: string) => {
    openPublicProfile(playerId);
    onClose();
  };

  if (!isOpen) return null;

  const totalResults = players.length + clans.length + tournamentResults.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-[#0f1322] border border-purple-900/50 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-6 flex flex-col max-h-[90vh]">
        {/* Header & Search Bar */}
        <div className="p-4 border-b border-purple-900/30 bg-[#121628]/95 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Search className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Ricerca Globale SquadUP</h3>
                <p className="text-[10px] text-zinc-400">
                  Trova giocatori, tag clan o tornei competitivi
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca nome giocatore, tag clan [#TAG], o torneo..."
              autoFocus
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-zinc-900/90 border border-purple-900/50 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Categories Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                activeCategory === "all"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              Tutti ({totalResults})
            </button>
            <button
              onClick={() => setActiveCategory("players")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                activeCategory === "players"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Giocatori ({players.length})</span>
            </button>
            <button
              onClick={() => setActiveCategory("clans")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                activeCategory === "clans"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Clan ({clans.length})</span>
            </button>
            <button
              onClick={() => setActiveCategory("tournaments")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                activeCategory === "tournaments"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Tornei ({tournamentResults.length})</span>
            </button>
          </div>
        </div>

        {/* Results Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-zinc-400">Ricerca in corso su SquadUP...</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Search className="w-8 h-8 text-zinc-600 mx-auto" />
              <h4 className="text-xs font-bold text-zinc-300">Nessun risultato trovato</h4>
              <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                Prova con un termine diverso (es. nome Warzone, tag clan o titolo torneo).
              </p>
            </div>
          ) : (
            <>
              {/* PLAYERS SECTION */}
              {(activeCategory === "all" || activeCategory === "players") && players.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-zinc-400 uppercase tracking-wider px-1">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      Giocatori ({players.length})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {players.map((p) => {
                      const following = isFollowingUser(p.id);
                      const isSelf = currentUser?.id === p.id;

                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectPlayer(p.id)}
                          className="p-3 rounded-2xl bg-zinc-900/60 border border-purple-900/30 hover:border-cyan-500/50 hover:bg-[#141930] transition-all flex items-center justify-between gap-3 shadow-sm cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="relative shrink-0">
                              {p.avatar_url ? (
                                <img
                                  src={p.avatar_url}
                                  alt={p.name}
                                  className="w-10 h-10 rounded-xl object-cover border border-purple-500/40"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-600/40 flex items-center justify-center text-purple-300 font-extrabold text-sm">
                                  {p.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 text-black font-extrabold text-[9px] flex items-center justify-center">
                                {p.level}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-bold text-white truncate max-w-[140px] group-hover:text-cyan-300 transition-colors">
                                  {p.name}
                                </h4>
                                {p.username && (
                                  <span className="text-[11px] font-mono text-cyan-400 font-bold bg-cyan-950/60 px-1 rounded border border-cyan-800/40">
                                    @{p.username}
                                  </span>
                                )}
                                {p.subscription_tier === "pro" && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
                                    <Crown className="w-2.5 h-2.5 text-amber-400" />
                                    PRO
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                                <span className="text-cyan-400">{p.rank}</span>
                                {p.tag && p.tag !== `@${p.username}` && (
                                  <>
                                    <span>•</span>
                                    <span>{p.tag}</span>
                                  </>
                                )}
                              </div>
                              {p.activision_name && (
                                <div className="flex items-center gap-1 text-[10px] text-cyan-300 mt-0.5">
                                  <Gamepad2 className="w-3 h-3 text-cyan-400 shrink-0" />
                                  <span className="truncate max-w-[150px]">{p.activision_name}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Follow Button */}
                          {!isSelf && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (following) {
                                  unfollowUser(p.id);
                                } else {
                                  followUser(p.id);
                                }
                              }}
                              className={`py-1.5 px-3 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                                following
                                  ? "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40"
                                  : "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                              }`}
                            >
                              {following ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Seguito</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>Segui</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CLANS SECTION */}
              {(activeCategory === "all" || activeCategory === "clans") && clans.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-zinc-400 uppercase tracking-wider px-1">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-cyan-400" />
                      Clan Competitivi ({clans.length})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {clans.map((clan) => {
                      const following = isFollowingClan(clan.id);

                      return (
                        <div
                          key={clan.id}
                          onClick={() => handleSelectClan(clan.id)}
                          className="p-3 rounded-2xl bg-zinc-900/60 border border-purple-900/30 hover:border-cyan-500/50 hover:bg-[#141930] transition-all flex items-center justify-between gap-3 shadow-sm cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-600/40 flex items-center justify-center text-purple-300 font-extrabold text-xs shrink-0 group-hover:scale-105 transition-transform">
                              [{clan.tag}]
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-bold text-white truncate max-w-[140px] group-hover:text-cyan-300 transition-colors">
                                  {clan.name}
                                </h4>
                                {clan.tier === "elite" ? (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
                                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                                    ELITE
                                  </span>
                                ) : clan.tier === "pro" ? (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-0.5">
                                    <Crown className="w-2.5 h-2.5 text-purple-400" />
                                    PRO
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                                    BASE
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-zinc-400 block truncate">
                                {clan.game_mode} • {clan.description || "Clan competitivo SquadUP"}
                              </span>
                            </div>
                          </div>

                          {/* Follow Clan Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (following) {
                                unfollowClan(clan.id);
                              } else {
                                followClan(clan.id);
                              }
                            }}
                            className={`py-1.5 px-3 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                              following
                                ? "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40"
                                : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                            }`}
                          >
                            {following ? (
                              <>
                                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Seguito</span>
                              </>
                            ) : (
                              <>
                                <Shield className="w-3.5 h-3.5" />
                                <span>Segui</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TOURNAMENTS SECTION */}
              {(activeCategory === "all" || activeCategory === "tournaments") &&
                tournamentResults.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-extrabold text-zinc-400 uppercase tracking-wider px-1">
                      <span className="flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        Tornei Competitivi ({tournamentResults.length})
                      </span>
                    </div>

                    <div className="space-y-2">
                      {tournamentResults.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => handleSelectTournament(t.id)}
                          className="p-3 rounded-2xl bg-zinc-900/60 border border-purple-900/30 hover:border-amber-500/50 hover:bg-[#141930] transition-all flex items-center justify-between gap-3 shadow-sm cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                              <Trophy className="w-5 h-5" />
                            </div>

                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                                {t.name}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                                <span className="text-cyan-400 font-semibold">{t.game_mode}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-amber-300 font-bold">
                                  <Coins className="w-3 h-3" />
                                  {t.entry_fee_sc > 0 ? `${t.entry_fee_sc} SC` : "Gratuito"}
                                </span>
                              </div>
                              {t.prize_description && (
                                <p className="text-[10px] text-zinc-400 truncate max-w-[200px] mt-0.5">
                                  Montepremi: {t.prize_description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-xs font-bold text-cyan-400 shrink-0 group-hover:text-amber-300 transition-colors">
                            <span>Apri Torneo</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
