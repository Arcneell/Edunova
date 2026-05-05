import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listRoles } from '../api/user/roles.js'
import { useAuth } from '../hooks/useAuth.js'
import { getReadableFormError } from '../utils/formErrors.js'

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
  const [fieldErrors, setFieldErrors] = useState({})

  function validateForm() {
    const nextErrors = {}
    const cleanEmail = email.trim()
    if (!cleanEmail) nextErrors.email = "L'adresse e-mail est obligatoire."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      nextErrors.email = 'Entrez une adresse e-mail valide (exemple: nom@domaine.com).'
    }
    if (!password) nextErrors.password = 'Le mot de passe est obligatoire.'
    else if (password.length < 8) nextErrors.password = 'Le mot de passe doit contenir au moins 8 caractères.'
    else if (!/[^A-Za-z0-9]/.test(password)) {
      nextErrors.password = 'Le mot de passe doit contenir au moins un caractère spécial.'
    }
    if (!roleId) nextErrors.roleId = 'Choisissez un role dans la liste.'
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  useEffect(() => {
    let cancelled = false
    listRoles()
      .then((rows) => {
        if (cancelled) return
        const allRoles = Array.isArray(rows) ? rows : []
        const allowed = allRoles.filter((r) => {
          const n = normalizeRoleName(r.role_name)
          return n === 'utilisateur' || n === 'formateur' || n === 'etudiant' || n === 'enseignant'
        })
        setRoles(allowed.length > 0 ? allowed : allRoles)
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
    if (!validateForm()) return
    try {
      const payload = { email: email.trim(), password, role_id: Number(roleId) }
      const me = await register(payload)
      navigate(me.is_staff ? '/admin' : '/compte', { replace: true })
    } catch (ex) {
      setErr(getReadableFormError(ex, "Impossible de finaliser l'inscription. Vérifiez les champs du formulaire."))
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
          <form className="stack-form" onSubmit={onSubmit} noValidate>
            <label>
              E-mail
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }))
                }}
                required
                aria-invalid={fieldErrors.email ? 'true' : 'false'}
              />
              {fieldErrors.email ? <span className="field-error">{fieldErrors.email}</span> : null}
            </label>
            <label>
              Mot de passe (au moins 8 caractères)
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                minLength={8}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }))
                }}
                required
                aria-invalid={fieldErrors.password ? 'true' : 'false'}
              />
              {fieldErrors.password ? <span className="field-error">{fieldErrors.password}</span> : null}
            </label>
            <label>
              Rôle
              <select
                value={roleId}
                onChange={(e) => {
                  setRoleId(e.target.value)
                  if (fieldErrors.roleId) setFieldErrors((prev) => ({ ...prev, roleId: undefined }))
                }}
                required
                aria-invalid={fieldErrors.roleId ? 'true' : 'false'}
              >
                <option value="">-- choisir un rôle --</option>
                {roles.map((r) => (
                  <option key={r.role_id} value={r.role_id}>
                    {r.role_name}
                  </option>
                ))}
              </select>
              {fieldErrors.roleId ? <span className="field-error">{fieldErrors.roleId}</span> : null}
            </label>
            {err ? <p className="form-alert form-alert--error">{err}</p> : null}
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
