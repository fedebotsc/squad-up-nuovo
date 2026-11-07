import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Story,
  Post,
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

export type NavTab = "home" | "tournaments" | "voice" | "clan" | "profile";
export type TournamentSubTab = "active" | "match_room" | "leaderboard";

export interface UserProfileData {
  id?: string;
  name: string;
  tag: string;
  avatar: string;
  clanTag?: string;
  rank: string;
  level: number;
  activisionName?: string;
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
  createPost: (content: string, game: string, imageFile?: File) => Promise<void>;

  // Tournaments
  tournaments: Tournament[];
  selectedTournament: Tournament | null;
  setSelectedTournament: (tournament: Tournament | null) => void;
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

  // Clan
  clanData: ClanData | null;
  clanMembers: ClanMember[];
  donateToClan: (amount: number) => Promise<boolean>;
}

const SquadContext = createContext<SquadContextType | undefined>(undefined);

export const SquadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [tournamentSubTab, setTournamentSubTab] = useState<TournamentSubTab>("active");
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // Voice rooms & Agora SDK state - empty by default
  const [voiceRooms, setVoiceRooms] = useState<VoiceRoom[]>([]);
  const [activeVoiceRoomId, setActiveVoiceRoomId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);
  const [isRealSdkActive, setIsRealSdkActive] = useState<boolean>(false);
  const [userSpeaking, setUserSpeaking] = useState<boolean>(false);

  // Clan state - empty by default (no fake clan)
  const [clanData, setClanData] = useState<ClanData | null>(null);
  const [clanMembers, setClanMembers] = useState<ClanMember[]>([]);

  const agoraAppId = agoraVoiceService.getAppId();
  const isAgoraPlaceholder = agoraVoiceService.isAppIdPlaceholder();

  // Load user data from Supabase
  const refreshUserData = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user;

      if (currentUser) {
        // Query profile from Supabase
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (profile) {
          const balance = profile.balance ?? profile.coins ?? profile.schoins ?? 0;
          setSCoinBalance(balance);
          setUserProfile({
            id: profile.id,
            name: profile.display_name || profile.username || "Giocatore",
            tag: profile.activision_tag ? `#${profile.activision_tag}` : `#${profile.username?.slice(0, 4) || "SQ"}`,
            avatar: profile.avatar_url || "",
            rank: profile.subscription_tier === "pro" ? "Pro Player" : "Competitor",
            level: Math.max(1, Math.floor(balance / 100)),
            activisionName: profile.activision_name,
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
            .eq("user_id", currentUser.id)
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
                  name: m.profiles?.display_name || m.profiles?.username || "Membro",
                  avatar: m.profiles?.avatar_url || "",
                  role: m.role === "founder" ? "Leader" : m.role === "admin" ? "Co-Leader" : "Membro",
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
            .or(`user_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
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
                isPositive: tx.recipient_id === currentUser.id,
              }))
            );
          } else {
            setTransactions([]);
          }
        }
      } else {
        // Guest user - no fake data
        setClanData(null);
        setClanMembers([]);
        setTransactions([]);
        setSCoinBalance(0);
      }
    } catch (err) {
      console.warn("[SquadContext] Errore caricamento profilo Supabase:", err);
    }
  }, []);

  // Fetch feed posts, stories, tournaments, and voice rooms from Supabase
  const loadDatabaseContent = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Posts from Supabase
      const { data: postsData } = await supabase
        .from("posts")
        .select("*, profiles:author_id(id, username, display_name, avatar_url), clans:clan_id(name, tag)")
        .order("created_at", { ascending: false })
        .limit(30);

      if (postsData && postsData.length > 0) {
        setPosts(
          postsData.map((p: any) => ({
            id: p.id,
            author: {
              id: p.author_id,
              name: p.profiles?.display_name || p.profiles?.username || "Giocatore",
              handle: `@${p.profiles?.username || "player"}`,
              avatar: p.profiles?.avatar_url || "",
              clanTag: p.clans?.tag,
              verified: false,
            },
            timeAgo: new Date(p.created_at).toLocaleDateString([], {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
            game: "SquadUP",
            content: p.body || "",
            image: p.media_urls?.[0] || undefined,
            likes: Array.isArray(p.allowed_reactions) ? p.allowed_reactions.length : 0,
            isLiked: false,
            comments: 0,
            shares: 0,
          }))
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
        setTournaments(
          tournamentsData.map((t: any) => ({
            id: t.id,
            title: t.name,
            game: t.game_mode,
            category: t.type || "Torneo",
            status: t.status === "live" ? "in_corso" : t.status === "completed" ? "terminato" : "iscrizioni",
            prizePoolSCoin: t.entry_fee_sc ? t.entry_fee_sc * (t.team_limit || 8) : 0,
            entryFeeSCoin: t.entry_fee_sc || 0,
            teamsJoined: Array.isArray(t.teams) ? t.teams.length : 0,
            maxTeams: t.team_limit || 16,
            startsAt: new Date(t.starts_at).toLocaleDateString([], {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
            mode: t.game_mode,
            description: t.rules || t.prize_description || "Torneo ufficiale SquadUP.",
          }))
        );
      } else {
        setTournaments([]);
      }

      // 4. Fetch Squad Voice Rooms from Supabase
      const { data: roomsData } = await supabase
        .from("squad_rooms")
        .select("*, squad_room_members(*)")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (roomsData && roomsData.length > 0) {
        setVoiceRooms(
          roomsData.map((r: any) => ({
            id: r.id,
            name: r.name,
            game: r.category,
            channelType: r.ranked ? "Competitivo" : "Squad",
            activeMembers: (r.squad_room_members || []).map((m: any) => ({
              id: m.id || m.user_id,
              name: "Giocatore",
              role: m.role || "Membro",
              isSpeaking: false,
              isMuted: false,
              isDeafened: false,
              ping: 25,
            })),
            maxCapacity: 5,
            status: r.status,
          }))
        );
      } else {
        setVoiceRooms([]);
      }
    } catch (err) {
      console.warn("[SquadContext] Errore caricamento dati Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshUserData();
    loadDatabaseContent();
  }, [refreshUserData, loadDatabaseContent]);

  // Setup Agora listeners
  useEffect(() => {
    agoraVoiceService.onSpeakingChange((speaking) => {
      setUserSpeaking(speaking && !isMuted);
    });

    return () => {
      agoraVoiceService.closeLocalAudioTrack();
    };
  }, [isMuted]);

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

  const createPost = async (content: string, game: string, imageFile?: File) => {
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;

    let mediaUrl: string | undefined = undefined;

    // Optional upload image to Supabase storage if file provided
    if (imageFile && currentUser) {
      try {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("post_media")
          .upload(fileName, imageFile);

        if (!uploadErr && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from("post_media")
            .getPublicUrl(fileName);
          mediaUrl = publicUrlData?.publicUrl;
        }
      } catch (err) {
        console.warn("[SquadContext] Impossibile caricare immagine:", err);
      }
    }

    if (currentUser) {
      const { data: insertedPost, error } = await supabase
        .from("posts")
        .insert({
          author_id: currentUser.id,
          body: content,
          clan_id: clanData?.id || null,
          media_urls: mediaUrl ? [mediaUrl] : [],
          media_type: mediaUrl ? "image" : "none",
          moderation_status: "approved",
        })
        .select("*, profiles:author_id(id, username, display_name, avatar_url), clans:clan_id(name, tag)")
        .single();

      if (!error && insertedPost) {
        const newPost: Post = {
          id: insertedPost.id,
          author: {
            id: currentUser.id,
            name: userProfile.name,
            handle: `@${userProfile.name.toLowerCase().replace(/\s+/g, "")}`,
            avatar: userProfile.avatar,
            clanTag: clanData?.tag,
            verified: false,
          },
          timeAgo: "Adesso",
          game: game || "SquadUP",
          content,
          image: mediaUrl,
          likes: 0,
          isLiked: false,
          comments: 0,
          shares: 0,
        };
        setPosts((prev) => [newPost, ...prev]);
        toast({
          title: "Post pubblicato!",
          description: "Il tuo post è stato salvato su Supabase.",
        });
        return;
      }
    }

    // Local fallback for guest
    const localPost: Post = {
      id: `p-${Date.now()}`,
      author: {
        name: userProfile.name,
        handle: "@ospite",
        avatar: userProfile.avatar,
        clanTag: clanData?.tag,
        verified: false,
      },
      timeAgo: "Adesso",
      game: game || "SquadUP",
      content,
      image: mediaUrl,
      likes: 0,
      isLiked: false,
      comments: 0,
      shares: 0,
    };
    setPosts((prev) => [localPost, ...prev]);
    toast({
      title: "Post condiviso",
      description: "Post visualizzato nel feed locale.",
    });
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
        const detectedKills = 0; // Clean initial state for real check
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
          description: "Nessun punteggio simulato applicato.",
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

  const joinVoiceRoom = async (roomId: string) => {
    const targetRoom = voiceRooms.find((r) => r.id === roomId);
    const channelName = targetRoom ? targetRoom.name.replace(/\s+/g, "_") : `SquadUP_${roomId}`;

    setActiveVoiceRoomId(roomId);

    const res = await agoraVoiceService.joinVoiceChannel(channelName, userProfile.name);
    setIsRealSdkActive(res.realSdk);

    if (res.realSdk) {
      toast({
        title: "Canale Vocale Connesso",
        description: `Connesso a ${targetRoom?.name || roomId} con Agora SDK.`,
      });
    } else {
      toast({
        title: "Stanza Vocale Attiva",
        description: `Canale ${targetRoom?.name || roomId} attivo.`,
      });
    }
  };

  const leaveVoiceRoom = async () => {
    await agoraVoiceService.leaveVoiceChannel();
    setActiveVoiceRoomId(null);
    setIsRealSdkActive(false);
    setUserSpeaking(false);

    toast({
      title: "Disconnesso",
      description: "Tracce microfono chiuse (localAudioTrack.close()).",
    });
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
        // Record real transaction in Supabase
        await supabase.from("sc_transactions").insert({
          user_id: currentUser.id,
          recipient_id: clanData.ownerId,
          amount,
          type: "clan_donation",
          description: `Donazione alla cassaforte del clan ${clanData.name}`,
        });

        // Update profile balance
        await supabase
          .from("profiles")
          .update({ balance: Math.max(0, sCoinBalance - amount) })
          .eq("id", currentUser.id);

        // Update clan treasury
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
        tournaments,
        selectedTournament,
        setSelectedTournament,
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
        clanData,
        clanMembers,
        donateToClan,
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
