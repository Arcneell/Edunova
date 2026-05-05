import { useContext } from 'react'
import { AuthContext } from '../context/authContext.js'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth hors AuthProvider')
  return ctx
}
