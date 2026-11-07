export interface Story {
  id: string;
  username: string;
  avatar: string;
  game?: string;
  preview: string;
  hoursLeft: number;
  hasUnread?: boolean;
  verified?: boolean;
  userId?: string;
}

export interface Post {
  id: string;
  author: {
    name: string;
    handle: string;
    avatar: string;
    clanTag?: string;
    verified?: boolean;
    id?: string;
  };
  timeAgo: string;
  game: string;
  content: string;
  image?: string;
  likes: number;
  isLiked?: boolean;
  comments: number;
  shares: number;
}

export interface Tournament {
  id: string;
  title: string;
  game: string;
  category: string;
  banner?: string;
  status: "in_corso" | "iscrizioni" | "terminato" | "upcoming" | "live" | "completed";
  prizePoolSCoin: number;
  entryFeeSCoin: number;
  teamsJoined: number;
  maxTeams: number;
  startsAt: string;
  mode: string;
  description: string;
}

export interface MatchChatMessage {
  id: string;
  sender: string;
  team?: string;
  avatar?: string;
  text: string;
  time: string;
  isCaptain?: boolean;
  isReferee?: boolean;
  senderId?: string;
}

export interface LeaderboardEntry {
  rank: number;
  teamName: string;
  tag?: string;
  kills: number;
  damage: number;
  placement: number;
  points: number;
  isMyTeam?: boolean;
}

export interface VoiceMember {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  ping: number;
}

export interface VoiceRoom {
  id: string;
  name: string;
  game: string;
  channelType: string;
  activeMembers: VoiceMember[];
  maxCapacity: number;
  status?: string;
}

export interface ClanData {
  id: string;
  name: string;
  tag: string;
  description: string;
  gameMode: string;
  region: string;
  treasurySC: number;
  avatarUrl?: string;
  bannerUrl?: string;
  isRecruiting: boolean;
  ownerId: string;
  level?: number;
}

export interface ClanMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  donatedSCoin?: number;
  isOnline: boolean;
  joinedAt?: string;
}

export interface Transaction {
  id: string;
  type: "win" | "entry" | "donation" | "reward" | "admin_credit" | "p2p_transfer" | "shop_purchase";
  title: string;
  amount: number;
  date: string;
  isPositive: boolean;
}

// All initial arrays are completely empty (no fake/mock data)
export const INITIAL_STORIES: Story[] = [];
export const INITIAL_POSTS: Post[] = [];
export const INITIAL_TOURNAMENTS: Tournament[] = [];
export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [];
export const INITIAL_MATCH_CHAT: MatchChatMessage[] = [];
export const INITIAL_VOICE_ROOMS: VoiceRoom[] = [];
export const INITIAL_CLAN_MEMBERS: ClanMember[] = [];
export const INITIAL_TRANSACTIONS: Transaction[] = [];
