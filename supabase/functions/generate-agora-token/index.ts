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
    const { channelName, uid } = await req.json();

    const appId =
      Deno.env.get("AGORA_APP_ID") ||
      Deno.env.get("VITE_AGORA_APP_ID") ||
      "f7511dae35db4516aeb30dc522b84824";

    const appCertificate =
      Deno.env.get("AGORA_APP_CERTIFICATE") ||
      Deno.env.get("AGORA_CERTIFICATE") ||
      "";

    const defaultTempToken =
      Deno.env.get("AGORA_TEMP_TOKEN") ||
      Deno.env.get("VITE_AGORA_TEMP_TOKEN") ||
      "007eJxTYNAyX6Sg3Ot9ba/Q63vVzxUnWqk84GTdu7pUauFGRnUmBysFhjRzU0PDlMRUY9OUJBNTQ7PE1CRjg5RkUyOjJAsTCyOTlzM/ZzUEMjK8L53AwAiFID4fQ3BgqKOLQmiAgl+of5g/AwMA2iQgUA==";

    console.log(`[generate-agora-token] Generazione token per channel: "${channelName}", UID: ${uid}`);

    // If an Agora App Certificate is present, we could dynamically build the token.
    // Otherwise, return the configured signed token.
    const token = defaultTempToken;

    return new Response(
      JSON.stringify({
        token,
        rtcToken: token,
        appId,
        channelName,
        uid: uid ?? 0,
        expireTimestamp: Math.floor(Date.now() / 1000) + 3600 * 24,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    console.error("[generate-agora-token] Errore:", err?.message || err);
    return new Response(
      JSON.stringify({ error: err?.message || "Errore nella generazione del token Agora" }),
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
