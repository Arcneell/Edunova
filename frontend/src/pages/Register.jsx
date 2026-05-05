import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listRoles } from '../api/user/roles.js'
import { useAuth } from '../hooks/useAuth.js'

function normalizeRoleName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState('')
  const [roles, setRoles] = useState([])
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    listRoles()
      .then((rows) => {
        if (cancelled) return
        const allowed = (Array.isArray(rows) ? rows : []).filter((r) => {
          const n = normalizeRoleName(r.role_name)
          return n === 'utilisateur' || n === 'formateur'
        })
        setRoles(allowed)
      })
      .catch(() => {
        if (!cancelled) setRoles([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null)
    if (roleId === '') {
      setErr('Veuillez choisir un rôle : Utilisateur ou Formateur.')
      return
    }
    try {
      const payload = { email, password, role_id: Number(roleId) }
      const me = await register(payload)
      navigate(me.is_staff ? '/admin' : '/compte', { replace: true })
    } catch (ex) {
      const msg =
        typeof ex.data === 'object'
          ? Object.entries(ex.data || {})
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
              .join(' · ')
          : ''
      setErr(msg || ex.message || 'Erreur')
    }
  }

  return (
    <div className="page">
      <div className="auth-layout">
        <section className="auth-side">
          <p className="page-header__eyebrow">Compte</p>
          <h1>Inscription</h1>
          <p className="page-header__lead">
            Créez votre accès en quelques secondes en choisissant votre profil.
          </p>
          <ul className="auth-points">
            <li>Choix du rôle à l'inscription</li>
            <li>Mot de passe sécurisé (8+ caractères)</li>
            <li>Accès immédiat après création du compte</li>
          </ul>
        </section>

        <article className="card card--narrow auth-card">
          <form className="stack-form" onSubmit={onSubmit}>
            <label>
              E-mail
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Mot de passe (au moins 8 caractères)
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                minLength={8}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <label>
              Rôle
              <select value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
                <option value="">-- choisir un rôle --</option>
                {roles.map((r) => (
                  <option key={r.role_id} value={r.role_id}>
                    {r.role_name}
                  </option>
                ))}
              </select>
            </label>
            {err ? <p className="error">{err}</p> : null}
            <button type="submit">Créer le compte</button>
          </form>
          <p className="form-footer muted">
            Déjà inscrit&nbsp;? <Link to="/login">Connexion</Link>
          </p>
        </article>
      </div>
    </div>
  )
}
