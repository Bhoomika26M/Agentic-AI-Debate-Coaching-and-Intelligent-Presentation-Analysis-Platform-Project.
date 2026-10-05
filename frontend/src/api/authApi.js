import axiosClient from './axiosClient';

export const authApi = {
  login: async (credentials) => {
    const response = await axiosClient.post('/auth/login/', credentials);
    return response.data;
  },
  register: async (userData) => {
    const response = await axiosClient.post('/auth/register/', userData);
    return response.data;
  },
  getProfile: async () => {
    const response = await axiosClient.get('/auth/profile/');
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await axiosClient.patch('/auth/profile/', data);
    return response.data;
  },
};
