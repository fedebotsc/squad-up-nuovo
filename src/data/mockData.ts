export interface Story {
  id: string;
  username: string;
  avatar: string;
  game: string;
  preview: string;
  hoursLeft: number;
  hasUnread: boolean;
  verified?: boolean;
}

export interface Post {
  id: string;
  author: {
    name: string;
    handle: string;
    avatar: string;
    clanTag?: string;
    verified: boolean;
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
  category: "Resurgence" | "Search & Destroy" | "Battle Royale" | "Competitive 5v5";
  banner: string;
  status: "in_corso" | "iscrizioni" | "terminato";
  prizePoolSCoin: number;
  entryFeeSCoin: number;
  teamsJoined: number;
  maxTeams: number;
  startsAt: string;
  mode: "Trios" | "Duos" | "Squads" | "5v5";
  description: string;
}

export interface MatchChatMessage {
  id: string;
  sender: string;
  team: string;
  avatar: string;
  text: string;
  time: string;
  isCaptain?: boolean;
  isReferee?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  teamName: string;
  tag: string;
  kills: number;
  damage: number;
  placement: number;
  points: number;
  isMyTeam?: boolean;
}

export interface VoiceMember {
  id: string;
  name: string;
  avatar: string;
  role: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  ping: number;
}

export interface VoiceRoom {
  id: string;
  name: string;
  game: string;
  channelType: "Squad" | "Lobby" | "Competitivo";
  activeMembers: VoiceMember[];
  maxCapacity: number;
}

export interface ClanPerk {
  id: string;
  title: string;
  description: string;
  progressPercent: number;
  currentSCoin: number;
  targetSCoin: number;
  isUnlocked: boolean;
}

export interface ClanMember {
  id: string;
  name: string;
  avatar: string;
  role: "Leader" | "Co-Leader" | "Pro Player" | "Membro";
  donatedSCoin: number;
  isOnline: boolean;
}

export interface Transaction {
  id: string;
  type: "win" | "entry" | "donation" | "reward";
  title: string;
  amount: number;
  date: string;
  isPositive: boolean;
}

export const INITIAL_STORIES: Story[] = [
  {
    id: "s1",
    username: "Tu (Aggiungi)",
    avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80",
    game: "La tua clip",
    preview: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80",
    hoursLeft: 24,
    hasUnread: false,
  },
  {
    id: "s2",
    username: "ViperStriker",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    game: "Warzone",
    preview: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80",
    hoursLeft: 18,
    hasUnread: true,
    verified: true,
  },
  {
    id: "s3",
    username: "KiraGhost",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    game: "Valorant",
    preview: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&auto=format&fit=crop&q=80",
    hoursLeft: 12,
    hasUnread: true,
  },
  {
    id: "s4",
    username: "ApexNova",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&auto=format&fit=crop&q=80",
    game: "Apex Legends",
    preview: "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=500&auto=format&fit=crop&q=80",
    hoursLeft: 9,
    hasUnread: true,
    verified: true,
  },
  {
    id: "s5",
    username: "ZeroPulse",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    game: "CS2",
    preview: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop&q=80",
    hoursLeft: 5,
    hasUnread: true,
  },
];

export const INITIAL_POSTS: Post[] = [
  {
    id: "p1",
    author: {
      name: "ShadowKilla (Tu)",
      handle: "@shadowkilla",
      avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80",
      clanTag: "NXP",
      verified: true,
    },
    timeAgo: "15 min fa",
    game: "Warzone Rebirth",
    content: "Clutch finale 1v3 con la nuova Striker 9 per portare il team in Top 1! Domani ore 21:00 pronti per le semifinali del torneo SquadUP 🏆🔥",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80",
    likes: 42,
    isLiked: false,
    comments: 8,
    shares: 4,
  },
  {
    id: "p2",
    author: {
      name: "Clan Nexus Prime",
      handle: "@nexusprime_official",
      avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
      clanTag: "NXP",
      verified: true,
    },
    timeAgo: "1 ora fa",
    game: "Clan Announcements",
    content: "La cassaforte del Clan ha raggiunto 42.650 SCoin! Grazie a tutti i player per le donazioni settimanali. A Lv. 15 sblocchiamo lo slot per altri 10 compagni di squadra 🛡️⚡",
    likes: 89,
    isLiked: true,
    comments: 19,
    shares: 12,
  },
  {
    id: "p3",
    author: {
      name: "Elena 'Valkyrie'",
      handle: "@valk_stream",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      verified: true,
    },
    timeAgo: "3 ore fa",
    game: "Valorant",
    content: "Nuovo lineup per la freccia di Sova su Haven C-Site! Provatela nel prossimo match ranked, vi garantisce vision completa su tutta la pianta 🎯",
    likes: 128,
    isLiked: false,
    comments: 24,
    shares: 31,
  },
];

export const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: "tour-1",
    title: "WARZONE CLASH: TRIOS RESURGENCE",
    game: "Call of Duty: Warzone",
    category: "Resurgence",
    banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80",
    status: "in_corso",
    prizePoolSCoin: 5000,
    entryFeeSCoin: 100,
    teamsJoined: 24,
    maxTeams: 32,
    startsAt: "Live Ora (Round 3/4)",
    mode: "Trios",
    description: "3 partite di Resurgence su Rebirth Island. Conta kill multiplier + placement score. Screenshot kill convalidati da IA Arbitro SquadUP.",
  },
  {
    id: "tour-2",
    title: "VALORANT SHOWDOWN: 5v5 MASTERS",
    game: "Valorant",
    category: "Competitive 5v5",
    banner: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80",
    status: "in_corso",
    prizePoolSCoin: 10000,
    entryFeeSCoin: 200,
    teamsJoined: 16,
    maxTeams: 16,
    startsAt: "Quarti di Finale - Ore 21:30",
    mode: "5v5",
    description: "Eliminazione diretta Bo3. Mappe con ban/pick su Ascent, Bind e Haven. Convalida automatica kill e spike defuse.",
  },
  {
    id: "tour-3",
    title: "APEX PREDATOR ROYALE",
    game: "Apex Legends",
    category: "Battle Royale",
    banner: "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80",
    status: "iscrizioni",
    prizePoolSCoin: 3500,
    entryFeeSCoin: 50,
    teamsJoined: 14,
    maxTeams: 20,
    startsAt: "Domenica alle 18:00",
    mode: "Trios",
    description: "World's Edge custom lobby. Punti moltiplicati per ogni kill oltre la Top 5. Iscrizione aperta per tutti i rank.",
  },
];

