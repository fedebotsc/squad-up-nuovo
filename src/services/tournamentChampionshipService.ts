import { RegisteredTeam, TournamentMember, getRegisteredTeams } from "./tournamentBracketService";
import { calculateTournamentScore, ScoringSettings } from "./tournamentVerificationService";
import { supabase } from "@/integrations/supabase/client";

export interface GameSubmission {
  gameNumber: number;
  placement: number;
  kills: number; // Strettamente dalla colonna UCCISIONI
  rawEliminations?: number;
  assistsDiscarded?: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
  multiplierUsed?: number;
  placementProofUrl?: string;
  killsProofUrl?: string;
  submittedAt: string;
  verifiedByAi: boolean;
  breakdownText?: string;
  summaryMessage?: string;
}

export interface AdminPointAdjustment {
  id: string;
  teamId: string;
  teamName: string;
  pointsDelta: number; // es. -5 o +3
  reason: string; // OBBLIGATORIO
  adminName: string;
  adminId: string;
  createdAt: string;
}

export interface ChampionshipTeamProgress {
  teamId: string;
  teamName: string;
  captainName: string;
  members: TournamentMember[];
  games: Record<number, GameSubmission>;
  penaltyAdjustments: AdminPointAdjustment[];
  totalKills: number;
  basePoints: number; // Somma punti game
  penaltyPoints: number; // Somma penalità / bonus
  totalPoints: number; // basePoints + penaltyPoints
  gamesPlayed: number;
  rank: number;
}

export interface ChampionshipState {
  tournamentId: string;
  totalGames: number; // Numero totale di Game (Giornate) stabiliti
  currentGame: number; // Game attualmente in corso (1, 2, ... totalGames)
  isCompleted: boolean;
  championTeamId?: string | null;
  championTeamName?: string | null;
  teams: ChampionshipTeamProgress[];
  lastUpdated: string;
}

const CHAMPIONSHIP_STORAGE_PREFIX = "squadup_championship_";

/**
 * Read championship state from storage or initialize with registered teams
 */
export function getChampionshipState(
  tournamentId: string,
  defaultTotalGames = 5,
  scoringSettings?: ScoringSettings
): ChampionshipState {
  try {
    const raw = localStorage.getItem(`${CHAMPIONSHIP_STORAGE_PREFIX}${tournamentId}`);
    if (raw) {
      const parsed: ChampionshipState = JSON.parse(raw);
      // Sync any new registered teams
      const registered = getRegisteredTeams(tournamentId);
      const existingTeamIds = new Set(parsed.teams.map((t) => t.teamId));

      let hasNew = false;
      registered.forEach((reg) => {
        if (reg.status === "approved" && !existingTeamIds.has(reg.id)) {
          hasNew = true;
          parsed.teams.push({
            teamId: reg.id,
            teamName: reg.teamName,
            captainName: reg.captainName,
            members: reg.members || [],
            games: {},
            penaltyAdjustments: [],
            totalKills: 0,
            basePoints: 0,
            penaltyPoints: 0,
            totalPoints: 0,
            gamesPlayed: 0,
            rank: parsed.teams.length + 1,
          });
        }
      });

      if (hasNew) {
        saveChampionshipState(tournamentId, parsed);
      }
      return parsed;
    }
  } catch (err) {
    console.warn("[ChampionshipService] Read error:", err);
  }

  // Initialize fresh championship state
  const registered = getRegisteredTeams(tournamentId);
  const initialTeams: ChampionshipTeamProgress[] = registered
    .filter((r) => r.status === "approved" || true) // Include all registered teams initially
    .map((r, idx) => ({
      teamId: r.id,
      teamName: r.teamName,
      captainName: r.captainName,
      members: r.members || [],
      games: {},
      penaltyAdjustments: [],
      totalKills: 0,
      basePoints: 0,
      penaltyPoints: 0,
      totalPoints: 0,
      gamesPlayed: 0,
      rank: idx + 1,
    }));

  const freshState: ChampionshipState = {
    tournamentId,
    totalGames: Math.max(1, defaultTotalGames || 5),
    currentGame: 1,
    isCompleted: false,
    teams: initialTeams,
    lastUpdated: new Date().toISOString(),
  };

  saveChampionshipState(tournamentId, freshState);
  return freshState;
}

/**
 * Save championship state to localStorage and update Supabase leaderboard
 */
export function saveChampionshipState(tournamentId: string, state: ChampionshipState): void {
  try {
    // Re-calculate ranks and totals
    const recalculatedTeams = state.teams.map((team) => {
      let totalKills = 0;
      let basePoints = 0;
      const gameEntries = Object.values(team.games || {});

      gameEntries.forEach((g) => {
        totalKills += g.kills || 0;
        basePoints += g.totalPoints || 0;
      });

      const penaltySum = (team.penaltyAdjustments || []).reduce(
        (acc, adj) => acc + (adj.pointsDelta || 0),
        0
      );

      const finalTotalPoints = Math.round((basePoints + penaltySum) * 10) / 10;

      return {
        ...team,
        totalKills,
        basePoints,
        penaltyPoints: penaltySum,
        totalPoints: finalTotalPoints,
        gamesPlayed: gameEntries.length,
      };
    });

    // Sort by totalPoints desc, then totalKills desc
    recalculatedTeams.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return b.totalKills - a.totalKills;
    });

    // Assign 1-indexed ranks
    recalculatedTeams.forEach((team, idx) => {
      team.rank = idx + 1;
    });

    const updatedState: ChampionshipState = {
      ...state,
      teams: recalculatedTeams,
      lastUpdated: new Date().toISOString(),
      championTeamId: state.isCompleted && recalculatedTeams[0] ? recalculatedTeams[0].teamId : state.championTeamId,
      championTeamName: state.isCompleted && recalculatedTeams[0] ? recalculatedTeams[0].teamName : state.championTeamName,
    };

    localStorage.setItem(
      `${CHAMPIONSHIP_STORAGE_PREFIX}${tournamentId}`,
      JSON.stringify(updatedState)
    );

    // Sync to Supabase tournament_leaderboards in background
    syncChampionshipToDatabase(updatedState).catch((e) =>
      console.warn("[ChampionshipService] DB sync non-blocking error:", e)
    );
  } catch (err) {
    console.warn("[ChampionshipService] Save error:", err);
  }
}

