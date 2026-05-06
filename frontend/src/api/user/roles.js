import { apiUrl } from './config.js'

/** Liste publique anonyme : pas de cookie de session (évite les en-têtes CORS « credentials » inutiles). */
export async function listRoles() {
  const res = await fetch(apiUrl('/api/roles/'), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'omit',
  })
  if (!res.ok) throw new Error(`Rôles: ${res.status}`)
  const data = await res.json()
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  return []
}
