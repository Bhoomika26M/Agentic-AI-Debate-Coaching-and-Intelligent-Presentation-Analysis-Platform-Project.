import api from './api'

export const getSkills = () => api.get('/skills/me')
export const updateSkills = (payload) => api.put('/skills/me', payload)
