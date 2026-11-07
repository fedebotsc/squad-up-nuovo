import React, { createContext, useContext, useState } from "react";
import {
  INITIAL_STORIES,
  INITIAL_POSTS,
  INITIAL_TOURNAMENTS,
  INITIAL_LEADERBOARD,
  INITIAL_MATCH_CHAT,
  INITIAL_VOICE_ROOMS,
  INITIAL_CLAN_PERKS,
  INITIAL_CLAN_MEMBERS,
  INITIAL_TRANSACTIONS,
  Story,
  Post,
  Tournament,
  LeaderboardEntry,
  MatchChatMessage,
  VoiceRoom,
  ClanPerk,
  ClanMember,
  Transaction,
} from "@/data/mockData";
import { toast } from "@/components/ui/use-toast";

export type NavTab = "home" | "tournaments" | "voice" | "clan" | "profile";
export type TournamentSubTab = "active" | "match_room" | "leaderboard";

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
  
  // Wallet & Profile
  sCoinBalance: number;
  transactions: Transaction[];
  userProfile: {
    name: string;
    tag: string;
    avatar: string;
    clanTag: string;
    rank: string;
    level: number;
    stats: {
      kd: string;
      winRate: string;
      matches: number;
      kills: number;
    };
  };

  // Feed & Stories
  stories: Story[];
  posts: Post[];
  activeStory: Story | null;
  setActiveStory: (story: Story | null) => void;
  toggleLikePost: (postId: string) => void;
  createPost: (content: string, game: string) => void;

  // Tournaments
  tournaments: Tournament[];
  leaderboard: LeaderboardEntry[];
  matchChat: MatchChatMessage[];
  sendMatchMessage: (text: string) => void;
  
  // AI OCR Kill Verification
  aiScanStatus: "idle" | "uploading" | "analyzing" | "verified";
  aiScanImage: string | null;
  aiScanResult: AiScanResult | null;
  startAiKillScan: (customImage?: string) => void;
  resetAiKillScan: () => void;

  // Voice Rooms
  voiceRooms: VoiceRoom[];
  activeVoiceRoomId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  toggleMute: () => void;
  toggleDeafen: () => void;
  joinVoiceRoom: (roomId: string) => void;
  leaveVoiceRoom: () => void;

  // Clan
  clanVault: number;
  clanPerks: ClanPerk[];
  clanMembers: ClanMember[];
  donateToClan: (amount: number) => boolean;
}

const SquadContext = createContext<SquadContextType | undefined>(undefined);

