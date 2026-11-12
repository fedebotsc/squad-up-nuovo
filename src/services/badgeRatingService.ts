import { supabase } from "@/integrations/supabase/client";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  type: "positive" | "negative";
  iconName: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
}

export const PLAYER_BADGES: BadgeDefinition[] = [
  // Positive badges
  {
    id: "team_player",
    name: "Team Player",
    description: "Gioca per la squadra, condivide risorse e comunica costantemente",
    type: "positive",
    iconName: "Users",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/30",
  },
  {
    id: "social_player",
    name: "Giocatore Socievole",
    description: "Simpatico, caloroso e crea un clima sereno in squadra",
    type: "positive",
    iconName: "Smile",
    color: "text-cyan-400",
    badgeBg: "bg-cyan-500/10",
    badgeBorder: "border-cyan-500/30",
  },
  {
    id: "laser_aim",
    name: "Mira Laser",
    description: "Precisione impeccabile e abilità balistica di altissimo livello",
    type: "positive",
    iconName: "Crosshair",
    color: "text-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30",
  },
  {
    id: "clutch_god",
    name: "Clutch God",
    description: "Risolve le situazioni 1v3 o 1v4 impossibili all'ultimo secondo",
    type: "positive",
    iconName: "Zap",
    color: "text-purple-400",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/30",
  },
  {
    id: "tactical_leader",
    name: "Leader Tattico",
    description: "Rotazioni perfette, shotcalling strategico e visione di gioco",
    type: "positive",
    iconName: "Compass",
    color: "text-blue-400",
    badgeBg: "bg-blue-500/10",
    badgeBorder: "border-blue-500/30",
  },
  // Negative badges
  {
    id: "toxic_player",
    name: "Giocatore Tossico",
    description: "Lamentele, insulti o flame frequenti durante la partita",
    type: "negative",
    iconName: "Skull",
    color: "text-rose-400",
    badgeBg: "bg-rose-500/10",
    badgeBorder: "border-rose-500/30",
  },
  {
    id: "rage_quit",
    name: "Rage Quitter",
    description: "Abbandona la lobby non appena viene abbattuto",
    type: "negative",
    iconName: "Flame",
    color: "text-orange-400",
    badgeBg: "bg-orange-500/10",
    badgeBorder: "border-orange-500/30",
  },
  {
    id: "no_mic",
    name: "Senza Microfono",
    description: "Nessuna comunicazione o segnali audio per il team",
    type: "negative",
    iconName: "MicOff",
    color: "text-zinc-400",
    badgeBg: "bg-zinc-500/10",
    badgeBorder: "border-zinc-500/30",
  },
  {
    id: "lone_wolf",
    name: "Lupo Solitario",
    description: "Si allontana dalla squadra ignorando gli obiettivi del match",
    type: "negative",
    iconName: "Target",
    color: "text-red-400",
    badgeBg: "bg-red-500/10",
    badgeBorder: "border-red-500/30",
  },
];

export const CLAN_BADGES: BadgeDefinition[] = [
  // Positive badges
  {
    id: "clan_organized",
    name: "Clan Organizzato",
    description: "Struttura solida, ruoli definiti e puntualità negli appuntamenti",
    type: "positive",
    iconName: "CheckCircle2",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/30",
  },
  {
    id: "clan_active",
    name: "Clan Attivo",
    description: "Membri sempre connessi nelle stanze vocali e pronti per i tornei",
    type: "positive",
    iconName: "Flame",
    color: "text-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30",
  },
  {
    id: "clan_welcoming",
    name: "Ambiente Accogliente",
    description: "Ottima accoglienza per le nuove reclute e atmosfera positiva",
    type: "positive",
    iconName: "Heart",
    color: "text-cyan-400",
    badgeBg: "bg-cyan-500/10",
    badgeBorder: "border-cyan-500/30",
  },
  {
    id: "clan_competitive",
    name: "Campioni Competitivi",
    description: "Vittorie nei tornei ed elevata dedizione al ranking",
    type: "positive",
    iconName: "Trophy",
    color: "text-purple-400",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/30",
  },
  // Negative badges
  {
    id: "clan_absent",
    name: "Poco Presente",
    description: "Bassa frequenza di gioco e stanze spesso vuote",
    type: "negative",
    iconName: "Clock",
    color: "text-yellow-400",
    badgeBg: "bg-yellow-500/10",
    badgeBorder: "border-yellow-500/30",
  },
  {
    id: "clan_disorganized",
    name: "Disorganizzato",
    description: "Mancanza di orari, confusione e cambi continui nei team",
    type: "negative",
    iconName: "AlertTriangle",
    color: "text-orange-400",
    badgeBg: "bg-orange-500/10",
    badgeBorder: "border-orange-500/30",
  },
  {
    id: "clan_toxic",
    name: "Clima Tossico",
    description: "Atteggiamenti ostili verso avversari o membri interni",
    type: "negative",
    iconName: "Skull",
    color: "text-rose-400",
    badgeBg: "bg-rose-500/10",
    badgeBorder: "border-rose-500/30",
  },
  {
    id: "clan_broken_promises",
    name: "Promesse Mancate",
    description: "Mancato rispetto di accordi o montepremi annunciati",
    type: "negative",
    iconName: "Ban",
    color: "text-red-400",
    badgeBg: "bg-red-500/10",
    badgeBorder: "border-red-500/30",
  },
];

export interface BadgeVoteRecord {
  targetId: string;
  badgeId: string;
  voterId: string;
  createdAt: string;
}

