import { apiFetch } from './http.js'

/**
 * Récupère la liste paginée des logs d'activité (staff uniquement).
 * @param {Object} params - action, user_id, since, page, page_size
 */
export async function listActivityLogs(params = {}) {
  const q = Object.keys(params).length ? `?${new URLSearchParams(params)}` : ''
  const res = await apiFetch(`/api/admin/logs/${q}`, { method: 'GET' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Logs activité'), { data, status: res.status })
  return data
}
