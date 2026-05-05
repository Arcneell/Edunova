import { apiFetch } from './http.js'

export async function fetchCsrf() {
  const res = await apiFetch('/api/auth/csrf/', { method: 'GET' })
  if (!res.ok) throw new Error(`CSRF: ${res.status}`)
  return res
}

export async function register({ email, password, role_id }) {
  const payload = { email, password }
  if (role_id != null) payload.role_id = role_id
  const res = await apiFetch('/api/auth/register/', {
    method: 'POST',
    body: payload,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Inscription échouée'), { data, status: res.status })
  return data
}

export async function login({ email, password }) {
  const res = await apiFetch('/api/auth/login/', {
    method: 'POST',
    body: { email, password },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Connexion échouée'), { data, status: res.status })
  return data
}

export async function logout() {
  const res = await apiFetch('/api/auth/logout/', { method: 'POST' })
  if (!res.ok && res.status !== 204) {
    throw new Error(`Déconnexion: ${res.status}`)
  }
}
