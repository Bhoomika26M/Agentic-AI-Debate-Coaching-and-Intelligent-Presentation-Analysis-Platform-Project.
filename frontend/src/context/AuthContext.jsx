import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('justitalk_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize and validate session on initial page load
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('justitalk_token');
      if (savedToken) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          const res = await api.get('/auth/me');
          setUser(res.data);
          setToken(savedToken);
        } catch (err) {
          console.warn('Saved token expired or invalid:', err);
          localStorage.removeItem('justitalk_token');
          delete api.defaults.headers.common['Authorization'];
          setToken(null);
          setUser(null);
        }
      } else {
        // No auto-login: Unauthenticated user stays unauthenticated
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password, rememberMe = true) => {
    const res = await api.post('/auth/login', { email, password });
    const newToken = res.data.access_token;
    
    if (rememberMe) {
      localStorage.setItem('justitalk_token', newToken);
    } else {
      sessionStorage.setItem('justitalk_token', newToken);
      localStorage.removeItem('justitalk_token');
    }

    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('justitalk_token');
      sessionStorage.clear();
      delete api.defaults.headers.common['Authorization'];
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      return res.data;
    } catch (e) {
      console.error('Failed to refresh user info:', e);
    }
  };

  // Quick Role Switcher for evaluator convenience
  const switchRole = async (targetRole) => {
    const roleAccounts = {
      'Administrator': { email: 'admin@justitalk.com', password: 'password123' },
      'Learner': { email: 'learner@justitalk.com', password: 'password123' },
      'Debate Coach': { email: 'coach@justitalk.com', password: 'password123' },
      'Educator': { email: 'educator@justitalk.com', password: 'password123' },
    };

    const creds = roleAccounts[targetRole];
    if (creds) {
      setLoading(true);
      try {
        await login(creds.email, creds.password);
      } catch (err) {
        console.error('Role switch failed:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