export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, teamName: "CyberReapers", tag: "NXP", kills: 38, damage: 14200, placement: 1, points: 64, isMyTeam: true },
  { rank: 2, teamName: "Vortex Gaming", tag: "VTX", kills: 31, damage: 11800, placement: 2, points: 52 },
  { rank: 3, teamName: "Aether Syndicate", tag: "ATH", kills: 27, damage: 9940, placement: 3, points: 46 },
  { rank: 4, teamName: "Phantom Phalanx", tag: "PHT", kills: 22, damage: 8400, placement: 4, points: 38 },
  { rank: 5, teamName: "Toxic Hydra", tag: "HYD", kills: 18, damage: 7100, placement: 5, points: 31 },
];

export const INITIAL_MATCH_CHAT: MatchChatMessage[] = [
  {
    id: "m1",
    sender: "Arbitro IA SquadUP",
    team: "SISTEMA",
    avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
    text: "Stanza Match #WZ-884 attivata. Avete 15 minuti dopo il termine del game per caricare lo screenshot delle kill score.",
    time: "20:45",
    isReferee: true,
  },
  {
    id: "m2",
    sender: "ShadowKilla (Capitano)",
    team: "CyberReapers",
    avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80",
    text: "Tutti pronti in lobby privata? Ricordatevi di salvare la schermata finale con tutti i danni e le kill visibili.",
    time: "20:47",
    isCaptain: true,
  },
  {
    id: "m3",
    sender: "Kaelen_VTX",
    team: "Vortex Gaming",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    text: "Prontissimi ragazzi, buona fortuna a tutti!",
    time: "20:49",
  },
];

