import { apiFetch } from './http.js'

export async function getFormateurCourses() {
  const res = await apiFetch('/api/formateur/courses/', { method: 'GET' })
  const data = await res.json().catch(() => [])
  if (!res.ok) throw Object.assign(new Error('Formateur courses'), { data, status: res.status })
  return data
}

export async function createFormateurCourse(payload) {
  const res = await apiFetch('/api/formateur/courses/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Create formateur course'), { data, status: res.status })
  return data
}

export async function updateFormateurCourse(courseId, payload) {
  const res = await apiFetch(`/api/formateur/courses/${courseId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Update formateur course'), { data, status: res.status })
  return data
}

export async function deleteFormateurCourse(courseId) {
  const res = await apiFetch(`/api/formateur/courses/${courseId}/`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw Object.assign(new Error('Delete formateur course'), { data, status: res.status })
  }
}

export async function getFormateurQuizzes() {
  const res = await apiFetch('/api/formateur/quizzes/', { method: 'GET' })
  const data = await res.json().catch(() => [])
  if (!res.ok) throw Object.assign(new Error('Formateur quizzes'), { data, status: res.status })
  return data
}

export async function getFormateurQuizQuestions(quizId) {
  const res = await apiFetch(`/api/formateur/quizzes/${quizId}/questions/`, { method: 'GET' })
  const data = await res.json().catch(() => [])
  if (!res.ok) throw Object.assign(new Error('Formateur questions'), { data, status: res.status })
  return data
}

export async function getFormateurQuestionAnswers(questionId) {
  const res = await apiFetch(`/api/formateur/questions/${questionId}/answers/`, { method: 'GET' })
  const data = await res.json().catch(() => [])
  if (!res.ok) throw Object.assign(new Error('Formateur answers'), { data, status: res.status })
  return data
}
