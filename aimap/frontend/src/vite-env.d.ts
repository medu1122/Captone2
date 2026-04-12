/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** App ID — SDK (ưu tiên). Fallback: VITE_FB_APP_ID. */
  readonly VITE_FACEBOOK_APP_ID?: string
  readonly VITE_FB_APP_ID?: string
  readonly VITE_FACEBOOK_GRAPH_VERSION?: string
  readonly VITE_FACEBOOK_LOGIN_CONFIG_ID?: string
  readonly VITE_FB_LOGIN_CONFIG_ID?: string
  /** Scope SDK — khớp FACEBOOK_OAUTH_SCOPES. Fallback: VITE_FB_OAUTH_SCOPES. */
  readonly VITE_FACEBOOK_OAUTH_SCOPES?: string
  readonly VITE_FB_OAUTH_SCOPES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
