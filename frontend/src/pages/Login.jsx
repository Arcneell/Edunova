import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { getReadableFormError } from '../utils/formErrors.js'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  function validateForm() {
    const nextErrors = {}
    const cleanEmail = email.trim()
    if (!cleanEmail) nextErrors.email = "L'adresse e-mail est obligatoire."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      nextErrors.email = 'Entrez une adresse e-mail valide (exemple: nom@domaine.com).'
    }
    if (!password.trim()) nextErrors.password = 'Le mot de passe est obligatoire.'
    else if (password.length < 8) {
      nextErrors.password = 'Le mot de passe doit contenir au moins 8 caractères.'
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      nextErrors.password = 'Le mot de passe doit contenir au moins un caractère spécial.'
    }
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null)
    if (!validateForm()) return
    try {
      const me = await login({ email: email.trim(), password })
      navigate(me.is_staff ? '/admin' : '/compte', { replace: true })
    } catch (ex) {
      setErr(getReadableFormError(ex, 'Impossible de se connecter avec ces identifiants.'))
    }
  }

  return (
    <div className="page">
      <div className="auth-layout">
        <section className="auth-side">
          <p className="page-header__eyebrow">Compte</p>
          <h1>Connexion</h1>
          <p className="page-header__lead">
            Entrez vos identifiants pour accéder rapidement à votre espace personnel.
          </p>
          <ul className="auth-points">
            <li>Connexion sécurisée</li>
            <li>Redirection automatique selon le rôle</li>
            <li>Interface optimisée mobile / desktop</li>
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
              Mot de passe
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }))
                }}
                required
                aria-invalid={fieldErrors.password ? 'true' : 'false'}
              />
              {fieldErrors.password ? <span className="field-error">{fieldErrors.password}</span> : null}
            </label>
            {err ? <p className="form-alert form-alert--error">{err}</p> : null}
            <button type="submit">Se connecter</button>
          </form>
          <p className="form-footer muted">
            Pas encore de compte&nbsp;?{' '}
            <Link to="/register">Créer un compte</Link>
          </p>
        </article>
      </div>
    </div>
  )
}
