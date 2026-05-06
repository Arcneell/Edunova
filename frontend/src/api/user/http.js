import { apiUrl } from './config.js'

function csrfTokenFromDocument() {
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)
  return m ? decodeURIComponent(m[1]) : ''
}

async function ensureCsrfCookie() {
  await fetch(apiUrl('/api/auth/csrf/'), {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
}

/**
 * Requête JSON avec session + CSRF Django (cookie session + en-tête X-CSRFToken).
 */
export async function apiFetch(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const needsCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  if (needsCsrf) {
    await ensureCsrfCookie()
  }

  const headers = new Headers(options.headers || {})
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')

  const body = options.body
  const isJsonBody =
    body != null &&
    typeof body === 'object' &&
    !(body instanceof FormData) &&
    !(body instanceof Blob)

  if (isJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (needsCsrf) {
    const token = csrfTokenFromDocument()
    if (token) headers.set('X-CSRFToken', token)
  }

  return fetch(apiUrl(path), {
    ...options,
    credentials: 'include',
    headers,
    body: isJsonBody ? JSON.stringify(body) : body,
  })
}
