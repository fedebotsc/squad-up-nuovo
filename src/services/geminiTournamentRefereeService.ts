import { supabase } from "@/integrations/supabase/client";

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

  if (!targetUserId) {
    return {
      userId: "",
      username: "Utente_Ospite",
      activisionId: "Non registrato",
      teamMembers: extraTeammates && extraTeammates.length > 0 ? extraTeammates.join(", ") : "Nessun membro clan (Giocatore Singolo)",
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
      if (clean && !teamMembersList.includes(clean)) {
        teamMembersList.push(clean);
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
    clanTag,
    clanName,
  };
}

/**
 * Builds the exact, severe referee system prompt demanded by Call of Duty tournament regulations.
 */
export function buildCodRefereeSystemPrompt(context: {
  username: string;
  activisionId: string;
  teamMembers: string;
}): string {
  return `Sei un arbitro eSport inflessibile per Call of Duty. Devi analizzare lo screenshot confrontandolo con i dati dell'utente che sta caricando l'immagine (Username registrato: ${context.username}, Activision ID: ${context.activisionId}, Membri del Team/Clan: ${context.teamMembers}).

Esegui tassativamente questi controlli:
1. VERIFICA IDENTITÀ: Cerca nell'immagine il nome utente o l'Activision ID registrato. L'immagine DEVE appartenere al giocatore o a un membro del suo team. Se lo screenshot appartiene a un giocatore estraneo o non verificabile, imposta \`valid: false\` e motiva il rifiuto.
2. DISTINZIONE ELIMINAZIONI / ASSIST: Per il conteggio delle kill, cerca specificamente la voce 'Eliminazioni' (o 'Kills') pulite ed evita di sommare gli 'Assist' (se presenti separatamente), registrando esclusivamente il numero effettivo delle eliminazioni personali o di squadra richieste.
3. VALIDITÀ DELLA SCHERMATA: Lo screenshot deve essere una schermata di fine match di Call of Duty leggibile, non contraffatta o ritagliata in modo sospetto.

Rispondi SOLO ed ESCLUSIVAMENTE in formato JSON puro (senza blocchi di markdown o testo aggiuntivo) con questa struttura esatta:
{
  "valid": boolean,
  "reason": "stringa con la motivazione dettagliata in italiano dell'approvazione o del rifiuto",
  "placement": number | null,
  "kills": number | null,
  "matched_player": "stringa con il nome trovato nella foto che ha confermato l'identità"
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
  // If JSON is surrounded by other characters
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

/**
 * Main Call: Executes REST API request to Google Gemini (gemini-2.5-flash)
 * using import.meta.env.VITE_GEMINI_API_KEY_TORNEO.
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

  // 3. Build severe system prompt
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
            text: `Analizza questo screenshot finale del match di Call of Duty in conformità con i controlli inflessibili di verifica identità (giocatore o team), eliminazioni pulite ed esclusione assist. Restituisci esclusivamente il JSON formattato.`,
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

    const valid = Boolean(parsed.valid);
    const reason = String(parsed.reason || (valid ? "Screenshot approvato dall'arbitro IA." : "Screenshot respinto."));
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
    const matched_player = parsed.matched_player ? String(parsed.matched_player) : null;

    return {
      valid,
      reason,
      placement: Number.isFinite(placement) ? placement : null,
      kills: Number.isFinite(kills) ? kills : null,
      matched_player,
    };
  } catch (parseErr) {
    console.error("[RefereeService] Errore parsing JSON restituito da Gemini:", rawCandidateText, parseErr);
    throw new Error(`Formato JSON non valido restituito da Gemini 2.5 Flash: ${rawCandidateText.slice(0, 150)}...`);
  }
}
