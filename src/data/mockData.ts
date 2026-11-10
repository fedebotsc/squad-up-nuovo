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

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
  };
  content: string;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  clanId?: string;
  postedAsClan?: boolean;
  clan?: {
    id: string;
    name: string;
    tag: string;
    avatarUrl?: string;
    bannerUrl?: string;
    clanFrameUrl?: string;
    tier?: string;
  };
  author: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    clanTag?: string;
    verified?: boolean;
    activisionId?: string;
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
  hostId?: string;
  createdAt?: string;
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
  tier?: "base" | "pro" | "elite";
  subscriptionTier?: "free" | "plus" | "pro" | "elite";
  subscriptionMonths?: number;
  subscriptionExpiresAt?: string | null;
  clanFrameUrl?: string;
  clanBannerUrl?: string;
}

export interface ClanMember {
  id: string;
  userId?: string;
  name: string;
  avatar?: string;
  role: string;
  customRoleId?: string;
  customRoleTitle?: string;
  donatedSCoin?: number;
  isOnline: boolean;
  joinedAt?: string;
}

export interface Transaction {
  id: string;
  type: "win" | "entry" | "donation" | "reward" | "admin_credit" | "p2p_transfer" | "shop_purchase" | "daily_bonus";
  title: string;
  description?: string;
  amount: number;
  date: string;
  isPositive: boolean;
}

// Initial empty collections - dynamic Supabase data source
export const initialStories: Story[] = [];
export const initialPosts: Post[] = [];
export const initialTournaments: Tournament[] = [];
export const initialLeaderboard: LeaderboardEntry[] = [];
export const initialMatchChat: MatchChatMessage[] = [];
export const initialVoiceRooms: VoiceRoom[] = [];
export const initialClanMembers: ClanMember[] = [];
export const initialTransactions: Transaction[] = [];
