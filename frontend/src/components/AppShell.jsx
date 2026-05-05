import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'

export default function AppShell() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span className="app-footer__brand">Edunova</span>
        <span className="muted">Apprentissage · quiz · progression</span>
      </footer>
    </div>
  )
}
