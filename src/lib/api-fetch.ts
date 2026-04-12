export const GIGITY_API_TOKEN_STORAGE_KEY = 'gigity_api_token'

export function readStoredApiToken(): string {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem(GIGITY_API_TOKEN_STORAGE_KEY)?.trim() ?? ''
}

function isSameOriginAppApiPath(href: string): boolean {
  if (href.startsWith('/api/')) return true
  try {
    const u = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    return u.pathname.startsWith('/api/')
  } catch {
    return false
  }
}

export function apiFetch(
  input: string | URL,
  init?: RequestInit
): Promise<Response> {
  const href = typeof input === 'string' ? input : input.href
  if (!isSameOriginAppApiPath(href)) {
    return fetch(input, init)
  }
  const token = readStoredApiToken()
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}
