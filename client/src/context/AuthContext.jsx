import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('secureproctor_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('secureproctor_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      const storedToken = localStorage.getItem('secureproctor_token');
      if (storedToken) {
        try {
          const freshUser = await Promise.race([
            authService.getMe(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Auth check timeout')), 4000))
          ]);
          if (mounted && freshUser) {
            setUser(freshUser);
          }
        } catch (err) {
          console.warn('Silent auth validation skipped or failed:', err);
          if (err.response?.status === 401) {
            if (mounted) {
              setUser(null);
              setToken(null);
              localStorage.removeItem('secureproctor_token');
              localStorage.removeItem('secureproctor_user');
            }
          }
        }
      }
      if (mounted) {
        setLoading(false);
      }
    };

    initAuth();
    return () => { mounted = false; };
  }, []);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    setUser(data.user);
    setToken(data.token);
    return data;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);
    setUser(data.user);
    setToken(data.token);
    return data;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
  };

  const hasRole = (...roles) => {
    return user && roles.includes(user.role);
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
        hasRole,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
