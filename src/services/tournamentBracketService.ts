export interface TournamentMember {
  activisionId: string;
  screenshotUrl?: string;
  detectedActivisionId?: string;
  detectedKd?: number;
  isActivisionMatch?: boolean;
  isKdCompliant?: boolean;
  aiStatus?: "pending" | "approved" | "rejected";
  aiReason?: string;
}

export interface RegisteredTeam {
  id: string;
  tournamentId: string;
  teamName: string;
  captainUserId: string;
  captainName: string;
  members: TournamentMember[];
  status: "pending_approval" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: string;
}

export interface PlayerKillDetail {
  playerName: string;
  actualKills: number; // Colonna UCCISIONI (reale)
  rawEliminations: number; // Colonna ELIMINAZIONI (scartata perché include assist)
  assistsExcluded: number;
}

export interface TeamMatchSubmission {
  teamId: string;
  teamName: string;
  placementScreenshotUrl?: string;
  killsScreenshotUrl?: string;
  placement: number;
  verifiedKills: number;
  discardedEliminations: number;
  playerDetails: PlayerKillDetail[];
  placementScore: number;
  killsScore: number;
  totalScore: number;
  submittedAt: string;
  aiVerificationDetails: {
    strictlyUsedUccisioni: boolean;
    discardedEliminationsColumn: boolean;
    playersMatched: boolean;
    explanation: string;
  };
}

export interface EliminationMatch {
  id: string;
  tournamentId: string;
  round: number; // 1 = Quarti (o primo turno), 2 = Semifinali, 3 = Finale
  roundName: string; // "Quarti di Finale 1", "Semifinale A", "Finalissima"
  matchIndex: number;
  nextMatchId?: string;
  nextMatchSlot?: "team1" | "team2";
  team1: RegisteredTeam | null;
  team2: RegisteredTeam | null;
  team1Submission?: TeamMatchSubmission | null;
  team2Submission?: TeamMatchSubmission | null;
  team1Score: number;
  team2Score: number;
  winnerTeamId?: string | null;
  winnerTeamName?: string | null;
  status: "pending" | "in_progress" | "completed";
  override?: {
    organizerId: string;
    organizerName: string;
    reason: string;
    timestamp: string;
    previousWinnerId?: string | null;
    penaltyOrBonus?: number;
  } | null;
  chatMessages: {
    id: string;
    senderId: string;
    senderName: string;
    teamName?: string;
    text: string;
    timestamp: string;
    isSystem?: boolean;
    isOrganizer?: boolean;
  }[];
}

export interface EliminationBracketState {
  tournamentId: string;
  totalTeams: number; // e.g. 4, 8, 16
  rounds: {
    roundNumber: number;
    roundName: string;
    matches: EliminationMatch[];
  }[];
  isCompleted: boolean;
  championTeam?: RegisteredTeam | null;
}

const BRACKET_STORAGE_PREFIX = "squadup_bracket_";
const REGISTRATIONS_STORAGE_PREFIX = "squadup_registrations_";

/**
 * Get stored registered teams for a tournament
 */
