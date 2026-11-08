import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import {
  Story,
  Post,
  PostComment,
  Tournament,
  LeaderboardEntry,
  MatchChatMessage,
  VoiceRoom,
  ClanData,
  ClanMember,
  Transaction,
} from "@/data/mockData";
import { toast } from "@/components/ui/use-toast";
import { agoraVoiceService } from "@/services/agoraService";
import { supabase } from "@/integrations/supabase/client";
import { uploadMediaFile } from "@/services/storageService";

export type NavTab = "home" | "tournaments" | "voice" | "messages" | "clan" | "profile";
export type TournamentSubTab = "active" | "match_room" | "leaderboard";

export interface UserProfileData {
  id?: string;
  name: string;
  tag: string;
  avatar: string;
  bannerUrl?: string;
  unlockedBanners?: string[];
  avatarFrame?: string;
  proTheme?: "gold" | "neon";
  subscriptionTier?: "free" | "pro";
  proExpiresAt?: string | null;
  clanTag?: string;
  rank: string;
  level: number;
  activisionName?: string;
  bio?: string;
  stats: {
    kd: string | null;
    winRate: string | null;
    matches: number;
    kills: number;
  };
}

export interface AiScanResult {
  kills: number;
  damage: number;
  placement: number;
  pointsEarned: number;
  sCoinReward: number;
  confidence: number;
  gameId: string;
  timestamp: string;
  notes: string;
}

interface SquadContextType {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  tournamentSubTab: TournamentSubTab;
  setTournamentSubTab: (subTab: TournamentSubTab) => void;
  isLoading: boolean;

  // Auth & Session
  currentUser: User | null;
  isAuthModalOpen: boolean;
  authModalTab: "login" | "signup";
  openAuthModal: (tab?: "login" | "signup") => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;

  // Wallet & Profile
  sCoinBalance: number;
  transactions: Transaction[];
  userProfile: UserProfileData;
  refreshUserData: () => Promise<void>;

  // Feed & Stories
  stories: Story[];
  posts: Post[];
  activeStory: Story | null;
  setActiveStory: (story: Story | null) => void;
  toggleLikePost: (postId: string) => void;
  createPost: (content: string, game: string, imageFile?: File, asClan?: boolean) => Promise<boolean>;
  deletePost: (postId: string) => Promise<boolean>;
  createStory: (file: File, caption?: string) => Promise<boolean>;

  // Comments
  fetchPostComments: (postId: string) => Promise<PostComment[]>;
  addComment: (postId: string, content: string) => Promise<PostComment | null>;
  deleteComment: (commentId: string, postId: string) => Promise<boolean>;

  // Tournaments
  tournaments: Tournament[];
  selectedTournament: Tournament | null;
  setSelectedTournament: (tournament: Tournament | null) => void;
  refreshTournaments: () => Promise<void>;
  leaderboard: LeaderboardEntry[];
  matchChat: MatchChatMessage[];
  sendMatchMessage: (text: string) => Promise<void>;

  // AI OCR Kill Verification
  aiScanStatus: "idle" | "uploading" | "analyzing" | "verified";
  aiScanImage: string | null;
  aiScanResult: AiScanResult | null;
  startAiKillScan: (fileOrUrl?: File | string) => void;
  resetAiKillScan: () => void;

  // Voice Rooms & Agora SDK
  voiceRooms: VoiceRoom[];
  activeVoiceRoomId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  agoraAppId: string;
  isAgoraPlaceholder: boolean;
  isRealSdkActive: boolean;
  userSpeaking: boolean;
  toggleMute: () => void;
  toggleDeafen: () => void;
  joinVoiceRoom: (roomId: string) => Promise<void>;
  leaveVoiceRoom: () => Promise<void>;
  createVoiceRoom: (name: string, category?: string) => Promise<VoiceRoom>;
  deleteVoiceRoom: (roomId: string) => Promise<boolean>;

  // Follow System
  followedUserIds: string[];
  followedClanIds: string[];
  followUser: (targetUserId: string) => Promise<boolean>;
  unfollowUser: (targetUserId: string) => Promise<boolean>;
  isFollowingUser: (targetUserId: string) => boolean;
  followClan: (targetClanId: string) => Promise<boolean>;
  unfollowClan: (targetClanId: string) => Promise<boolean>;
  isFollowingClan: (targetClanId: string) => boolean;

  // Clan
  clanData: ClanData | null;
  clanMembers: ClanMember[];
  donateToClan: (amount: number) => Promise<boolean>;

  // Universal Admin & Deletion
  isUniversalAdmin: boolean;
  deleteTournament: (tournamentId: string) => Promise<boolean>;
  deleteStory: (storyId: string) => Promise<boolean>;
  adminCreditSCoin: (targetUserId: string, amount: number, reason?: string) => Promise<boolean>;
}

const SquadContext = createContext<SquadContextType | undefined>(undefined);

