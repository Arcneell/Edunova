import { apiFetch } from './http.js'

export async function getThemes() {
  const res = await apiFetch('/api/themes/', { method: 'GET' })
  if (!res.ok) throw new Error(`Themes: ${res.status}`)
  return res.json()
}

export async function getThemeMap(themeId) {
  const res = await apiFetch(`/api/themes/${themeId}/map/`, { method: 'GET' })
  if (!res.ok) throw new Error(`Map: ${res.status}`)
  return res.json()
}

export async function getQuizPlay(quizId) {
  const res = await apiFetch(`/api/quizzes/${quizId}/play/`, { method: 'GET' })
  if (!res.ok) throw new Error(`Quiz play: ${res.status}`)
  return res.json()
}

export async function submitQuiz(quizId, answers) {
  const res = await apiFetch(`/api/quizzes/${quizId}/submit/`, {
    method: 'POST',
    body: { answers },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Quiz submit'), { data, status: res.status })
  return data
}
