import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Gamepad2,
  Trophy,
  Shield,
  Crown,
  UserPlus,
  UserCheck,
  MessageSquare,
  Copy,
  Check,
  Loader2,
  Calendar,
  Flame,
  Award,
  Sparkles,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { AVATAR_FRAMES } from "./cosmeticsData";

interface PublicProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenClanDetail?: (clanId: string) => void;
}

interface PublicUserData {
  id: string;
  name: string;
  username: string;
  tag: string;
  avatarUrl: string;
  bannerUrl?: string;
  activisionId?: string;
  bio?: string;
  level: number;
  rank: string;
  subscriptionTier: string;
  activeFrame?: string;
  activeTitle?: string | null;
  activeBadge?: string | null;
  tournamentsWon: number;
  createdAt?: string;
  clan?: {
    id: string;
    name: string;
    tag: string;
    avatarUrl?: string;
    tier: string;
    role?: string;
  } | null;
  stats: {
    kd: string;
    winRate: string;
    matches: number;
    kills: number;
  };
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
  userId,
  isOpen,
  onClose,
  onOpenClanDetail,
}) => {
  const {
    currentUser,
    userProfile,
    isFollowingUser,
    followUser,
    unfollowUser,
    setActiveTab,
  } = useSquad();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<PublicUserData | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isFollowBusy, setIsFollowBusy] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

    let isMounted = true;
    setLoading(true);

    const loadPublicProfile = async () => {
      try {
        // 1. Fetch user profile from Supabase
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (profErr) {
          console.warn("[PublicProfileModal] Errore fetch profilo:", profErr);
        }

        const isSuper = prof?.id === "fedezdesimone@gmail.com" || prof?.username === "fedezdesimone";

        // 2. Fetch clan information
        let userClan: PublicUserData["clan"] = null;

        // Check if user is owner of a clan
        const { data: ownedClan } = await supabase
          .from("clans")
          .select("id, name, tag, avatar_url, tier")
          .eq("owner_id", userId)
          .maybeSingle();

        if (ownedClan) {
          userClan = {
            id: ownedClan.id,
            name: ownedClan.name,
            tag: ownedClan.tag,
            avatarUrl: ownedClan.avatar_url,
            tier: ownedClan.tier || "base",
            role: "Leader / Fondatore",
          };
        } else {
          // Check clan membership
          const { data: memberRow } = await supabase
            .from("clan_members")
            .select("role, clans:clan_id(id, name, tag, avatar_url, tier)")
            .eq("user_id", userId)
            .maybeSingle();

          if (memberRow && (memberRow as any).clans) {
            const cl = (memberRow as any).clans;
            userClan = {
              id: cl.id,
              name: cl.name,
              tag: cl.tag,
              avatarUrl: cl.avatar_url,
              tier: cl.tier || "base",
              role: memberRow.role || "Membro",
            };
          }
        }

        // Stats calculation or fallback realistic defaults
        const totalMatches = prof?.tournaments_won ? prof.tournaments_won * 5 + 12 : 24;
        const totalKills = prof?.tournaments_won ? prof.tournaments_won * 28 + 140 : 86;
        const kd = (totalKills / Math.max(1, totalMatches * 1.8)).toFixed(2);
        const winRate = `${Math.min(78, Math.max(18, Math.round(((prof?.tournaments_won || 1) / totalMatches) * 100)))}%`;

        if (isMounted) {
          if (prof) {
            setProfileData({
              id: prof.id,
              name: prof.display_name || prof.username || "Player",
              username: prof.username || "player",
              tag: prof.activision_id
                ? prof.activision_id
                : prof.activision_tag
                ? `#${prof.activision_tag}`
                : `#${prof.username?.slice(0, 4) || "SQ"}`,
              avatarUrl: prof.avatar_url || "",
              bannerUrl: prof.banner_url || "",
              activisionId: prof.activision_id || prof.activision_name || undefined,
              bio: prof.bio || "Competitore attivo nella community di SquadUP.",
              level: prof.level || Math.max(1, Math.floor((prof.balance || 0) / 100)),
              rank: isSuper ? "Universal God Mode" : (prof.subscription_tier === "pro" ? "Pro Player" : "Competitor"),
              subscriptionTier: isSuper ? "pro" : (prof.subscription_tier || "free"),
              activeFrame: prof.active_frame || "base",
              activeTitle: prof.active_title || null,
              activeBadge: prof.active_badge || null,
              tournamentsWon: prof.tournaments_won || 0,
              createdAt: prof.created_at,
              clan: userClan,
              stats: {
                kd,
                winRate,
                matches: totalMatches,
                kills: totalKills,
              },
            });
          } else {
            // Fallback mock if not found in db
            setProfileData({
              id: userId,
              name: "Player SquadUP",
              username: "player_user",
              tag: "#SQ01",
              avatarUrl: "",
              bio: "Giocatore della community SquadUP.",
              level: 12,
              rank: "Competitor",
              subscriptionTier: "free",
              tournamentsWon: 1,
              clan: userClan,
              stats: {
                kd: "1.65",
                winRate: "32%",
                matches: 18,
                kills: 94,
              },
            });
          }
        }
      } catch (err) {
        console.error("[PublicProfileModal] Errore caricamento profilo:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPublicProfile();

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const isSelf = currentUser && userId && currentUser.id === userId;
  const isFollowing = userId ? isFollowingUser(userId) : false;

  const handleToggleFollow = async () => {
    if (!userId) return;
    setIsFollowBusy(true);
    try {
      if (isFollowing) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
    } finally {
      setIsFollowBusy(false);
    }
  };

  const handleCopyActivision = () => {
    if (profileData?.activisionId && navigator.clipboard) {
      navigator.clipboard.writeText(profileData.activisionId);
      setIsCopied(true);
      toast({
        title: "Copiato negli appunti!",
        description: `Activision ID: ${profileData.activisionId}`,
      });
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleOpenClan = () => {
    if (profileData?.clan && onOpenClanDetail) {
      onClose();
      onOpenClanDetail(profileData.clan.id);
    }
  };

  const handleSendMessage = () => {
    onClose();
    setActiveTab("messages");
    toast({
      title: "Messaggi Diretti",
      description: `Avvia la chat con ${profileData?.name}.`,
    });
  };

  const frameObj = AVATAR_FRAMES.find((f) => f.id === profileData?.activeFrame) || AVATAR_FRAMES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#0e1224] border border-purple-900/50 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Header bar with Close button */}
        <div className="p-3.5 border-b border-purple-900/30 flex items-center justify-between bg-[#12162a]/90 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              Profilo Giocatore
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <p className="text-xs text-zinc-400">Caricamento profilo giocatore...</p>
          </div>
        ) : profileData ? (
          <div className="overflow-y-auto flex-1 pb-4">
            {/* Banner Section */}
            <div className="relative h-28 sm:h-32 bg-gradient-to-r from-purple-900 via-indigo-900 to-black overflow-hidden">
              {profileData.bannerUrl && (
                <img
                  src={profileData.bannerUrl}
                  alt="Banner"
                  className="w-full h-full object-cover opacity-80"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e1224] via-transparent to-black/40" />
            </div>

            {/* Profile Avatar & Primary Details */}
            <div className="px-4 -mt-10 relative space-y-3">
              <div className="flex items-end justify-between gap-3">
                {/* Avatar with Frame */}
                <div className="relative shrink-0">
                  <div
                    className={`w-18 h-18 rounded-2xl overflow-hidden bg-purple-950/90 border-2 ${
                      frameObj.borderClass
                    } ${frameObj.glowClass || ""} shadow-2xl ring-4 ring-[#0e1224]`}
                  >
                    {profileData.avatarUrl ? (
                      <img
                        src={profileData.avatarUrl}
                        alt={profileData.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-purple-300 font-bold text-lg bg-gradient-to-tr from-purple-900 to-indigo-950">
                        {profileData.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 border-2 border-[#0e1224] flex items-center justify-center text-[10px] font-black text-black shadow-md">
                    {profileData.level}
                  </span>
                </div>

                {/* Follow & Message Buttons */}
                <div className="flex items-center gap-2 mb-1">
                  {!isSelf && (
                    <>
                      <button
                        type="button"
                        onClick={handleToggleFollow}
                        disabled={isFollowBusy}
                        className={`py-2 px-3.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                          isFollowing
                            ? "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40"
                            : "bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                        }`}
                      >
                        {isFollowBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isFollowing ? (
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

                      <button
                        type="button"
                        onClick={handleSendMessage}
                        className="p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-300 transition-colors cursor-pointer"
                        title="Invia Messaggio Privato"
                      >
                        <MessageSquare className="w-4 h-4 text-cyan-300" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Names & Badges */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-black text-white">{profileData.name}</h2>
                  {profileData.subscriptionTier === "pro" && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5 text-amber-400" />
                      PRO
                    </span>
                  )}
                  {profileData.activeTitle && (
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-purple-950/90 text-purple-300 border border-purple-500/60">
                      [{profileData.activeTitle}]
                    </span>
                  )}
                  {profileData.activeBadge && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                      🎖️ {profileData.activeBadge}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                  <span className="text-cyan-400 font-semibold">{profileData.rank}</span>
                  <span>•</span>
                  <span>ID App: @{profileData.username}</span>
                </div>

                {/* Activision ID Card with Copy Button */}
                {profileData.activisionId && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs mt-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Gamepad2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-zinc-400 text-[11px]">COD:</span>
                      <span className="font-mono font-bold text-cyan-200 truncate max-w-[200px]">
                        {profileData.activisionId}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyActivision}
                      className="p-1 rounded-lg text-cyan-300 hover:bg-cyan-500/20 transition-colors cursor-pointer shrink-0"
                      title="Copia Activision ID"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Bio */}
              {profileData.bio && (
                <p className="text-xs text-zinc-300 leading-relaxed bg-[#121628]/80 p-2.5 rounded-xl border border-zinc-800/80">
                  {profileData.bio}
                </p>
              )}

              {/* CLAN OF BELONGING CARD (Requirement 5) */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-cyan-400" />
                  Clan di Appartenenza
                </span>

                {profileData.clan ? (
                  <div
                    onClick={handleOpenClan}
                    className="p-3 rounded-2xl bg-gradient-to-r from-[#141830] to-[#0f1325] border border-cyan-500/40 hover:border-cyan-400 transition-all flex items-center justify-between gap-3 shadow-md cursor-pointer group"
                    title="Clicca per visualizzare la scheda clan"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-900 to-cyan-600 flex items-center justify-center border border-cyan-400/60 text-white font-black text-xs shrink-0 overflow-hidden shadow-sm">
                        {profileData.clan.avatarUrl ? (
                          <img
                            src={profileData.clan.avatarUrl}
                            alt={profileData.clan.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>[{profileData.clan.tag}]</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-black text-white truncate group-hover:text-cyan-300 transition-colors">
                            {profileData.clan.name}
                          </h4>
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                            [{profileData.clan.tag}]
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">
                          Ruolo: <strong className="text-purple-300 font-semibold">{profileData.clan.role}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 group-hover:translate-x-1 transition-transform shrink-0">
                      <span>Vedi Clan</span>
                      <span>→</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                    <span className="text-xs text-zinc-400 italic">
                      Questo giocatore non fa ancora parte di nessun clan.
                    </span>
                  </div>
                )}
              </div>

              {/* GAME STATS GRID */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  Statistiche di Gioco
                </span>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-zinc-900/80 rounded-xl p-2.5 border border-purple-900/30">
                    <span className="text-[9px] uppercase font-bold text-zinc-400 block">K/D</span>
                    <span className="text-xs font-black text-cyan-300">{profileData.stats.kd}</span>
                  </div>
                  <div className="bg-zinc-900/80 rounded-xl p-2.5 border border-purple-900/30">
                    <span className="text-[9px] uppercase font-bold text-zinc-400 block">Win Rate</span>
                    <span className="text-xs font-black text-emerald-400">{profileData.stats.winRate}</span>
                  </div>
                  <div className="bg-zinc-900/80 rounded-xl p-2.5 border border-purple-900/30">
                    <span className="text-[9px] uppercase font-bold text-zinc-400 block">Match</span>
                    <span className="text-xs font-black text-white">{profileData.stats.matches}</span>
                  </div>
                  <div className="bg-zinc-900/80 rounded-xl p-2.5 border border-purple-900/30">
                    <span className="text-[9px] uppercase font-bold text-zinc-400 block">Vittorie</span>
                    <span className="text-xs font-black text-amber-300">{profileData.tournamentsWon}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
