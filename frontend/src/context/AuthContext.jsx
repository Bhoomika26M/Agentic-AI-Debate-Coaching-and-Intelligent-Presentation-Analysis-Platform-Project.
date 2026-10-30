import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)
const tokenKey = 'debate_coach_token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(tokenKey)
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => {
        localStorage.removeItem(tokenKey)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem(tokenKey, data.access_token)
    const currentUser = await api.get('/auth/me')
    setUser(currentUser.data)
    return currentUser.data
  }

  async function register(details) {
    const payload = {
      ...details,
      email: details.email.trim().toLowerCase(),
      role: details.role || 'learner',
    }
    await api.post('/auth/register', payload)
    return login(payload.email, payload.password)
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      // no-op: JWT is stateless and the client must clear local session state.
    }
    localStorage.removeItem(tokenKey)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