export const SquadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [tournamentSubTab, setTournamentSubTab] = useState<TournamentSubTab>("active");

  const [sCoinBalance, setSCoinBalance] = useState<number>(1850);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  const [stories, setStories] = useState<Story[]>(INITIAL_STORIES);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);

  const [tournaments] = useState<Tournament[]>(INITIAL_TOURNAMENTS);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(INITIAL_LEADERBOARD);
  const [matchChat, setMatchChat] = useState<MatchChatMessage[]>(INITIAL_MATCH_CHAT);

  // AI OCR Kill Verification state
  const [aiScanStatus, setAiScanStatus] = useState<"idle" | "uploading" | "analyzing" | "verified">("idle");
  const [aiScanImage, setAiScanImage] = useState<string | null>(null);
  const [aiScanResult, setAiScanResult] = useState<AiScanResult | null>(null);

  // Voice rooms state
  const [voiceRooms, setVoiceRooms] = useState<VoiceRoom[]>(INITIAL_VOICE_ROOMS);
  const [activeVoiceRoomId, setActiveVoiceRoomId] = useState<string | null>("vr-1");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);

  // Clan state
  const [clanVault, setClanVault] = useState<number>(42650);
  const [clanPerks, setClanPerks] = useState<ClanPerk[]>(INITIAL_CLAN_PERKS);
  const [clanMembers] = useState<ClanMember[]>(INITIAL_CLAN_MEMBERS);

  const userProfile = {
    name: "ShadowKilla",
    tag: "#SQ99",
    avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80",
    clanTag: "NXP",
    rank: "Master Elite",
    level: 48,
    stats: {
      kd: "2.84",
      winRate: "34%",
      matches: 312,
      kills: 2450,
    },
  };

  const toggleLikePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const isLiked = !post.isLiked;
          return {
            ...post,
            isLiked,
            likes: isLiked ? post.likes + 1 : post.likes - 1,
          };
        }
        return post;
      })
    );
  };

  const createPost = (content: string, game: string) => {
    const newPost: Post = {
      id: `p-${Date.now()}`,
      author: {
        name: "ShadowKilla (Tu)",
        handle: "@shadowkilla",
        avatar: userProfile.avatar,
        clanTag: userProfile.clanTag,
        verified: true,
      },
      timeAgo: "Adesso",
      game: game || "SquadUP Community",
      content,
      likes: 0,
      isLiked: false,
      comments: 0,
      shares: 0,
    };
    setPosts([newPost, ...posts]);
    toast({
      title: "Post pubblicato!",
      description: "Il tuo messaggio è ora visibile nel feed di SquadUP.",
    });
  };

  const sendMatchMessage = (text: string) => {
    const newMsg: MatchChatMessage = {
      id: `m-${Date.now()}`,
      sender: "ShadowKilla (Capitano)",
      team: "CyberReapers",
      avatar: userProfile.avatar,
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isCaptain: true,
    };
    setMatchChat((prev) => [...prev, newMsg]);
  };

  const startAiKillScan = (customImage?: string) => {
    const imgToUse =
      customImage ||
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80";

    setAiScanImage(imgToUse);
    setAiScanStatus("uploading");

    setTimeout(() => {
      setAiScanStatus("analyzing");

      setTimeout(() => {
        const detectedKills = 19;
        const detectedDamage = 6420;
        const detectedPlacement = 1;
        const points = 25; // 19 kills + 6 placement points
        const rewardSCoin = 250;

        const result: AiScanResult = {
          kills: detectedKills,
          damage: detectedDamage,
          placement: detectedPlacement,
          pointsEarned: points,
          sCoinReward: rewardSCoin,
          confidence: 99.4,
          gameId: "COD-WZ-REBIRTH-884",
          timestamp: new Date().toLocaleTimeString(),
          notes: "Nessun artefatto visivo rilevato. Scoreboard ufficiale convalidata.",
        };

        setAiScanResult(result);
        setAiScanStatus("verified");

        // Reward player & update leaderboard
        setSCoinBalance((prev) => prev + rewardSCoin);
        setTransactions((prev) => [
          {
            id: `tx-${Date.now()}`,
            type: "win",
            title: `Verifica IA Match: ${detectedKills} Kills + Top 1`,
            amount: rewardSCoin,
            date: "Adesso",
            isPositive: true,
          },
          ...prev,
        ]);

        // Update leaderboard
        setLeaderboard((prev) =>
          prev.map((team) =>
            team.isMyTeam
              ? {
                  ...team,
                  kills: team.kills + detectedKills,
                  damage: team.damage + detectedDamage,
                  points: team.points + points,
                }
              : team
          )
        );

        toast({
          title: "🎉 Kill Screenshot Validato!",
          description: `IA Arbitro: +${detectedKills} Kills e +${rewardSCoin} SCoin accreditati nel wallet!`,
        });
      }, 1800);
    }, 900);
  };

  const resetAiKillScan = () => {
    setAiScanStatus("idle");
    setAiScanImage(null);
    setAiScanResult(null);
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      toast({
        title: next ? "Microfono Disattivato (Muto)" : "Microfono Attivo",
        description: next ? "I tuoi compagni non ti sentono." : "Agora Voice: trasmissione in corso.",
      });
      return next;
    });
  };

  const toggleDeafen = () => {
    setIsDeafened((prev) => {
      const next = !prev;
      toast({
        title: next ? "Audio Disattivato (Deafen)" : "Audio Riattivato",
        description: next ? "Non sentirai gli altri membri del canale." : "Audio del canale ripristinato.",
      });
      return next;
    });
  };

  const joinVoiceRoom = (roomId: string) => {
    setActiveVoiceRoomId(roomId);
    toast({
      title: "Canale Vocale Connesso",
      description: "Canale Agora a bassa latenza e bitrate HD attivo.",
    });
  };

  const leaveVoiceRoom = () => {
    setActiveVoiceRoomId(null);
    toast({
      title: "Disconnesso dal Vocale",
      description: "Sei uscito dalla stanza vocale.",
    });
  };

  const donateToClan = (amount: number): boolean => {
    if (amount <= 0 || amount > sCoinBalance) {
      toast({
        title: "Saldo SCoin insufficiente",
        description: "Non hai abbastanza SCoin nel tuo wallet per questa donazione.",
        variant: "destructive",
      });
      return false;
    }

    setSCoinBalance((prev) => prev - amount);
    setClanVault((prev) => prev + amount);

    // Update perks progress
    setClanPerks((prev) =>
      prev.map((perk) => {
        if (!perk.isUnlocked && perk.currentSCoin < perk.targetSCoin) {
          const newCurrent = Math.min(perk.targetSCoin, perk.currentSCoin + amount);
          const newProgress = Math.round((newCurrent / perk.targetSCoin) * 100);
          return {
            ...perk,
            currentSCoin: newCurrent,
            progressPercent: newProgress,
            isUnlocked: newProgress >= 100,
          };
        }
        return perk;
      })
    );

    setTransactions((prev) => [
      {
        id: `tx-${Date.now()}`,
        type: "donation",
        title: `Donazione Cassaforte Clan (${amount} SCoin)`,
        amount,
        date: "Adesso",
        isPositive: false,
      },
      ...prev,
    ]);

    toast({
      title: "🛡️ Donazione Effettuata!",
      description: `Hai donato ${amount} SCoin al clan Nexus Prime. Il perk di espansione avanza!`,
    });

    return true;
  };

  return (
    <SquadContext.Provider
      value={{
        activeTab,
        setActiveTab,
        tournamentSubTab,
        setTournamentSubTab,
        sCoinBalance,
        transactions,
        userProfile,
        stories,
        posts,
        activeStory,
        setActiveStory,
        toggleLikePost,
        createPost,
        tournaments,
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
        toggleMute,
        toggleDeafen,
        joinVoiceRoom,
        leaveVoiceRoom,
        clanVault,
        clanPerks,
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
