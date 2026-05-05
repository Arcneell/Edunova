import { Link } from 'react-router-dom'
import { DashHero, DashLayout } from '../components/dash/index.js'
import { useAuth } from '../hooks/useAuth.js'

export default function AdminDashboard() {
  const { user } = useAuth()

  return (
    <DashLayout>
      <nav className="admin-nav" aria-label="Navigation admin">
        <NavLink to="/admin" end className={adminLinkClass}>
          Dashboard
        </NavLink>
        {user?.is_staff ? (
          <NavLink to="/admin/users" className={adminLinkClass}>
            Utilisateurs
          </NavLink>
        ) : null}
        {user?.is_staff ? (
          <NavLink to="/admin/logs" className={adminLinkClass}>
            Logs
          </NavLink>
        ) : null}
        <NavLink to="/admin/cours" className={adminLinkClass}>
          Cours
        </NavLink>
        <NavLink to="/admin/quizz" className={adminLinkClass}>
          Quiz
        </NavLink>
      </nav>

      <DashHero eyebrow="Dashboard" title="Pilotage pédagogique">
        <p>
          Accédez rapidement aux espaces de gestion pour les cours, quiz et
          questions/réponses.
        </p>
      </DashHero>

      <section className="admin-cards">
        {user?.is_staff ? (
          <article className="card admin-card">
            <div className="admin-card__head">
              <h2>Gestion des utilisateurs</h2>
              <span className="dash-badge dash-badge--blue">Admin</span>
            </div>
            <p className="muted">Consulter, filtrer et suivre les comptes de la plateforme.</p>
            <div className="hero-actions admin-card__actions">
              <Link to="/admin/users" className="btn btn--primary">
                Ouvrir
              </Link>
            </div>
          </article>
        ) : null}

        {user?.is_staff ? (
          <article className="card admin-card">
            <div className="admin-card__head">
              <h2>Logs d'activité</h2>
              <span className="dash-badge dash-badge--pink">Admin</span>
            </div>
            <p className="muted">Trace en temps réel de toutes les actions enregistrées sur la plateforme.</p>
            <div className="hero-actions admin-card__actions">
              <Link to="/admin/logs" className="btn btn--primary">
                Ouvrir
              </Link>
            </div>
          </article>
        ) : null}

        <article className="card admin-card">
          <div className="admin-card__head">
            <h2>Gestion des cours</h2>
            <span className="dash-badge dash-badge--purple">Admin · Formateur</span>
          </div>
          <p className="muted">Créer, modifier et organiser les contenus pédagogiques.</p>
          <div className="hero-actions admin-card__actions">
            <Link to="/admin/cours" className="btn btn--primary">
              Ouvrir
            </Link>
          </div>
        </article>

        <article className="card admin-card">
          <div className="admin-card__head">
            <h2>Gestion des quiz & Q/R</h2>
            <span className="dash-badge dash-badge--pink">Admin · Formateur</span>
          </div>
          <p className="muted">Construire les quiz et administrer les questions/réponses.</p>
          <div className="hero-actions admin-card__actions">
            <Link to="/admin/quizz" className="btn btn--primary">
              Ouvrir
            </Link>
          </div>
        </article>
      </section>
    </DashLayout>
  )
}
