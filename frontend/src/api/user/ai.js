import { apiFetch } from './http.js'

/**
 * Indique si le backend a une clef Gemini configurée.
 * Réponse : { configured: boolean, model: string | null }
 */
export async function getAiStatus() {
  const res = await apiFetch('/api/formateur/ai/status/', { method: 'GET' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('AI status'), { data, status: res.status })
  return data
}

/**
 * Génère un cours complet (cours + quiz + questions + réponses) via Gemini, puis
 * persiste l'ensemble côté serveur en transaction. Retour :
 *   { course, quiz, questions: [{ question_id, answer_count }] }
 */
export async function generateAiCourse(payload) {
  const res = await apiFetch('/api/formateur/ai/courses/', {
    method: 'POST',
    body: payload,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('AI generate course'), { data, status: res.status })
  return data
}
