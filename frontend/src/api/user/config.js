/** Base URL API (vide = chemins relatifs `/api`, via proxy Vite). */
export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL
  if (raw === undefined || raw === '') return ''
  return String(raw).replace(/\/$/, '')
}

export function apiUrl(path) {
  const base = getApiBaseUrl()
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : p
}