/**
 * Record a verified game result for a team
 */
export function recordGameSubmission(
  tournamentId: string,
  teamId: string,
  gameNumber: number,
  submission: GameSubmission
): ChampionshipState {
  const state = getChampionshipState(tournamentId);

  let targetTeam = state.teams.find((t) => t.teamId === teamId);
  if (!targetTeam) {
    // If not found, create new entry
    const registered = getRegisteredTeams(tournamentId);
    const reg = registered.find((r) => r.id === teamId);
    targetTeam = {
      teamId,
      teamName: reg?.teamName || "Squadra",
      captainName: reg?.captainName || "Capitano",
      members: reg?.members || [],
      games: {},
      penaltyAdjustments: [],
      totalKills: 0,
      basePoints: 0,
      penaltyPoints: 0,
      totalPoints: 0,
      gamesPlayed: 0,
      rank: state.teams.length + 1,
    };
    state.teams.push(targetTeam);
  }

  targetTeam.games[gameNumber] = submission;
  saveChampionshipState(tournamentId, state);
  return getChampionshipState(tournamentId);
}

/**
 * Apply manual Admin penalty or bonus with MANDATORY motivation note
 */
export function applyAdminPointAdjustment(
  tournamentId: string,
  teamId: string,
  pointsDelta: number,
  reason: string,
  adminName: string,
  adminId: string
): { success: boolean; state: ChampionshipState; message: string } {
  const cleanReason = reason.trim();
  if (!cleanReason) {
    throw new Error("La motivazione della penalità/correzione è obbligatoria.");
  }

  const state = getChampionshipState(tournamentId);
  const targetTeam = state.teams.find((t) => t.teamId === teamId);
  if (!targetTeam) {
    throw new Error("Squadra non trovata per l'assegnazione della penalità.");
  }

  const adjustment: AdminPointAdjustment = {
    id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    teamId,
    teamName: targetTeam.teamName,
    pointsDelta,
    reason: cleanReason,
    adminName: adminName || "Organizzatore",
    adminId,
    createdAt: new Date().toISOString(),
  };

  if (!targetTeam.penaltyAdjustments) {
    targetTeam.penaltyAdjustments = [];
  }
  targetTeam.penaltyAdjustments.push(adjustment);

  saveChampionshipState(tournamentId, state);
  const updatedState = getChampionshipState(tournamentId);

  const sign = pointsDelta > 0 ? `+${pointsDelta}` : `${pointsDelta}`;
  const message = `⚖️ Modifica applicata: ${sign} punti a "${targetTeam.teamName}". Motivazione: "${cleanReason}".`;

  return { success: true, state: updatedState, message };
}

/**
 * Advance championship to next game
 */
export function setChampionshipCurrentGame(
  tournamentId: string,
  gameNumber: number
): ChampionshipState {
  const state = getChampionshipState(tournamentId);
  state.currentGame = Math.max(1, Math.min(state.totalGames, gameNumber));
  saveChampionshipState(tournamentId, state);
  return getChampionshipState(tournamentId);
}

/**
 * Conclude the championship and decree champion team
 */
export function concludeChampionship(tournamentId: string): ChampionshipState {
  const state = getChampionshipState(tournamentId);
  state.isCompleted = true;
  if (state.teams.length > 0) {
    state.championTeamId = state.teams[0].teamId;
    state.championTeamName = state.teams[0].teamName;
  }
  saveChampionshipState(tournamentId, state);
  return getChampionshipState(tournamentId);
}

/**
 * Re-open championship if needed
 */
export function reopenChampionship(tournamentId: string): ChampionshipState {
  const state = getChampionshipState(tournamentId);
  state.isCompleted = false;
  saveChampionshipState(tournamentId, state);
  return getChampionshipState(tournamentId);
}

/**
 * Sync championship teams to Supabase tournament_leaderboards
 */
async function syncChampionshipToDatabase(state: ChampionshipState): Promise<void> {
  if (!state.tournamentId) return;

  try {
    for (const team of state.teams) {
      await supabase.from("tournament_leaderboards").upsert(
        {
          tournament_id: state.tournamentId,
          team_id: team.teamId,
          team_name: team.teamName,
          total_kills: team.totalKills,
          total_score: team.totalPoints,
          matches_played: team.gamesPlayed,
        },
        { onConflict: "tournament_id, team_id" }
      );
    }
  } catch (err) {
    // ignore
  }
}
