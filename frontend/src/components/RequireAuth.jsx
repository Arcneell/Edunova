import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="muted">Chargement…</p>
  if (!user) return <Navigate to="/login" replace />
  return children
}
