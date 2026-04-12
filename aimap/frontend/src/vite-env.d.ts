/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** Meta App ID (số) — Facebook JS SDK; nếu không set thì dùng OAuth redirect server. */
  readonly VITE_FB_APP_ID?: string
  /** ID cấu hình đăng nhập (Login configuration) — dùng cho fb:login-button config_id; tuỳ chọn. */
  readonly VITE_FB_LOGIN_CONFIG_ID?: string
  readonly VITE_FACEBOOK_GRAPH_VERSION?: string
  /** Scope FB.login, khớp FB_OAUTH_SCOPES trên server (cách nhau dấu phẩy). */
  readonly VITE_FB_OAUTH_SCOPES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
