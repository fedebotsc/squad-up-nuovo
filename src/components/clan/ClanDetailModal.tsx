import React, { useState, useEffect } from "react";
import {
  X,
  Shield,
  Users,
  Trophy,
  Crown,
  UserPlus,
  UserCheck,
  Gamepad2,
  Calendar,
  Sparkles,
  Loader2,
  ExternalLink,
  Target,
  Award,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { useSquad } from "@/context/SquadContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { ClanBadgesCard } from "./ClanBadgesCard";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";

interface ClanDetailModalProps {
  clanId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenUserProfile?: (userId: string) => void;
}

interface ClanDetailData {
  id: string;
  name: string;
  tag: string;
  description: string | null;
  gameMode: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  clanFrameUrl: string | null;
  tier: "base" | "pro" | "elite" | string;
  isRecruiting: boolean;
  tournamentsWon: number;
  level: number;
  ownerId: string | null;
  createdAt?: string;
  members: ClanMemberDetail[];
}

interface ClanMemberDetail {
  id: string;
  userId: string;
  role: string;
  name: string;
  username: string;
  avatarUrl?: string;
  activisionId?: string;
  isLeader?: boolean;
}

export const ClanDetailModal: React.FC<ClanDetailModalProps> = ({
  clanId,
  isOpen,
  onClose,
  onOpenUserProfile,
}) => {
  const {
    currentUser,
    isFollowingClan,
    followClan,
    unfollowClan,
    setActiveTab,
  } = useSquad();

  const handleContactClan = () => {
    if (!clan) return;
    sessionStorage.setItem(
      "squadup_target_chat",
      JSON.stringify({
        id: clan.id,
        display_name: clan.name,
        username: clan.tag,
        avatar_url: clan.avatarUrl,
        clan_tag: clan.tag,
        is_clan: true,
        tier: clan.tier,
      })
    );
    onClose();
    setActiveTab("messages");
    toast({
      title: "Chat Clan",
      description: `Apertura chat diretta con il Clan [${clan.tag}] ${clan.name}...`,
    });
  };

  const [loading, setLoading] = useState(true);
  const [clan, setClan] = useState<ClanDetailData | null>(null);
  const [isFollowBusy, setIsFollowBusy] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    if (!isOpen || !clanId) return;

    let isMounted = true;
    setLoading(true);

    const loadClanDetail = async () => {
      try {
        // 1. Fetch clan data from Supabase
        const { data: clanRow, error: clanErr } = await supabase
          .from("clans")
          .select("*")
          .eq("id", clanId)
          .maybeSingle();

        if (clanErr) {
          console.warn("[ClanDetailModal] Errore fetch clan:", clanErr);
        }

        // 2. Fetch clan members
        const { data: membersData } = await supabase
          .from("clan_members")
          .select("id, role, user_id, profiles:user_id(id, display_name, username, avatar_url, activision_id)")
          .eq("clan_id", clanId);

        let parsedMembers: ClanMemberDetail[] = [];

        if (membersData && membersData.length > 0) {
          parsedMembers = membersData.map((m: any) => {
            const prof = m.profiles;
            return {
              id: m.id,
              userId: m.user_id,
              role: m.role || "Membro",
              name: prof?.display_name || prof?.username || "Player",
              username: prof?.username || "player",
              avatarUrl: prof?.avatar_url,
              activisionId: prof?.activision_id,
              isLeader: m.role === "Leader" || m.role === "leader" || m.role === "founder",
            };
          });
        } else if (clanRow) {
          // If no clan_members rows yet, add owner as Leader
          const { data: ownerProf } = await supabase
            .from("profiles")
            .select("id, display_name, username, avatar_url, activision_id")
            .eq("id", clanRow.owner_id)
            .maybeSingle();

          if (ownerProf) {
            parsedMembers = [
              {
                id: `lead-${ownerProf.id}`,
                userId: ownerProf.id,
                role: "Leader & Fondatore",
                name: ownerProf.display_name || ownerProf.username || "Clan Leader",
                username: ownerProf.username || "leader",
                avatarUrl: ownerProf.avatar_url,
                activisionId: ownerProf.activision_id,
                isLeader: true,
              },
            ];
          }
        }

        if (isMounted) {
          if (clanRow) {
            setClan({
              id: clanRow.id,
              name: clanRow.name,
              tag: clanRow.tag,
              description: clanRow.description || "Clan competitivo attivo nei tornei ufficiali di SquadUP.",
              gameMode: clanRow.game_mode || "Warzone Competitivo",
              avatarUrl: clanRow.avatar_url,
              bannerUrl: clanRow.clan_banner_url || clanRow.banner_url || null,
              clanFrameUrl: clanRow.clan_frame_url,
              tier: clanRow.tier || clanRow.subscription_tier || "base",
              isRecruiting: clanRow.is_recruiting ?? true,
              tournamentsWon: clanRow.tournaments_won || 0,
              level: clanRow.level || 1,
              ownerId: clanRow.owner_id,
              createdAt: clanRow.created_at,
              members: parsedMembers,
            });
          } else {
            // Fallback mock
            setClan({
              id: clanId,
              name: "Team Vanguard",
              tag: "VNG",
              description: "Clan esportivo focalizzato sulle ranked e tornei Warzone.",
              gameMode: "Warzone Battle Royale",
              avatarUrl: null,
              bannerUrl: null,
              clanFrameUrl: null,
              tier: "pro",
              isRecruiting: true,
              tournamentsWon: 5,
              level: 8,
              ownerId: null,
              members: parsedMembers,
            });
          }
        }
      } catch (err) {
        console.error("[ClanDetailModal] Errore caricamento clan:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadClanDetail();

    return () => {
      isMounted = false;
    };
  }, [isOpen, clanId]);

  if (!isOpen) return null;

  const isFollowing = clanId ? isFollowingClan(clanId) : false;

  const handleToggleFollow = async () => {
    if (!clanId) return;
    setIsFollowBusy(true);
    try {
      if (isFollowing) {
        await unfollowClan(clanId);
      } else {
        await followClan(clanId);
      }
    } finally {
      setIsFollowBusy(false);
    }
  };

  const handleMemberClick = (userId: string) => {
    if (onOpenUserProfile) {
      onClose();
      onOpenUserProfile(userId);
    }
  };

  const isElite = clan?.tier === "elite";
  const isPro = clan?.tier === "pro" || isElite;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#0e1224] border border-cyan-900/50 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Header Bar */}
        <div className="p-3.5 border-b border-purple-900/30 flex items-center justify-between bg-[#12162a]/90 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Dettagli Clan
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
            <p className="text-xs text-zinc-400">Caricamento dettagli clan...</p>
          </div>
        ) : clan ? (
          <div className="overflow-y-auto flex-1 pb-4">
            {/* Clan Banner - Resized & Proportionate */}
            <div className="relative w-full h-36 sm:h-44 md:h-48 bg-gradient-to-r from-cyan-950 via-indigo-950 to-purple-950 overflow-hidden shrink-0">
              {clan.bannerUrl && (clan.bannerUrl.startsWith("http") || clan.bannerUrl.startsWith("/") || clan.bannerUrl.startsWith("data:")) ? (
                <img
                  src={clan.bannerUrl}
                  alt="Banner Clan"
                  className="w-full h-full object-cover object-center"
                />
              ) : clan.bannerUrl && clan.bannerUrl.includes("from-") ? (
                <div className={`w-full h-full bg-gradient-to-r ${clan.bannerUrl}`} />
              ) : (
                <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/50 via-indigo-950 to-[#0e1224]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e1224] via-[#0e1224]/30 to-transparent pointer-events-none" />
            </div>

            {/* Emblem, Info & Actions */}
            <div className="px-4 -mt-8 sm:-mt-10 relative space-y-3">
              <div className="flex items-end justify-between gap-3">
                {/* Clan Emblem */}
                <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20">
                  {clan.clanFrameUrl && (
                    clan.clanFrameUrl.startsWith("#") ? (
                      <div
                        className="absolute -inset-1.5 rounded-2xl pointer-events-none z-10 border-2"
                        style={{
                          borderColor: clan.clanFrameUrl,
                          boxShadow: `0 0 12px ${clan.clanFrameUrl}90`,
                        }}
                      />
                    ) : (
                      <img
                        src={clan.clanFrameUrl}
                        alt="Cornice Clan"
                        className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] max-w-none pointer-events-none z-10 object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.7)]"
                      />
                    )
                  )}
                  <div
                    className={`w-full h-full rounded-2xl overflow-hidden bg-gradient-to-tr from-purple-950 via-indigo-950 to-cyan-950 border-2 ${
                      clan.clanFrameUrl && !clan.clanFrameUrl.startsWith("#")
                        ? "border-transparent"
                        : isElite
                        ? "border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                        : isPro
                        ? "border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                        : "border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    } shadow-2xl ring-4 ring-[#0e1224] flex items-center justify-center`}
                  >
                    {clan.avatarUrl ? (
                      <img
                        src={clan.avatarUrl}
                        alt={clan.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <Shield className="w-7 h-7 text-cyan-300 mx-auto opacity-70 mb-0.5" />
                        <span className="text-[10px] font-black text-white tracking-widest">
                          [{clan.tag}]
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Follow & Message Clan Buttons */}
                <div className="flex items-center gap-2 mb-1">
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    disabled={isFollowBusy}
                    className={`py-2 px-3.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                      isFollowing
                        ? "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
                        : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                    }`}
                  >
                    {isFollowBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Clan Seguito</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Segui Clan</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleContactClan}
                    className="p-2 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 transition-colors cursor-pointer shadow-md flex items-center gap-1.5 px-3"
                    title="Scrivi al Clan"
                  >
                    <MessageCircle className="w-4 h-4 text-cyan-300" />
                    <span className="text-xs font-bold hidden sm:inline">Scrivi al Clan</span>
                  </button>
                </div>
              </div>

              {/* Clan Names & Tier Tags */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-black text-white">{clan.name}</h2>
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/50">
                    [{clan.tag}]
                  </span>

                  {isElite ? (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5 text-amber-400" />
                      ELITE CLAN
                    </span>
                  ) : isPro ? (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/50 flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                      PRO CLAN
                    </span>
                  ) : null}

                  {clan.isRecruiting ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Reclutamento Aperto
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                      Reclutamento Chiuso
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="text-cyan-400 font-semibold">{clan.gameMode}</span>
                  <span>•</span>
                  <span>Livello {clan.level}</span>
                </div>
              </div>

              {/* Clan Manifesto / Description */}
              {clan.description && (
                <div className="bg-[#121628]/80 p-3 rounded-2xl border border-zinc-800/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Manifesto del Clan
                  </span>
                  <p className="text-xs text-zinc-200 leading-relaxed break-words whitespace-pre-wrap">
                    {clan.description}
                  </p>
                </div>
              )}

              {/* Clan Stats Highlights */}
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-zinc-900/80 rounded-xl p-2.5 border border-cyan-900/30">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 block">Tornei Vinti</span>
                  <span className="text-xs font-black text-amber-300 flex items-center justify-center gap-1 mt-0.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    {clan.tournamentsWon}
                  </span>
                </div>
                <div className="bg-zinc-900/80 rounded-xl p-2.5 border border-cyan-900/30">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 block">Membri</span>
                  <span className="text-xs font-black text-cyan-300 flex items-center justify-center gap-1 mt-0.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    {clan.members.length}
                  </span>
                </div>
                <div className="bg-zinc-900/80 rounded-xl p-2.5 border border-cyan-900/30">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 block">Livello Clan</span>
                  <span className="text-xs font-black text-purple-300 mt-0.5 block">
                    Lv. {clan.level}
                  </span>
                </div>
              </div>

              {/* VALUTAZIONI CLAN & BADGE */}
              <div className="pt-1">
                <ClanBadgesCard
                  clanId={clan.id}
                  clanName={clan.name}
                  clanTag={clan.tag}
                  onOpenSubscriptionModal={() => setShowSubscriptionModal(true)}
                />
              </div>

              {/* CLAN MEMBERS LIST (Requirement 5) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    Membri del Clan ({clan.members.length})
                  </span>
                  <span className="text-[10px] text-zinc-500">Clicca un membro per vederne il profilo</span>
                </div>

                <div className="space-y-1.5">
                  {clan.members.length > 0 ? (
                    clan.members.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => handleMemberClick(member.userId)}
                        className="p-2.5 rounded-xl bg-zinc-900/70 border border-purple-900/30 hover:border-cyan-500/50 transition-all flex items-center justify-between gap-2.5 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-500/40 overflow-hidden flex items-center justify-center text-[11px] font-bold text-purple-300 shrink-0">
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt={member.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{member.name.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white truncate max-w-[140px] group-hover:text-cyan-300 transition-colors">
                                {member.name}
                              </span>
                              {member.isLeader && (
                                <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
                                  <Crown className="w-2.5 h-2.5 text-amber-400" />
                                  LEADER
                                </span>
                              )}
                            </div>
                            {member.activisionId && (
                              <span className="text-[10px] text-cyan-400/90 font-mono block truncate max-w-[160px]">
                                COD: {member.activisionId}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-semibold text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-800/80">
                            {member.role}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-xl bg-zinc-900/50 text-center text-xs text-zinc-400 italic">
                      Nessun membro visibile in questo clan.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Subscription Modal for Pro Plus Upgrade */}
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          defaultTab="player"
        />
      </div>
    </div>
  );
};
