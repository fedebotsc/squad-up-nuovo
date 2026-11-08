// OpenRouter & Gemini Flash integration for SquadUP
// Handles AI Tournament Generation & Multimodal Screenshot OCR

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const PRIMARY_MODEL = "google/gemini-2.0-flash-001";
const FALLBACK_MODEL = "google/gemini-flash-1.5";

export interface GeneratedTournamentStructure {
  name: string;
  game_mode: string;
  type: "elimination" | "groups_and_knockout" | "championship" | "round_robin";
  team_limit: number;
  prize_description: string;
  rules: string;
  starts_in_hours: number;
  phases_summary: string;
  leaderboard_settings: {
    format: "teams" | "solo";
    kill_points: number;
    placement_points: Record<string, number>;
  };
  initial_matches: Array<{
    round_name: string;
    player1_name: string;
    player2_name: string;
  }>;
}

export interface MatchScreenshotAnalysis {
  score_player1: number;
  score_player2: number;
  winner: "player1" | "player2" | "draw";
  player1_details?: {
    kills?: number;
    damage?: number;
    goals?: number;
    placement?: number;
  };
  player2_details?: {
    kills?: number;
    damage?: number;
    goals?: number;
    placement?: number;
  };
  confidence: number;
  explanation: string;
  raw?: any;
}

/**
 * Retrieve OpenRouter API key from env or localStorage
 */
export const getOpenRouterApiKey = (): string => {
  const envKey = (import.meta as any).env?.VITE_OPENROUTER_API_KEY || (import.meta as any).env?.OPENROUTER_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();

  try {
    const saved = localStorage.getItem("squadup_openrouter_api_key");
    if (saved && saved.trim()) return saved.trim();
  } catch (e) {
    // ignore
  }

  return "";
};

/**
 * Save user OpenRouter API key in localStorage
 */
export const setOpenRouterApiKey = (key: string): void => {
  try {
    localStorage.setItem("squadup_openrouter_api_key", key.trim());
  } catch (e) {
    console.error("Impossibile salvare la chiave OpenRouter in localStorage:", e);
  }
};

/**
 * Helper to convert a File to base64
 */
export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/**
 * Call OpenRouter Chat Completions
 */
