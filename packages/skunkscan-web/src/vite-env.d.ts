/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Absolute base URL of the @elizaos/agent deployment that serves
  // /api/skunkscan/* - required now that this frontend is deployed as its
  // own Railway service, on its own origin. See TrustCheckWidget.tsx.
  readonly VITE_SKUNKSCAN_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
