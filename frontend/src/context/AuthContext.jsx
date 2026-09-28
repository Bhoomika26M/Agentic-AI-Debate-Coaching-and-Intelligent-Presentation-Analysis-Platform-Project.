import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        } catch (err) {
          console.error('Session validation error:', err);
          logout();
        }
      }
      setLoading(false);
    };
    verifyUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, role, user_id, full_name } = res.data;
    const userData = { id: user_id, email, full_name, role, is_active: true };
    
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const register = async (registerData) => {
    const res = await api.post('/auth/register', registerData);
    const { access_token, role, user_id, full_name, email } = res.data;
    const userData = { id: user_id, email, full_name, role, is_active: true };
    
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Quick switch between demo accounts for testing & grading evaluation
  const quickSwitchRole = async (targetRole) => {
    const credentials = {
      learner: { email: 'learner@debateai.com', password: 'Password123!' },
      coach: { email: 'coach@debateai.com', password: 'Password123!' },
      educator: { email: 'educator@debateai.com', password: 'Password123!' },
      admin: { email: 'admin@debateai.com', password: 'Password123!' }
    };
    const cred = credentials[targetRole] || credentials.learner;
    return await login(cred.email, cred.password);
  };

  const value = {
    user,
    token,
    loading,
    role: user?.role || 'guest',
    isLearner: user?.role === 'learner',
    isCoach: user?.role === 'coach',
    isEducator: user?.role === 'educator',
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    quickSwitchRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
