import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";

export interface AgoraConnectionState {
  status: "idle" | "connecting" | "connected" | "error";
  errorMessage?: string;
  isRealSdkConnected: boolean;
  channelName: string | null;
  appId: string;
}

class AgoraVoiceService {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private remoteUsers: Map<string | number, IAgoraRTCRemoteUser> = new Map();
  private isDeafened: boolean = false;
  private onSpeakingChangeCallback?: (isSpeaking: boolean, volume: number) => void;
  private onRemoteUserChangeCallback?: (usersCount: number) => void;

  constructor() {
    // Garanzia di rilascio tracce audio all'uscita o chiusura finestra
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.closeLocalAudioTrack();
      });
    }
  }

  public getAppId(): string {
    const rawId = import.meta.env.VITE_AGORA_APP_ID || "";
    return rawId.trim();
  }

  public isAppIdPlaceholder(): boolean {
    const appId = this.getAppId();
    return (
      !appId ||
      appId === "la_tua_app_id_di_agora" ||
      appId.includes("la_tua_app_id") ||
      appId.length < 10
    );
  }

  public getClient(): IAgoraRTCClient {
    if (!this.client) {
      this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      this.setupEventListeners();
    }
    return this.client;
  }

  private setupEventListeners(): void {
    if (!this.client) return;

    // Utente remoto che pubblica traccia audio
    this.client.on("user-published", async (user, mediaType) => {
      if (mediaType === "audio") {
        try {
          const remoteTrack = await this.client!.subscribe(user, mediaType);
          this.remoteUsers.set(user.uid, user);
          if (!this.isDeafened) {
            remoteTrack.play();
          }
          this.onRemoteUserChangeCallback?.(this.remoteUsers.size);
        } catch (err) {
          console.warn("[Agora Web SDK] Errore sottoscrizione audio remoto:", err);
        }
      }
    });

    // Utente remoto che interrompe la trasmissione audio
    this.client.on("user-unpublished", (user, mediaType) => {
      if (mediaType === "audio") {
        this.remoteUsers.delete(user.uid);
        this.onRemoteUserChangeCallback?.(this.remoteUsers.size);
      }
    });

    this.client.on("user-left", (user) => {
      this.remoteUsers.delete(user.uid);
      this.onRemoteUserChangeCallback?.(this.remoteUsers.size);
    });

    // Indicatore livello volume per animazioni grafiche audio parlante
    this.client.enableAudioVolumeIndicator();
    this.client.on("volume-indicator", (volumes) => {
      const localVolume = volumes.find(
        (v) => v.uid === 0 || v.uid === this.client?.uid
      );
      if (localVolume && this.onSpeakingChangeCallback) {
        this.onSpeakingChangeCallback(localVolume.level > 5, localVolume.level);
      }
    });
  }

  /**
   * Connette alla stanza vocale Agora utilizzando VITE_AGORA_APP_ID
   */
  public async joinVoiceChannel(
    channelName: string,
    uid?: string | number,
    token: string | null = null
  ): Promise<{ success: boolean; realSdk: boolean; error?: string }> {
    const appId = this.getAppId();

    // Pulizia e chiusura preventiva di tracce audio precedenti
    this.closeLocalAudioTrack();

    // Se l'App ID è assente o segnaposto
    if (this.isAppIdPlaceholder()) {
      console.info(
        `[Agora Web SDK] VITE_AGORA_APP_ID non configurata o segnaposto ("${appId}").`
      );
      return {
        success: true,
        realSdk: false,
        error: "App ID non configurata in .env",
      };
    }

    try {
      const client = this.getClient();

      // Crea traccia microfono locale con cancellazione rumore e AEC
      try {
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: "high_quality_stereo",
          AEC: true,
          ANS: true,
        });
      } catch (micErr: unknown) {
        console.warn(
          "[Agora Web SDK] Impossibile acquisire il microfono (permessi o dispositivo assente):",
          micErr
        );
        // Assicurati che nessuna risorsa rimanga appesa
        this.closeLocalAudioTrack();

        // Connetti comunque al canale per ricevere l'audio degli altri membri
        await client.join(appId, channelName, token, uid || null);
        console.info(
          `[Agora Web SDK] Connesso al canale ${channelName} in modalità solo ascolto (mic non disponibile).`
        );
        return {
          success: true,
          realSdk: true,
          error: "Microfono non accessibile, connesso in modalità ascolto.",
        };
      }

      // Join del canale Agora con App ID
      await client.join(appId, channelName, token, uid || null);

      // Pubblica la traccia audio nel canale se disponibile
      if (this.localAudioTrack) {
        await client.publish([this.localAudioTrack]);
      }

      console.info(
        `[Agora Web SDK] Connesso con successo al canale: ${channelName} con App ID ${appId.slice(0, 8)}...`
      );
      return { success: true, realSdk: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[Agora Web SDK] Errore connessione canale vocale:", errorMessage);

      // Chiudi SEMPRE la traccia audio locale in caso di errore
      this.closeLocalAudioTrack();

      return {
        success: false,
        realSdk: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Attiva o disattiva il microfono locale
   */
  public async setMuted(isMuted: boolean): Promise<void> {
    if (this.localAudioTrack) {
      try {
        await this.localAudioTrack.setEnabled(!isMuted);
      } catch (err) {
        console.warn("[Agora Web SDK] Errore setEnabled traccia microfono:", err);
      }
    }
  }

  /**
   * Attiva o disattiva l'audio in ascolto (Deafen)
   */
  public setDeafened(isDeafened: boolean): void {
    this.isDeafened = isDeafened;
    this.remoteUsers.forEach((user) => {
      if (user.audioTrack) {
        if (isDeafened) {
          user.audioTrack.stop();
        } else {
          user.audioTrack.play();
        }
      }
    });
  }

  /**
   * Chiude e rilascia in modo pulito tutte le risorse audio
   * Assicura SEMPRE la chiusura della traccia con localAudioTrack.close()
   */
  public closeLocalAudioTrack(): void {
    if (this.localAudioTrack) {
      try {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        console.info("[Agora Web SDK] localAudioTrack.close() eseguito correttamente.");
      } catch (err) {
        console.warn("[Agora Web SDK] Errore durante localAudioTrack.close():", err);
      } finally {
        this.localAudioTrack = null;
      }
    }
  }

  /**
   * Disconnessione completa dalla stanza vocale
   */
  public async leaveVoiceChannel(): Promise<void> {
    // 1. Chiudi SEMPRE la traccia audio locale (localAudioTrack.close())
    this.closeLocalAudioTrack();

    // 2. Lascia il canale Agora se il client è attivo
    if (this.client) {
      try {
        await this.client.leave();
        this.remoteUsers.clear();
        console.info("[Agora Web SDK] Disconnessione dal canale completata.");
      } catch (err) {
        console.warn("[Agora Web SDK] Errore uscita canale Agora:", err);
      }
    }
  }

  public onSpeakingChange(cb: (isSpeaking: boolean, volume: number) => void): void {
    this.onSpeakingChangeCallback = cb;
  }

  public onRemoteUserChange(cb: (count: number) => void): void {
    this.onRemoteUserChangeCallback = cb;
  }
}

export const agoraVoiceService = new AgoraVoiceService();
