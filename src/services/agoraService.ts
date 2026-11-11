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

export interface AgoraJoinResult {
  success: boolean;
  realSdk: boolean;
  isPublishing: boolean;
  uid?: number;
  error?: string;
  errorCode?: string;
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
   * Restituisce l'App ID Agora attivo.
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

  /**
   * Deprecato: I token statici sono disabilitati. Tutti i token devono essere generati
   * dinamicamente su richiesta dalla Supabase Edge Function 'generate-agora-token'.
   */
  public getToken(): string | null {
    return null;
  }

  public setCustomToken(_token: string): void {
    // No-op: i token statici sono disabilitati per evitare l'errore 'dynamic use static key'.
    if (typeof window !== "undefined") {
      localStorage.removeItem("squadup_agora_token");
    }
  }

  /**
   * Richiede OBBLIGATORIAMENTE il token dinamico alla Supabase Edge Function 'generate-agora-token'.
   * Se il token non viene restituito o la Edge Function fallisce, interrompe l'esecuzione
   * lanciando un errore esplicito invece di fare fallback a null, stringhe vuote o chiavi statiche.
   */
  public async fetchSignedAgoraToken(
    channelName: string,
    uid: number | string
  ): Promise<string> {
    console.log(
      `[Agora Voice] Richiesta obbligatoria token RTC dinamico alla Edge Function "generate-agora-token" (channel: "${channelName}", UID: ${uid})...`
    );

    let signedToken: string | null = null;
    let errorMessage = "";

    // 1. Chiamata primaria tramite supabase.functions.invoke
    try {
      const { data, error } = await supabase.functions.invoke("generate-agora-token", {
        body: {
          channelName,
          uid,
        },
      });

      if (!error && data) {
        if (data.error) {
          errorMessage = String(data.error);
        } else {
          const receivedToken = data.token || data.rtcToken || data.jwt || null;
          if (receivedToken && typeof receivedToken === "string" && receivedToken.trim().length > 10) {
            signedToken = receivedToken.trim();
          }
        }
      } else if (error) {
        errorMessage = error.message || String(error);
        console.warn("[Agora Voice] Avviso supabase.functions.invoke('generate-agora-token'):", errorMessage);
      }
    } catch (invokeErr: any) {
      errorMessage = invokeErr?.message || String(invokeErr);
      console.warn("[Agora Voice] Eccezione supabase.functions.invoke:", errorMessage);
    }

    // 2. Fallback diretto endpoint HTTP verso l'Edge Function se l'invoke fallisce per CORS/rete
    if (!signedToken) {
      try {
        console.log(`[Agora Voice] Tentativo HTTP diretto verso Edge Function generate-agora-token...`);
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
          if (directData?.error) {
            errorMessage = String(directData.error);
          } else {
            const receivedToken = directData?.token || directData?.rtcToken || directData?.jwt || null;
            if (receivedToken && typeof receivedToken === "string" && receivedToken.trim().length > 10) {
              signedToken = receivedToken.trim();
            }
          }
        } else {
          const resErr = await fallbackRes.text().catch(() => "");
          errorMessage = `HTTP ${fallbackRes.status}: ${resErr || fallbackRes.statusText}`;
        }
      } catch (fetchErr: any) {
        errorMessage = fetchErr?.message || String(fetchErr);
        console.warn("[Agora Voice] Eccezione fetch diretto Edge Function:", errorMessage);
      }
    }

    // 3. VERIFICA RIGIDA: Nessun fallback a chiavi statiche, null o stringa vuota.
    // Se la chiamata fallisce o il token non viene restituito, interrompe l'esecuzione lanciando un errore esplicito.
    if (!signedToken || signedToken.length < 10) {
      const explicitError = `Errore Agora [DYNAMIC_TOKEN_REQUIRED]: Impossibile ottenere il token dinamico dalla Edge Function 'generate-agora-token' per il canale "${channelName}" (UID: ${uid}). Motivo: ${errorMessage || "Token non restituito o vuoto"}. Connessione interrotta per prevenire l'errore Agora 'dynamic use static key'.`;
      console.error("[Agora Voice]", explicitError);
      throw new Error(explicitError);
    }

    console.log("[Agora Voice] Token RTC dinamico ottenuto con successo da Supabase Edge Function:", {
      channel: channelName,
      uid,
      tokenPrefix: signedToken.slice(0, 15) + "...",
    });

