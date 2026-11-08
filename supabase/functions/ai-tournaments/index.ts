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
    const { action, userDescription, extraInstructions, imageBase64, mimeType, matchInfo } = await req.json();

    // Centralized system OpenRouter API Key from server environment secrets
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("VITE_OPENROUTER_API_KEY") || "";

    if (!OPENROUTER_API_KEY) {
      console.warn("[ai-tournaments] OPENROUTER_API_KEY not configured on server, returning fallback directive");
      return new Response(JSON.stringify({ fallback: true, message: "No server key, use client-side generator" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    if (action === "ocr-match") {
      const systemPrompt = `Sei l'arbitro ufficiale SquadUP per match gaming. Analizza l'immagine del tabellone finale ed estrai gol/kill e vincitore in JSON puro:
{
  "winner": 1 o 2 o 0,
  "score_player1": 0,
  "score_player2": 0,
  "player1_details": { "kills": 0, "damage": 0 },
  "player2_details": { "kills": 0, "damage": 0 },
  "confidence": 0.95,
  "explanation": "Spiegazione sintetica"
}`;

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
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Match: ${matchInfo?.player1_name || "Giocatore 1"} vs ${matchInfo?.player2_name || "Giocatore 2"}. Modalità: ${matchInfo?.game_mode || "Competitivo"}.`,
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
