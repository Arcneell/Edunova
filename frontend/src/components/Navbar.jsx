import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

function normalizeRoleName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function NavIconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"
      />
    </svg>
  )
}

function NavIconClose() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.3 5.71 12 12l6.3 6.29-1.42 1.42L10.59 13.4 4.29 19.7 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29l6.3 6.29 6.29-6.3 1.42 1.42z"
      />
    </svg>
  )
}

export default function Navbar() {
  const { user, loading, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isTrainer = normalizeRoleName(user?.role?.role_name) === 'formateur'
  const canAccessLearningAdmin = Boolean(user?.is_staff || isTrainer)

  function closeMobile() {
    setMobileOpen(false)
  }

  function navLinkClass({ isActive }) {
    return `navbar__link ${isActive ? 'navbar__link--active' : ''}`
  }

  function navCtaClass({ isActive }) {
    return `navbar__link navbar__cta ${isActive ? 'navbar__cta--active' : ''}`
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand" onClick={closeMobile}>
          <span className="navbar__logo" aria-hidden="true" />
          <span className="navbar__title">Edunova</span>
        </Link>

        <button
          type="button"
          className="navbar__toggle"
          aria-expanded={mobileOpen}
          aria-controls="navbar-drawer"
          aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <NavIconClose /> : <NavIconMenu />}
        </button>

        <nav
          id="navbar-drawer"
          className={`navbar__links ${mobileOpen ? 'navbar__links--open' : ''}`}
          aria-label="Navigation principale"
        >
          <NavLink to="/" className={navLinkClass} end onClick={closeMobile}>
            Accueil
          </NavLink>

          {!loading && !user ? (
            <>
              <NavLink to="/login" className={navLinkClass} onClick={closeMobile}>
                Connexion
              </NavLink>
              <NavLink to="/register" className={navCtaClass} onClick={closeMobile}>
                Inscription
              </NavLink>
            </>
          ) : null}

          {!loading && user ? (
            <>
              <NavLink to="/compte" className={navLinkClass} onClick={closeMobile}>
                Mon compte
              </NavLink>
              {canAccessLearningAdmin ? (
                <NavLink to="/admin" className={navLinkClass} onClick={closeMobile}>
                  Dashboard
                </NavLink>
              ) : null}
              {user.is_staff ? (
                <>
                  <NavLink to="/admin/users" className={navLinkClass} onClick={closeMobile}>
                    Gestion users
                  </NavLink>
                </>
              ) : null}
              {canAccessLearningAdmin ? (
                <>
                  <NavLink to="/admin/cours" className={navLinkClass} onClick={closeMobile}>
                    Gestion cours
                  </NavLink>
                  <NavLink to="/admin/quizz" className={navLinkClass} onClick={closeMobile}>
                    Gestion quiz
                  </NavLink>
                </>
              ) : null}
            </>
          ) : null}

          {!loading && user ? (
            <div className="navbar__mobile-account">
              <span className="navbar__avatar" aria-hidden="true">
                {(user.email || '?')[0].toUpperCase()}
              </span>
              <span className="navbar__email-mobile">{user.email}</span>
              <button
                type="button"
                className="navbar__logout navbar__logout--block"
                onClick={() => {
                  closeMobile()
                  void logout()
                }}
              >
                Déconnexion
              </button>
            </div>
          ) : null}
        </nav>

        {!loading && user ? (
          <div className="navbar__user-bar">
            <span className="navbar__avatar" aria-hidden="true">
              {(user.email || '?')[0].toUpperCase()}
            </span>
            <span className="navbar__email" title={user.email}>
              {user.email}
            </span>
            <button
              type="button"
              className="navbar__logout"
              onClick={() => {
                void logout()
              }}
            >
              Déconnexion
            </button>
          </div>
        ) : null}
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="navbar__backdrop"
          aria-label="Fermer le menu"
          onClick={closeMobile}
        />
      ) : null}
    </header>
  )
}
