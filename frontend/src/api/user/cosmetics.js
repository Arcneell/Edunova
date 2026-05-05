import { apiFetch } from './http.js'

export async function listAllCosmetics() {
  const res = await apiFetch('/api/cosmetics/')
  if (!res.ok) throw new Error(`Cosmétiques: ${res.status}`)
  return res.json()
}

export async function listMyPurchases() {
  const res = await apiFetch('/api/me/purchases/')
  if (!res.ok) throw new Error(`Achats: ${res.status}`)
  return res.json()
}

export async function equipCosmetic(cosmeticId) {
  const res = await apiFetch('/api/me/equip/', {
    method: 'POST',
    body: { cosmetic_id: cosmeticId },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok)
    throw Object.assign(new Error('Équipement impossible'), { data, status: res.status })
  return data
}
