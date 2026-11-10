import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { RtcTokenBuilder, RtcRole } from "npm:agora-token@2.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fallback configuration if secrets are not set in Supabase Dashboard
const DEFAULT_APP_ID = "f7511dae35db4516aeb30dc522b84824";
const FALLBACK_TEMP_TOKEN =
  "007eJxTYNAyX6Sg3Ot9ba/Q63vVzxUnWqk84GTdu7pUauFGRnUmBysFhjRzU0PDlMRUY9OUJBNTQ7PE1CRjg5RkUyOjJAsTCyOTlzM/ZzUEMjK8L53AwAiFID4fQ3BgqKOLQmiAgl+of5g/AwMA2iQgUA==";

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

    // App Certificate from Supabase environment secrets
    const appCertificate =
      Deno.env.get("AGORA_APP_CERTIFICATE") ||
      Deno.env.get("AGORA_CERTIFICATE") ||
      "";

    // Expiration times (default: 24 hours = 86400 seconds)
    const tokenExpireSeconds = 86400;
    const privilegeExpireSeconds = 86400;

    // Determine Agora RTC Role
    const rtcRole =
      roleParam === "subscriber" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

    console.log(`[generate-agora-token] Generazione token RTC Agora per channel: "${channelName}", UID: ${rawUid}, AppID: ${appId.slice(0, 6)}...`);

    let generatedToken: string;

    // Check if App Certificate is configured in Supabase Secrets to generate fresh dynamic token
    if (appCertificate && appCertificate.trim().length >= 10) {
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

      console.log(`[generate-agora-token] Token firmato v2 generato con successo tramite libreria ufficiale agora-token.`);
    } else {
      console.warn(
        `[generate-agora-token] AGORA_APP_CERTIFICATE non impostato in Supabase Secrets. Utilizzo token di fallback per garantire il funzionamento.`
      );
      generatedToken =
        Deno.env.get("AGORA_TEMP_TOKEN") ||
        Deno.env.get("VITE_AGORA_TEMP_TOKEN") ||
        FALLBACK_TEMP_TOKEN;
    }

    const expireTimestamp = Math.floor(Date.now() / 1000) + tokenExpireSeconds;

    return new Response(
      JSON.stringify({
        token: generatedToken,
        rtcToken: generatedToken,
        jwt: generatedToken,
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
        token: FALLBACK_TEMP_TOKEN,
      }),
      {
        status: 200, // Return 200 with fallback token so client doesn't freeze
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
