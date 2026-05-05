import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export default function Compte() {
  const { user } = useAuth()

  return (
    <div className="page">
      <section className="profile-hero">
        <p className="page-header__eyebrow">Profil</p>
        <h1>Mon compte</h1>
        <p className="page-header__lead">
          Retrouvez vos informations de compte et vos accès dans une vue simplifiée.
        </p>
      </section>

      <article className="card profile-card">
        <h2 className="section-title">Informations</h2>
        {user ? (
          <dl className="kv kv--modern">
            <dt>E-mail</dt>
            <dd>{user.email}</dd>
            <dt>Rôle</dt>
            <dd>{user.role?.role_name ?? '—'}</dd>
            <dt>Équipe staff</dt>
            <dd>{user.is_staff ? 'Oui' : 'Non'}</dd>
          </dl>
        ) : null}
        <p className="hint">
          La déconnexion et la navigation restent disponibles depuis la barre du haut.
        </p>
        {user?.is_staff ? (
          <div className="hero-actions account-actions">
            <Link to="/admin" className="btn btn--primary">
              Ouvrir l’administration
            </Link>
          </div>
        ) : null}
      </article>
    </div>
  )
}
