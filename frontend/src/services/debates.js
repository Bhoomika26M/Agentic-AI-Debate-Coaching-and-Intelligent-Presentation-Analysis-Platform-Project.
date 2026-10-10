import api from './api'

export const listDebates = (params) => api.get('/debates', { params })
export const getDebate = (id) => api.get(`/debates/${id}`)
export const createDebate = (payload) => api.post('/debates', payload)
export const updateDebate = (id, payload) => api.put(`/debates/${id}`, payload)
export const deleteDebate = (id) => api.delete(`/debates/${id}`)
export const joinDebate = (id, payload = {}) => api.post(`/debates/${id}/join`, payload)
export const getParticipants = (id) => api.get(`/debates/${id}/participants`)
export const analyzeDebate = (id, payload) => api.post(`/debates/${id}/analysis`, payload)
export const getDebateAnalysis = (id) => api.get(`/debates/${id}/analysis`)
export const createSimulation = (id, payload) => api.post(`/debates/${id}/simulation`, payload)
export const getSimulation = (id) => api.get(`/debates/${id}/simulation`)
