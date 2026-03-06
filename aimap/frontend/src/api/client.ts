/**
 * API base URL – từ env (VITE_API_URL). Dev: để trống thì dùng proxy /api -> backend 4000.
 */
const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL ?? 'http://localhost:4000'

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE.replace(/\/$/, '')}${p}`
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
