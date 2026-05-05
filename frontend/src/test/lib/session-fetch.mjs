/**
 * Appels HTTP avec jar à cookies (Node 18+) pour l’API Django session + CSRF.
 * @param {string} apiBase URL du backend sans slash final (ex. http://localhost:8000)
 */

export function parseSetCookie(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie()
  }
  const single = headers.get('set-cookie')
  return single ? [single] : []
}

export function applySetCookieLines(jar, lines) {
  for (const line of lines) {
    const [pair] = line.split(';')
    const i = pair.indexOf('=')
    if (i <= 0) continue
    const name = pair.slice(0, i).trim()
    const value = pair.slice(i + 1).trim()
    jar[name] = value
  }
}

export function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

export function csrfFromJar(jar) {
  return jar.csrftoken || ''
}

export async function fetchWithJar(apiBase, path, { jar = {}, method = 'GET', json } = {}) {
  const url = `${apiBase.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  const headers = { Accept: 'application/json' }
  const c = cookieHeader(jar)
  if (c) headers.Cookie = c

  const upper = method.toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(upper)) {
    const tok = csrfFromJar(jar)
    if (tok) headers['X-CSRFToken'] = tok
    if (json !== undefined) {
      headers['Content-Type'] = 'application/json'
    }
  }

  const res = await fetch(url, {
    method: upper,
    headers,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  })

  applySetCookieLines(jar, parseSetCookie(res.headers))

  const text = await res.text()
  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  return { res, body, jar }
}

export async function ensureCsrf(apiBase, jar) {
  const { res, jar: j } = await fetchWithJar(apiBase, '/api/auth/csrf/', { jar, method: 'GET' })
  if (!res.ok) {
    throw new Error(`CSRF ${res.status}: ${JSON.stringify(j)}`)
  }
  return j
}