export function getRegisteredTeams(tournamentId: string): RegisteredTeam[] {
  try {
    const raw = localStorage.getItem(`${REGISTRATIONS_STORAGE_PREFIX}${tournamentId}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("[BracketService] Error reading registrations:", err);
  }
  return [];
}

/**
 * Save registered teams
 */
export function saveRegisteredTeams(tournamentId: string, teams: RegisteredTeam[]) {
  try {
    localStorage.setItem(`${REGISTRATIONS_STORAGE_PREFIX}${tournamentId}`, JSON.stringify(teams));
  } catch (err) {
    console.warn("[BracketService] Error saving registrations:", err);
  }
}

/**
 * Initialize single elimination bracket
 */
export function initializeBracket(
  tournamentId: string,
  totalTeams: number = 8,
  teams: RegisteredTeam[] = []
): EliminationBracketState {
  const safeTotal = totalTeams >= 8 ? 8 : 4;
  const numRounds = Math.log2(safeTotal); // 3 rounds for 8 teams, 2 rounds for 4 teams

  const roundNames =
    safeTotal === 8
      ? ["Quarti di Finale", "Semifinali", "Finalissima 🏆"]
      : ["Semifinali", "Finalissima 🏆"];

  const rounds: EliminationBracketState["rounds"] = [];

  // Round 1 matches
  const round1MatchesCount = safeTotal / 2;
  const round1Matches: EliminationMatch[] = [];

  for (let i = 0; i < round1MatchesCount; i++) {
    const team1 = teams[i * 2] || null;
    const team2 = teams[i * 2 + 1] || null;

    round1Matches.push({
      id: `match_${tournamentId}_r1_${i + 1}`,
      tournamentId,
      round: 1,
      roundName: `${roundNames[0]} #${i + 1}`,
      matchIndex: i,
      team1,
      team2,
      team1Score: 0,
      team2Score: 0,
      status: team1 && team2 ? "in_progress" : "pending",
      chatMessages: [
        {
          id: `sys_${Date.now()}_${i}`,
          senderId: "system",
          senderName: "SquadUP Arbitro IA",
          text: `Incontro configurato: ${team1?.teamName || "Squadra da definire"} VS ${team2?.teamName || "Squadra da definire"}. Entrambe le squadre devono caricare gli screenshot di Posizionamento finale e Kill effettive (Colonna UCCISIONI).`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isSystem: true,
        },
      ],
    });
  }

  rounds.push({
    roundNumber: 1,
    roundName: roundNames[0],
    matches: round1Matches,
  });

  // Subsequent rounds (Semifinals, Final)
  for (let r = 2; r <= numRounds; r++) {
    const matchesCount = safeTotal / Math.pow(2, r);
    const roundMatches: EliminationMatch[] = [];

    for (let i = 0; i < matchesCount; i++) {
      roundMatches.push({
        id: `match_${tournamentId}_r${r}_${i + 1}`,
        tournamentId,
        round: r,
        roundName: `${roundNames[r - 1]} ${matchesCount > 1 ? `#${i + 1}` : ""}`.trim(),
        matchIndex: i,
        team1: null,
        team2: null,
        team1Score: 0,
        team2Score: 0,
        status: "pending",
        chatMessages: [
          {
            id: `sys_r${r}_${Date.now()}_${i}`,
            senderId: "system",
            senderName: "SquadUP Arbitro IA",
            text: `Stanza scontro ${roundNames[r - 1]}. I team verranno ammessi automaticamente al completamento del turno precedente.`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isSystem: true,
          },
        ],
      });
    }

    rounds.push({
      roundNumber: r,
      roundName: roundNames[r - 1],
      matches: roundMatches,
    });
  }

  // Link nextMatchId references
  for (let r = 0; r < rounds.length - 1; r++) {
    const currMatches = rounds[r].matches;
    const nextMatches = rounds[r + 1].matches;

    for (let m = 0; m < currMatches.length; m++) {
      const nextMatchIdx = Math.floor(m / 2);
      const slot = m % 2 === 0 ? "team1" : "team2";
      if (nextMatches[nextMatchIdx]) {
        currMatches[m].nextMatchId = nextMatches[nextMatchIdx].id;
        currMatches[m].nextMatchSlot = slot;
      }
    }
  }

  const initialState: EliminationBracketState = {
    tournamentId,
    totalTeams: safeTotal,
    rounds,
    isCompleted: false,
  };

  saveBracketState(tournamentId, initialState);
  return initialState;
}

/**
 * Get or load bracket state from storage
 */
