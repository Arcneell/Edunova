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

export async function purchaseCosmetic(cosmeticId) {
  const res = await apiFetch('/api/cosmetics/purchase/', {
    method: 'POST',
    body: { cosmetic_id: cosmeticId },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok && res.status !== 409) {
    throw Object.assign(new Error('Achat impossible'), { data, status: res.status })
  }
  return { ok: res.ok, alreadyOwned: res.status === 409, data }
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

/**
 * Acquiert le cosmétique (idempotent) puis l'équipe. Lève une erreur si l'achat
 * échoue (solde insuffisant, etc.) ; ignore la 409 « déjà possédé ».
 */
export async function purchaseAndEquipCosmetic(cosmeticId) {
  await purchaseCosmetic(cosmeticId)
  return equipCosmetic(cosmeticId)
}
