import { Outlet } from 'react-router-dom'
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
          <div className="app-footer__brand-line">
            <img className="navbar__logo" src="/edunova-mark.svg" alt="" decoding="async" />
            <span className="app-footer__brand">Edunova</span>
          </div>
          <p className="app-footer__legal">© {year} Edunova — Projet hackathon, en cours de développement.</p>
        </div>
      </footer>
    </div>
  )
}