export function getBracketState(tournamentId: string): EliminationBracketState | null {
  try {
    const raw = localStorage.getItem(`${BRACKET_STORAGE_PREFIX}${tournamentId}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("[BracketService] Error reading bracket state:", err);
  }
  return null;
}

/**
 * Save bracket state
 */
export function saveBracketState(tournamentId: string, state: EliminationBracketState) {
  try {
    localStorage.setItem(`${BRACKET_STORAGE_PREFIX}${tournamentId}`, JSON.stringify(state));
  } catch (err) {
    console.warn("[BracketService] Error saving bracket state:", err);
  }
}

/**
 * Advance winner to next round match
 */
export function advanceWinnerInBracket(
  state: EliminationBracketState,
  matchId: string,
  winnerTeam: RegisteredTeam,
  organizerOverride?: { organizerId: string; organizerName: string; reason: string; penaltyOrBonus?: number }
): EliminationBracketState {
  const updatedRounds = state.rounds.map((round) => {
    return {
      ...round,
      matches: round.matches.map((m) => {
        if (m.id !== matchId) return m;

        return {
          ...m,
          winnerTeamId: winnerTeam.id,
          winnerTeamName: winnerTeam.teamName,
          status: "completed" as const,
          override: organizerOverride
            ? {
                organizerId: organizerOverride.organizerId,
                organizerName: organizerOverride.organizerName,
                reason: organizerOverride.reason,
                timestamp: new Date().toISOString(),
                penaltyOrBonus: organizerOverride.penaltyOrBonus,
              }
            : m.override,
        };
      }),
    };
  });

  // Find the match that just finished
  let currentMatch: EliminationMatch | null = null;
  for (const r of updatedRounds) {
    const found = r.matches.find((m) => m.id === matchId);
    if (found) {
      currentMatch = found;
      break;
    }
  }

  // If there's a next match, place this winner into it
  if (currentMatch && currentMatch.nextMatchId) {
    const nextId = currentMatch.nextMatchId;
    const slot = currentMatch.nextMatchSlot || "team1";

    for (const r of updatedRounds) {
      for (const m of r.matches) {
        if (m.id === nextId) {
          if (slot === "team1") {
            m.team1 = winnerTeam;
          } else {
            m.team2 = winnerTeam;
          }
          if (m.team1 && m.team2) {
            m.status = "in_progress";
            m.chatMessages.push({
              id: `sys_ready_${Date.now()}`,
              senderId: "system",
              senderName: "SquadUP Arbitro IA",
              text: `⚔️ Scontro pronto: ${m.team1.teamName} VS ${m.team2.teamName}! Potete caricare le vostre prove (Posizionamento e Kill effettive).`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              isSystem: true,
            });
          }
        }
      }
    }
  }

  // Check if final round is completed to set champion
  const finalRound = updatedRounds[updatedRounds.length - 1];
  const finalMatch = finalRound.matches[0];
  let champion: RegisteredTeam | null = null;
  let isCompleted = false;

  if (finalMatch && finalMatch.status === "completed" && finalMatch.winnerTeamId) {
    isCompleted = true;
    champion = finalMatch.winnerTeamId === finalMatch.team1?.id ? finalMatch.team1 : finalMatch.team2;
  }

  const newState: EliminationBracketState = {
    ...state,
    rounds: updatedRounds,
    isCompleted,
    championTeam: champion || state.championTeam,
  };

  saveBracketState(state.tournamentId, newState);
  return newState;
}

/**
 * Generate sample approved teams for testing the tournament bracket
 */
export function generateSampleTeamsForBracket(tournamentId: string, teamSize: number = 3): RegisteredTeam[] {
  const sampleNames = [
    { team: "Cyber Wolves", captain: "Ghost_Killa", activision: "Ghost_Killa#98213", kd: 1.85 },
    { team: "Apex Strikers", captain: "Viper_CoD", activision: "Viper_CoD#44120", kd: 1.95 },
    { team: "Phantom Ghosts", captain: "ShadowSniper", activision: "ShadowSniper#77211", kd: 1.65 },
    { team: "Titan Vanguard", captain: "Bravo_Leader", activision: "Bravo_Leader#11099", kd: 2.10 },
    { team: "Omega Syndicate", captain: "EchoRecon", activision: "EchoRecon#88341", kd: 1.70 },
    { team: "Valkyrie Storm", captain: "Valkyrie_X", activision: "Valkyrie_X#66542", kd: 2.25 },
    { team: "Solaris Eclipse", captain: "Solaris_One", activision: "Solaris_One#33411", kd: 1.55 },
    { team: "Nemesis Prime", captain: "Nemesis_99", activision: "Nemesis_99#55122", kd: 1.90 },
  ];

  return sampleNames.map((s, idx) => {
    const members: TournamentMember[] = [];
    for (let m = 0; m < teamSize; m++) {
      const suffix = m === 0 ? "" : `_M${m + 1}`;
      const actId = m === 0 ? s.activision : `${s.captain}${suffix}#${10000 + m * 555}`;
      const memberKd = Number((s.kd + (m * 0.1 - 0.05)).toFixed(2));

      members.push({
        activisionId: actId,
        detectedActivisionId: actId,
        detectedKd: memberKd,
        isActivisionMatch: true,
        isKdCompliant: true,
        aiStatus: "approved",
        aiReason: "Activision ID e KD verificati con successo da IA Vision.",
      });
    }

    return {
      id: `sample_team_${tournamentId}_${idx + 1}`,
      tournamentId,
      teamName: s.team,
      captainUserId: `sample_user_${idx + 1}`,
      captainName: s.captain,
      members,
      status: "approved",
      createdAt: new Date().toISOString(),
    };
  });
}
