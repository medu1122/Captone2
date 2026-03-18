/**
 * API base URL – từ env (VITE_API_URL). Gọi thẳng backend 4111; mặc định http://localhost:4111.
 */
const env = (import.meta as unknown as { env: Record<string, string> }).env
const raw = env?.VITE_API_URL?.trim()
const API_BASE = raw ? raw.replace(/\/$/, '') : 'http://localhost:4111'

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE.replace(/\/$/, '')}${p}`
}

/** Ảnh lưu tại /uploads (không nằm dưới /api). */
export function assetStorageUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) {
    // Rewrite any localhost URL to a same-origin relative path so HTTPS pages
    // never load mixed-content and the nginx /uploads/ proxy handles the request.
    try {
      const u = new URL(path)
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        // #region agent log
        console.warn('[bb1f55][H:rewrite] assetStorageUrl rewriting localhost URL → relative. original=' + path + ' result=' + (u.pathname + u.search))
        // #endregion
        return u.pathname + u.search
      }
    } catch { /* fall through */ }
    // #region agent log
    fetch('http://127.0.0.1:7761/ingest/05cf90d4-996a-4cce-828d-8d12f370426f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c42cf'},body:JSON.stringify({sessionId:'5c42cf',location:'client.ts:assetStorageUrl',message:'H-C: non-localhost absolute URL passed through',data:{path},timestamp:Date.now(),hypothesisId:'H-C'})}).catch(()=>{});
    // #endregion
    return path
  }
  const origin = API_BASE.replace(/\/api\/?$/i, '') || ''
  const result = `${origin.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  // #region agent log
  fetch('http://127.0.0.1:7761/ingest/05cf90d4-996a-4cce-828d-8d12f370426f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c42cf'},body:JSON.stringify({sessionId:'5c42cf',location:'client.ts:assetStorageUrl',message:'H-C: relative path resolved',data:{path,API_BASE,origin,result},timestamp:Date.now(),hypothesisId:'H-C'})}).catch(()=>{});
  // #endregion
  return result
}

export type ApiFetchOptions = Omit<RequestInit, 'body'> & { body?: object }

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const url = apiUrl(path)
  const { body, ...rest } = options
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  const res = await fetch(url, {
    ...rest,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })
  let data: T | { error?: string } = {}
  const ct = res.headers.get('content-type')
  if (ct?.includes('application/json')) {
    try {
      data = (await res.json()) as T | { error?: string }
    } catch {
      /* ignore */
    }
  }
  const error = (data as { error?: string }).error ?? (res.ok ? undefined : res.statusText)
  return { data: data as T, error, status: res.status }
}
