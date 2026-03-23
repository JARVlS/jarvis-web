const rawApiBase =
  import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? '/api' : '/api')
const normalizedBase = rawApiBase.startsWith('/') ? rawApiBase : `/${rawApiBase}`
const API_BASE = normalizedBase.replace(/\/+$/, '')

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${normalizedPath}`
}

export function authUrl(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}
