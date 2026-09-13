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
    api.get('/auth/me').then(({ data }) => setUser(data)).catch(() => localStorage.removeItem(tokenKey)).finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem(tokenKey, data.access_token)
    const currentUser = await api.get('/auth/me')
    setUser(currentUser.data)
  }

  async function register(details) {
    await api.post('/auth/register', details)
    await login(details.email, details.password)
  }

  function logout() {
    localStorage.removeItem(tokenKey)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}