import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setErr(null)
    try {
      const me = await login({ email, password })
      navigate(me.is_staff ? '/admin' : '/compte', { replace: true })
    } catch (ex) {
      const detail = ex.data?.detail ?? ex.data?.non_field_errors?.join?.(', ')
      setErr(detail || ex.message || 'Erreur')
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
              Mot de passe
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {err ? <p className="error">{err}</p> : null}
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
