import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

const demoCourses = [
  {
    id: 'CRS-101',
    title: 'Bases JavaScript',
    level: 'Débutant',
    lessons: 12,
    status: 'Publié',
  },
  {
    id: 'CRS-205',
    title: 'React intermédiaire',
    level: 'Intermédiaire',
    lessons: 18,
    status: 'Brouillon',
  },
  {
    id: 'CRS-330',
    title: 'API REST avec Django',
    level: 'Avancé',
    lessons: 15,
    status: 'Publié',
  },
]

function adminLinkClass({ isActive }) {
  return `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`
}

export default function AdminCourses() {
  const { user } = useAuth()

  return (
    <div className="page">
      <nav className="admin-nav" aria-label="Navigation admin">
        <NavLink to="/admin" end className={adminLinkClass}>
          Dashboard
        </NavLink>
        {user?.is_staff ? (
          <NavLink to="/admin/users" className={adminLinkClass}>
            Utilisateurs
          </NavLink>
        ) : null}
        <NavLink to="/admin/cours" className={adminLinkClass}>
          Cours
        </NavLink>
        <NavLink to="/admin/quizz" className={adminLinkClass}>
          Quiz
        </NavLink>
      </nav>

      <header className="page-header">
        <p className="page-header__eyebrow">Administration</p>
        <h1>Gestion des cours</h1>
        <p className="page-header__lead">
          Créez, organisez et suivez les contenus de formation depuis un seul espace.
        </p>
      </header>

      <section className="admin-cards">
        {demoCourses.map((course) => (
          <article key={course.id} className="card admin-card">
            <div className="admin-card__head">
              <h2>{course.title}</h2>
              <span className="dash-badge dash-badge--purple">{course.status}</span>
            </div>
            <p className="muted">
              {course.id} · Niveau {course.level} · {course.lessons} leçons
            </p>
            <div className="hero-actions admin-card__actions">
              <button type="button" className="btn btn--secondary">
                Modifier
              </button>
              <button type="button" className="btn btn--secondary">
                Dupliquer
              </button>
              <Link to="/admin/quizz" className="btn btn--primary">
                Gérer les quiz
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
