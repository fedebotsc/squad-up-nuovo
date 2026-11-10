import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";

// Log level 1 for detailed development warnings & error logging
AgoraRTC.setLogLevel(1);

export interface AgoraConnectionState {
  status: "idle" | "connecting" | "connected" | "error";
  errorMessage?: string;
  channelName: string | null;
  appId: string;
}

const DEFAULT_AGORA_APP_ID = "f7511dae35db4516aeb30dc522b84824";
const DEFAULT_AGORA_TEMP_TOKEN = "007eJxTYNAyX6Sg3Ot9ba/Q63vVzxUnWqk84GTdu7pUauFGRnUmBysFhjRzU0PDlMRUY9OUJBNTQ7PE1CRjg5RkUyOjJAsTCyOTlzM/ZzUEMjK8L53AwAiFID4fQ3BgqKOLQmiAgl+of5g/AwMA2iQgUA==";

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
   * Retrieves the current Agora App ID directly from environment variables.
   */
  public getAppId(): string {
    const envAppId = (import.meta.env.VITE_AGORA_APP_ID as string | undefined)?.trim();
    if (envAppId && envAppId.length >= 10 && !this.isPlaceholder(envAppId)) {
      return envAppId;
    }
    if (typeof window !== "undefined") {
      const storedAppId = localStorage.getItem("squadup_agora_appid");
      if (storedAppId && storedAppId.trim().length >= 10) {
        return storedAppId.trim();
      }
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

  /**
   * Retrieves the Agora Temp Token directly from environment variables.
   */
  public getToken(): string | null {
    // 1. Check VITE_AGORA_TEMP_TOKEN directly from environment
    const envTempToken = (import.meta.env.VITE_AGORA_TEMP_TOKEN as string | undefined)?.trim();
    if (envTempToken && envTempToken.length > 5 && envTempToken !== "null" && envTempToken !== "undefined") {
      return envTempToken;
    }
    // 2. Check VITE_AGORA_TOKEN directly from environment
    const envToken = (import.meta.env.VITE_AGORA_TOKEN as string | undefined)?.trim();
    if (envToken && envToken.length > 5 && envToken !== "null" && envToken !== "undefined") {
      return envToken;
    }
    // 3. Check custom stored token
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("squadup_agora_token");
      if (storedToken && storedToken.trim().length > 5) {
        return storedToken.trim();
      }
    }
    return DEFAULT_AGORA_TEMP_TOKEN;
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

  private isPlaceholder(val: string): boolean {
    return !val || val === "la_tua_app_id_di_agora" || val.includes("la_tua_app_id");
  }

  public isAppIdPlaceholder(): boolean {
    const appId = this.getAppId();
    return !appId || this.isPlaceholder(appId) || appId.length < 15;
  }

  /**
   * Creates or returns the Agora RTC client instance with event listeners.
   */
  public getClient(): IAgoraRTCClient {
    if (!this.client) {
      console.log("[Agora Voice] Inizializzazione nuovo client AgoraRTC (mode: rtc, codec: vp8)");
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

    client.on("token-privilege-will-expire", () => {
      console.warn("[Agora Voice Alert] Il token Agora sta per scadere (30 secondi rimanenti).");
    });

    client.on("token-privilege-did-expire", () => {
      console.error("[Agora Voice Error] Il token Agora è scaduto. Riconnessione richiesta.");
      this.onConnectionStateChangeCallback?.("DISCONNECTED");
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
   * Joins an Agora RTC Voice Channel with explicit validation, cleanup, and try/catch.
   */
  public async joinVoiceChannel(
    channelName: string,
    userNameOrId?: string | number,
    token?: string | null
  ): Promise<{ success: boolean; realSdk: boolean; error?: string; errorCode?: string; isPublishing: boolean }> {
    // 1. Retrieve App ID directly from environment variables (with fallback)
    const appId =
      (import.meta.env.VITE_AGORA_APP_ID as string | undefined)?.trim() ||
      this.getAppId();

    if (this.isAppIdPlaceholder()) {
      const msg = "App ID Agora non configurato o non valido.";
      console.error("[Agora Voice] Configurazione App ID mancante:", msg);
      return {
        success: false,
        realSdk: false,
        isPublishing: false,
        error: msg,
        errorCode: "INVALID_APP_ID",
      };
    }

    // 2. Strict Channel Name sanitization according to Agora rules
    let sanitizedChannel = (channelName || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50);

    if (!sanitizedChannel) {
      sanitizedChannel = `channel_${Date.now()}`;
    }

    // 3. Strict Token handling: retrieve directly from import.meta.env.VITE_AGORA_TEMP_TOKEN
    const envTempToken =
      (import.meta.env.VITE_AGORA_TEMP_TOKEN as string | undefined)?.trim() ||
      (import.meta.env.VITE_AGORA_TOKEN as string | undefined)?.trim();

    let safeToken: string | null = null;
    const resolvedToken = token || envTempToken || this.getToken();
    if (resolvedToken && typeof resolvedToken === "string") {
      const trimmed = resolvedToken.trim();
      if (trimmed && trimmed !== "null" && trimmed !== "undefined" && trimmed !== '""') {
        safeToken = trimmed;
      }
    }

    // 4. UID handling: Positive 32-bit integer or let Agora auto-generate with null
    let numericUid: number | null = null;
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

    // 5. MANDATORY CLEANUP: Leave prior channel and remove all listeners before attempting new join
    console.log(`[Agora Voice] Esecuzione cleanup preventivo prima del join a "${sanitizedChannel}"...`);
    await this.cleanup();

    this.isConnecting = true;
    this.isDisconnected = false;

    // 6. Explicit Try/Catch with detailed SDK error handling
    try {
      const client = this.getClient();

      console.log("[Agora Voice] Chiamata a client.join():", {
        appId: `${appId.slice(0, 6)}••••••••••••${appId.slice(-4)}`,
        channel: sanitizedChannel,
        tokenConfigured: Boolean(safeToken),
        numericUid,
      });

      // Pass directly import.meta.env.VITE_AGORA_APP_ID and import.meta.env.VITE_AGORA_TEMP_TOKEN
      const joinedUid = await client.join(appId, sanitizedChannel, safeToken, numericUid);
      this.currentChannel = sanitizedChannel;

      console.log(`[Agora Voice] Connessione riuscita al canale: "${sanitizedChannel}", UID effettivo: ${joinedUid}`);

      // Open local microphone audio track
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
          console.log("[Agora Voice] Traccia audio microfono pubblicata con successo.");
        }
      } catch (micErr: any) {
        console.warn("[Agora Voice] Microfono locale non disponibile o permessi negati dal browser:", micErr?.message || micErr);
      }

      // Check remote users already in channel
      for (const remoteUser of client.remoteUsers) {
        if (remoteUser.hasAudio) {
          try {
            await client.subscribe(remoteUser, "audio");
            this.remoteUsers.set(remoteUser.uid, remoteUser);
            if (!this.isDeafened && remoteUser.audioTrack) {
              remoteUser.audioTrack.play();
            }
          } catch (subErr: any) {
            console.warn("[Agora Voice] Errore sottoscrizione utente già connesso:", subErr?.message || subErr);
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

      // Print full exact Agora error to console as requested
      console.error("[Agora Voice Error Details]:", {
        code: errorCode,
        message: errorMessage,
        raw: err,
        appId: `${appId.slice(0, 6)}...`,
        channel: sanitizedChannel,
        tokenUsed: Boolean(safeToken),
      });

      // Perform clean teardown on failure
      await this.cleanup();

      // Formulate explicit, actionable error message for the user
      let friendlyAlert = `Errore Agora [${errorCode}]: ${errorMessage}`;

      if (
        errorCode === "DYNAMIC_KEY_TIMEOUT" ||
        errorMessage.includes("DYNAMIC_KEY_TIMEOUT") ||
        errorCode === "CANNOT_JOIN_CHANNEL: DYNAMIC_KEY_TIMEOUT" ||
        errorCode === "INVALID_TOKEN" ||
        errorCode === "TOKEN_EXPIRED"
      ) {
        friendlyAlert = `Errore Agora [${errorCode}]: Il tuo progetto Agora richiede un Token di sicurezza per connettersi. Nella console Agora imposta l'App ID in modalità "Testing (App ID only)" oppure incolla un Token temporaneo valido.`;
      } else if (errorCode === "CAN_NOT_GET_GATEWAY_SERVER") {
        friendlyAlert = `Errore Agora [${errorCode}]: Impossibile raggiungere i server gateway Agora. Verifica la connessione a Internet o eventuali restrizioni di rete.`;
      } else if (errorCode === "INVALID_APP_ID" || errorCode === "INVALID_VENDOR_KEY") {
        friendlyAlert = `Errore Agora [${errorCode}]: L'App ID fornito non è valido o è stato eliminato dalla console Agora.`;
      } else if (errorCode === "NOT_SUPPORTED") {
        friendlyAlert = `Errore Agora [${errorCode}]: Il browser corrente o il contesto iframe non supporta WebRTC audio.`;
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
   * Cleanly leaves the channel and removes all event listeners to prevent conflicting states.
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

      // Reset client to null so next call creates a pristine client instance
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
