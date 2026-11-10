/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGORA_APP_ID: string;
  readonly VITE_AGORA_TEMP_TOKEN?: string;
  readonly VITE_AGORA_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
