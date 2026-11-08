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
      placementBase64,
      killsBase64,
      mimeType,
      kdLimits,
      tournamentRules,
      scoringSettings,
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
    "placement_points": { "1": 10, "2": 7, "3": 5, "4": 4, "5": 3, "top10": 1 }
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

    // 2. OCR VERIFICA KD STATS (Cerca esplicitamente "K/D" o "Rapporto Kill/Morte")
    if (action === "ocr-kd") {
      const minKd = kdLimits?.min_kd ? Number(kdLimits.min_kd) : null;
      const maxKd = kdLimits?.max_kd ? Number(kdLimits.max_kd) : null;

      const systemPrompt = `Sei l'arbitro ufficiale anti-smurf di SquadUP per Call of Duty e Warzone.
Il tuo compito principale è esaminare l'immagine e CERCARE ESPLICITAMENTE una delle seguenti voci:
- "K/D"
- "KD"
- "Rapporto K/M"
- "Rapporto Kill/Morte"
- "Rapporto Uccisioni/Morti"
- "Eliminazioni / Morti" (E/D)

REGOLE DI VALUTAZIONE OBBLIGATORIE:
1. Se la foto NON mostra chiaramente le statistiche di gioco o il valore del K/D non è chiaramente visibile e leggibile:
   - "valid_stats_image": false
   - "approved": false
   - "reason": "La foto non mostra chiaramente le statistiche di gioco o la voce K/D / Rapporto Kill-Morte."

2. Se la voce K/D è visibile:
   - Estrai il valore numerico (es. 1.85) nel campo "kd_ratio".
   - Estrai il Gamertag o Activision ID se leggibile nel campo "gamer_tag".
   - Limiti torneo da verificare:
     ${minKd !== null ? `* Limite Minimo KD: ${minKd}` : "* Nessun limite minimo stabilito"}
     ${maxKd !== null ? `* Limite Massimo KD: ${maxKd}` : "* Nessun limite massimo stabilito"}

   - Se il KD rilevato è SUPERIORE al limite massimo consentito (${maxKd}):
     "approved": false
     "reason": "K/D rilevato di " + kd_ratio + ", superiore al tetto massimo consentito di " + maxKd + " per questo torneo."

   - Se il KD rilevato è INFERIORE al minimo (${minKd}):
     "approved": false
     "reason": "K/D rilevato di " + kd_ratio + ", inferiore al requisito minimo di " + minKd + " stabilito per il torneo."

   - Se il KD è CONFORME:
     "approved": true
     "reason": "K/D " + kd_ratio + " verificato e conforme al regolamento del torneo."

Rispondi ESCLUSIVAMENTE con un JSON puro valido:
{
  "valid_stats_image": true,
  "kd_ratio": 1.75,
  "gamer_tag": "Player#1234",
  "kills": 4500,
  "deaths": 2570,
  "confidence": 0.95,
  "approved": true,
  "reason": "K/D 1.75 rilevato con successo e compatibile con le regole del torneo."
}`;

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://squadup.app",
          "X-Title": "SquadUP Arbitro IA KD",
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
                  text: `Cerca la voce K/D o Rapporto Kill/Morte e verifica la conformità dello screenshot.`,
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

    // 3. OCR RISULTATI POST-GAME (Uccisioni Effettive vs Eliminazioni + Roster Dettagliato)
    if (action === "ocr-post-game" || action === "calculate-post-game-score") {
      const placementImg = placementBase64 || imageBase64;
      const killsImg = killsBase64 || imageBase64;

      const systemPrompt = `Sei l'arbitro ufficiale SquadUP per il match gaming post-partita di Call of Duty Warzone.
Analizza con estrema precisione lo/gli screenshot post-partita (tabellone / scoreboard di squadra).

IMPORTANTE - REGOLA CRITICA SU UCCISIONI vs ELIMINAZIONI:
Nel tabellone di Warzone sono presenti sia "Eliminazioni" che "Uccisioni".
DEVI RIGOROSAMENTE IGNORARE LE ELIMINAZIONI.
Le Eliminazioni NON devono essere usate per il calcolo delle kill personali o di squadra.
Bisogna estrarre ed utilizzare UNICAMENTE il valore della colonna "UCCISIONI" (Kills reali).

Per ogni riga giocatore della squadra presente nella schermata, leggi e registra separatamente:
1. "clan_tag": il tag del clan tra parentesi quadre se presente (es. "[R|SE]")
2. "player_name": il nome / Gamertag del giocatore (es. "PiNTusSniPer_lxa")
3. "kills": il valore numerico dalla colonna "UCCISIONI" (es. 6). NON prendere la colonna Eliminazioni!
4. "damage": danno inflitto se visibile

Somma Automatica delle Uccisioni:
Il punteggio delle kill di squadra ("team_kills") deve essere calcolato sommando ESCLUSIVAMENTE i valori della colonna "UCCISIONI" dei singoli membri della squadra.

Piazzamento Finale (Placement):
Estrai il numero del piazzamento finale della squadra (es. 1 se vittoria "#1", 2 se secondi, 3 se terzi, ecc.).

Rispondi ESCLUSIVAMENTE con un JSON puro valido:
{
  "placement": 3,
  "team_kills": 14,
  "players": [
    { "clan_tag": "[R|SE]", "player_name": "PiNTusSniPer_lxa", "kills": 6, "damage": 2400 },
    { "clan_tag": "[R|SE]", "player_name": "Compagno1", "kills": 5, "damage": 1950 },
    { "clan_tag": "[R|SE]", "player_name": "Compagno2", "kills": 3, "damage": 1200 }
  ],
  "confidence": 0.95,
  "explanation": "Piazzamento #3 estratto. Rilevate 14 uccisioni effettive totali sommando la colonna UCCISIONI dei membri."
}`;

      const contentPayload: any[] = [
        {
          type: "text",
          text: `Estrai il piazzamento finale e per ogni giocatore il Tag Clan, il Nome e le UCCISIONI (dalla colonna UCCISIONI, NON eliminazioni!). Somma le uccisioni effettive.`,
        },
      ];

      if (placementImg) {
        contentPayload.push({
          type: "text",
          text: "Foto 1 (Posizione Finale / Piazzamento):",
        });
        contentPayload.push({
          type: "image_url",
          image_url: { url: `data:${mimeType || "image/jpeg"};base64,${placementImg}` },
        });
      }

      if (killsImg && killsImg !== placementImg) {
        contentPayload.push({
          type: "text",
          text: "Foto 2 (Tabellone Uccisioni Squadra):",
        });
        contentPayload.push({
          type: "image_url",
          image_url: { url: `data:${mimeType || "image/jpeg"};base64,${killsImg}` },
        });
      }

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://squadup.app",
          "X-Title": "SquadUP Arbitro Post-Game Score",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: contentPayload },
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

      // Score Calculation Engine
      const placement = Math.max(1, Number(parsed.placement) || 1);

      // Extract players array and sum strictly actual kills
      const playersList = Array.isArray(parsed.players) ? parsed.players : [];
      let computedTeamKills = playersList.reduce((acc: number, p: any) => acc + (Number(p.kills) || 0), 0);
      if (computedTeamKills === 0 && Number(parsed.team_kills) > 0) {
        computedTeamKills = Number(parsed.team_kills);
      }

      const placementPointsMap = scoringSettings?.placement_points || {
        "1": 10,
        "2": 7,
        "3": 5,
        "4": 4,
        "5": 3,
        top10: 1,
      };
      const killMultiplier = Number(scoringSettings?.kill_points) || 1;

      const placementPts =
        placementPointsMap[String(placement)] ??
        (placement <= 10 ? (placementPointsMap.top10 ?? 1) : 0);
      const killPts = computedTeamKills * killMultiplier;
      const totalPoints = placementPts + killPts;

      // Construct detailed chat breakdown
      const playerLines = playersList.map((p: any) => {
        const clan = p.clan_tag ? `${p.clan_tag} ` : "";
        return `• ${clan}${p.player_name || "Giocatore"} - ${p.kills ?? 0} Uccisioni`;
      });

      const playerBreakdownText = playerLines.length > 0
        ? `👥 Dettaglio Squadra (Colonna "Uccisioni"):\n${playerLines.join("\n")}\n⚔️ Totale Uccisioni Effettive: ${computedTeamKills} Uccisioni`
        : `⚔️ Totale Uccisioni Effettive: ${computedTeamKills} Uccisioni`;

      const summaryMessage = `🎮 Risultato registrato: ${placement}° Posizione (${placementPts} pt) + ${computedTeamKills} Uccisioni (${killPts} pt) = ${totalPoints} Punti Totali`;

      return new Response(
        JSON.stringify({
          success: true,
          result: {
            placement,
            kills: computedTeamKills,
            players: playersList,
            player_breakdown_text: playerBreakdownText,
            damage: parsed.damage || 0,
            confidence: parsed.confidence || 0.95,
            placement_points: placementPts,
            kill_points: killPts,
            total_points: totalPoints,
            summary_message: summaryMessage,
            explanation: parsed.explanation,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
