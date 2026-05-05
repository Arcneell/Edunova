import { apiFetch } from './http.js'

export async function listRoles() {
  const res = await apiFetch('/api/roles/', { method: 'GET' })
  if (!res.ok) throw new Error(`Rôles: ${res.status}`)
  return res.json()
}
