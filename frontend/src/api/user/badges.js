import { apiFetch } from './http.js'

export async function getBadges() {
  const res = await apiFetch('/api/badges/', { method: 'GET' })
  const data = await res.json().catch(() => [])
  if (!res.ok) throw Object.assign(new Error('Badges'), { data, status: res.status })
  return data
}
