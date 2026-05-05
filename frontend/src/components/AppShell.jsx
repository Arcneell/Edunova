import { Outlet, Link } from 'react-router-dom'
import Navbar from './Navbar.jsx'

export default function AppShell() {
  const year = new Date().getFullYear()

  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <div className="app-footer__inner">
          <div className="app-footer__lead">
            <div className="app-footer__brand-line">
              <span className="navbar__logo" aria-hidden="true" />
              <span className="app-footer__brand">Edunova</span>
            </div>
            <p className="app-footer__tagline">
              Apprentissage structuré, parcours par thématiques, quizzes et progression — tout ce que fait
              l’app accessible depuis votre navigateur après connexion.
            </p>
          </div>
          <nav className="app-footer__cols" aria-label="Navigation pied de page">
            <p className="app-footer__col-title">Découvrir</p>
            <ul className="app-footer__list">
              <li>
                <Link to="/">Accueil</Link>
              </li>
              <li>
                <Link to="/login">Connexion</Link>
              </li>
              <li>
                <Link to="/register">Inscription</Link>
              </li>
              <li>
                <Link to="/courses/ma-thematiques">Ma map de cours</Link>
              </li>
            </ul>
          </nav>
          <nav className="app-footer__cols" aria-label="Espace équipe">
            <p className="app-footer__col-title">Fonctionnels</p>
            <ul className="app-footer__list">
              <li>
                <Link to="/admin">Dashboard</Link>
              </li>
              <li>
                <Link to="/admin/cours">Gestion des cours</Link>
              </li>
              <li>
                <Link to="/admin/quizz">Gestion des quiz</Link>
              </li>
              <li>
                <Link to="/compte">Mon compte</Link>
              </li>
            </ul>
          </nav>
          <p className="app-footer__legal">
            Mentions légales, confidentialité ou support : prévoir des URLs dédiées quand elles existeront. ©{' '}
            {year} Edunova.
          </p>
        </div>
      </footer>
    </div>
  )
}
