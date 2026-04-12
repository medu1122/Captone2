/**
 * Facebook SDK for JavaScript — load async, FB.init, getLoginStatus, FB.login.
 * Tài liệu: https://developers.facebook.com/docs/javascript
 */

const VITE_SCOPES =
  (import.meta.env.VITE_FACEBOOK_OAUTH_SCOPES || import.meta.env.VITE_FB_OAUTH_SCOPES) as string | undefined

export const FB_LOGIN_SCOPES =
  VITE_SCOPES?.replace(/\s/g, '') ||
  'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts'

export type FbLoginStatus = 'connected' | 'not_authorized' | 'unknown'

export interface FbAuthResponse {
  accessToken: string
  userID: string
  expiresIn?: string
}

export interface FbLoginStatusResponse {
  status: FbLoginStatus
  authResponse?: FbAuthResponse
}

type FbSdk = {
  init: (opts: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void
  getLoginStatus: (cb: (r: FbLoginStatusResponse) => void) => void
  login: (cb: (r: FbLoginStatusResponse) => void, opts?: { scope?: string; return_scopes?: boolean }) => void
  AppEvents?: { logPageView?: () => void }
  XFBML?: { parse?: (node?: HTMLElement) => void }
}

declare global {
  interface Window {
    FB?: FbSdk
    fbAsyncInit?: () => void
    __aimapAfterFbLogin?: () => void
  }
}

function graphVersion(v: string): string {
  const t = v.trim()
  return t.startsWith('v') ? t : `v${t}`
}

/** Load sdk.js + gọi FB.init (cookie, xfbml cho fb:login-button). */
export function loadAndInitFacebookSdk(
  appId: string,
  version: string,
  sdkLocale: 'vi_VN' | 'en_US'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ver = graphVersion(version || 'v20.0')
    if (window.FB) {
      try {
        window.FB.init({ appId, cookie: true, xfbml: true, version: ver })
        window.FB.AppEvents?.logPageView?.()
      } catch {
        /* ignore */
      }
      resolve()
      return
    }

    window.fbAsyncInit = () => {
      try {
        if (!window.FB) {
          reject(new Error('FB not loaded'))
          return
        }
        window.FB.init({ appId, cookie: true, xfbml: true, version: ver })
        window.FB.AppEvents?.logPageView?.()
        resolve()
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    }

    const id = 'facebook-jssdk'
    if (document.getElementById(id)) {
      const start = Date.now()
      const iv = window.setInterval(() => {
        if (window.FB) {
          window.clearInterval(iv)
          try {
            window.FB.init({ appId, cookie: true, xfbml: true, version: ver })
            window.FB.AppEvents?.logPageView?.()
          } catch {
            /* ignore */
          }
          resolve()
        } else if (Date.now() - start > 20000) {
          window.clearInterval(iv)
          reject(new Error('Facebook SDK timeout'))
        }
      }, 50)
      return
    }

    const firstScript = document.getElementsByTagName('script')[0]
    const js = document.createElement('script')
    js.id = id
    js.async = true
    js.src = `https://connect.facebook.net/${sdkLocale}/sdk.js`
    js.onerror = () => reject(new Error('Facebook SDK script failed'))
    firstScript?.parentNode?.insertBefore(js, firstScript)
  })
}

export function getFacebookLoginStatus(): Promise<FbLoginStatusResponse> {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('FB not ready'))
      return
    }
    window.FB.getLoginStatus((r) => resolve(r))
  })
}

/** Mở dialog đăng nhập Facebook (scope Page). */
export function facebookLoginWithScopes(scope: string = FB_LOGIN_SCOPES): Promise<FbLoginStatusResponse> {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('FB not ready'))
      return
    }
    window.FB.login((r) => resolve(r), { scope, return_scopes: true })
  })
}

/** Parse XFBML (fb:login-button) trong container. */
export function parseXfbml(container: HTMLElement | null) {
  if (!container || !window.FB?.XFBML?.parse) return
  window.FB.XFBML.parse(container)
}