export const INITIAL_VOICE_ROOMS: VoiceRoom[] = [
  {
    id: "vr-1",
    name: "Warzone Trio #Alpha",
    game: "Call of Duty: Warzone",
    channelType: "Squad",
    maxCapacity: 4,
    activeMembers: [
      {
        id: "vm-1",
        name: "ShadowKilla (Tu)",
        avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80",
        role: "Capitano",
        isSpeaking: true,
        isMuted: false,
        isDeafened: false,
        ping: 22,
      },
      {
        id: "vm-2",
        name: "ViperStriker",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        role: "Fragger",
        isSpeaking: false,
        isMuted: false,
        isDeafened: false,
        ping: 28,
      },
      {
        id: "vm-3",
        name: "KiraGhost",
        avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
        role: "Support",
        isSpeaking: true,
        isMuted: false,
        isDeafened: false,
        ping: 34,
      },
    ],
  },
  {
    id: "vr-2",
    name: "Valorant Ranked Squad",
    game: "Valorant",
    channelType: "Competitivo",
    maxCapacity: 5,
    activeMembers: [
      {
        id: "vm-4",
        name: "ZeroPulse",
        avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
        role: "IGL",
        isSpeaking: false,
        isMuted: true,
        isDeafened: false,
        ping: 19,
      },
      {
        id: "vm-5",
        name: "ApexNova",
        avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&auto=format&fit=crop&q=80",
        role: "Entry",
        isSpeaking: true,
        isMuted: false,
        isDeafened: false,
        ping: 24,
      },
    ],
  },
  {
    id: "vr-3",
    name: "Lounge Clan & Strategie",
    game: "Community Chat",
    channelType: "Lobby",
    maxCapacity: 10,
    activeMembers: [],
  },
];

export const INITIAL_CLAN_PERKS: ClanPerk[] = [
  {
    id: "cp-1",
    title: "Bonus SCoin Tornei +15%",
    description: "Tutti i membri del clan ricevono un moltiplicatore 1.15x sui premi vinti.",
    progressPercent: 100,
    currentSCoin: 25000,
    targetSCoin: 25000,
    isUnlocked: true,
  },
  {
    id: "cp-2",
    title: "Espansione Roster (+10 Slot)",
    description: "Aumenta la capienza massima del Clan da 25 a 35 membri.",
    progressPercent: 85,
    currentSCoin: 42650,
    targetSCoin: 50000,
    isUnlocked: false,
  },
  {
    id: "cp-3",
    title: "Tag Clan Olografica Neon",
    description: "Badge animato ciano/viola per i profili e nelle leaderboard tornei.",
    progressPercent: 40,
    currentSCoin: 30000,
    targetSCoin: 75000,
    isUnlocked: false,
  },
];

export const INITIAL_CLAN_MEMBERS: ClanMember[] = [
  { id: "cm-1", name: "ShadowKilla (Tu)", avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80", role: "Leader", donatedSCoin: 14500, isOnline: true },
  { id: "cm-2", name: "ViperStriker", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80", role: "Co-Leader", donatedSCoin: 12200, isOnline: true },
  { id: "cm-3", name: "KiraGhost", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80", role: "Pro Player", donatedSCoin: 9400, isOnline: true },
  { id: "cm-4", name: "ApexNova", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&auto=format&fit=crop&q=80", role: "Pro Player", donatedSCoin: 4800, isOnline: false },
  { id: "cm-5", name: "ZeroPulse", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80", role: "Membro", donatedSCoin: 1750, isOnline: false },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "tx-1", type: "win", title: "1° Posto Resurgence Match #3", amount: 450, date: "Oggi, 20:30", isPositive: true },
  { id: "tx-2", type: "donation", title: "Donazione Cassaforte Clan NXP", amount: 150, date: "Oggi, 17:15", isPositive: false },
  { id: "tx-3", type: "entry", title: "Iscrizione Torneo Warzone Clash", amount: 100, date: "Oggi, 16:00", isPositive: false },
  { id: "tx-4", type: "reward", title: "Bonus Sfida Giornaliera 10 Kill", amount: 50, date: "Ieri, 22:40", isPositive: true },
];
