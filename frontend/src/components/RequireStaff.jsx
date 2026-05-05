import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

function normalizeRoleName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function isTrainer(user) {
  return normalizeRoleName(user?.role?.role_name) === 'formateur'
}

export function RequireStaff({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="muted">Chargement…</p>
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_staff) return <Navigate to="/compte" replace />
  return children
}

export function RequireAdminOrTrainer({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="muted">Chargement…</p>
  if (!user) return <Navigate to="/login" replace />
  if (!(user.is_staff || isTrainer(user))) return <Navigate to="/compte" replace />
  return children
}
