import api from './api'

export const getCoachingDashboard = () => api.get('/coaching/dashboard')
export const getSimulationHistory = () => api.get('/simulations/history')