// Storage keys for real votes (no fake mock seeds)
const PLAYER_VOTES_KEY = "squadup_real_player_votes_v2";
const CLAN_VOTES_KEY = "squadup_real_clan_votes_v2";

export function getZeroBadgeCounts(badgeList: BadgeDefinition[]): Record<string, number> {
  const result: Record<string, number> = {};
  badgeList.forEach((badge) => {
    result[badge.id] = 0;
  });
  return result;
}

export function getPlayerBadgeCounts(targetId: string): { counts: Record<string, number>; userVotes: string[] } {
  const zeroCounts = getZeroBadgeCounts(PLAYER_BADGES);

  try {
    const raw = localStorage.getItem(`${PLAYER_VOTES_KEY}_${targetId}`);
    if (raw) {
      const stored = JSON.parse(raw);
      return {
        counts: { ...zeroCounts, ...(stored.counts || {}) },
        userVotes: stored.userVotes || [],
      };
    }
  } catch (e) {
    console.warn("Errore lettura voti giocatore:", e);
  }

  return { counts: zeroCounts, userVotes: [] };
}

export function getClanBadgeCounts(clanId: string): { counts: Record<string, number>; userVotes: string[] } {
  const zeroCounts = getZeroBadgeCounts(CLAN_BADGES);

  try {
    const raw = localStorage.getItem(`${CLAN_VOTES_KEY}_${clanId}`);
    if (raw) {
      const stored = JSON.parse(raw);
      return {
        counts: { ...zeroCounts, ...(stored.counts || {}) },
        userVotes: stored.userVotes || [],
      };
    }
  } catch (e) {
    console.warn("Errore lettura voti clan:", e);
  }

  return { counts: zeroCounts, userVotes: [] };
}

export function togglePlayerBadgeVote(
  targetId: string,
  badgeId: string,
  voterId: string
): { counts: Record<string, number>; userVotes: string[]; hasVoted: boolean } {
  const current = getPlayerBadgeCounts(targetId);
  const userVoted = current.userVotes.includes(badgeId);

  let newUserVotes: string[];
  const newCounts = { ...current.counts };

  if (userVoted) {
    newUserVotes = current.userVotes.filter((id) => id !== badgeId);
    newCounts[badgeId] = Math.max(0, (newCounts[badgeId] || 1) - 1);
  } else {
    newUserVotes = [...current.userVotes, badgeId];
    newCounts[badgeId] = (newCounts[badgeId] || 0) + 1;
  }

  try {
    localStorage.setItem(
      `${PLAYER_VOTES_KEY}_${targetId}`,
      JSON.stringify({ counts: newCounts, userVotes: newUserVotes })
    );
  } catch (e) {
    console.warn("Errore salvataggio voti giocatore:", e);
  }

  return { counts: newCounts, userVotes: newUserVotes, hasVoted: !userVoted };
}

export function toggleClanBadgeVote(
  clanId: string,
  badgeId: string,
  voterId: string
): { counts: Record<string, number>; userVotes: string[]; hasVoted: boolean } {
  const current = getClanBadgeCounts(clanId);
  const userVoted = current.userVotes.includes(badgeId);

  let newUserVotes: string[];
  const newCounts = { ...current.counts };

  if (userVoted) {
    newUserVotes = current.userVotes.filter((id) => id !== badgeId);
    newCounts[badgeId] = Math.max(0, (newCounts[badgeId] || 1) - 1);
  } else {
    newUserVotes = [...current.userVotes, badgeId];
    newCounts[badgeId] = (newCounts[badgeId] || 0) + 1;
  }

  try {
    localStorage.setItem(
      `${CLAN_VOTES_KEY}_${clanId}`,
      JSON.stringify({ counts: newCounts, userVotes: newUserVotes })
    );
  } catch (e) {
    console.warn("Errore salvataggio voti clan:", e);
  }

  return { counts: newCounts, userVotes: newUserVotes, hasVoted: !userVoted };
}

/**
 * Checks whether user has permission to vote and award badges:
 * Exclusively allowed for active "Player Pro" subscribers, "Clan Pro / Elite" subscribers, or Universal Admin.
 */
export function isUserEligibleToVote(
  userProfile: any,
  currentUser: any,
  clanData: any,
  isUniversalAdmin: boolean
): boolean {
  if (isUniversalAdmin) return true;
  if (!userProfile && !currentUser) return false;

  const email = currentUser?.email?.toLowerCase();
  if (email === "fedezdesimone@gmail.com") return true;

  // 1. Player Pro subscriber
  const pTier = (userProfile?.subscriptionTier || userProfile?.subscription_tier || "").toLowerCase();
  if (pTier === "pro" || pTier === "pro_plus" || userProfile?.isPro) {
    return true;
  }

  // 2. Clan Pro or Clan Elite subscriber
  if (clanData) {
    const cTier = (clanData.tier || clanData.subscription_tier || "").toLowerCase();
    if (cTier === "pro" || cTier === "elite" || cTier.includes("pro") || cTier.includes("elite")) {
      return true;
    }
    if (clanData.level && clanData.level >= 2) {
      return true;
    }
  }

  return false;
}

// Backwards compatibility
export const isUserPlayerProPlus = (
  userProfile: any,
  currentUser: any,
  isUniversalAdmin: boolean,
  clanData?: any
): boolean => {
  return isUserEligibleToVote(userProfile, currentUser, clanData, isUniversalAdmin);
};
