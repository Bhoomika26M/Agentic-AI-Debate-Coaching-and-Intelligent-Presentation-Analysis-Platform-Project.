import axios from 'axios'

// Helper to safely format API error messages (handles FastAPI/Pydantic validation error lists/objects)
export function parseApiError(detail, fallback = 'An error occurred.') {
  if (!detail) return fallback
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const loc = Array.isArray(item.loc) ? item.loc.filter(l => l !== 'body').join(' ') : ''
          const prefix = loc ? `${loc}: ` : ''
          return `${prefix}${item.msg || item.message || JSON.stringify(item)}`
        }
        return String(item)
      })
      .join('; ')
  }
  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail)
  }
  return String(detail)
}

// Use relative URL — Vite proxy forwards /api/* → http://localhost:8000/api/*
// This avoids CORS issues in development.
const BASE_URL = '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`)
    } else {
      config.headers = config.headers || {}
      config.headers['Authorization'] = `Bearer ${token}`
    }
  }
  return config
})

// Handle errors globally — normalize Pydantic error objects and handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Normalize FastAPI 422 validation detail array/object to a clean user-friendly string
    if (err.response?.data?.detail) {
      err.response.data.detail = parseApiError(err.response.data.detail)
    }

    const url = err.config?.url || ''
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register')
    if (err.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
