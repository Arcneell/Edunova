import { Link } from 'react-router-dom'
import { DashHero, DashLayout } from '../components/dash/index.js'
import { useAuth } from '../hooks/useAuth.js'

function normalizeRoleName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default function Dashboard() {
  const { user } = useAuth()
  const isTrainer = normalizeRoleName(user?.role?.role_name) === 'formateur'
  const canTeam = Boolean(user?.is_staff || isTrainer)

  return (
    <DashLayout>
      <DashHero eyebrow="Bienvenue" title={`Bonjour${user?.email ? `, ${user.email.split('@')[0]}` : ''}`}>
        <p>Continuez votre parcours ou gérez votre compte depuis ce tableau de bord.</p>
      </DashHero>

      <section className="admin-cards">
        <article className="card admin-card">
          <div className="admin-card__head">
            <h2>Ma progression</h2>
            <span className="dash-badge dash-badge--blue">Parcours</span>
          </div>
          <p className="muted">Vos thématiques et votre carte de progression.</p>
          <div className="hero-actions admin-card__actions">
            <Link to="/courses/ma-thematiques" className="btn btn--primary">
              Ouvrir ma carte
            </Link>
          </div>
        </article>

        <article className="card admin-card">
          <div className="admin-card__head">
            <h2>Mon compte</h2>
            <span className="dash-badge dash-badge--purple">Profil</span>
          </div>
          <p className="muted">Vos informations et préférences.</p>
          <div className="hero-actions admin-card__actions">
            <Link to="/compte" className="btn btn--secondary">
              Voir mon compte
            </Link>
          </div>
        </article>

        {canTeam ? (
          <article className="card admin-card">
            <div className="admin-card__head">
              <h2>Espace équipe</h2>
              <span className="dash-badge dash-badge--pink">Organisation</span>
            </div>
            <p className="muted">Gérer les cours et les quiz pour votre public.</p>
            <div className="hero-actions admin-card__actions">
              <Link to="/admin" className="btn btn--primary">
                Ouvrir l’espace équipe
              </Link>
            </div>
          </article>
        ) : null}
      </section>
    </DashLayout>
  )
}
