import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('justitalk_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      // Only bounce if this was an authenticated API request and NOT the login endpoint itself
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('justitalk_token');
        sessionStorage.clear();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login?session_expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
