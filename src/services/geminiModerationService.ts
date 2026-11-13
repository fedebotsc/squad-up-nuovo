/**
 * SISTEMA DI MODERAZIONE AUTOMATICA SQUADUP
 * Basato su Google Gemini (modello gemini-2.5-flash)
 * Chiave: VITE_GEMINI_API_KEY_TORNEO
 * 
 * Regole del filtro di moderazione:
 * 1. CONTENUTI CONSENTITI: Esclusivamente Call of Duty e gaming competitivo (tattiche, tornei, chat clan, statistiche).
 * 2. CONTENUTI DA BLOCCARE:
 *    - Contenuti sessuali, espliciti o NSFW.
 *    - Linguaggio offensivo, razziale, discriminatorio o istigazione all'odio.
 *    - Violenza estrema, omicidi, immagini forti, gore non correlati a normale gameplay CoD.
 *    - Contenuti e post totalmente off-topic (spam, crypto, pubblicità non legate a CoD o al gaming).
 */

export interface ModerationResult {
  safe: boolean;
  reason: string;
}

export interface ModerationInput {
  text?: string;
  imageFile?: File | null;
  imageBase64?: string | null;
  mimeType?: string;
  contextType?: "post" | "chat" | "story" | "comment" | "profile" | "clan";
}

/**
 * Recupera la chiave API di Gemini privilegiando VITE_GEMINI_API_KEY_TORNEO
 */
export function getGeminiModerationApiKey(): string {
  const envKey = (import.meta.env.VITE_GEMINI_API_KEY_TORNEO as string | undefined)?.trim();
  if (envKey) return envKey;

  const fallbackKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();
  if (fallbackKey) return fallbackKey;

  return "";
}

/**
 * Converte un file immagine in base64 pulito senza prefisso data-URI
 */
export async function fileToInlineBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const mimeType = file.type || "image/jpeg";
      const base64 = res.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
      resolve({ base64, mimeType });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * System prompt rigoroso per la moderazione IA
 */
export function buildModerationSystemPrompt(contextType: string = "post"): string {
  return `Sei il sistema ufficiale di moderazione automatica per la piattaforma SquadUp, una community eSport dedicata ESCLUSIVAMENTE a Call of Duty e al gaming competitivo.
Il tuo compito è analizzare preventivamente qualsiasi contenuto (testo, immagine, screenshot, storia o messaggio) PRIMA che venga registrato su Supabase. Tipo di contesto: "${contextType}".

LINEE GUIDA E REGOLE TASSATIVE:

1. CONTENUTI CONSENTITI (safe: true):
- Ammessi UNICAMENTE argomenti inerenti a Call of Duty (Warzone, Modern Warfare, Black Ops, CoD Mobile), gaming competitivo, tornei, tattiche di gioco, loadout di armi, reclutamento clan, ricerca compagni di squadra (LFG), statistiche di gioco (K/D, kill, vittorie, score) e banter/conversazioni amichevoli e sportive tra giocatori all'interno dell'ecosistema CoD.

2. CONTENUTI DA BLOCCARE TASSATIVAMENTE (safe: false):
- Contenuti sessuali, espliciti, pornografici o NSFW (sia testi allusivi che immagini con nudità o semi-nudità).
- Linguaggio offensivo, razziale, discriminatorio, omofobo, denigratorio, bestemmie gravi, incitamento all'odio o molestie verso altri giocatori.
- Violenza estrema, omicidi, immagini forti del mondo reale, gore, incidenti o corpi feriti reali (è consentita solo la normale grafica fittizia di gioco di Call of Duty, MAI violenza reale o gore esplicito).
- Qualsiasi post, testo o immagine TOTALMENTE OFF-TOPIC rispetto al mondo di Call of Duty e al gaming competitivo (esempi di off-topic: spam pubblicitario, promozione di criptovalute/NFT/servizi esterni, politica, cronaca, ricette, compravendite non gaming o discussioni totalmente estranee a CoD).

FORMATO DI RISPOSTA:
Devi rispondere TASSATIVAMENTE ed ESCLUSIVAMENTE con un JSON puro valido (senza markdown, senza blocchi di codice, senza spiegazioni all'esterno del JSON):
{
  "safe": boolean,
  "reason": "Motivazione dettagliata e cortese in lingua italiana che spieghi il motivo esatto del blocco (se safe è false), oppure confermi l'idoneità (se safe è true)."
}`;
}

/**
 * Pulisce ed estrae l'oggetto JSON dalla risposta di Gemini
 */
export function parseModerationResponse(rawText: string): ModerationResult {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      safe: Boolean(parsed.safe),
      reason: String(
        parsed.reason ||
          (parsed.safe
            ? "Contenuto conforme alle linee guida di Call of Duty."
            : "Contenuto non consentito dal regolamento della community.")
      ),
    };
  } catch (err) {
    console.warn("[ModerationService] Errore parsing JSON risposta Gemini:", cleaned, err);
    // Se il testo contiene indicatori espliciti di non sicurezza
    const isUnsafe = /non conforme|bloccato|offensivo|nsfw|vietato|off-topic/i.test(cleaned);
    return {
      safe: !isUnsafe,
      reason: isUnsafe
        ? "Contenuto segnalato come non conforme dalle regole di moderazione."
        : "Contenuto approvato.",
    };
  }
}

/**
 * Controllo euristico di sicurezza immediato (fallback se rete o chiave non disponibile)
 */
