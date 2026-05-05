import { apiFetch } from './http.js'

export async function getMe() {
  const res = await apiFetch('/api/me/', { method: 'GET' })
  if (res.status === 401) return null
  if (!res.ok) throw new Error(`Profil: ${res.status}`)
  return res.json()
}

export async function patchMe(body) {
  const res = await apiFetch('/api/me/', { method: 'PATCH', body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Mise à jour compte'), { data, status: res.status })
  return data
}

export async function getProfile() {
  const res = await apiFetch('/api/me/profile/', { method: 'GET' })
  if (!res.ok) throw new Error(`Profil jeu: ${res.status}`)
  return res.json()
}

export async function patchProfile(body) {
  const res = await apiFetch('/api/me/profile/', { method: 'PATCH', body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Mise à jour profil'), { data, status: res.status })
  return data
}
