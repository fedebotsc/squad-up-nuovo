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

// App ID fisso e prioritario per la modalità App ID-only (senza token)
const AGORA_APP_ID = "f7511dae35db4516aeb30dc522b84824";

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
   * Restituisce l'App ID Agora (f7511dae35db4516aeb30dc522b84824).
   */
  public getAppId(): string {
    const envAppId = (import.meta.env.VITE_AGORA_APP_ID as string | undefined)?.trim();
    if (envAppId && envAppId.length >= 10 && !this.isPlaceholder(envAppId)) {
      return envAppId;
    }
    return AGORA_APP_ID;
  }

  /**
   * Modalità App ID-only: nessun token richiesto.
   */
  public getToken(): string | null {
    return null;
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
      console.log("[Agora Voice] Inizializzazione client AgoraRTC (mode: rtc, codec: vp8 - Modalità App ID Only)");
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
   * Connessione al canale vocale Agora in modalità App ID-only:
   * QUALSIASI token viene completamente ignorato, passando rigorosamente NULL a client.join().
   */
  public async joinVoiceChannel(
    channelName: string,
    userNameOrId?: string | number,
    _token?: string | null
  ): Promise<{ success: boolean; realSdk: boolean; error?: string; errorCode?: string; isPublishing: boolean }> {
    // 1. App ID fisso o da env
    const appId = this.getAppId();

    if (this.isAppIdPlaceholder()) {
      const msg = "App ID Agora non valido.";
      console.error("[Agora Voice] App ID mancante:", msg);
      return {
        success: false,
        realSdk: false,
        isPublishing: false,
        error: msg,
        errorCode: "INVALID_APP_ID",
      };
    }

    // 2. Sanitizzazione rigorosa nome canale
    let sanitizedChannel = (channelName || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50);

    if (!sanitizedChannel) {
      sanitizedChannel = `channel_${Date.now()}`;
    }

    // 3. UID positivo o casuale
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

    // 4. Reset preventivo completo dell'istanza client per evitare conflitti di sessione
    console.log(`[Agora Voice] Reset preventivo e cleanup prima del join a "${sanitizedChannel}"...`);
    await this.cleanup();

    this.isConnecting = true;
    this.isDisconnected = false;

    // 5. Try/Catch dettagliato: client.join() con TOKEN = null (App ID-only)
    try {
      const client = this.getClient();

      console.log(`[Agora Voice] Tentativo client.join() App ID-only:`, {
        appId: AGORA_APP_ID,
        channel: sanitizedChannel,
        token: null, // Ignora completamente qualsiasi token
        uid: numericUid,
      });

      // Chiamata SDK: passa ESCLUSIVAMENTE l'App ID e NULL per il token
      const joinedUid = await client.join(appId, sanitizedChannel, null, numericUid);
      this.currentChannel = sanitizedChannel;

      console.log(`[Agora Voice] Connessione riuscita a "${sanitizedChannel}" (UID: ${joinedUid}) in modalità App ID-only!`);

      // Apertura microfono locale
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
        appId: AGORA_APP_ID,
        channel: sanitizedChannel,
      });

      await this.cleanup();

      let friendlyAlert = `Errore Agora [${errorCode}]: ${errorMessage}`;

      if (
        errorCode === "DYNAMIC_KEY_TIMEOUT" ||
        errorMessage.includes("DYNAMIC_KEY_TIMEOUT") ||
        errorCode === "CANNOT_JOIN_CHANNEL: DYNAMIC_KEY_TIMEOUT"
      ) {
        friendlyAlert = `Errore Agora [${errorCode}]: Questo App ID ha il certificato attivo nella console Agora. Per usare la modalità App ID-only senza token, disattiva il "Primary Certificate" nella Dashboard Agora (oppure crea un progetto in modalità "Testing: App ID only").`;
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
