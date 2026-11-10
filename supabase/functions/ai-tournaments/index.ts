import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Exact error messages as strictly requested
const ERROR_POST_GAME_UPLOADED_FOR_KD =
  "Errore: Hai caricato una schermata di fine partita. Per l'iscrizione è richiesta la foto delle tue statistiche generali (dove sia visibile il valore KD e il tuo nome Activision)";

const ERROR_KD_PROFILE_UPLOADED_FOR_POST_GAME =
  "Errore: Hai caricato una schermata del profilo/statistiche KD. Per registrare il punteggio del match è richiesto lo screenshot del risultato di fine partita (con la colonna UCCISIONI e la posizione finale della squadra).";

const INVALID_COD_SCREENSHOT_MESSAGE =
  "Immagine non valida: L'IA ha rilevato che la foto caricata non è uno screenshot delle statistiche di Call of Duty. Si prega di caricare lo screenshot corretto.";

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

    // 2. OCR VERIFICA KD STATS (Fase Iscrizione: Esclusivamente Schermata Profilo/Statistiche Generali)
    if (action === "ocr-kd") {
      const minKd = kdLimits?.min_kd ? Number(kdLimits.min_kd) : null;
      const maxKd = kdLimits?.max_kd ? Number(kdLimits.max_kd) : null;

      const systemPrompt = `Sei l'arbitro ufficiale anti-smurf di SquadUP per Call of Duty e Warzone.
Il tuo compito è analizzare con estrema precisione e rigore lo screenshot caricato dal giocatore per la fase di iscrizione al torneo.

VINCOLO VINCOLANTE SUL TIPO DI SCHERMATA:
L'IA non deve tentare di indovinare o calcolare dati che non sono visibili nell'immagine.
L'IA deve accertarsi che la foto sia ESCLUSIVAMENTE la schermata del Profilo / Statistiche di Gioco / Record di carriera generale.

CONTROLLO 1 - RIFIUTO SCHERMATA FINE PARTITA:
Se l'utente invia una schermata di fine partita (come i Risultati / Riepilogo match / Scoreboard post-partita con le colonne Punteggio/Uccisioni/Danni/Assist, oppure scritte come "Vittoria Warzone", "Riepilogo Partita", "Sconfitta", "Squadra Eliminata", o il piazzamento finale della partita), l'IA DEVE RIFIUTARE IMMEDIATAMENTE l'immagine con questo esatto messaggio:
"${ERROR_POST_GAME_UPLOADED_FOR_KD}".
In questo caso rispondi:
{
  "screen_type": "post_game",
  "is_authentic_game_screenshot": true,
  "valid_stats_image": false,
  "kd_ratio": 0,
  "approved": false,
  "confidence": 98,
  "reason": "${ERROR_POST_GAME_UPLOADED_FOR_KD}"
}

CONTROLLO 2 - RIFIUTO IMMAGINI NON DI GIOCO (ANTI-FAKE):
Se l'immagine ritrae oggetti della vita reale, stanze, animali, meme o non è una schermata di Call of Duty:
{
  "screen_type": "unrelated",
  "is_authentic_game_screenshot": false,
  "valid_stats_image": false,
  "kd_ratio": 0,
  "approved": false,
  "confidence": 98,
  "reason": "${INVALID_COD_SCREENSHOT_MESSAGE}"
}

CONTROLLO 3 - VERIFICA VOCE ESPLICITA KD NEL PROFILO:
La schermata deve contenere espressamente una delle seguenti voci esplicite:
- "KD"
- "K/D"
- "Rapporto Uccisioni/Morti"
- "Rapporto K/M"
- "Rapporto Kill/Morte"
- "Eliminazioni / Morti" (E/D)

Se la voce esplicita non è visibile, NON INDOVINARE. Rifiuta con:
{
  "screen_type": "profile_kd",
  "is_authentic_game_screenshot": true,
  "valid_stats_image": false,
  "kd_ratio": 0,
  "approved": false,
  "confidence": 95,
  "reason": "La foto non mostra chiaramente la voce esplicita K/D o Rapporto Uccisioni/Morti. L'IA non può indovinare valori non visibili."
}

CONTROLLO 4 - ESTRAZIONE ED APPROVAZIONE KD:
Se e solo se la voce KD è esplicitamente presente e visibile:
- Estrai il valore numerico (es. 1.85) nel campo "kd_ratio".
- Estrai il Gamertag o Activision ID leggibile nel campo "gamer_tag".
- Estrai kills e deaths complessive se presenti.
- Regole limiti torneo:
  ${minKd !== null ? `* Minimo KD: ${minKd}` : "* Nessun minimo"}
  ${maxKd !== null ? `* Massimo KD: ${maxKd}` : "* Nessun massimo"}

Se il KD supera il massimo consentito (${maxKd}):
  "approved": false, "reason": "K/D rilevato di " + kd_ratio + ", superiore al tetto massimo consentito di " + maxKd + " per questo torneo."
Se il KD è inferiore al minimo consentito (${minKd}):
  "approved": false, "reason": "K/D rilevato di " + kd_ratio + ", inferiore al requisito minimo di " + minKd + " stabilito per il torneo."
Se conforme:
  "approved": true, "reason": "K/D " + kd_ratio + " verificato e conforme al regolamento del torneo."

Rispondi ESCLUSIVAMENTE con un JSON puro valido:
{
  "screen_type": "profile_kd",
  "is_authentic_game_screenshot": true,
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
                  text: `Esegui il controllo vincolante sullo screenshot per la fase di iscrizione. Verifica se è una schermata di fine partita (da rifiutare) o profilo statistiche KD. Cerca espressamente la voce esplicita K/D o Rapporto Uccisioni/Morti senza indovinare.`,
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

    // 3. OCR RISULTATI POST-GAME (Fase Post-Partita: Esclusivamente Schermata Risultati/Scoreboard con colonna UCCISIONI e Piazzamento)
    if (action === "ocr-post-game" || action === "calculate-post-game-score") {
      const placementImg = placementBase64 || imageBase64;
      const killsImg = killsBase64 || imageBase64;

      const systemPrompt = `Sei l'arbitro ufficiale SquadUP per il match gaming post-partita di Call of Duty Warzone.
Analizza con estrema precisione lo/gli screenshot post-partita (tabellone / scoreboard di squadra).

VINCOLO VINCOLANTE SUL TIPO DI SCHERMATA:
L'arbitro attende ESCLUSIVAMENTE la schermata dei Risultati di fine partita (tabellone punteggio, scoreboard squadra, riepilogo match).
L'IA non deve tentare di indovinare o calcolare dati che non sono visibili nell'immagine.

CONTROLLO 1 - RIFIUTO SCHERMATA PROFILO KD:
Se l'utente in questa fase invia la foto del proprio profilo KD / statistiche generali di carriera (dove compare il valore KD anziché il tabellone dei risultati della partita appena conclusa), l'IA DEVE RIFIUTARLA con questo esatto errore:
"${ERROR_KD_PROFILE_UPLOADED_FOR_POST_GAME}"
In questo caso rispondi:
{
  "screen_type": "profile_kd",
  "is_authentic_game_screenshot": true,
  "valid_match_image": false,
  "error": "${ERROR_KD_PROFILE_UPLOADED_FOR_POST_GAME}",
  "confidence": 98
}

CONTROLLO 2 - RIFIUTO IMMAGINI NON DI GIOCO:
Se l'immagine non è una schermata di Call of Duty:
{
  "screen_type": "unrelated",
  "is_authentic_game_screenshot": false,
  "valid_match_image": false,
  "error": "${INVALID_COD_SCREENSHOT_MESSAGE}",
  "confidence": 98
}

CONTROLLO 3 - REGOLA CRITICA: UNICAMENTE COLONNA "UCCISIONI" E POSIZIONE FINALE:
In questa fase devi cercare UNICAMENTE:
1. La posizione finale della squadra ("placement", es. #1 vittoria, 2° posto, 3°, ecc.).
2. La colonna "UCCISIONI" (Kills effettive di ciascun giocatore della squadra).

RIGOROSAMENTE VIETATO:
- NON usare la colonna "Eliminazioni" (include assist).
- NON tentare di calcolare o indovinare le kill da danni, assist o punteggio.
- Estrai e somma ESCLUSIVAMENTE la colonna denominata "UCCISIONI".

Se la colonna "UCCISIONI" o la posizione finale non sono chiaramente visibili o leggibili, non tirare a indovinare e segnalalo:
"Colonna 'UCCISIONI' o piazzamento finale non rilevabili nello screenshot. L'IA non calcola dati non visibili nell'immagine."

Per ogni riga giocatore della squadra nella schermata post-partita:
1. "clan_tag": il tag del clan tra parentesi quadre se presente (es. "[R|SE]")
2. "player_name": il nome / Gamertag del giocatore (es. "PiNTusSniPer_lxa")
3. "kills": valore dalla colonna "UCCISIONI" (es. 6). NON prendere eliminazioni!
4. "damage": danno se visibile

Rispondi ESCLUSIVAMENTE con un JSON puro valido:
{
  "screen_type": "post_game",
  "is_authentic_game_screenshot": true,
  "valid_match_image": true,
  "placement": 3,
  "team_kills": 14,
  "players": [
    { "clan_tag": "[R|SE]", "player_name": "PiNTusSniPer_lxa", "kills": 6, "damage": 2400 },
    { "clan_tag": "[R|SE]", "player_name": "Compagno1", "kills": 5, "damage": 1950 },
    { "clan_tag": "[R|SE]", "player_name": "Compagno2", "kills": 3, "damage": 1200 }
  ],
  "confidence": 0.95,
  "explanation": "Piazzamento #3 estratto. Rilevate 14 uccisioni effettive totali sommando unicamente la colonna UCCISIONI dei membri."
}`;

      const contentPayload: any[] = [
        {
          type: "text",
          text: `Esegui il controllo vincolante sullo screenshot post-partita. Verifica che sia la schermata dei Risultati di fine partita (rifiuta se è una foto del profilo KD). Cerca UNICAMENTE la colonna 'UCCISIONI' e la posizione finale della squadra. Non indovinare dati non visibili.`,
        },
      ];

      if (placementImg) {
        contentPayload.push({
          type: "text",
          text: "Foto 1 (Posizione Finale / Risultati Partita):",
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

      // Handle screen mismatch rejection (KD profile uploaded during post-game)
      if (
        parsed.screen_type === "profile_kd" ||
        parsed.valid_match_image === false ||
        (parsed.error && parsed.error.includes("profilo"))
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: parsed.error || ERROR_KD_PROFILE_UPLOADED_FOR_POST_GAME,
            result: {
              screen_type: "profile_kd",
              is_authentic_game_screenshot: true,
              valid_match_image: false,
              error_message: parsed.error || ERROR_KD_PROFILE_UPLOADED_FOR_POST_GAME,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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
            screen_type: "post_game",
            is_authentic_game_screenshot: true,
            valid_match_image: true,
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
