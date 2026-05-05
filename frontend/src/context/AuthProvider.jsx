import { useCallback, useEffect, useMemo, useState } from 'react'
import * as userApi from '../api/user/index.js'
import { AuthContext } from './authContext.js'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshMe = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const me = await userApi.getMe()
      setUser(me)
    } catch (e) {
      setError(e.message)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydratation session au montage
    void refreshMe()
  }, [refreshMe])

  const login = useCallback(async (credentials) => {
    setError(null)
    const me = await userApi.login(credentials)
    setUser(me)
    return me
  }, [])

  const register = useCallback(async (payload) => {
    setError(null)
    const me = await userApi.register(payload)
    setUser(me)
    return me
  }, [])

  const logout = useCallback(async () => {
    setError(null)
    await userApi.logout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      refreshMe,
      login,
      register,
      logout,
      clearError: () => setError(null),
    }),
    [user, loading, error, refreshMe, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
