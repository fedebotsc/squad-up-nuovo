/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGORA_APP_ID: string;
  readonly VITE_AGORA_TEMP_TOKEN?: string;
  readonly VITE_AGORA_TOKEN?: string;
  readonly VITE_GEMINI_API_KEY_TORNEO?: string;
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
