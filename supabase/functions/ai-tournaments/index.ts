import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      action,
      userDescription,
      extraInstructions,
      imageBase64,
      mimeType,
      matchInfo,
      kdLimits,
      tournamentRules,
      submissionType,
    } = await req.json();

    // Centralized system OpenRouter API Key from server environment secrets
    const OPENROUTER_API_KEY =
      Deno.env.get("OPENROUTER_API_KEY") ||
      Deno.env.get("VITE_OPENROUTER_API_KEY") ||
      "";

    if (!OPENROUTER_API_KEY) {
      console.warn("[ai-tournaments] OPENROUTER_API_KEY not configured on server, returning fallback directive");
      return new Response(
        JSON.stringify({ fallback: true, message: "No server key, use client-side generator" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. GENERATE TOURNAMENT
    if (action === "generate-tournament") {
      const systemPrompt = `Sei l'assistente IA esperto di SquadUP per l'organizzazione di tornei esport e gaming competitivo (Call of Duty, Warzone, EA FC, Rocket League, Valorant, Fortnite).
Il tuo compito è analizzare la richiesta ed emettere ESCLUSIVAMENTE un oggetto JSON valido con la seguente struttura:
{
  "name": "Nome accattivante del torneo in italiano",
  "game_mode": "Modalità e gioco specifico",
  "type": "elimination" | "groups_and_knockout" | "championship" | "round_robin",
  "team_limit": 8,
  "prize_description": "Descrizione montepremi dettagliata",
  "rules": "Regole di gara complete, formattate per punti",
  "starts_in_hours": 24,
  "phases_summary": "Sintesi chiara delle fasi del torneo",
  "leaderboard_settings": {
    "format": "teams",
    "kill_points": 1,
    "placement_points": { "1": 15, "2": 10, "3": 7, "4": 5, "5": 3, "top10": 1 }
  },
  "initial_matches": [
    { "round_name": "Quarti di Finale - Match 1", "player1_name": "Squadra Alpha", "player2_name": "Squadra Bravo" }
  ]
}`;

      const userPrompt = `Descrizione: "${userDescription}". ${extraInstructions ? `Note: "${extraInstructions}"` : ""}`;

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://squadup.app",
          "X-Title": "SquadUP Competitivo",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        console.error("[ai-tournaments] OpenRouter error status:", res.status);
        return new Response(JSON.stringify({ fallback: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const rawText = data?.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(rawText);

      return new Response(JSON.stringify({ success: true, result: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. OCR VERIFICA KD STATS
    if (action === "ocr-kd") {
      const minKd = kdLimits?.min_kd ? Number(kdLimits.min_kd) : null;
      const maxKd = kdLimits?.max_kd ? Number(kdLimits.max_kd) : null;

      const systemPrompt = `Sei l'arbitro ufficiale anti-smurf di SquadUP. Analizza lo screenshot del profilo/statistiche del giocatore (Call of Duty, Warzone o altro gioco competitivo).
Trova il rapporto Uccisioni/Morti (K/D ratio o E/D ratio o KD complessivo), le uccisioni totali e il Gamertag/Activision ID visibile.
Verifica se rispetta i limiti del torneo:
${minKd ? `- KD Minimo: ${minKd}` : "- Nessun limite minimo"}
${maxKd ? `- KD Massimo: ${maxKd}` : "- Nessun limite massimo"}

Rispondi ESCLUSIVAMENTE con un JSON puro:
{
  "kd_ratio": 1.75,
  "gamer_tag": "NomeGiocatore#1234",
  "kills": 4500,
  "deaths": 2570,
  "confidence": 0.95,
  "approved": true,
  "reason": "KD 1.75 rilevato con successo e compatibile con il regolamento del torneo."
}`;

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://squadup.app",
          "X-Title": "SquadUP Arbitro IA",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analizza questa schermata delle statistiche KD del giocatore per validare l'iscrizione al torneo.`,
                },
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}` },
                },
              ],
            },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ fallback: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const rawText = data?.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(rawText);

      return new Response(JSON.stringify({ success: true, result: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. OCR RISULTATI POST-GAME (Piazzamento & Kill)
    if (action === "ocr-post-game" || action === "ocr-match") {
      const systemPrompt = `Sei l'arbitro ufficiale SquadUP per il match gaming competitivo.
Analizza lo screenshot post-partita (può essere la schermata di vittoria/piazzamento "#1 Victory", classifica finale, o il resoconto kill del team).
Estrai con la massima precisione:
- Piazzamento finale (es. 1 se vittoria, 2 se secondi, ecc.)
- Uccisioni totali (kill totali della squadra o del giocatore)
- Danno totale inflitto se visibile

Rispondi ESCLUSIVAMENTE con un JSON puro:
{
  "placement": 1,
  "kills": 14,
  "damage": 5400,
  "team_name": "NomeTeam (se leggibile)",
  "confidence": 0.95,
  "explanation": "Piazzamento #1 con 14 kill confermato dal tabellone finale."
}`;

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://squadup.app",
          "X-Title": "SquadUP Arbitro Post-Game",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Tipo screenshot: ${submissionType || "Risultati Post-Game"}. Regole: ${tournamentRules || "Standard Warzone"}.`,
                },
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}` },
                },
              ],
            },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ fallback: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const rawText = data?.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(rawText);

      return new Response(JSON.stringify({ success: true, result: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[ai-tournaments] General error:", err);
    return new Response(JSON.stringify({ fallback: true, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
