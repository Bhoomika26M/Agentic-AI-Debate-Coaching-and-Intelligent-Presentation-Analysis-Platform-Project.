import api from './api'

export const listUsers = () => api.get('/users')
