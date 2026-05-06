import { apiFetch } from './http.js'

export async function getRanks() {
  const res = await apiFetch('/api/ranks/', { method: 'GET' })
  const data = await res.json().catch(() => [])
  if (!res.ok) throw Object.assign(new Error('Rangs'), { data, status: res.status })
  return data
}
