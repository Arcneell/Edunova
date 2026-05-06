import { apiFetch } from './http.js'

export async function listAdminUsers(searchParams) {
  const q = searchParams ? `?${new URLSearchParams(searchParams)}` : ''
  const res = await apiFetch(`/api/admin/users/${q}`, { method: 'GET' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Liste utilisateurs'), { data, status: res.status })
  return data
}

export async function getAdminUser(userId) {
  const res = await apiFetch(`/api/admin/users/${userId}/`, { method: 'GET' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Utilisateur'), { data, status: res.status })
  return data
}

export async function patchAdminUser(userId, body) {
  const res = await apiFetch(`/api/admin/users/${userId}/`, {
    method: 'PATCH',
    body,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Mise à jour utilisateur'), { data, status: res.status })
  return data
}

export async function createAdminUser(payload) {
  const res = await apiFetch('/api/admin/users/', {
    method: 'POST',
    body: payload,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Création utilisateur'), { data, status: res.status })
  return data
}

export async function deleteAdminUser(userId) {
  const res = await apiFetch(`/api/admin/users/${userId}/`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw Object.assign(new Error('Suppression utilisateur'), { data, status: res.status })
  }
}
