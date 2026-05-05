#!/usr/bin/env node
/**
 * Crée un compte test par rôle via POST /api/auth/register/.
 * Usage (hôte, backend exposé sur le port Compose) :
 *   API_BASE=http://localhost:8000 node src/test/create-users-by-role.mjs
 *
 * Prérequis : tables Role peuplées (sinon l’inscription échoue).
 */
import { ensureCsrf, fetchWithJar } from './lib/session-fetch.mjs'

const apiBase = process.env.API_BASE || 'http://localhost:8000'
const password = process.env.TEST_PASSWORD || 'TestUser01!'

async function loadRoles(jar) {
  await ensureCsrf(apiBase, jar)
  const { res, body } = await fetchWithJar(apiBase, '/api/roles/', { jar, method: 'GET' })
  if (!res.ok) throw new Error(`GET /api/roles/ → ${res.status} ${JSON.stringify(body)}`)
  return Array.isArray(body) ? body : []
}

async function register(jar, email, role_id) {
  await ensureCsrf(apiBase, jar)
  const payload = { email, password }
  if (role_id != null) payload.role_id = role_id
  const { res, body } = await fetchWithJar(apiBase, '/api/auth/register/', {
    jar,
    method: 'POST',
    json: payload,
  })
  if (!res.ok) {
    throw new Error(`register ${email} → ${res.status} ${JSON.stringify(body)}`)
  }
  return body
}

function stamp() {
  return Date.now().toString(36)
}

async function main() {
  const jar = {}
  const roles = await loadRoles(jar)
  if (!roles.length) {
    console.error('Aucun rôle en base. Créez des Role avant ce script.')
    process.exit(1)
  }

  const prefix = process.env.TEST_EMAIL_PREFIX || 'test-role'
  const s = stamp()

  console.log(`API_BASE=${apiBase}`)
  console.log(`Création de ${roles.length} utilisateur(s)…`)

  for (const role of roles) {
    const slug = String(role.role_name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const email = `${prefix}-${slug}-${s}@example.test`
    /* Nouveau jar par inscription pour éviter les sessions mélangées */
    const localJar = {}
    await ensureCsrf(apiBase, localJar)
    const user = await register(localJar, email, role.role_id)
    console.log(`OK role_id=${role.role_id} (${role.role_name}) → user_id=${user.user_id} ${email}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
