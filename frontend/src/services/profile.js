import api from './api'

export const getProfile = () => api.get('/profiles/me')
export const updateProfile = (payload) => api.put('/profiles/me', payload)
export const getUser = () => api.get('/users/me')
export const updateUser = (payload) => api.put('/users/me', payload)
