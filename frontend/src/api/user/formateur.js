import { apiFetch } from './http.js'

export async function createFormateurTheme(payload) {
  const res = await apiFetch('/api/formateur/themes/', {
    method: 'POST',
    body: payload,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Create formateur theme'), { data, status: res.status })
  return data
}

export async function deleteFormateurTheme(themeId) {
  const res = await apiFetch(`/api/formateur/themes/${themeId}/`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw Object.assign(new Error('Delete formateur theme'), { data, status: res.status })
  }
}

export async function getFormateurCourses() {
  const res = await apiFetch('/api/formateur/courses/', { method: 'GET' })
  const data = await res.json().catch(() => [])
  if (!res.ok) throw Object.assign(new Error('Formateur courses'), { data, status: res.status })
  return data
}

export async function createFormateurCourse(payload) {
  const res = await apiFetch('/api/formateur/courses/', {
    method: 'POST',
    body: payload,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Create formateur course'), { data, status: res.status })
  return data
}

export async function updateFormateurCourse(courseId, payload) {
  const res = await apiFetch(`/api/formateur/courses/${courseId}/`, {
    method: 'PATCH',
    body: payload,
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

export async function createFormateurQuiz(payload) {
  const res = await apiFetch('/api/formateur/quizzes/', {
    method: 'POST',
    body: payload,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Create quiz'), { data, status: res.status })
  return data
}

export async function updateFormateurQuiz(quizId, payload) {
  const res = await apiFetch(`/api/formateur/quizzes/${quizId}/`, {
    method: 'PATCH',
    body: payload,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Update quiz'), { data, status: res.status })
  return data
}

export async function deleteFormateurQuiz(quizId) {
  const res = await apiFetch(`/api/formateur/quizzes/${quizId}/`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw Object.assign(new Error('Delete quiz'), { data, status: res.status })
  }
}

export async function createFormateurQuestion(quizId, payload) {
  const res = await apiFetch(`/api/formateur/quizzes/${quizId}/questions/`, {
    method: 'POST',
    body: payload,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Create question'), { data, status: res.status })
  return data
}

export async function updateFormateurQuestion(questionId, payload) {
  const res = await apiFetch(`/api/formateur/questions/${questionId}/`, {
    method: 'PATCH',
    body: payload,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Update question'), { data, status: res.status })
  return data
}

export async function deleteFormateurQuestion(questionId) {
  const res = await apiFetch(`/api/formateur/questions/${questionId}/`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw Object.assign(new Error('Delete question'), { data, status: res.status })
  }
}

export async function createFormateurAnswer(questionId, payload) {
  const res = await apiFetch(`/api/formateur/questions/${questionId}/answers/`, {
    method: 'POST',
    body: payload,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Create answer'), { data, status: res.status })
  return data
}

export async function updateFormateurAnswer(answerId, payload) {
  const res = await apiFetch(`/api/formateur/answers/${answerId}/`, {
    method: 'PATCH',
    body: payload,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error('Update answer'), { data, status: res.status })
  return data
}

export async function deleteFormateurAnswer(answerId) {
  const res = await apiFetch(`/api/formateur/answers/${answerId}/`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw Object.assign(new Error('Delete answer'), { data, status: res.status })
  }
}
