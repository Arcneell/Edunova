import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
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
  const { register, user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState('')
  const [roles, setRoles] = useState([])
  const [rolesLoadError, setRolesLoadError] = useState(null)
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
    if (!roleId) nextErrors.roleId = 'Choisissez un profil dans la liste.'
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

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
        setRolesLoadError(null)
      })
      .catch(() => {
        if (!cancelled) {
          setRoles([])
          setRolesLoadError(
            'Impossible de charger les profils. Vérifiez la connexion ou réessayez.',
          )
        }
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
      navigate(me.is_staff ? '/admin' : '/dashboard', { replace: true })
    } catch (ex) {
      setErr(getReadableFormError(ex, "Impossible de finaliser l'inscription. Vérifiez les champs du formulaire."))
    }
  }

  if (!authLoading && user) {
    return <Navigate to={user.is_staff ? '/admin' : '/dashboard'} replace />
  }

  return (
    <div className="page">
      <div className="auth-layout">
        <section className="auth-side">
          <p className="page-header__eyebrow">Compte</p>
          <h1>Inscription</h1>
          <p className="page-header__lead">
            Créez votre compte en choisissant votre profil (apprenant ou formateur).
          </p>
          <ul className="auth-points">
            <li>Choix du profil à l’inscription</li>
            <li>Mot de passe robuste (8 caractères minimum)</li>
            <li>Accès au tableau de bord après création</li>
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
              Profil
              <select
                value={roleId}
                onChange={(e) => {
                  setRoleId(e.target.value)
                  if (fieldErrors.roleId) setFieldErrors((prev) => ({ ...prev, roleId: undefined }))
                }}
                required
                aria-invalid={fieldErrors.roleId ? 'true' : 'false'}
              >
                <option value="">-- choisir un profil --</option>
                {roles.map((r) => (
                  <option key={r.role_id} value={r.role_id}>
                    {r.role_name}
                  </option>
                ))}
              </select>
              {fieldErrors.roleId ? <span className="field-error">{fieldErrors.roleId}</span> : null}
            </label>
            {rolesLoadError ? (
              <p className="form-alert form-alert--error" role="alert">
                {rolesLoadError}
              </p>
            ) : null}
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