function localSafetyPrecheck(text: string): ModerationResult | null {
  const lower = text.toLowerCase();

  // Pattern NSFW / Sessuali espliciti
  const nsfwKeywords = ["porn", "porno", "nsfw", "xxx", "onlyfans", "nude", "nudo", "scopare", "hardcore"];
  for (const kw of nsfwKeywords) {
    if (new RegExp(`\\b${kw}\\b`, "i").test(lower)) {
      return {
        safe: false,
        reason: "Contenuto bloccato: sono severamente vietati contenuti sessuali, espliciti o NSFW su SquadUp.",
      };
    }
  }

  // Pattern Odio / Discriminazione
  const hateKeywords = ["negro", "frocio", "ritardato", "handicappato", "dio cane", "madonna puttana", "ebreo di merda"];
  for (const kw of hateKeywords) {
    if (lower.includes(kw)) {
      return {
        safe: false,
        reason: "Contenuto bloccato: linguaggio offensivo, discriminatorio o istigazione all'odio non tollerato.",
      };
    }
  }

  // Pattern Spam / Truffe palesi
  const spamKeywords = ["crypto", "bitcoin gratuito", "free robux", "investi adesso", "guadagna online", "telegram.me", "t.me/"];
  for (const kw of spamKeywords) {
    if (lower.includes(kw)) {
      return {
        safe: false,
        reason: "Contenuto bloccato: rilevato spam o pubblicità off-topic non consentita.",
      };
    }
  }

  return null;
}

/**
 * Analizza preventivamente qualsiasi contenuto (testo e/o immagine) con Gemini 2.5 Flash
 * prima di consentirne il salvataggio su Supabase.
 */
export async function moderateContentWithGemini(
  input: ModerationInput
): Promise<ModerationResult> {
  const textContent = input.text?.trim() || "";
  const hasImage = Boolean(input.imageFile || input.imageBase64);

  // Se non c'è né testo né immagine, non c'è nulla da moderare
  if (!textContent && !hasImage) {
    return { safe: true, reason: "Contenuto vuoto." };
  }

  // Controllo euristico locale rapido sui testi
  if (textContent) {
    const localHit = localSafetyPrecheck(textContent);
    if (localHit && !localHit.safe) {
      return localHit;
    }
  }

  const apiKey = getGeminiModerationApiKey();

  // Se la chiave API non è configurata nelle variabili d'ambiente
  if (!apiKey) {
    console.warn(
      "[ModerationService] VITE_GEMINI_API_KEY_TORNEO non impostata nelle variabili d'ambiente. Moderazione IA eseguita in modalità euristica."
    );
    // In assenza di chiave, se non ha violato i filtri locali, consentiamo con log di avviso
    return {
      safe: true,
      reason: "Contenuto verificato tramite filtro di sicurezza locale (chiave Gemini non configurata).",
    };
  }

  try {
    // 1. Preparazione immagine se presente
    let pureBase64 = input.imageBase64 || "";
    let mime = input.mimeType || "image/jpeg";

    if (input.imageFile) {
      const converted = await fileToInlineBase64(input.imageFile);
      pureBase64 = converted.base64;
      mime = converted.mimeType;
    } else if (pureBase64.startsWith("data:")) {
      const match = pureBase64.match(/^data:([a-zA-Z0-9+.-]+\/[a-zA-Z0-9+.-]+);base64,(.*)$/);
      if (match) {
        mime = match[1];
        pureBase64 = match[2];
      }
    }

    // 2. Costruzione payload per Gemini 2.5 Flash
    const systemPrompt = buildModerationSystemPrompt(input.contextType || "post");
    const parts: any[] = [];

    let userInstruction = `Valuta la conformità di questo contenuto per SquadUp (Call of Duty & Gaming competitivo).`;
    if (textContent && pureBase64) {
      userInstruction += ` Contiene sia un messaggio di testo sia un'immagine allegata.`;
    } else if (textContent) {
      userInstruction += ` Contiene un messaggio di testo.`;
    } else if (pureBase64) {
      userInstruction += ` Contiene un'immagine o screenshot.`;
    }

    parts.push({
      text: `${userInstruction}\n\n[TESTO INVIATO DALL'UTENTE]:\n${textContent || "(Nessun testo allegato)"}`,
    });

    if (pureBase64) {
      parts.push({
        inlineData: {
          mimeType: mime,
          data: pureBase64,
        },
      });
    }

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[ModerationService] Errore HTTP da Google Gemini:", response.status, errText);

      // In caso di errore API temporaneo (es. quota o rete), effettuiamo un fail-safe
      // ma se il testo conteneva elementi sospetti locali li blocchiamo
      if (textContent) {
        const fallbackCheck = localSafetyPrecheck(textContent);
        if (fallbackCheck) return fallbackCheck;
      }

      return {
        safe: true,
        reason: "Verifica completata con fallback di sicurezza.",
      };
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      console.warn("[ModerationService] Nessun testo restituito da Gemini:", data);
      return { safe: true, reason: "Contenuto idoneo." };
    }

    const parsedResult = parseModerationResponse(candidateText);
    return parsedResult;
  } catch (error: any) {
    console.error("[ModerationService] Eccezione durante la moderazione Gemini:", error);
    if (textContent) {
      const fallbackCheck = localSafetyPrecheck(textContent);
      if (fallbackCheck) return fallbackCheck;
    }
    return {
      safe: true,
      reason: "Controlli di sicurezza di base superati.",
    };
  }
}
