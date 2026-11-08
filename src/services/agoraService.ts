import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";

AgoraRTC.setLogLevel(2);

export interface AgoraConnectionState {
  status: "idle" | "connecting" | "connected" | "error";
  errorMessage?: string;
  channelName: string | null;
  appId: string;
}

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
        this.cleanup();
      });
    }
  }

  public getAppId(): string {
    const rawId = import.meta.env.VITE_AGORA_APP_ID || "f7511dae35db4516aeb30dc522b84824";
    return rawId.trim();
  }

  public isAppIdPlaceholder(): boolean {
    const appId = this.getAppId();
    return !appId || appId === "la_tua_app_id_di_agora" || appId.includes("la_tua_app_id") || appId.length < 15;
  }

  public getClient(): IAgoraRTCClient {
    if (!this.client) {
      this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      this.setupEventListeners(this.client);
    }
    return this.client;
  }

  private setupEventListeners(client: IAgoraRTCClient): void {
    client.on("user-published", async (user, mediaType) => {
      try {
        await client.subscribe(user, mediaType);
        this.remoteUsers.set(user.uid, user);

        if (mediaType === "audio" && user.audioTrack) {
          if (!this.isDeafened) {
            try {
              user.audioTrack.play();
            } catch (playErr) {
              console.warn("[Agora Voice] Autoplay remoto bloccato dal browser:", playErr);
            }
          }
        }
        this.notifyRemoteUsers();
      } catch (err) {
        console.warn("[Agora Voice] Errore sottoscrizione utente remoto:", err);
      }
    });

    client.on("user-unpublished", (user, mediaType) => {
      if (mediaType === "audio") {
        this.remoteUsers.delete(user.uid);
        this.notifyRemoteUsers();
      }
    });

    client.on("user-left", (user) => {
      this.remoteUsers.delete(user.uid);
      this.notifyRemoteUsers();
    });

    client.on("connection-state-change", (curState) => {
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
      console.warn("[Agora Voice] Volume indicator non supportato:", e);
    }
  }

  private notifyRemoteUsers(): void {
    const usersList = Array.from(this.remoteUsers.values());
    this.onRemoteUserChangeCallback?.(usersList.length, usersList);
  }

  public async joinVoiceChannel(
    channelName: string,
    userNameOrId?: string | number,
    token: string | null = null
  ): Promise<{ success: boolean; realSdk: boolean; error?: string; isPublishing: boolean }> {
    const appId = this.getAppId();

    if (this.isAppIdPlaceholder()) {
      return {
        success: false,
        realSdk: false,
        isPublishing: false,
        error: "App ID Agora non valido o non configurato.",
      };
    }

    if (this.isConnecting) {
      return { success: false, realSdk: false, isPublishing: false, error: "Connessione in corso..." };
    }

    this.isConnecting = true;
    this.isDisconnected = false;

    try {
      const sanitizedChannel = channelName
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 60);

      let numericUid: number;
      if (typeof userNameOrId === "number") {
        numericUid = Math.abs(userNameOrId) % 900000 + 100000;
      } else if (typeof userNameOrId === "string" && userNameOrId.length > 0) {
        let hash = 0;
        for (let i = 0; i < userNameOrId.length; i++) {
          hash = (hash << 5) - hash + userNameOrId.charCodeAt(i);
          hash |= 0;
        }
        numericUid = Math.abs(hash) % 900000 + 100000;
      } else {
        numericUid = Math.floor(Math.random() * 899999) + 100000;
      }

      const client = this.getClient();

      await client.join(appId, sanitizedChannel, token, numericUid);
      this.currentChannel = sanitizedChannel;

      let isPublishing = false;
      try {
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          AEC: true,
          ANS: true,
          AGC: true,
        });

        if (this.localAudioTrack) {
          await client.publish([this.localAudioTrack]);
          isPublishing = true;
        }
      } catch (micErr: any) {
        console.warn("[Agora Voice] Microfono non disponibile o permessi negati:", micErr?.message || micErr);
      }

      for (const remoteUser of client.remoteUsers) {
        if (remoteUser.hasAudio) {
          try {
            await client.subscribe(remoteUser, "audio");
            this.remoteUsers.set(remoteUser.uid, remoteUser);
            if (!this.isDeafened && remoteUser.audioTrack) {
              remoteUser.audioTrack.play();
            }
          } catch (subErr) {
            console.warn("[Agora Voice] Errore sottoscrizione partecipante esistente:", subErr);
          }
        }
      }
      this.notifyRemoteUsers();

      this.isConnecting = false;
      return {
        success: true,
        realSdk: true,
        isPublishing,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[Agora Voice] Errore critico durante client.join():", errorMessage);

      await this.cleanup();

      this.isConnecting = false;
      return {
        success: false,
        realSdk: false,
        isPublishing: false,
        error: errorMessage,
      };
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

  public cleanup(): void {
    this.closeLocalAudioTrack();

    if (this.client) {
      try {
        this.client.leave().catch(() => {});
      } catch (err) {
        console.warn("[Agora Voice] Errore client.leave() durante cleanup:", err);
      } finally {
        this.remoteUsers.clear();
        this.currentChannel = null;
        this.notifyRemoteUsers();
      }
    }
    this.isDisconnected = true;
    this.isConnecting = false;
  }
}

export const agoraVoiceService = new AgoraVoiceService();
