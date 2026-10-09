import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, login as loginRequest, register as registerRequest } from '../services/auth'

const TOKEN_KEY = 'debate_coach_token'
const USER_KEY = 'debate_coach_user'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    getCurrentUser()
      .then(({ data }) => {
        setUser(data)
        localStorage.setItem(USER_KEY, JSON.stringify(data))
      })
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [token])

  async function login(credentials) {
    const { data } = await loginRequest(credentials)
    const accessToken = data.access_token
    localStorage.setItem(TOKEN_KEY, accessToken)
    setToken(accessToken)
    const currentUser = await getCurrentUser()
    setUser(currentUser.data)
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser.data))
  }

  async function register(payload) {
    return registerRequest(payload)
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, isAuthenticated: Boolean(token && user), login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
