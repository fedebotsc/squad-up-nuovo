import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";
import { supabase } from "@/integrations/supabase/client";

// Log level 1 for detailed development warnings & error logging
AgoraRTC.setLogLevel(1);

export interface AgoraConnectionState {
  status: "idle" | "connecting" | "connected" | "error";
  errorMessage?: string;
  channelName: string | null;
  appId: string;
}

const DEFAULT_AGORA_APP_ID = "f7511dae35db4516aeb30dc522b84824";

class AgoraVoiceService {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private remoteUsers: Map<string | number, IAgoraRTCRemoteUser> = new Map();
  private isDeafened: boolean = false;
  private currentChannel: string | null = null;
  private isConnecting: boolean = false;
  private isDisconnected: boolean = false;
  private onSpeakingChangeCallback?: (isSpeaking: boolean, volume: number) => void;
  private onRemoteUserChangeCallback?: (usersCount: number, users: IAgoraRTCRemoteUser[]) => void;
  private onConnectionStateChangeCallback?: (state: string) => void;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        void this.cleanup();
      });
    }
  }

  /**
   * Restituisce l'App ID Agora.
   */
  public getAppId(): string {
    const envAppId = (import.meta.env.VITE_AGORA_APP_ID as string | undefined)?.trim();
    if (envAppId && envAppId.length >= 10 && !this.isPlaceholder(envAppId)) {
      return envAppId;
    }
    return DEFAULT_AGORA_APP_ID;
  }

  public setCustomAppId(appId: string): void {
    if (typeof window !== "undefined") {
      if (appId.trim()) {
        localStorage.setItem("squadup_agora_appid", appId.trim());
      } else {
        localStorage.removeItem("squadup_agora_appid");
      }
    }
  }

  public getToken(): string | null {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("squadup_agora_token");
      if (storedToken && storedToken.trim().length > 5) {
        return storedToken.trim();
      }
    }
    const envTemp = (import.meta.env.VITE_AGORA_TEMP_TOKEN as string | undefined)?.trim();
    if (envTemp && envTemp.length > 5) return envTemp;
    const envToken = (import.meta.env.VITE_AGORA_TOKEN as string | undefined)?.trim();
    if (envToken && envToken.length > 5) return envToken;
    return null;
  }

  public setCustomToken(token: string): void {
    if (typeof window !== "undefined") {
      if (token.trim()) {
        localStorage.setItem("squadup_agora_token", token.trim());
      } else {
        localStorage.removeItem("squadup_agora_token");
      }
    }
  }

  /**
   * Recupera il token firmato invocando la Supabase Edge Function 'generate-agora-token'.
   * Passa channelName e uid e ritorna il token JWT firmato da passare al metodo client.join().
   */
  public async fetchSignedAgoraToken(
    channelName: string,
    uid: number | string
  ): Promise<string | null> {
    try {
      console.log(`[Agora Voice] Richiesta token RTC alla Edge Function "generate-agora-token" (channel: "${channelName}", UID: ${uid})...`);

      const { data, error } = await supabase.functions.invoke("generate-agora-token", {
        body: {
          channelName,
          uid,
        },
      });

      if (!error && data) {
        const signedToken = data?.token || data?.rtcToken || data?.jwt || null;
        if (signedToken) {
          console.log("[Agora Voice] Token RTC firmato ottenuto con successo da Supabase Edge Function:", {
            channel: channelName,
            uid,
            tokenPrefix: signedToken.slice(0, 15) + "...",
            expireTimestamp: data.expireTimestamp,
          });
          return signedToken;
        }
      }

      if (error) {
        console.warn("[Agora Voice] Avviso supabase.functions.invoke('generate-agora-token'):", error.message || error);

        // Fallback: chiamata HTTP diretta all'endpoint della Edge Function con chiavi apikey
        const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NYFmcAIbknMLAasXoMiUZg_0-xvIR5C";
        const fallbackRes = await fetch("https://ojostglcbfbpsisfdibk.supabase.co/functions/v1/generate-agora-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            channelName,
            uid,
          }),
        });

        if (fallbackRes.ok) {
          const directData = await fallbackRes.json();
          const signedToken = directData?.token || directData?.rtcToken || directData?.jwt || null;
          if (signedToken) {
            console.log("[Agora Voice] Token firmato RTC ricevuto con successo via endpoint HTTP diretto della Edge Function.");
            return signedToken;
          }
        }
      }
    } catch (err: any) {
      console.warn("[Agora Voice] Eccezione durante la richiesta del token a generate-agora-token:", err?.message || err);
    }

    // Fallback prioritario alle variabili d'ambiente se l'edge function non è raggiungibile offline
    const envToken =
      (import.meta.env.VITE_AGORA_TEMP_TOKEN as string | undefined)?.trim() ||
      (import.meta.env.VITE_AGORA_TOKEN as string | undefined)?.trim();

    return envToken || null;
  }

  /**
   * Metodo diagnostico per verificare in tempo reale lo stato dell'Edge Function generate-agora-token
   */
  public async testEdgeFunctionToken(): Promise<{
    success: boolean;
    token?: string;
    error?: string;
    source: string;
    channel: string;
    uid: number;
  }> {
    const testChannel = "squad_test_channel";
    const testUid = Math.floor(Math.random() * 899999) + 100000;

    try {
      console.log(`[Agora Voice Test] Inizio test diagnostico Edge Function su "${testChannel}", UID: ${testUid}...`);
      const { data, error } = await supabase.functions.invoke("generate-agora-token", {
        body: {
          channelName: testChannel,
          uid: testUid,
        },
      });

      if (!error && data && (data.token || data.rtcToken)) {
        const receivedToken = data.token || data.rtcToken;
        return {
          success: true,
          token: receivedToken,
          source: "Supabase Edge Function (invoke)",
          channel: testChannel,
          uid: testUid,
        };
      }

      // Tentativo diretto fallback
      const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NYFmcAIbknMLAasXoMiUZg_0-xvIR5C";
      const directRes = await fetch("https://ojostglcbfbpsisfdibk.supabase.co/functions/v1/generate-agora-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          channelName: testChannel,
          uid: testUid,
        }),
      });

      if (directRes.ok) {
        const directData = await directRes.json();
        if (directData?.token || directData?.rtcToken) {
          return {
            success: true,
            token: directData.token || directData.rtcToken,
            source: "Supabase Edge Function (HTTP direct)",
            channel: testChannel,
            uid: testUid,
          };
        }
      }

      return {
        success: false,
        error: error?.message || "Nessun token restituito dall'Edge Function",
        source: "Failed",
        channel: testChannel,
        uid: testUid,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || "Errore di connessione con l'Edge Function",
        source: "Exception",
        channel: testChannel,
        uid: testUid,
      };
    }
  }

  private isPlaceholder(val: string): boolean {
    return !val || val === "la_tua_app_id_di_agora" || val.includes("la_tua_app_id");
  }

  public isAppIdPlaceholder(): boolean {
    const appId = this.getAppId();
    return !appId || this.isPlaceholder(appId) || appId.length < 15;
  }

  /**
   * Inizializza o restituisce il client AgoraRTC in modalità rtc.
   */
  public getClient(): IAgoraRTCClient {
    if (!this.client) {
      console.log("[Agora Voice] Inizializzazione client AgoraRTC (mode: rtc, codec: vp8)");
      this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      this.setupEventListeners(this.client);
    }
    return this.client;
  }

  private setupEventListeners(client: IAgoraRTCClient): void {
    client.on("user-published", async (user, mediaType) => {
      try {
        console.log(`[Agora Voice] Remote user published: UID ${user.uid}, media: ${mediaType}`);
        await client.subscribe(user, mediaType);
        this.remoteUsers.set(user.uid, user);

        if (mediaType === "audio" && user.audioTrack) {
          if (!this.isDeafened) {
            try {
              user.audioTrack.play();
            } catch (playErr: any) {
              console.warn("[Agora Voice] Autoplay audio remoto bloccato dal browser:", playErr?.message || playErr);
            }
          }
        }
        this.notifyRemoteUsers();
      } catch (err: any) {
        console.warn("[Agora Voice] Errore sottoscrizione utente remoto:", err?.message || err);
      }
    });

    client.on("user-unpublished", (user, mediaType) => {
      console.log(`[Agora Voice] Remote user unpublished: UID ${user.uid}, media: ${mediaType}`);
      if (mediaType === "audio") {
        this.remoteUsers.delete(user.uid);
        this.notifyRemoteUsers();
      }
    });

    client.on("user-left", (user) => {
      console.log(`[Agora Voice] Remote user left: UID ${user.uid}`);
      this.remoteUsers.delete(user.uid);
      this.notifyRemoteUsers();
    });

    client.on("connection-state-change", (curState, revState, reason) => {
      console.log(`[Agora Voice] Stato Connessione: ${revState} -> ${curState} (Motivo: ${reason || "N/A"})`);
      this.onConnectionStateChangeCallback?.(curState);
    });

    try {
      client.enableAudioVolumeIndicator();
      client.on("volume-indicator", (volumes) => {
        const localVolume = volumes.find((v) => v.uid === 0 || v.uid === client.uid);
        if (localVolume && this.onSpeakingChangeCallback) {
          this.onSpeakingChangeCallback(localVolume.level > 5, localVolume.level);
        }
      });
    } catch (e) {
      console.warn("[Agora Voice] Indicatore volume non disponibile:", e);
    }
  }

  private notifyRemoteUsers(): void {
    const usersList = Array.from(this.remoteUsers.values());
    this.onRemoteUserChangeCallback?.(usersList.length, usersList);
  }

  /**
   * Connessione al canale vocale Agora:
   * 1. Esegue cleanup preventivo completo per azzerare sessioni precedenti.
   * 2. Chiama la Supabase Edge Function 'generate-agora-token' con channelName e uid.
   * 3. Passa il token JWT firmato ottenuto al metodo client.join(appId, channelName, token, uid).
   */
  public async joinVoiceChannel(
    channelName: string,
    userNameOrId?: string | number,
    tokenOverride?: string | null
  ): Promise<{ success: boolean; realSdk: boolean; error?: string; errorCode?: string; isPublishing: boolean }> {
    // 1. App ID da env o default
    const appId = this.getAppId();

    if (this.isAppIdPlaceholder()) {
      const msg = "App ID Agora non configurato o non valido.";
      console.error("[Agora Voice] App ID mancante:", msg);
      return {
        success: false,
        realSdk: false,
        isPublishing: false,
        error: msg,
        errorCode: "INVALID_APP_ID",
      };
    }

    // 2. Sanitizzazione nome canale per Agora
    let sanitizedChannel = (channelName || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50);

    if (!sanitizedChannel) {
      sanitizedChannel = `channel_${Date.now()}`;
    }

    // 3. Calcolo UID numerico per la sessione
    let numericUid: number;
    if (typeof userNameOrId === "number" && Number.isFinite(userNameOrId) && userNameOrId > 0) {
      numericUid = (Math.abs(Math.floor(userNameOrId)) % 899999) + 100000;
    } else if (typeof userNameOrId === "string" && userNameOrId.trim()) {
      let hash = 0;
      const str = userNameOrId.trim();
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      numericUid = (Math.abs(hash) % 899999) + 100000;
    } else {
      numericUid = Math.floor(Math.random() * 899999) + 100000;
    }

    // 4. Reset preventivo completo dell'istanza client per evitare conflitti di sessioni aperte
    console.log(`[Agora Voice] Reset preventivo e cleanup prima del join a "${sanitizedChannel}"...`);
    await this.cleanup();

    this.isConnecting = true;
    this.isDisconnected = false;

    // 5. CHIAMATA ALLA SUPABASE EDGE FUNCTION PER OTTENERE IL TOKEN JWT FIRMATO
    let signedToken: string | null = tokenOverride || null;
    if (!signedToken) {
      signedToken = await this.fetchSignedAgoraToken(sanitizedChannel, numericUid);
    }

    // 6. Try/Catch con client.join(appId, channelName, signedToken, uid)
    try {
      const client = this.getClient();

      console.log(`[Agora Voice] Chiamata a client.join() con token firmato da Edge Function:`, {
        appId: `${appId.slice(0, 6)}••••••••••••${appId.slice(-4)}`,
        channel: sanitizedChannel,
        tokenAvailable: Boolean(signedToken),
        uid: numericUid,
      });

      // Esegue il join passando App ID, Channel Name, Token firmato e UID
      const joinedUid = await client.join(appId, sanitizedChannel, signedToken, numericUid);
      this.currentChannel = sanitizedChannel;

      console.log(`[Agora Voice] Connessione riuscita a "${sanitizedChannel}" (UID: ${joinedUid}) con token Edge Function!`);

      // Apertura e pubblicazione microfono locale
      let isPublishing = false;
      try {
        this.closeLocalAudioTrack();
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          AEC: true,
          ANS: true,
          AGC: true,
        });

        if (this.localAudioTrack) {
          await client.publish([this.localAudioTrack]);
          isPublishing = true;
          console.log("[Agora Voice] Traccia microfono pubblicata con successo.");
        }
      } catch (micErr: any) {
        console.warn("[Agora Voice] Microfono locale non disponibile o permessi negati:", micErr?.message || micErr);
      }

      // Sottoscrizione partecipanti remoti
      for (const remoteUser of client.remoteUsers) {
        if (remoteUser.hasAudio) {
          try {
            await client.subscribe(remoteUser, "audio");
            this.remoteUsers.set(remoteUser.uid, remoteUser);
            if (!this.isDeafened && remoteUser.audioTrack) {
              remoteUser.audioTrack.play();
            }
          } catch (subErr: any) {
            console.warn("[Agora Voice] Errore sottoscrizione utente esistente:", subErr?.message || subErr);
          }
        }
      }
      this.notifyRemoteUsers();

      return {
        success: true,
        realSdk: true,
        isPublishing,
      };
    } catch (err: any) {
      const errorCode = err?.code || err?.name || "JOIN_ERROR";
      const errorMessage = err?.message || String(err);

      console.error("[Agora Voice Error Details]:", {
        code: errorCode,
        message: errorMessage,
        raw: err,
        appId: `${appId.slice(0, 6)}...`,
        channel: sanitizedChannel,
      });

      await this.cleanup();

      let friendlyAlert = `Errore Agora [${errorCode}]: ${errorMessage}`;

      if (
        errorCode === "DYNAMIC_KEY_TIMEOUT" ||
        errorMessage.includes("DYNAMIC_KEY_TIMEOUT") ||
        errorCode === "CANNOT_JOIN_CHANNEL: DYNAMIC_KEY_TIMEOUT"
      ) {
        friendlyAlert = `Errore Agora [${errorCode}]: Il token non è valido o è scaduto. La Supabase Edge Function generate-agora-token ha generato una chiave non sincronizzata con il certificato console.`;
      } else if (errorCode === "CAN_NOT_GET_GATEWAY_SERVER") {
        friendlyAlert = `Errore Agora [${errorCode}]: Gateway Agora irraggiungibile. Verifica la connessione a Internet.`;
      } else if (errorCode === "NOT_SUPPORTED") {
        friendlyAlert = `Errore Agora [${errorCode}]: WebRTC audio non supportato nel browser corrente.`;
      }

      return {
        success: false,
        realSdk: false,
        isPublishing: false,
        error: friendlyAlert,
        errorCode: String(errorCode),
      };
    } finally {
      this.isConnecting = false;
    }
  }

  public async setMuted(isMuted: boolean): Promise<void> {
    if (this.localAudioTrack) {
      try {
        await this.localAudioTrack.setMuted(isMuted);
      } catch (err) {
        console.warn("[Agora Voice] Errore setMuted:", err);
      }
    }
  }

  public setDeafened(isDeafened: boolean): void {
    this.isDeafened = isDeafened;
    this.remoteUsers.forEach((user) => {
      if (user.audioTrack) {
        try {
          if (isDeafened) {
            user.audioTrack.stop();
          } else {
            user.audioTrack.play();
          }
        } catch (e) {
          console.warn("[Agora Voice] Errore toggle deafen:", e);
        }
      }
    });
  }

  public closeLocalAudioTrack(): void {
    if (this.localAudioTrack) {
      try {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
      } catch (err) {
        console.warn("[Agora Voice] Errore closeLocalAudioTrack:", err);
      } finally {
        this.localAudioTrack = null;
      }
    }
  }

  public async leaveVoiceChannel(): Promise<void> {
    await this.cleanup();
  }

  public getCurrentChannel(): string | null {
    return this.currentChannel;
  }

  public getConnectedUsersCount(): number {
    return this.remoteUsers.size;
  }

  public getRemoteUsers(): IAgoraRTCRemoteUser[] {
    return Array.from(this.remoteUsers.values());
  }

  public isConnected(): boolean {
    return Boolean(this.client && this.client.connectionState === "CONNECTED");
  }

  public isPublishingAudio(): boolean {
    return Boolean(this.localAudioTrack && !this.localAudioTrack.muted);
  }

  public onSpeakingChange(callback: (isSpeaking: boolean, volume: number) => void): void {
    this.onSpeakingChangeCallback = callback;
  }

  public onRemoteUserChange(callback: (usersCount: number, users: IAgoraRTCRemoteUser[]) => void): void {
    this.onRemoteUserChangeCallback = callback;
  }

  public onConnectionStateChange(callback: (state: string) => void): void {
    this.onConnectionStateChangeCallback = callback;
  }

  /**
   * Reset completo dell'istanza client:
   * Chiude la traccia locale, esegue client.leave() e rimuove tutti i listener prima di azzerare il client.
   */
  public async cleanup(): Promise<void> {
    this.closeLocalAudioTrack();

    if (this.client) {
      try {
        if (this.client.connectionState === "CONNECTED" || this.client.connectionState === "CONNECTING") {
          console.log("[Agora Voice Cleanup] client.leave() in corso...");
          await this.client.leave();
          console.log("[Agora Voice Cleanup] client.leave() completato.");
        }
      } catch (err: any) {
        console.warn("[Agora Voice Cleanup] Avviso client.leave():", err?.message || err);
      }

      try {
        console.log("[Agora Voice Cleanup] client.removeAllListeners() in corso...");
        this.client.removeAllListeners();
        console.log("[Agora Voice Cleanup] client.removeAllListeners() completato.");
      } catch (listenerErr: any) {
        console.warn("[Agora Voice Cleanup] Avviso removeAllListeners():", listenerErr?.message || listenerErr);
      }

      // Reset client a null per ricreare un'istanza pulita
      this.client = null;
    }

    this.remoteUsers.clear();
    this.currentChannel = null;
    this.isDisconnected = true;
    this.isConnecting = false;
    this.notifyRemoteUsers();
  }
}

export const agoraVoiceService = new AgoraVoiceService();
