import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { RtcTokenBuilder, RtcRole } from "npm:agora-token@2.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default Agora App ID if not in environment secrets
const DEFAULT_APP_ID = "f7511dae35db4516aeb30dc522b84824";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const channelName: string = body.channelName ? String(body.channelName).trim() : "default";
    const rawUid = body.uid;
    const roleParam: string = body.role || "publisher";

    // App ID from Supabase environment secrets or fallback
    const appId =
      Deno.env.get("AGORA_APP_ID") ||
      Deno.env.get("VITE_AGORA_APP_ID") ||
      DEFAULT_APP_ID;

    // App Certificate from Supabase environment secrets (mandatory for dynamic tokens)
    const appCertificate =
      Deno.env.get("AGORA_APP_CERTIFICATE") ||
      Deno.env.get("AGORA_CERTIFICATE") ||
      "";

    // Check if App Certificate is present.
    // NESSUN FALLBACK A CHIAVI O TOKEN STATICI: Agora rifiuta con 'dynamic use static key' se si passa un token statico
    // quando il progetto ha il certificato abilitato.
    if (!appCertificate || appCertificate.trim().length < 10) {
      const errorMsg = "AGORA_APP_CERTIFICATE non configurato nei Secret di Supabase. Impossibile generare il token dinamico RTC richiesto dal progetto Agora.";
      console.error(`[generate-agora-token] Errore: ${errorMsg}`);
      return new Response(
        JSON.stringify({
          error: errorMsg,
          token: null,
          rtcToken: null,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Expiration times (default: 24 hours = 86400 seconds)
    const tokenExpireSeconds = 86400;
    const privilegeExpireSeconds = 86400;

    // Determine Agora RTC Role
    const rtcRole =
      roleParam === "subscriber" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

    console.log(`[generate-agora-token] Generazione token RTC dinamico per channel: "${channelName}", UID: ${rawUid}, AppID: ${appId.slice(0, 6)}...`);

    let generatedToken: string;

    const numericUid =
      typeof rawUid === "number" && !isNaN(rawUid)
        ? rawUid
        : parseInt(String(rawUid), 10);

    if (!isNaN(numericUid) && numericUid > 0) {
      generatedToken = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate.trim(),
        channelName,
        numericUid,
        rtcRole,
        tokenExpireSeconds,
        privilegeExpireSeconds
      );
    } else {
      const userAccount = rawUid ? String(rawUid) : "guest_user";
      generatedToken = RtcTokenBuilder.buildTokenWithUserAccount(
        appId,
        appCertificate.trim(),
        channelName,
        userAccount,
        rtcRole,
        tokenExpireSeconds,
        privilegeExpireSeconds
      );
    }

    if (!generatedToken || generatedToken.trim().length < 10) {
      throw new Error("Generazione token fallita da RtcTokenBuilder.");
    }

    console.log(`[generate-agora-token] Token firmato v2 generato con successo tramite RtcTokenBuilder.`);

    const expireTimestamp = Math.floor(Date.now() / 1000) + tokenExpireSeconds;

    return new Response(
      JSON.stringify({
        token: generatedToken.trim(),
        rtcToken: generatedToken.trim(),
        jwt: generatedToken.trim(),
        appId,
        channelName,
        uid: rawUid ?? 0,
        expireTimestamp,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    console.error("[generate-agora-token] Errore critico:", err?.message || err);
    return new Response(
      JSON.stringify({
        error: err?.message || "Errore durante la generazione del token Agora",
        token: null,
        rtcToken: null,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