async function callOpenRouter(
  messages: any[],
  apiKey: string,
  model = PRIMARY_MODEL,
  responseFormatJson = true
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://squadup.app",
    "X-Title": "SquadUP Competitivo",
  };

  const payload: any = {
    model,
    messages,
    temperature: 0.2,
  };

  if (responseFormatJson) {
    payload.response_format = { type: "json_object" };
  }

  let response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  // If primary model failed, try fallback model
  if (!response.ok && model !== FALLBACK_MODEL) {
    console.warn(`[OpenRouter] Chiamata con ${model} fallita (${response.status}). Tentativo con ${FALLBACK_MODEL}...`);
    payload.model = FALLBACK_MODEL;
    response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr = "";
    try {
      const jsonErr = JSON.parse(errText);
      parsedErr = jsonErr.error?.message || jsonErr.message || errText;
    } catch {
      parsedErr = errText;
    }
    throw new Error(`OpenRouter API error (${response.status}): ${parsedErr}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Nessuna risposta generata dal modello IA.");
  }

  return content;
}

/**
 * Clean and parse JSON response from LLM
 */
function cleanAndParseJson<T>(rawText: string): T {
  let cleaned = rawText.trim();
  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```json\s*/i, "");
  cleaned = cleaned.replace(/^```\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/i, "");
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    // Try to extract first JSON object between { and }
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error(`Impossibile decodificare la risposta JSON: ${rawText.slice(0, 150)}...`);
  }
}

/**
 * 1. AI Guided Tournament Generation
 */
export async function generateTournamentWithAI(
  userDescription: string,
  extraInstructions?: string
): Promise<GeneratedTournamentStructure> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error("Chiave API OpenRouter mancante. Inserisci la tua API Key per procedere.");
  }

  const systemPrompt = `Sei l'assistente IA esperto di SquadUP per l'organizzazione di tornei esport e gaming competitivo (Call of Duty, Warzone, EA FC, Rocket League, Valorant, Fortnite, ecc.).
L'utente ti descrive come desidera organizzare il torneo in linguaggio naturale.

Il tuo compito è analizzare la richiesta ed emettere ESCLUSIVAMENTE un oggetto JSON valido con la seguente struttura:
{
  "name": "Nome accattivante del torneo in italiano",
  "game_mode": "Modalità e gioco specifico (es. Warzone Resurgence Trios, EA FC 24 1v1, MW3 CDL 4v4)",
  "type": "elimination" | "groups_and_knockout" | "championship" | "round_robin",
  "team_limit": 8, // numero intero di partecipanti/squadre (minimo 2)
  "prize_description": "Descrizione montepremi dettagliata (es. 2.000 SCoin + Ruolo Discord)",
  "rules": "Regole di gara complete, formattate per punti, chiare e professionali.",
  "starts_in_hours": 24, // tra quante ore far partire il torneo (numero intero)
  "phases_summary": "Sintesi chiara delle fasi del torneo (es. Gironi da 4 con passaggio delle prime due, poi semifinale e finale)",
  "leaderboard_settings": {
    "format": "teams" o "solo",
    "kill_points": 1,
    "placement_points": {
      "1": 15,
      "2": 10,
      "3": 7,
      "4": 5,
      "5": 3,
      "top10": 1
    }
  },
  "initial_matches": [
    {
      "round_name": "Quarti di Finale - Match 1",
      "player1_name": "Squadra Alpha",
      "player2_name": "Squadra Bravo"
    }
  ]
}

Regole importanti:
- Restituisci ESCLUSIVAMENTE JSON puro, senza commenti.
- Se l'utente non specifica il numero di squadre, usa 8 per tornei a eliminazione o gironi.
- Genera i match iniziali di bracket/fase iniziale in base al numero di partecipanti (es. per 8 squadre crea 4 match di Quarti o 2 gironi).
- Assegna nomi segnaposto accattivanti (es. Squadra Alpha, Phantom Gaming, Cyber Wolves, ecc.).`;

  const userPrompt = `Descrizione dell'organizzatore del torneo:
"${userDescription}"
${extraInstructions ? `\nIstruzioni aggiuntive: "${extraInstructions}"` : ""}

Genera la struttura completa del torneo in JSON conforme.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const rawJson = await callOpenRouter(messages, apiKey, PRIMARY_MODEL, true);
  const parsed = cleanAndParseJson<GeneratedTournamentStructure>(rawJson);

  // Validation & sensible defaults
  if (!parsed.name) parsed.name = "Torneo SquadUP Community";
  if (!parsed.game_mode) parsed.game_mode = "Warzone Competitivo";
  if (!parsed.team_limit || parsed.team_limit < 2) parsed.team_limit = 8;
  if (!parsed.type) parsed.type = "elimination";
  if (!parsed.prize_description) parsed.prize_description = "1.000 SCoin + Badge Campioni";
  if (!parsed.rules) {
    parsed.rules = "1. Carica lo screenshot del tabellone finale al termine del match.\n2. Vietato ogni tipo di hack o comportamento antisportivo.\n3. Risultati convalidati dall'arbitro IA.";
  }
  if (!parsed.leaderboard_settings) {
    parsed.leaderboard_settings = {
      format: "teams",
      kill_points: 1,
      placement_points: { "1": 15, "2": 10, "3": 7, "4": 5, "5": 3, top10: 1 },
    };
  }
  if (!Array.isArray(parsed.initial_matches) || parsed.initial_matches.length === 0) {
    parsed.initial_matches = [
      { round_name: "Match 1", player1_name: "Team 1", player2_name: "Team 2" },
      { round_name: "Match 2", player1_name: "Team 3", player2_name: "Team 4" },
    ];
  }

  return parsed;
}

/**
 * 2. Multimodal OCR Analysis of Match Screenshot
 */
export async function analyzeMatchScreenshotWithAI(params: {
  imageBase64: string;
  mimeType?: string;
  tournamentRules?: string;
  matchInfo?: {
    round_name?: string;
    player1_name?: string;
    player2_name?: string;
    game_mode?: string;
  };
}): Promise<MatchScreenshotAnalysis> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error("Chiave API OpenRouter mancante. Inserisci la tua API Key per convalidare lo screenshot.");
  }

  const mime = params.mimeType || "image/jpeg";
  const dataUrl = `data:${mime};base64,${params.imageBase64}`;

  const matchContext = params.matchInfo
    ? `Contesto Match:
- Round: ${params.matchInfo.round_name || "Match Ufficiale"}
- Giocatore / Squadra 1: ${params.matchInfo.player1_name || "Giocatore 1"}
- Giocatore / Squadra 2: ${params.matchInfo.player2_name || "Giocatore 2"}
- Gioco/Modalità: ${params.matchInfo.game_mode || "Videogioco Competitivo"}`
    : "Videogioco competitivo / Sparatutto / Calcio / Battle Royale";

  const rulesContext = params.tournamentRules
    ? `Regolamento del torneo:\n${params.tournamentRules}`
    : "Standard: vince chi ha più gol/round vinti o miglior punteggio kill/piazzamento.";

  const systemPrompt = `Sei l'arbitro IA ufficiale e analista OCR di SquadUP.
Analizza con estrema attenzione lo screenshot fornito (schermata finale di vittoria/sconfitta, tabellone dei punteggi, statistiche post-partita di Warzone, Call of Duty, FIFA/EA FC, Rocket League, ecc.).

Obiettivo:
Identifica con precisione assoluta:
1. Punteggio Giocatore/Squadra 1 (score_player1: es. gol fatti, round vinti, o totale kill)
2. Punteggio Giocatore/Squadra 2 (score_player2: es. gol fatti, round vinti, o totale kill)
3. Vincitore tra i due ("player1", "player2", o "draw")
4. Eventuali dettagli specifici estratti dallo schermo: kill, danno, posizionamento, gol.
5. Livello di confidenza (da 0 a 100)
6. Spiegazione sintetica in italiano di ciò che vedi nel tabellone (nomi visibili, punteggi, MVP).

Restituisci ESCLUSIVAMENTE un oggetto JSON valido:
{
  "score_player1": number,
  "score_player2": number,
  "winner": "player1" | "player2" | "draw",
  "player1_details": {
    "kills": number,
    "damage": number,
    "goals": number,
    "placement": number
  },
  "player2_details": {
    "kills": number,
    "damage": number,
    "goals": number,
    "placement": number
  },
  "confidence": number,
  "explanation": "Spiegazione sintetica e professionale in italiano"
}

Importante: se l'immagine è un singolo punteggio di Battle Royale per una squadra (es. Vittoria e 14 Kill), assegna a score_player1 il punteggio calcolato o le kill, e fornisci il dettaglio in player1_details.`;

  const userContent: any[] = [
    {
      type: "text",
      text: `${matchContext}

${rulesContext}

Esamina con OCR accurato l'immagine allegata ed estrai il risultato finale ufficiale in formato JSON:`,
    },
    {
      type: "image_url",
      image_url: {
        url: dataUrl,
      },
    },
  ];

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];

  const rawJson = await callOpenRouter(messages, apiKey, PRIMARY_MODEL, true);
  const parsed = cleanAndParseJson<MatchScreenshotAnalysis>(rawJson);

  // Guarantee integer values
  parsed.score_player1 = typeof parsed.score_player1 === "number" ? Math.round(parsed.score_player1) : 0;
  parsed.score_player2 = typeof parsed.score_player2 === "number" ? Math.round(parsed.score_player2) : 0;
  if (!parsed.winner) {
    if (parsed.score_player1 > parsed.score_player2) parsed.winner = "player1";
    else if (parsed.score_player2 > parsed.score_player1) parsed.winner = "player2";
    else parsed.winner = "draw";
  }
  if (!parsed.confidence) parsed.confidence = 90;
  if (!parsed.explanation) parsed.explanation = "Risultato rilevato con successo dallo screenshot ufficiale.";

  return parsed;
}
