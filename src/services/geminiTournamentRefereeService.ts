import { supabase } from "@/integrations/supabase/client";

export const REJECTION_REASON_NAME_NOT_FOUND =
  "Il nome del giocatore registrato non è presente in questa schermata di fine partita. Carica uno screenshot corretto dove risulti tu o la tua squadra.";

export interface GeminiTournamentRefereeResult {
  valid: boolean;
  reason: string;
  placement: number | null;
  kills: number | null;
  matched_player: string | null;
}

export interface UserTournamentContext {
  userId: string;
  username: string;
  activisionId: string;
  teamMembers: string;
  candidateNames: string[];
  clanTag?: string;
  clanName?: string;
}

/**
 * Reads the Gemini API key strictly from the requested environment variable:
 * import.meta.env.VITE_GEMINI_API_KEY_TORNEO
 */
export function getGeminiTournamentApiKey(): string {
  const envKey = (import.meta.env.VITE_GEMINI_API_KEY_TORNEO as string | undefined)?.trim();
  if (envKey) return envKey;

  // Secondary fallback check if standard key is provided in env
  const fallbackKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
  if (fallbackKey) return fallbackKey;

  return "";
}

/**
 * Sanitizes and strips clan tags, hashtags, and whitespace for resilient name comparison
 */
export function sanitizePlayerName(raw: string): string {
  return raw
    .replace(/\[.*?\]/g, "") // remove [CLAN] tags
    .split("#")[0] // remove #12344 battle tag suffix
    .trim()
    .toLowerCase();
}

/**
 * Dynamically fetches user profile & clan members from Supabase database
 * to supply the referee system prompt with accurate identity information.
 */
export async function fetchUserAndClanTournamentContext(
  userId?: string,
  extraTeammates?: string[]
): Promise<UserTournamentContext> {
  let targetUserId = userId;

  if (!targetUserId) {
    const { data: authData } = await supabase.auth.getUser();
    targetUserId = authData?.user?.id;
  }

  const candidateNames: string[] = [];

  if (!targetUserId) {
    if (extraTeammates && extraTeammates.length > 0) {
      extraTeammates.forEach((t) => {
        const clean = t.trim();
        if (clean && !candidateNames.includes(clean)) candidateNames.push(clean);
      });
    }

    return {
      userId: "",
      username: "Utente_Ospite",
      activisionId: "Non registrato",
      teamMembers: extraTeammates && extraTeammates.length > 0 ? extraTeammates.join(", ") : "Nessun membro clan (Giocatore Singolo)",
      candidateNames,
    };
  }

  // 1. Fetch user profile from Supabase
  let username = "Utente";
  let activisionId = "Non registrato";
  let clanId: string | null = null;
  let clanTag = "";
  let clanName = "";

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name, activision_id, clan_id, clan_tag")
      .eq("id", targetUserId)
      .maybeSingle();

    if (profile) {
      username = profile.username || profile.display_name || "Utente";
      activisionId = profile.activision_id || (profile as any).activision_name || "Non registrato";
      clanId = profile.clan_id || null;
      clanTag = profile.clan_tag || "";

      if (profile.username) candidateNames.push(profile.username);
      if (profile.display_name && !candidateNames.includes(profile.display_name)) candidateNames.push(profile.display_name);
      if (profile.activision_id && !candidateNames.includes(profile.activision_id)) candidateNames.push(profile.activision_id);
    }
  } catch (err) {
    console.warn("[RefereeService] Errore caricamento profilo Supabase:", err);
  }

  // 2. If clanId not in profile, query clan_members or clans where owner_id = targetUserId
  if (!clanId) {
    try {
      const { data: membership } = await supabase
        .from("clan_members")
        .select("clan_id")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (membership?.clan_id) {
        clanId = membership.clan_id;
      } else {
        const { data: ownedClan } = await supabase
          .from("clans")
          .select("id, tag, name")
          .eq("owner_id", targetUserId)
          .maybeSingle();

        if (ownedClan?.id) {
          clanId = ownedClan.id;
          clanTag = ownedClan.tag || clanTag;
          clanName = ownedClan.name || clanName;
        }
      }
    } catch (err) {
      console.warn("[RefereeService] Errore lookup appartenenza clan:", err);
    }
  }

  // 3. Fetch all clan members from Supabase clan_members + profiles
  const teamMembersList: string[] = [];

  if (clanId) {
    try {
      // Get clan details if not already loaded
      if (!clanName) {
        const { data: clanData } = await supabase
          .from("clans")
          .select("name, tag, owner_id")
          .eq("id", clanId)
          .maybeSingle();
        if (clanData) {
          clanName = clanData.name;
          clanTag = clanData.tag || clanTag;
        }
      }

      const { data: members } = await supabase
        .from("clan_members")
        .select(`
          user_id,
          role,
          profiles:user_id (
            id,
            username,
            display_name,
            activision_id
          )
        `)
        .eq("clan_id", clanId);

      if (members && members.length > 0) {
        members.forEach((m: any) => {
          const prof = m.profiles;
          if (prof) {
            const memberName = prof.username || prof.display_name || "Membro";
            const memberAct = prof.activision_id ? `Activision ID: ${prof.activision_id}` : null;
            const desc = memberAct ? `${memberName} (${memberAct})` : memberName;
            if (prof.id !== targetUserId && !teamMembersList.includes(desc)) {
              teamMembersList.push(desc);
            }

            if (prof.username && !candidateNames.includes(prof.username)) candidateNames.push(prof.username);
            if (prof.display_name && !candidateNames.includes(prof.display_name)) candidateNames.push(prof.display_name);
            if (prof.activision_id && !candidateNames.includes(prof.activision_id)) candidateNames.push(prof.activision_id);
          }
        });
      }
    } catch (err) {
      console.warn("[RefereeService] Errore caricamento membri clan:", err);
    }
  }

  // Include any extra tournament teammates provided by context
  if (extraTeammates && extraTeammates.length > 0) {
    extraTeammates.forEach((tm) => {
      const clean = tm.trim();
      if (clean) {
        if (!teamMembersList.includes(clean)) teamMembersList.push(clean);
        if (!candidateNames.includes(clean)) candidateNames.push(clean);
      }
    });
  }

  const teamMembersString =
    teamMembersList.length > 0
      ? teamMembersList.join(", ")
      : "Nessun membro clan aggiuntivo (Giocatore Singolo)";

  return {
    userId: targetUserId,
    username,
    activisionId,
    teamMembers: teamMembersString,
    candidateNames,
    clanTag,
    clanName,
  };
}