    return signedToken;
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
        if (typeof receivedToken === "string" && receivedToken.length > 10) {
          return {
            success: true,
            token: receivedToken,
            source: "Supabase Edge Function (invoke)",
            channel: testChannel,
            uid: testUid,
          };
        }
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
        const receivedToken = directData?.token || directData?.rtcToken;
        if (typeof receivedToken === "string" && receivedToken.length > 10) {
          return {
            success: true,
            token: receivedToken,
            source: "Supabase Edge Function (HTTP direct)",
            channel: testChannel,
            uid: testUid,
          };
        }
      }

      return {
        success: false,
        error: error?.message || "Nessun token valido restituito dall'Edge Function",
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
   * Verifica preventiva della disponibilità e dei permessi del microfono tramite getUserMedia.
   */
  public async checkMicrophonePermission(): Promise<{ granted: boolean; error?: string; errorCode?: string }> {
    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      return {
        granted: false,
        error: "Il browser o il contesto attuale non supporta l'accesso al microfono (richiede HTTPS o localhost).",
        errorCode: "MEDIA_DEVICES_NOT_SUPPORTED",
      };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Rilascia immediatamente tutte le tracce audio acquisite per non bloccare il microfono
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      return { granted: true };
    } catch (err: any) {
      console.warn("[Agora Voice] Controllo preventivo permessi audio fallito:", err?.name, err?.message);

      let userFriendlyMsg = "Accesso al microfono negato o dispositivo audio non disponibile.";
      let code = "MIC_PERMISSION_DENIED";

      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        userFriendlyMsg = "Permesso microfono negato: consenti l'accesso al microfono nelle impostazioni del browser (o dall'icona del lucchetto) per entrare nella stanza vocale.";
        code = "PERMISSION_DENIED";
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        userFriendlyMsg = "Nessun microfono rilevato: collega un microfono o una cuffia con microfono al dispositivo per partecipare alla voce.";
        code = "NO_MIC_DEVICE";
      } else if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
        userFriendlyMsg = "Il microfono è attualmente occupato da un'altra applicazione (es. Discord, Meet, Zoom). Chiudi l'altra app e riprova.";
        code = "MIC_BUSY";
      } else if (err?.name === "OverconstrainedError") {
        userFriendlyMsg = "Nessun microfono rilevato soddisfa i requisiti di sistema.";
        code = "MIC_OVERCONSTRAINED";
      } else if (err?.name === "SecurityError") {
        userFriendlyMsg = "Accesso al microfono non consentito dal browser per motivi di sicurezza (richiede contesto protetto HTTPS).";
        code = "MIC_SECURITY_ERROR";
      }

      return {
        granted: false,
        error: userFriendlyMsg,
        errorCode: code,
      };
    }
  }

  /**
   * Alias esplicito per la connessione al canale Agora.
   * Richiede obbligatoriamente il token dinamico tramite la Edge Function generate-agora-token.
   * Se il token non viene restituito o la Edge Function fallisce, interrompe l'esecuzione
   * lanciando un errore esplicito invece di fare fallback a static key o null.
   * Esegue client.join(appId, channelName, token, numericUid) passando esclusivamente il token dinamico generato.
   */
  public async joinChannel(
    channelName: string,
    userNameOrId?: string | number
  ): Promise<AgoraJoinResult> {
    return this.joinVoiceChannel(channelName, userNameOrId);
  }

  /**
   * Connessione al canale vocale Agora:
   * 1. Verifica App ID e permessi microfono.
   * 2. Sanitizza nome canale e calcola UID numerico univoco.
   * 3. Reset preventivo completo dell'istanza client.
   * 4. Richiede OBBLIGATORIAMENTE il token dinamico alla Edge Function generate-agora-token.
   *    Se non viene restituito, INTERROMPE immediatamente l'esecuzione lanciando un errore esplicito.
   * 5. Esegue client.join(appId, channelName, token, numericUid) passando ESCLUSIVAMENTE il token dinamico generato.
   */
  public async joinVoiceChannel(
    channelName: string,
    userNameOrId?: string | number
  ): Promise<AgoraJoinResult> {
    // 1. App ID da env o default
    const appId = this.getAppId();

    if (this.isAppIdPlaceholder()) {
      const msg = "App ID Agora non configurato o non valido.";
      console.error("[Agora Voice] App ID mancante:", msg);
      throw new Error(`Errore Agora [INVALID_APP_ID]: ${msg}`);
    }

    // 2. Controllo preventivo permessi audio e disponibilità microfono
    const micCheck = await this.checkMicrophonePermission();
    if (!micCheck.granted) {
      console.warn("[Agora Voice] Accesso microfono rifiutato o non disponibile:", micCheck.error);
      throw new Error(micCheck.error || "Permesso microfono negato o dispositivo audio non disponibile.");
    }

    // 3. Sanitizzazione nome canale per Agora
    let sanitizedChannel = (channelName || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50);

    if (!sanitizedChannel) {
      sanitizedChannel = `channel_${Date.now()}`;
    }

    // 4. Calcolo UID numerico per la sessione
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

    // 5. Reset preventivo completo dell'istanza client per evitare conflitti di sessioni aperte
    console.log(`[Agora Voice] Reset preventivo e cleanup prima del join a "${sanitizedChannel}"...`);
    await this.cleanup();

    this.isConnecting = true;
    this.isDisconnected = false;

    // 6. RICHIESTA OBBLIGATORIA DEL TOKEN DINAMICO TRAMITE LA EDGE FUNCTION generate-agora-token
    // Se il token non viene restituito o la Edge Function fallisce, interrompe l'esecuzione lanciando un errore esplicito.
    // NESSUN FALLBACK A client.join(appId, channelName, null, uid) O CHIAVI STATICHE!
    let token: string;
    try {
      token = await this.fetchSignedAgoraToken(sanitizedChannel, numericUid);
    } catch (err: any) {
      this.isConnecting = false;
      const errorMsg = err?.message || "Impossibile ottenere il token dinamico da generate-agora-token.";
      console.error("[Agora Voice] Interruzione esplicita connessione:", errorMsg);
      throw new Error(errorMsg);
    }

    if (!token || typeof token !== "string" || token.trim().length < 10) {
      this.isConnecting = false;
      const errorMsg = `Errore Agora [DYNAMIC_TOKEN_REQUIRED]: Token dinamico non valido o vuoto per il canale "${sanitizedChannel}". Connessione interrotta per prevenire l'errore 'dynamic use static key'.`;
      console.error("[Agora Voice]", errorMsg);
      throw new Error(errorMsg);
    }

    // 7. Esegue client.join(appId, channelName, token, numericUid) passando ESCLUSIVAMENTE il token dinamico generato
    try {
      const client = this.getClient();

      console.log(`[Agora Voice] Esecuzione client.join() con token dinamico obbligatorio:`, {
        appId: `${appId.slice(0, 6)}••••••••••••${appId.slice(-4)}`,
        channel: sanitizedChannel,
        tokenPrefix: `${token.slice(0, 12)}...`,
        uid: numericUid,
      });

      // Esegue il join ESCLUSIVAMENTE con il token dinamico generato
      const joinedUid = await client.join(appId, sanitizedChannel, token, numericUid);
      this.currentChannel = sanitizedChannel;

      console.log(`[Agora Voice] Connessione riuscita a "${sanitizedChannel}" (UID: ${joinedUid}) con token dinamico!`);

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
        uid: typeof joinedUid === "number" ? joinedUid : numericUid,
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
        friendlyAlert = `Errore Agora [DYNAMIC_KEY_TIMEOUT]: Il token dinamico è scaduto o non sincronizzato. Riprova per rigenerare il token.`;
      } else if (
        errorCode === "DYNAMIC_USE_STATIC_KEY" ||
        errorMessage.includes("dynamic use static key") ||
        errorMessage.includes("DYNAMIC_USE_STATIC_KEY")
      ) {
        friendlyAlert = `Errore Agora [DYNAMIC_USE_STATIC_KEY]: Il progetto Agora richiede un token dinamico generato con App Certificate valido. Assicurati che AGORA_APP_CERTIFICATE sia configurato nei Segreti di Supabase per l'Edge Function generate-agora-token.`;
      } else if (errorCode === "CAN_NOT_GET_GATEWAY_SERVER") {
        friendlyAlert = `Errore Agora [CAN_NOT_GET_GATEWAY_SERVER]: Gateway Agora irraggiungibile. Verifica la connessione a Internet.`;
      } else if (errorCode === "NOT_SUPPORTED") {
        friendlyAlert = `Errore Agora [NOT_SUPPORTED]: WebRTC audio non supportato nel browser corrente.`;
      }

      throw new Error(friendlyAlert);
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
