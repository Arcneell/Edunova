import { apiFetch } from './http.js'

export async function getBadges() {
  const res = await apiFetch('/api/badges/', { method: 'GET' })
  const data = await res.json().catch(() => [])
  if (!res.ok) throw Object.assign(new Error('Badges'), { data, status: res.status })
  return data
}

export async function getMyBadges() {
  const res = await apiFetch('/api/me/badges/', { method: 'GET' })
  const data = await res.json().catch(() => [])
  if (!res.ok) throw Object.assign(new Error('Mes badges'), { data, status: res.status })
  return data
}