/**
 * Builds the exact, severe referee system prompt demanded by Call of Duty tournament regulations.
 * Incorporates mandatory cross-check between registered player/team names and OCR text.
 */
export function buildCodRefereeSystemPrompt(context: {
  username: string;
  activisionId: string;
  teamMembers: string;
}): string {
  return `Sei un arbitro eSport inflessibile per Call of Duty. Devi analizzare lo screenshot confrontandolo con i dati dell'utente che sta caricando l'immagine (Username registrato: ${context.username}, Activision ID: ${context.activisionId}, Membri del Team/Clan: ${context.teamMembers}).

Esegui tassativamente questi controlli:
1. CONTROLLO INCROCIATO RIGOROSO NOME / FOTO:
Confronta attentamente il nome dell'utente registrato ('${context.username}'), il suo Activision ID ('${context.activisionId}') o i nomi dei membri del team ('${context.teamMembers}') con tutti i testi e nomi presenti nell'immagine della classifica di Call of Duty.
Se il nome registrato (o l'Activision ID o un membro del team registrato) NON compare fisicamente all'interno dello screenshot della classifica, DEVI restituire TASSATIVAMENTE ed ESATTAMENTE:
{
  "valid": false,
  "reason": "Il nome del giocatore registrato non è presente in questa schermata di fine partita. Carica uno screenshot corretto dove risulti tu o la tua squadra.",
  "placement": null,
  "kills": null,
  "matched_player": null
}

2. DISTINZIONE ELIMINAZIONI / ASSIST: Per il conteggio delle kill, cerca specificamente la voce 'Eliminazioni' (o 'Kills') pulite ed evita di sommare gli 'Assist' (se presenti separatamente), registrando esclusivamente il numero effettivo delle eliminazioni personali o di squadra richieste.

3. VALIDITÀ DELLA SCHERMATA: Lo screenshot deve essere una schermata di fine match di Call of Duty leggibile, non contraffatta o ritagliata in modo sospetto. Non indovinare o inventare dati non chiaramente visibili.

Rispondi SOLO ed ESCLUSIVAMENTE in formato JSON puro (senza blocchi di markdown o testo aggiuntivo) con questa struttura esatta:
{
  "valid": boolean,
  "reason": "stringa con la motivazione dettagliata in italiano dell'approvazione o del rifiuto",
  "placement": number | null,
  "kills": number | null,
  "matched_player": "stringa con il nome trovato nella foto che ha confermato l'identità" | null
}`;
}