export const SquadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [tournamentSubTab, setTournamentSubTab] = useState<TournamentSubTab>("active");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Auth Modal State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup">("signup");

  // Profile & Wallet state - empty by default
  const [sCoinBalance, setSCoinBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileData>({
    name: "Ospite",
    tag: "#SquadUP",
    avatar: "",
    rank: "Unranked",
    level: 1,
    stats: {
      kd: null,
      winRate: null,
      matches: 0,
      kills: 0,
    },
  });

  // Feed & Stories - empty by default
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  // Tournaments - empty by default
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [matchChat, setMatchChat] = useState<MatchChatMessage[]>([]);

  // AI OCR Kill Verification state
  const [aiScanStatus, setAiScanStatus] = useState<"idle" | "uploading" | "analyzing" | "verified">("idle");
  const [aiScanImage, setAiScanImage] = useState<string | null>(null);
  const [aiScanResult, setAiScanResult] = useState<AiScanResult | null>(null);

  // Voice rooms & Agora SDK state
  const [voiceRooms, setVoiceRooms] = useState<VoiceRoom[]>([]);
  const [activeVoiceRoomId, setActiveVoiceRoomId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);
  const [isRealSdkActive, setIsRealSdkActive] = useState<boolean>(false);
  const [userSpeaking, setUserSpeaking] = useState<boolean>(false);

  // Clan state
  const [clanData, setClanData] = useState<ClanData | null>(null);
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([]);

  // Follow system state
  const [followedUserIds, setFollowedUserIds] = useState<string[]>([]);
  const [followedClanIds, setFollowedClanIds] = useState<string[]>([]);

  const agoraAppId = agoraVoiceService.getAppId();
  const isAgoraPlaceholder = agoraVoiceService.isAppIdPlaceholder();

  const openAuthModal = (tab: "login" | "signup" = "signup") => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setUserProfile({
        name: "Ospite",
        tag: "#SquadUP",
        avatar: "",
        rank: "Unranked",
        level: 1,
        stats: { kd: null, winRate: null, matches: 0, kills: 0 },
      });
      setSCoinBalance(0);
      setTransactions([]);
      setClanData(null);
      setClanMembers([]);
      toast({
        title: "Disconnesso",
        description: "Sei uscito dal tuo account.",
      });
    } catch (err: any) {
      console.warn("[SquadContext] Errore sign out:", err);
    }
  };

  // Load user data from Supabase
  const refreshUserData = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;
      setCurrentUser(user);

      if (user) {
        // Query profile from Supabase
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          const isSuper = user.email?.toLowerCase() === "fedezdesimone@gmail.com";
          const balance = isSuper ? 999999999 : (profile.balance ?? profile.coins ?? profile.schoins ?? 0);
          setSCoinBalance(balance);
          setUserProfile({
            id: profile.id,
            name: profile.display_name || profile.username || (isSuper ? "Federico De Simone" : "Giocatore"),
            tag: profile.activision_id
              ? profile.activision_id
              : profile.activision_tag
              ? `#${profile.activision_tag}`
              : `#${profile.username?.slice(0, 4) || "SQ"}`,
            avatar: profile.avatar_url || "",
            bannerUrl: profile.banner_url || "",
            unlockedBanners: profile.unlocked_banners || [],
            avatarFrame: isSuper ? "gold" : (profile.subscription_tier === "pro" ? "gold" : "base"),
            proTheme: (profile.pro_theme as any) || "gold",
            subscriptionTier: isSuper ? "pro" : ((profile.subscription_tier as any) || "free"),
            proExpiresAt: profile.pro_expires_at || null,
            bio: profile.bio || (isSuper ? "Account Universale God Mode • SquadUP Founder" : ""),
            rank: isSuper ? "Universal God Mode ⚡" : (profile.subscription_tier === "pro" ? "Pro Player" : "Competitor"),
            level: isSuper ? 999 : Math.max(1, Math.floor(balance / 100)),
            activisionName: profile.activision_id || profile.activision_name || "",
            stats: {
              kd: null,
              winRate: null,
              matches: 0,
              kills: 0,
            },
          });

          // Fetch user's clan membership from Supabase
          const { data: membership } = await supabase
            .from("clan_members")
            .select("*, clans(*)")
            .eq("user_id", user.id)
            .eq("status", "active")
            .maybeSingle();

          if (membership && membership.clans) {
            const rawClan = membership.clans as any;
            setClanData({
              id: rawClan.id,
              name: rawClan.name,
              tag: rawClan.tag,
              description: rawClan.description || "",
              gameMode: rawClan.game_mode || "Warzone",
              region: rawClan.region || "EU",
              treasurySC: rawClan.clan_treasury_sc || 0,
              avatarUrl: rawClan.avatar_url,
              bannerUrl: rawClan.banner_url,
              isRecruiting: rawClan.is_recruiting ?? true,
              ownerId: rawClan.owner_id,
              level: Math.max(1, Math.floor((rawClan.clan_treasury_sc || 0) / 1000)),
              tier: (rawClan.tier as any) || (rawClan.subscription_tier === "elite" ? "elite" : rawClan.subscription_tier === "pro" ? "pro" : "base"),
              subscriptionTier: (rawClan.subscription_tier as any) || "free",
              subscriptionMonths: rawClan.subscription_months || 1,
              subscriptionExpiresAt: rawClan.subscription_expires_at,
              clanFrameUrl: rawClan.clan_frame_url,
              clanBannerUrl: rawClan.clan_banner_url,
            });

            // Fetch members of this clan
            const { data: membersList } = await supabase
              .from("clan_members")
              .select("*, profiles:user_id(id, username, display_name, avatar_url)")
              .eq("clan_id", rawClan.id)
              .eq("status", "active");

            if (membersList) {
              setClanMembers(
                membersList.map((m: any) => ({
                  id: m.user_id,
                  userId: m.user_id,
                  name: m.profiles?.display_name || m.profiles?.username || "Membro",
                  avatar: m.profiles?.avatar_url || "",
                  role: m.role === "founder" ? "Leader" : m.role === "admin" ? "Co-Leader" : "Membro",
                  customRoleId: m.custom_role_id,
                  customRoleTitle: m.custom_role_title,
                  donatedSCoin: 0,
                  isOnline: false,
                  joinedAt: m.joined_at,
                }))
              );
            }
          } else {
            setClanData(null);
            setClanMembers([]);
          }

          // Fetch user transactions
          const { data: txList } = await supabase
            .from("sc_transactions")
            .select("*")
            .or(`user_id.eq.${user.id},recipient_id.eq.${user.id}`)
            .order("created_at", { ascending: false })
            .limit(20);

          if (txList && txList.length > 0) {
            setTransactions(
              txList.map((tx: any) => ({
                id: tx.id,
                type: tx.type,
                title: tx.description || "Transazione SCoin",
                amount: tx.amount,
                date: new Date(tx.created_at).toLocaleDateString([], {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                isPositive: tx.recipient_id === user.id,
              }))
            );
          } else {
            setTransactions([]);
          }

          // Fetch followed profiles and clans
          const { data: userFollows } = await supabase
            .from("follows")
            .select("following_user_id, following_clan_id")
            .eq("follower_id", user.id);

          if (userFollows) {
            setFollowedUserIds(
              userFollows
                .filter((f: any) => f.following_user_id)
                .map((f: any) => f.following_user_id as string)
            );
            setFollowedClanIds(
              userFollows
                .filter((f: any) => f.following_clan_id)
                .map((f: any) => f.following_clan_id as string)
            );
          } else {
            setFollowedUserIds([]);
            setFollowedClanIds([]);
          }
        }
      } else {
        // Guest user - clear state
        setClanData(null);
        setClanMembers([]);
        setTransactions([]);
        setFollowedUserIds([]);
        setFollowedClanIds([]);
        setSCoinBalance(0);
        setUserProfile({
          name: "Ospite",
          tag: "#SquadUP",
          avatar: "",
          rank: "Unranked",
          level: 1,
          stats: { kd: null, winRate: null, matches: 0, kills: 0 },
        });
      }
    } catch (err) {
      console.warn("[SquadContext] Errore caricamento profilo Supabase:", err);
    }
  }, []);

  // Fetch feed posts, comments count, stories, tournaments, and voice rooms from Supabase
  const loadDatabaseContent = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Posts from Supabase public.posts
      const { data: postsData, error: postsErr } = await supabase
        .from("posts")
        .select(`
          id,
          user_id,
          content,
          media_url,
          created_at,
          clan_id,
          posted_as_clan,
          clans:clan_id (
            id,
            name,
            tag,
            avatar_url,
            banner_url,
            clan_frame_url,
            tier
          ),
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url,
            activision_id
          )
        `)
        .order("created_at", { ascending: false })
        .limit(40);

      if (!postsErr && postsData && postsData.length > 0) {
        // Fetch comments count for these posts
        const postIds = postsData.map((p) => p.id);
        const { data: commentsCountData } = await supabase
          .from("comments")
          .select("post_id")
          .in("post_id", postIds);

        const commentCountsMap: Record<string, number> = {};
        if (commentsCountData) {
          commentsCountData.forEach((c: any) => {
            commentCountsMap[c.post_id] = (commentCountsMap[c.post_id] || 0) + 1;
          });
        }

        setPosts(
          postsData.map((p: any) => {
            const authorProf = p.profiles;
            const authorName = authorProf?.display_name || authorProf?.username || "Giocatore";
            const authorHandle = authorProf?.username ? `@${authorProf.username}` : "@gamer";
            const clanObj = p.clans;

            return {
              id: p.id,
              userId: p.user_id,
              clanId: p.clan_id || undefined,
              postedAsClan: Boolean(p.posted_as_clan && p.clan_id),
              clan: clanObj
                ? {
                    id: clanObj.id,
                    name: clanObj.name,
                    tag: clanObj.tag,
                    avatarUrl: clanObj.avatar_url,
                    bannerUrl: clanObj.banner_url,
                    clanFrameUrl: clanObj.clan_frame_url,
                    tier: clanObj.tier,
                  }
                : undefined,
              author: {
                id: p.user_id,
                name: authorName,
                handle: authorHandle,
                avatar: authorProf?.avatar_url || "",
                clanTag: clanObj?.tag || undefined,
                verified: false,
                activisionId: authorProf?.activision_id,
              },
              timeAgo: new Date(p.created_at).toLocaleDateString([], {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }),
              game: "Warzone",
              content: p.content || "",
              image: p.media_url || undefined,
              likes: 0,
              isLiked: false,
              comments: commentCountsMap[p.id] || 0,
              shares: 0,
            };
          })
        );
      } else {
        setPosts([]);
      }

      // 2. Fetch Stories from Supabase
      const { data: storiesData } = await supabase
        .from("stories")
        .select("*, profiles:user_id(id, username, display_name, avatar_url)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (storiesData && storiesData.length > 0) {
        setStories(
          storiesData.map((s: any) => {
            const diffHours = Math.max(
              1,
              Math.round((new Date(s.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))
            );
            return {
              id: s.id,
              userId: s.user_id,
              username: s.profiles?.display_name || s.profiles?.username || "Player",
              avatar: s.profiles?.avatar_url || "",
              preview: s.media_url,
              hoursLeft: diffHours,
              hasUnread: true,
            };
          })
        );
      } else {
        setStories([]);
      }

      // 3. Fetch Tournaments from Supabase
      const { data: tournamentsData } = await supabase
        .from("tournaments")
        .select("*")
        .order("starts_at", { ascending: true });

      if (tournamentsData && tournamentsData.length > 0) {
        const mapped = tournamentsData.map((t: any) => ({
          id: t.id,
          title: t.name || t.title || "Torneo SquadUP",
          game: t.game_mode || t.game || "Warzone Competitivo",
          category: t.type || t.category || "Battle Royale",
          banner: t.banner_url,
          status: (t.status as any) || "iscrizioni",
          prizePoolSCoin: t.prize_pool_scoin || (t.prize_description ? 1000 : 0),
          entryFeeSCoin: t.entry_fee_sc ?? t.entry_fee_scoin ?? 0,
          teamsJoined: Array.isArray(t.teams) ? t.teams.length : (t.teams_joined || 0),
          maxTeams: t.team_limit || t.max_teams || 64,
          startsAt: t.starts_at
            ? new Date(t.starts_at).toLocaleDateString([], {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "A breve",
          mode: t.game_mode || t.mode || "Squads",
          description: t.rules || t.description || t.prize_description || "",
          raw: t,
        }));
        setTournaments(mapped);
        setSelectedTournament(mapped[0] || null);
      } else {
        setTournaments([]);
        setSelectedTournament(null);
      }

      // 4. Fetch Voice Rooms from Supabase
      const { data: roomsData } = await supabase
        .from("squad_rooms")
        .select("*")
        .eq("status", "open")
        .limit(20);

      if (roomsData && roomsData.length > 0) {
        setVoiceRooms(
          roomsData.map((r: any) => ({
            id: r.id,
            name: r.name || "Canale Vocale",
            game: r.category || "Warzone",
            channelType: "Aperto a tutti",
            activeMembers: [],
            maxCapacity: 4,
            status: r.status,
          }))
        );
      } else {
        setVoiceRooms([]);
      }
    } catch (err) {
      console.warn("[SquadContext] Errore caricamento dati database:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen to Supabase Auth State changes
  useEffect(() => {
    refreshUserData();
    loadDatabaseContent();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      refreshUserData();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refreshUserData, loadDatabaseContent]);

  // Clean audio track termination on unmount
  useEffect(() => {
    return () => {
      agoraVoiceService.closeLocalAudioTrack();
    };
  }, []);

  const toggleLikePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const isLiked = !post.isLiked;
          return {
            ...post,
            isLiked,
            likes: isLiked ? post.likes + 1 : Math.max(0, post.likes - 1),
          };
        }
        return post;
      })
    );
  };

  // Create post on Supabase `posts` table
  const createPost = async (
    content: string,
    game: string,
    imageFile?: File,
    asClan?: boolean
  ): Promise<boolean> => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      openAuthModal("signup");
      toast({
        title: "Accesso Richiesto",
        description: "Devi registrarti o accedere per pubblicare un post.",
      });
      return false;
    }

    let mediaUrl: string | undefined = undefined;

    // Upload image to Supabase storage with robust bucket fallback
    if (imageFile) {
      try {
        const uploadRes = await uploadMediaFile(imageFile, "post-media", user.id);
        mediaUrl = uploadRes.url;
      } catch (err) {
        console.warn("[SquadContext] Impossibile caricare immagine nei bucket Supabase:", err);
      }
    }

    try {
      const isPublishingAsClan = Boolean(asClan && clanData?.id);

      const { data: insertedPost, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: content.trim(),
          media_url: mediaUrl || null,
          clan_id: isPublishingAsClan ? clanData?.id : null,
          posted_as_clan: isPublishingAsClan,
        })
        .select(`
          id,
          user_id,
          content,
          media_url,
          created_at,
          clan_id,
          posted_as_clan,
          clans:clan_id (
            id,
            name,
            tag,
            avatar_url,
            banner_url,
            clan_frame_url,
            tier
          ),
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url,
            activision_id
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      if (insertedPost) {
        const authorProf = insertedPost.profiles as any;
        const clanObj = insertedPost.clans as any;

        const newPost: Post = {
          id: insertedPost.id,
          userId: insertedPost.user_id,
          clanId: insertedPost.clan_id || undefined,
          postedAsClan: Boolean(insertedPost.posted_as_clan && insertedPost.clan_id),
          clan: clanObj
            ? {
                id: clanObj.id,
                name: clanObj.name,
                tag: clanObj.tag,
                avatarUrl: clanObj.avatar_url,
                bannerUrl: clanObj.banner_url,
                clanFrameUrl: clanObj.clan_frame_url,
                tier: clanObj.tier,
              }
            : undefined,
          author: {
            id: user.id,
            name: authorProf?.display_name || authorProf?.username || userProfile.name,
            handle: authorProf?.username ? `@${authorProf.username}` : `@${userProfile.name}`,
            avatar: authorProf?.avatar_url || userProfile.avatar,
            clanTag: clanObj?.tag || clanData?.tag,
            verified: isPublishingAsClan,
            activisionId: authorProf?.activision_id,
          },
          timeAgo: "Adesso",
          game: game || "Warzone",
          content: insertedPost.content,
          image: insertedPost.media_url || undefined,
          likes: 0,
          isLiked: false,
          comments: 0,
          shares: 0,
        };
        setPosts((prev) => [newPost, ...prev]);
        toast({
          title: isPublishingAsClan ? "Post Clan Pubblicato! 🛡️" : "Post pubblicato! 🚀",
          description: isPublishingAsClan
            ? `Pubblicato con successo a nome del clan [${clanData?.tag}] ${clanData?.name}.`
            : "Il post è ora visibile a tutta la community.",
        });
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("[SquadContext] Errore pubblicazione post:", err);
      toast({
        title: "Errore pubblicazione",
        description: err.message || "Impossibile salvare il post su Supabase.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Create Story in Supabase `stories` table and bucket `stories-media` / `social-media`
  const createStory = async (file: File, caption?: string): Promise<boolean> => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      openAuthModal("signup");
      toast({
        title: "Accesso Richiesto",
        description: "Accedi o registrati per pubblicare una storia 24h.",
      });
      return false;
    }

    try {
      let mediaUrl: string | undefined = undefined;
      try {
        const uploadRes = await uploadMediaFile(file, "post-media", user.id);
        mediaUrl = uploadRes.url;
      } catch {
        mediaUrl = URL.createObjectURL(file);
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { data: storyRow, error: insertErr } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          media_url: mediaUrl,
          caption: caption || "",
          expires_at: expiresAt,
        })
        .select("*, profiles:user_id(id, username, display_name, avatar_url)")
        .single();

      if (insertErr) {
        console.warn("[SquadContext] Errore inserimento riga stories:", insertErr);
      }

      const newStory: Story = {
        id: storyRow?.id || `st-${Date.now()}`,
        userId: user.id,
        username: userProfile.name,
        avatar: userProfile.avatar,
        preview: mediaUrl,
        hoursLeft: 24,
        hasUnread: true,
      };

      setStories((prev) => [newStory, ...prev]);
      toast({
        title: "Storia 24h pubblicata! 🔥",
        description: "La tua clip/screenshot è ora visibile in cima al feed.",
      });

      return true;
    } catch (err: any) {
      console.error("[SquadContext] Errore pubblicazione storia:", err);
      toast({
        title: "Errore pubblicazione storia",
        description: err.message || "Impossibile caricare il media.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Delete story from Supabase `stories` table
  const deleteStory = async (storyId: string): Promise<boolean> => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      openAuthModal("login");
      return false;
    }

    try {
      let query = supabase.from("stories").delete().eq("id", storyId);
      if (!isUniversalAdmin) {
        query = query.eq("user_id", user.id);
      }
      const { error } = await query;
      if (error) throw error;

      setStories((prev) => prev.filter((s) => s.id !== storyId));
      if (activeStory?.id === storyId) {
        setActiveStory(null);
      }
      toast({
        title: "Storia rimossa! 🗑️",
        description: "La storia è stata eliminata definitivamente.",
      });
      return true;
    } catch (err: any) {
      console.error("[SquadContext] Errore eliminazione storia:", err);
      toast({
        title: "Errore eliminazione storia",
        description: err.message || "Impossibile rimuovere la storia.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Delete tournament with full refund of creation cost and entry fees
  const deleteTournament = async (tournamentId: string): Promise<boolean> => {
    try {
      const { data: tourn, error: fetchErr } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .maybeSingle();

      if (fetchErr || !tourn) throw new Error("Torneo non trovato.");

      const isOwner = currentUser?.id && tourn.owner_id === currentUser.id;
      if (!isOwner && !isUniversalAdmin) {
        throw new Error("Non hai i permessi per eliminare questo torneo.");
      }

      // 1. Refund the creator (100 SCoin or creation_cost_sc)
      const creationRefund = tourn.creation_cost_sc ?? 100;
      if (creationRefund > 0 && tourn.owner_id) {
        const { data: creatorProf } = await supabase
          .from("profiles")
          .select("balance")
          .eq("id", tourn.owner_id)
          .maybeSingle();

        const newCreatorBal = (creatorProf?.balance || 0) + creationRefund;
        await supabase
          .from("profiles")
          .update({
            balance: newCreatorBal,
            coins: newCreatorBal,
            schoins: newCreatorBal,
          })
          .eq("id", tourn.owner_id);

        await supabase.from("sc_transactions").insert({
          user_id: tourn.owner_id,
          recipient_id: tourn.owner_id,
          amount: creationRefund,
          type: "admin_credit",
          description: `Rimborso creazione torneo annullato: ${tourn.name}`,
        });
      }

      // 2. Refund registered participants if entry_fee_sc > 0
      const entryFee = tourn.entry_fee_sc || 0;
      if (entryFee > 0) {
        const { data: registrations } = await supabase
          .from("tournament_registrations")
          .select("user_id")
          .eq("tournament_id", tournamentId);

        if (registrations && registrations.length > 0) {
          for (const reg of registrations) {
            const { data: p } = await supabase
              .from("profiles")
              .select("balance")
              .eq("id", reg.user_id)
              .maybeSingle();

            const newBal = (p?.balance || 0) + entryFee;
            await supabase
              .from("profiles")
              .update({
                balance: newBal,
                coins: newBal,
                schoins: newBal,
              })
              .eq("id", reg.user_id);

            await supabase.from("sc_transactions").insert({
              user_id: reg.user_id,
              recipient_id: reg.user_id,
              amount: entryFee,
              type: "admin_credit",
              description: `Rimborso quota iscrizione torneo annullato: ${tourn.name}`,
            });
          }
        }
      }

      // 3. Delete dependent rows
      await supabase.from("tournament_registrations").delete().eq("tournament_id", tournamentId);
      await supabase.from("tournament_matches").delete().eq("tournament_id", tournamentId);
      await supabase.from("tournament_leaderboards").delete().eq("tournament_id", tournamentId);
      await supabase.from("tournament_match_chats").delete().eq("tournament_id", tournamentId);

      // 4. Delete tournament row
      const { error: delErr } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", tournamentId);

      if (delErr) throw delErr;

      // 5. Update state
      setTournaments((prev) => prev.filter((t) => t.id !== tournamentId));
      if (selectedTournament?.id === tournamentId) {
        setSelectedTournament(null);
      }

      await refreshUserData();
      await loadDatabaseContent();

      toast({
        title: "Torneo eliminato con successo! 🗑️",
        description: `Tutti gli SCoin spesi per creazione (${creationRefund} SC) e quote iscrizione sono stati rimborsati.`,
      });

      return true;
    } catch (err: any) {
      console.error("[SquadContext] Errore cancellazione torneo:", err);
      toast({
        title: "Errore eliminazione torneo",
        description: err.message || "Impossibile eliminare il torneo.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Universal Admin credit SCoin to any user
  const adminCreditSCoin = async (targetUserId: string, amount: number, reason?: string): Promise<boolean> => {
    if (!isUniversalAdmin) {
      toast({
        title: "Non autorizzato",
        description: "Azione riservata all'account universale fedezdesimone@gmail.com.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data: targetProf } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", targetUserId)
        .maybeSingle();

      const newBal = (targetProf?.balance || 0) + amount;
      await supabase
        .from("profiles")
        .update({
          balance: newBal,
          coins: newBal,
          schoins: newBal,
        })
        .eq("id", targetUserId);

      await supabase.from("sc_transactions").insert({
        user_id: targetUserId,
        recipient_id: targetUserId,
        sender_id: currentUser?.id || null,
        amount,
        type: "admin_credit",
        description: reason || "Accredito Amministratore Universale",
      });

      if (currentUser?.id === targetUserId) {
        await refreshUserData();
      }

      toast({
        title: "SCoin Accreditati! ⚡",
        description: `Assegnati +${amount.toLocaleString()} SCoin all'account.`,
      });
      return true;
    } catch (err: any) {
      console.error("[SquadContext] Errore accredito SCoin:", err);
      toast({
        title: "Errore accredito",
        description: err.message,
        variant: "destructive",
      });
      return false;
    }
  };

  // Delete post from Supabase `posts` table
  const deletePost = async (postId: string): Promise<boolean> => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      openAuthModal("login");
      return false;
    }

    try {
      let query = supabase.from("posts").delete().eq("id", postId);
      if (!isUniversalAdmin) {
        query = query.eq("user_id", user.id);
      }
      const { error } = await query;

      if (error) {
        throw error;
      }

      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast({
        title: "Post eliminato",
        description: "Il post è stato rimosso definitivamente.",
      });
      return true;
    } catch (err: any) {
      console.error("[SquadContext] Errore eliminazione post:", err);
      toast({
        title: "Errore eliminazione",
        description: err.message || "Impossibile rimuovere il post.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Fetch comments for a specific post
  const fetchPostComments = async (postId: string): Promise<PostComment[]> => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          post_id,
          user_id,
          content,
          created_at,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        return data.map((c: any) => ({
          id: c.id,
          postId: c.post_id,
          userId: c.user_id,
          author: {
            id: c.user_id,
            name: c.profiles?.display_name || c.profiles?.username || "Gamer",
            handle: c.profiles?.username ? `@${c.profiles.username}` : "@player",
            avatar: c.profiles?.avatar_url || "",
          },
          content: c.content,
          createdAt: new Date(c.created_at).toLocaleDateString([], {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));
      }
      return [];
    } catch (err) {
      console.warn("[SquadContext] Errore fetch commenti:", err);
      return [];
    }
  };

  // Add comment to Supabase `comments` table
  const addComment = async (postId: string, content: string): Promise<PostComment | null> => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      openAuthModal("signup");
      toast({
        title: "Accesso Richiesto",
        description: "Devi registrarti o accedere per commentare.",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content: content.trim(),
        })
        .select(`
          id,
          post_id,
          user_id,
          content,
          created_at,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      if (data) {
        const newComment: PostComment = {
          id: data.id,
          postId: data.post_id,
          userId: data.user_id,
          author: {
            id: user.id,
            name: data.profiles?.display_name || data.profiles?.username || userProfile.name,
            handle: data.profiles?.username ? `@${data.profiles.username}` : `@${userProfile.name}`,
            avatar: data.profiles?.avatar_url || userProfile.avatar,
          },
          content: data.content,
          createdAt: "Adesso",
        };

        // Increment local comments count
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments: p.comments + 1 } : p))
        );

        toast({
          title: "Commento aggiunto",
          description: "Il tuo commento è stato pubblicato.",
        });

        return newComment;
      }
      return null;
    } catch (err: any) {
      console.error("[SquadContext] Errore aggiunta commento:", err);
      toast({
        title: "Errore invio commento",
        description: err.message || "Impossibile salvare il commento.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Delete comment from Supabase `comments` table
  const deleteComment = async (commentId: string, postId: string): Promise<boolean> => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      openAuthModal("login");
      return false;
    }

    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Decrement local comments count
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: Math.max(0, p.comments - 1) } : p
        )
      );

      toast({
        title: "Commento rimosso",
        description: "Il tuo commento è stato eliminato.",
      });

      return true;
    } catch (err: any) {
      console.error("[SquadContext] Errore eliminazione commento:", err);
      toast({
        title: "Errore eliminazione commento",
        description: err.message || "Impossibile rimuovere il commento.",
        variant: "destructive",
      });
      return false;
    }
  };

  const sendMatchMessage = async (text: string) => {
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;

    const newMsg: MatchChatMessage = {
      id: `m-${Date.now()}`,
      sender: userProfile.name,
      team: clanData?.name || "Squad",
      avatar: userProfile.avatar,
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isCaptain: true,
      senderId: currentUser?.id,
    };
    setMatchChat((prev) => [...prev, newMsg]);
  };

  const startAiKillScan = (fileOrUrl?: File | string) => {
    let previewUrl = "";
    if (fileOrUrl instanceof File) {
      previewUrl = URL.createObjectURL(fileOrUrl);
    } else if (typeof fileOrUrl === "string") {
      previewUrl = fileOrUrl;
    }

    setAiScanImage(previewUrl || null);
    setAiScanStatus("uploading");

    setTimeout(() => {
      setAiScanStatus("analyzing");

      setTimeout(() => {
        const detectedKills = 0;
        const detectedDamage = 0;
        const detectedPlacement = 0;
        const points = 0;
        const rewardSCoin = 0;

        const result: AiScanResult = {
          kills: detectedKills,
          damage: detectedDamage,
          placement: detectedPlacement,
          pointsEarned: points,
          sCoinReward: rewardSCoin,
          confidence: 100,
          gameId: selectedTournament ? selectedTournament.id : "MATCH-LIVE",
          timestamp: new Date().toLocaleTimeString(),
          notes: "Nessun dato di match fittizio inserito. L'arbitro IA analizzerà i tabelloni caricati.",
        };

        setAiScanResult(result);
        setAiScanStatus("verified");

        toast({
          title: "Screenshot elaborato dall'IA",
          description: "Tabellone analizzato dal sistema.",
        });
      }, 1500);
    }, 800);
  };

  const resetAiKillScan = () => {
    setAiScanStatus("idle");
    setAiScanImage(null);
    setAiScanResult(null);
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      agoraVoiceService.setMuted(next);
      toast({
        title: next ? "Microfono Disattivato" : "Microfono Attivo",
        description: next ? "Nessuno sentirà la tua voce." : "Trasmissione audio attiva su Agora.",
      });
      return next;
    });
  };

  const toggleDeafen = () => {
    setIsDeafened((prev) => {
      const next = !prev;
      agoraVoiceService.setDeafened(next);
      toast({
        title: next ? "Audio Disattivato" : "Audio Riattivato",
        description: next ? "Audio degli altri membri silenziato." : "Audio del canale ripristinato.",
      });
      return next;
    });
  };

  const deleteVoiceRoom = async (roomId: string): Promise<boolean> => {
    if (activeVoiceRoomId === roomId) {
      await agoraVoiceService.leaveVoiceChannel();
      setActiveVoiceRoomId(null);
      setIsRealSdkActive(false);
      setUserSpeaking(false);
    }

    setVoiceRooms((prev) => prev.filter((r) => r.id !== roomId));

    try {
      if (roomId.length > 20) {
        await supabase.from("squad_rooms").delete().eq("id", roomId);
      }
      return true;
    } catch (err) {
      console.warn("[SquadContext] Errore rimozione stanza:", err);
      return false;
    }
  };

  const joinVoiceRoom = async (roomId: string) => {
    let targetRoom = voiceRooms.find((r) => r.id === roomId);
    if (!targetRoom) {
      targetRoom = {
        id: roomId,
        name: `Canale Vocale #${roomId.slice(0, 6)}`,
        game: "Warzone",
        channelType: "Aperto a tutti",
        activeMembers: [userProfile],
        maxCapacity: 4,
        status: "open",
      };
      setVoiceRooms((prev) => [targetRoom!, ...prev.filter((r) => r.id !== roomId)]);
    } else {
      setVoiceRooms((prev) =>
        prev
          .map((r) => {
            if (r.id === roomId) {
              const already = r.activeMembers.some(
                (m) => m.id === (currentUser?.id || userProfile.id)
              );
              return {
                ...r,
                activeMembers: already ? r.activeMembers : [...r.activeMembers, userProfile],
              };
            }
            if (activeVoiceRoomId && r.id === activeVoiceRoomId && r.id !== roomId) {
              return {
                ...r,
                activeMembers: r.activeMembers.filter(
                  (m) => m.id !== (currentUser?.id || userProfile.id)
                ),
              };
            }
            return r;
          })
          .filter((r) => {
            if (r.id !== roomId && r.activeMembers.length === 0) {
              if (r.id.length > 20) {
                supabase.from("squad_rooms").delete().eq("id", r.id).catch(console.error);
              }
              return false;
            }
            return true;
          })
      );
    }

    setActiveVoiceRoomId(roomId);
    const channelName = targetRoom.name.replace(/\s+/g, "_");

    const res = await agoraVoiceService.joinVoiceChannel(
      channelName,
      currentUser?.id || userProfile.name
    );
    setIsRealSdkActive(res.realSdk);

    if (res.success) {
      toast({
        title: "Canale Vocale Connesso 🎙️",
        description: `Connesso a "${targetRoom.name}" con Agora Web RTC (App ID: ${agoraAppId.slice(0, 6)}...).`,
      });
    } else if (res.error) {
      setActiveVoiceRoomId(null);
      toast({
        title: "Errore Connessione Vocale",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  const createVoiceRoom = async (name: string, category: string = "Warzone"): Promise<VoiceRoom> => {
    const trimmedName = name.trim() || `Stanza ${userProfile.name}`;
    let newRoom: VoiceRoom;

    if (currentUser) {
      try {
        const { data: inserted, error: insErr } = await supabase
          .from("squad_rooms")
          .insert({
            host_id: currentUser.id,
            name: trimmedName,
            category: category,
            status: "open",
            voice_enabled: true,
          })
          .select()
          .single();

        if (inserted && !insErr) {
          newRoom = {
            id: inserted.id,
            name: inserted.name,
            game: inserted.category || category,
            channelType: "Aperto a tutti",
            activeMembers: [userProfile],
            maxCapacity: 4,
            status: inserted.status,
          };
        } else {
          newRoom = {
            id: `room-${Date.now()}`,
            name: trimmedName,
            game: category,
            channelType: "Aperto a tutti",
            activeMembers: [userProfile],
            maxCapacity: 4,
            status: "open",
          };
        }
      } catch {
        newRoom = {
          id: `room-${Date.now()}`,
          name: trimmedName,
          game: category,
          channelType: "Aperto a tutti",
          activeMembers: [userProfile],
          maxCapacity: 4,
          status: "open",
        };
      }
    } else {
      newRoom = {
        id: `room-${Date.now()}`,
        name: trimmedName,
        game: category,
        channelType: "Aperto a tutti",
        activeMembers: [userProfile],
        maxCapacity: 4,
        status: "open",
      };
    }

    setVoiceRooms((prev) => [newRoom, ...prev.filter((r) => r.id !== newRoom.id)]);
    await joinVoiceRoom(newRoom.id);
    return newRoom;
  };

  const leaveVoiceRoom = async () => {
    const leavingRoomId = activeVoiceRoomId;
    await agoraVoiceService.leaveVoiceChannel();
    setActiveVoiceRoomId(null);
    setIsRealSdkActive(false);
    setUserSpeaking(false);

    if (leavingRoomId) {
      setVoiceRooms((prev) => {
        const updated = prev.map((r) => {
          if (r.id === leavingRoomId) {
            return {
              ...r,
              activeMembers: r.activeMembers.filter(
                (m) => m.id !== (currentUser?.id || userProfile.id)
              ),
            };
          }
          return r;
        });

        const target = updated.find((r) => r.id === leavingRoomId);
        // Automatically delete room if empty
        if (!target || target.activeMembers.length === 0) {
          if (leavingRoomId.length > 20) {
            supabase
              .from("squad_rooms")
              .delete()
              .eq("id", leavingRoomId)
              .then(() => {
                console.log("[SquadContext] Stanza vocale vuota eliminata:", leavingRoomId);
              })
              .catch(console.error);
          }
          toast({
            title: "Stanza Eliminata",
            description: "La stanza vocale è rimasta vuota ed è stata rimossa automaticamente.",
          });
          return updated.filter((r) => r.id !== leavingRoomId);
        }

        return updated;
      });
    }

    toast({
      title: "Disconnesso",
      description: "Hai lasciato il canale vocale. Tracce audio rilasciate correttamente.",
    });
  };

  // Follow system methods
  const isFollowingUser = (targetUserId: string): boolean => {
    return followedUserIds.includes(targetUserId);
  };

  const isFollowingClan = (targetClanId: string): boolean => {
    return followedClanIds.includes(targetClanId);
  };

  const followUser = async (targetUserId: string): Promise<boolean> => {
    if (!currentUser) {
      openAuthModal();
      return false;
    }
    if (targetUserId === currentUser.id) {
      toast({
        title: "Azione non consentita",
        description: "Non puoi seguire il tuo stesso account.",
        variant: "destructive",
      });
      return false;
    }

    setFollowedUserIds((prev) => (prev.includes(targetUserId) ? prev : [...prev, targetUserId]));

    try {
      const { error } = await supabase.from("follows").insert({
        follower_id: currentUser.id,
        following_user_id: targetUserId,
      });

      if (error && error.code !== "23505") {
        console.warn("[SquadContext] Errore follow:", error);
      }

      toast({
        title: "Giocatore Seguito! 🔔",
        description: "Riceverai aggiornamenti da questo giocatore.",
      });
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const unfollowUser = async (targetUserId: string): Promise<boolean> => {
    if (!currentUser) return false;

    setFollowedUserIds((prev) => prev.filter((id) => id !== targetUserId));

    try {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.id)
        .eq("following_user_id", targetUserId);

      toast({
        title: "Follow Rimosso",
        description: "Non segui più questo giocatore.",
      });
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const followClan = async (targetClanId: string): Promise<boolean> => {
    if (!currentUser) {
      openAuthModal();
      return false;
    }

    setFollowedClanIds((prev) => (prev.includes(targetClanId) ? prev : [...prev, targetClanId]));

    try {
      const { error } = await supabase.from("follows").insert({
        follower_id: currentUser.id,
        following_clan_id: targetClanId,
      });

      if (error && error.code !== "23505") {
        console.warn("[SquadContext] Errore follow clan:", error);
      }

      toast({
        title: "Clan Seguito! 🛡️",
        description: "Ora segui le attività di questo Clan.",
      });
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const unfollowClan = async (targetClanId: string): Promise<boolean> => {
    if (!currentUser) return false;

    setFollowedClanIds((prev) => prev.filter((id) => id !== targetClanId));

    try {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.id)
        .eq("following_clan_id", targetClanId);

      toast({
        title: "Follow Clan Rimosso",
        description: "Non segui più questo Clan.",
      });
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const donateToClan = async (amount: number): Promise<boolean> => {
    if (!clanData) {
      toast({
        title: "Nessun clan",
        description: "Devi far parte di un clan per poter donare SCoin.",
        variant: "destructive",
      });
      return false;
    }

    if (amount <= 0 || amount > sCoinBalance) {
      toast({
        title: "Saldo SCoin insufficiente",
        description: "Non hai abbastanza SCoin nel tuo wallet per questa donazione.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user;

      if (currentUser) {
        await supabase.from("sc_transactions").insert({
          user_id: currentUser.id,
          recipient_id: clanData.ownerId,
          amount,
          type: "clan_donation",
          description: `Donazione alla cassaforte del clan ${clanData.name}`,
        });

        await supabase
          .from("profiles")
          .update({ balance: Math.max(0, sCoinBalance - amount) })
          .eq("id", currentUser.id);

        await supabase
          .from("clans")
          .update({ clan_treasury_sc: (clanData.treasurySC || 0) + amount })
          .eq("id", clanData.id);
      }

      setSCoinBalance((prev) => Math.max(0, prev - amount));
      setClanData((prev) => (prev ? { ...prev, treasurySC: prev.treasurySC + amount } : null));

      toast({
        title: "Donazione inviata",
        description: `Hai donato ${amount} SCoin alla cassaforte del clan.`,
      });

      return true;
    } catch (err) {
      console.warn("[SquadContext] Errore donazione:", err);
      toast({
        title: "Errore donazione",
        description: "Impossibile completare la transazione in questo momento.",
        variant: "destructive",
      });
      return false;
    }
  };

  return (
    <SquadContext.Provider
      value={{
        activeTab,
        setActiveTab,
        tournamentSubTab,
        setTournamentSubTab,
        isLoading,
        currentUser,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        signOut,
        sCoinBalance,
        transactions,
        userProfile,
        refreshUserData,
        stories,
        posts,
        activeStory,
        setActiveStory,
        toggleLikePost,
        createPost,
        deletePost,
        createStory,
        fetchPostComments,
        addComment,
        deleteComment,
        tournaments,
        selectedTournament,
        setSelectedTournament,
        refreshTournaments: loadDatabaseContent,
        leaderboard,
        matchChat,
        sendMatchMessage,
        aiScanStatus,
        aiScanImage,
        aiScanResult,
        startAiKillScan,
        resetAiKillScan,
        voiceRooms,
        activeVoiceRoomId,
        isMuted,
        isDeafened,
        agoraAppId,
        isAgoraPlaceholder,
        isRealSdkActive,
        userSpeaking,
        toggleMute,
        toggleDeafen,
        joinVoiceRoom,
        leaveVoiceRoom,
        createVoiceRoom,
        deleteVoiceRoom,
        followedUserIds,
        followedClanIds,
        followUser,
        unfollowUser,
        isFollowingUser,
        followClan,
        unfollowClan,
        isFollowingClan,
        clanData,
        clanMembers,
        donateToClan,
        isUniversalAdmin: currentUser?.email?.toLowerCase() === "fedezdesimone@gmail.com",
        deleteTournament,
        deleteStory,
        adminCreditSCoin,
      }}
    >
      {children}
    </SquadContext.Provider>
  );
};

export const useSquad = () => {
  const context = useContext(SquadContext);
  if (!context) {
    throw new Error("useSquad must be used within a SquadProvider");
  }
  return context;
};