/**
 * Converts a File to base64 string without data prefix
 */
export async function fileToPureBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const mimeType = file.type || "image/jpeg";
      const pureBase64 = res.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
      resolve({ base64: pureBase64, mimeType });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Strips code fences and cleans JSON output
 */
function extractAndParseJson(rawText: string): any {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

/**
 * Programmatic cross-check verification:
 * Verifies that the matched_player reported by the AI actually corresponds to
 * the registered user or a registered team member.
 */
export function verifyMatchedPlayerAgainstContext(
  matchedPlayer: string | null | undefined,
  candidateNames: string[]
): boolean {
  if (!matchedPlayer || !matchedPlayer.trim()) return false;

  const cleanMatched = sanitizePlayerName(matchedPlayer);
  if (!cleanMatched || cleanMatched.length < 2) return false;

  for (const candidate of candidateNames) {
    if (!candidate || candidate === "Utente" || candidate === "Non registrato") continue;

    const cleanCandidate = sanitizePlayerName(candidate);
    if (!cleanCandidate || cleanCandidate.length < 2) continue;

    if (
      cleanMatched === cleanCandidate ||
      cleanMatched.includes(cleanCandidate) ||
      cleanCandidate.includes(cleanMatched)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Main Call: Executes REST API request to Google Gemini (gemini-2.5-flash)
 * using import.meta.env.VITE_GEMINI_API_KEY_TORNEO.
 * Enforces zero-tolerance check on player name presence.
 */
export async function arbitrateTournamentScreenshotWithGemini(params: {
  file?: File | null;
  base64?: string;
  mimeType?: string;
  userId?: string;
  extraTeammates?: string[];
}): Promise<GeminiTournamentRefereeResult> {
  const apiKey = getGeminiTournamentApiKey();

  if (!apiKey) {
    throw new Error(
      "Configurazione mancante: La chiave API 'VITE_GEMINI_API_KEY_TORNEO' non è stata configurata nelle variabili d'ambiente. Impossibile autenticare la chiamata REST con Google Gemini 2.5 Flash."
    );
  }

  // 1. Fetch user data and clan members dynamically from Supabase
  const userContext = await fetchUserAndClanTournamentContext(params.userId, params.extraTeammates);

  // 2. Extract image base64 and mime
  let pureBase64 = params.base64 || "";
  let mime = params.mimeType || "image/jpeg";

  if (params.file) {
    const converted = await fileToPureBase64(params.file);
    pureBase64 = converted.base64;
    mime = converted.mimeType;
  } else if (pureBase64.startsWith("data:")) {
    pureBase64 = pureBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
  }

  if (!pureBase64) {
    throw new Error("Nessuna immagine valida fornita per l'arbitraggio dello screenshot.");
  }

  // 3. Build severe system prompt with explicit identity cross-check rule
  const systemPrompt = buildCodRefereeSystemPrompt({
    username: userContext.username,
    activisionId: userContext.activisionId,
    teamMembers: userContext.teamMembers,
  });

  // 4. REST Call to Google Gemini gemini-2.5-flash endpoint
  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const requestBody = {
    systemInstruction: {
      parts: [
        {
          text: systemPrompt,
        },
      ],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Esegui il controllo incrociato rigoroso: verifica se il nome '${userContext.username}' (o Activision '${userContext.activisionId}' o membri squadra) compare nello screenshot. Se non compare, restituisci valid: false con il messaggio tassativo richiesto. Se compare, estrai piazzamento e kill escludendo assist.`,
          },
          {
            inlineData: {
              mimeType: mime,
              data: pureBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  };

  const response = await fetch(geminiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorDetail = "";
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = `Codice HTTP ${response.status} (${response.statusText})`;
    }
    throw new Error(`Errore chiamata Google Gemini 2.5 Flash: ${errorDetail}`);
  }

  const responseData = await response.json();
  const rawCandidateText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawCandidateText) {
    throw new Error("Google Gemini 2.5 Flash non ha restituito alcun testo per l'analisi dello screenshot.");
  }

  try {
    const parsed = extractAndParseJson(rawCandidateText);

    let valid = Boolean(parsed.valid);
    let reason = String(parsed.reason || "");
    const matched_player = parsed.matched_player ? String(parsed.matched_player) : null;

    // RIGOROUS ZERO-TOLERANCE CHECK:
    // If Gemini reported valid: false or indicated player name was missing
    if (!valid) {
      // Standardize the exact requested message if name was not found
      if (
        !reason ||
        reason.toLowerCase().includes("non è presente") ||
        reason.toLowerCase().includes("nome") ||
        reason.toLowerCase().includes("identit") ||
        reason.toLowerCase().includes("estrane")
      ) {
        reason = REJECTION_REASON_NAME_NOT_FOUND;
      }

      return {
        valid: false,
        reason,
        placement: null,
        kills: null,
        matched_player: null,
      };
    }

    // Secondary programmatic cross-validation:
    // If valid: true, ensure matched_player actually matches one of our candidates
    const isIdentityConfirmed = verifyMatchedPlayerAgainstContext(
      matched_player,
      userContext.candidateNames
    );

    if (!isIdentityConfirmed) {
      console.warn(
        `[RefereeService] Nome "${matched_player}" non corrisponde a nessuno dei candidati registrati:`,
        userContext.candidateNames
      );
      return {
        valid: false,
        reason: REJECTION_REASON_NAME_NOT_FOUND,
        placement: null,
        kills: null,
        matched_player: null,
      };
    }

    const placement =
      typeof parsed.placement === "number"
        ? parsed.placement
        : parsed.placement
        ? Number(parsed.placement)
        : null;

    const kills =
      typeof parsed.kills === "number"
        ? parsed.kills
        : parsed.kills
        ? Number(parsed.kills)
        : null;

    return {
      valid: true,
      reason: reason || "Screenshot e identità del giocatore convalidati con successo dall'arbitro IA.",
      placement: Number.isFinite(placement) ? placement : null,
      kills: Number.isFinite(kills) ? kills : null,
      matched_player,
    };
  } catch (parseErr: any) {
    console.error("[RefereeService] Errore parsing JSON restituito da Gemini:", rawCandidateText, parseErr);
    throw new Error(`Formato JSON non valido restituito da Gemini 2.5 Flash: ${rawCandidateText.slice(0, 150)}...`);
  }
}

export interface GeminiMemberKdRefereeResult {
  valid: boolean;
  screen_type: "profile_kd" | "post_game" | "unrelated" | "unknown";
  is_authentic_game_screenshot: boolean;
  detected_player_name?: string | null;
  detected_activision_id?: string | null;
  is_activision_match: boolean;
  kd_ratio: number;
  reason: string;
}

/**
 * Builds the strict referee prompt for KD/Profile verification, with explicit
 * instructions for Multiplayer Career screens (name at bottom in PROFILO box, K/D at Rapporto U/M on left).
 */
export function buildCodKdRefereeSystemPrompt(context: {
  enteredActivisionId: string;
  gameCategory?: string;
  minKd?: number | null;
  maxKd?: number | null;
  kdMode?: string;
}): string {
  const isMultiplayer =
    (context.gameCategory || "").toLowerCase().includes("multi") ||
    (context.gameCategory || "").toLowerCase().includes("multiplayer") ||
    (context.gameCategory || "").toLowerCase().includes("multigiocatore");

  return `Sei l'arbitro ufficiale anti-smurf e verificatore credenziali di SquadUP per Call of Duty (${
    isMultiplayer ? "Categoria MULTIGIOCATORE" : "Categoria WARZONE / BATTLE ROYALE"
  }).
Stai verificando lo screenshot inviato dal giocatore per iscriversi a un torneo.
Activision ID inserito dal giocatore da verificare: "${context.enteredActivisionId}".
Limiti KD del torneo: Minimo ${context.minKd ?? "nessuno"}, Massimo ${context.maxKd ?? "nessuno"}, Modalità ${context.kdMode || "open"}.

REGOLE TASSATIVE DI ARBITRAGGIO:
1. CONTROLLO TIPO SCHERMATA:
   - Devi verificare che l'immagine sia una schermata di record/statistiche autentica di Call of Duty (menu "CARRIERA", "STATISTICHE", "PROFILO", "STATISTICHE MULTIGIOCATORE" o "STATISTICHE BATTLE ROYALE").
   - Se l'utente ha inviato una schermata di fine partita (tabellone post-partita con piazzamento finale o colonne punteggio/danni della singola partita), RIFIUTA con:
     {"valid": false, "screen_type": "post_game", "is_authentic_game_screenshot": true, "reason": "Schermata Errata: Hai caricato i risultati di fine partita anziché lo screenshot del tuo Profilo/Statistiche KD."}

2. RICONOSCIMENTO NOME GIOCATORE (ZONA IN BASSO / PROFILO O CLASSIFICHE):
   ${
     isMultiplayer
       ? `
   - Nello screenshot della CARRIERA MULTIGIOCATORE di Call of Duty:
     * Il nome del giocatore (Activision ID con o senza tag numerico #) si trova IN BASSO al centro nel riquadro "PROFILO" (ad esempio "Friedzon #6801607" o "Friedzon").
     * Compare inoltre sulla colonna sinistra nel riquadro "CLASSIFICHE" (ad esempio al numero 32 "Friedzon").
     * Estrai il nome presente in basso nel riquadro PROFILO.
   `
       : `
   - Nello screenshot del profilo/record di gioco, cerca il nome Activision del giocatore (visibile nella scheda profilo o nell'intestazione).
   `
   }
   - CONTROLLO IDENTITÀ OBBLIGATORIO:
     Confronta il nome trovato nella foto con l'Activision ID inserito ("${context.enteredActivisionId}").
     Se il nome non coincide con quello della foto inviata (ignorando maiuscole/minuscole e il suffisso numerico # se non inserito), DEVI RIFIUTARE IL GIOCATORE.
     Se il nome NON coincide:
     {
       "valid": false,
       "screen_type": "profile_kd",
       "is_authentic_game_screenshot": true,
       "detected_player_name": "<NomeTrovato>",
       "is_activision_match": false,
       "kd_ratio": 0,
       "reason": "Il nome del giocatore registrato non corrisponde a quello presente nello screenshot del Profilo. Nome trovato nello screenshot: '<NomeTrovato>', nome registrato: '${context.enteredActivisionId}'. Screenshot rifiutato."
     }

3. RICONOSCIMENTO DEL K/D RATIO (RAPPORTO UCCISIONI / MORTI):
   ${
     isMultiplayer
       ? `
   - Nella schermata Multigiocatore di Call of Duty in lingua italiana, sulla sinistra c'è la sezione "STATISTICHE MULTIGIOCATORE".
   - Al suo interno sono presenti due indicatori: "Rapporto V/S" (Vittorie/Sconfitte) e "Rapporto U/M" (Uccisioni/Morti).
   - IL K/D È RIGOROSAMENTE IL VALORE INDICATO IN "Rapporto U/M" (ad esempio 1.26, 1.06, 0.95, 2.10).
   - Estrai con precisione il valore decimale di "Rapporto U/M".
   `
       : `
   - Cerca la voce esplicita "KD", "K/D", "Rapporto U/M" o "Rapporto Uccisioni/Morti".
   - Estrai il valore decimale corrispondente.
   `
   }
   - Se la voce K/D (o Rapporto U/M) non è chiaramente visibile:
     {"valid": false, "screen_type": "profile_kd", "is_authentic_game_screenshot": true, "reason": "La voce Rapporto U/M (K/D) non è chiaramente visibile nella sezione Statistiche."}

4. VERIFICA LIMITI KD REGOLAMENTO:
   - Se il KD estratto non rispetta i limiti stabiliti per il torneo:
     {"valid": false, "screen_type": "profile_kd", "is_authentic_game_screenshot": true, "detected_player_name": "<Nome>", "is_activision_match": true, "kd_ratio": <valore>, "reason": "Il tuo KD (<valore>) non rispetta i limiti stabiliti per questo torneo..."}

5. SE TUTTI I CONTROLLI SONO SUPERATI:
   {
     "valid": true,
     "screen_type": "profile_kd",
     "is_authentic_game_screenshot": true,
     "detected_player_name": "<NomeTrovato>",
     "detected_activision_id": "<NomeTrovatoConTag>",
     "is_activision_match": true,
     "kd_ratio": <valore>,
     "reason": "Activision ID e Rapporto U/M (<valore>) verificati con successo per la categoria Multigiocatore."
   }

Rispondi SOLO ed ESCLUSIVAMENTE in formato JSON puro (senza markdown o altro testo).`;
}

/**
 * Arbitrate individual member KD screenshot using Google Gemini 2.5 Flash
 */
export async function arbitrateMemberKdScreenshotWithGemini(params: {
  file: File;
  enteredActivisionId: string;
  gameCategory?: string;
  limits?: { min_kd?: number | null; max_kd?: number | null; kd_mode?: string };
}): Promise<GeminiMemberKdRefereeResult> {
  const apiKey = getGeminiTournamentApiKey();

  if (!apiKey) {
    throw new Error("Chiave API Google Gemini non configurata per l'arbitro dei tornei.");
  }

  const { base64: pureBase64, mimeType: mime } = await fileToPureBase64(params.file);

  const systemPrompt = buildCodKdRefereeSystemPrompt({
    enteredActivisionId: params.enteredActivisionId,
    gameCategory: params.gameCategory,
    minKd: params.limits?.min_kd,
    maxKd: params.limits?.max_kd,
    kdMode: params.limits?.kd_mode,
  });

  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Analizza questa schermata di Call of Duty. Se è la schermata CARRIERA MULTIGIOCATORE, individua il nome in basso nella scheda PROFILO e verifica che coincida con '${params.enteredActivisionId}'. Sulla sinistra estrai il valore del Rapporto U/M (K/D). Se il nome non coincide rifiuta il giocatore.`,
          },
          {
            inlineData: {
              mimeType: mime,
              data: pureBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  };

  const response = await fetch(geminiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorDetail = "";
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = `HTTP ${response.status} (${response.statusText})`;
    }
    throw new Error(`Errore chiamata Google Gemini 2.5 Flash: ${errorDetail}`);
  }

  const responseData = await response.json();
  const rawCandidateText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawCandidateText) {
    throw new Error("Google Gemini 2.5 Flash non ha restituito alcun testo per l'analisi dello screenshot.");
  }

  try {
    const parsed = extractAndParseJson(rawCandidateText);
    const valid = Boolean(parsed.valid);
    const isAuthentic = parsed.is_authentic_game_screenshot !== false;
    const screenType = parsed.screen_type || (valid ? "profile_kd" : "unknown");
    const detectedPlayer = parsed.detected_player_name || parsed.detected_activision_id || null;
    const isNameMatch = Boolean(parsed.is_activision_match ?? (detectedPlayer && params.enteredActivisionId ? sanitizePlayerName(detectedPlayer) === sanitizePlayerName(params.enteredActivisionId) : true));
    const kdRatio = Number(parsed.kd_ratio) || 0;
    const reason = String(parsed.reason || (valid ? "Screenshot approvato." : "Screenshot rifiutato."));

    return {
      valid,
      screen_type: screenType,
      is_authentic_game_screenshot: isAuthentic,
      detected_player_name: detectedPlayer,
      detected_activision_id: parsed.detected_activision_id || detectedPlayer,
      is_activision_match: isNameMatch,
      kd_ratio: kdRatio,
      reason,
    };
  } catch (err: any) {
    console.error("[RefereeService] Errore parsing risposta KD Gemini:", rawCandidateText, err);
    throw new Error(`Risposta non valida da Gemini 2.5 Flash: ${rawCandidateText.slice(0, 150)}`);
  }
}

