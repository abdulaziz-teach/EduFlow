import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('eduflow_token'));
  const [loading, setLoading] = useState(true); // true until initial auth check completes

  const isAuthenticated = !!user && !!token;

  /** Fetch current user from the server using stored JWT */
  const refreshUser = useCallback(async () => {
    try {
      const data = await authService.getMe();
      setUser(data.user);
    } catch {
      // Token is invalid or expired — clear auth state
      localStorage.removeItem('eduflow_token');
      setToken(null);
      setUser(null);
    }
  }, []);

  // On mount: restore session from localStorage token
  useEffect(() => {
    const init = async () => {
      if (token) {
        await refreshUser();
      }
      setLoading(false);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Register a new user */
  const register = async ({ name, email, password }) => {
    const data = await authService.register({ name, email, password });
    localStorage.setItem('eduflow_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  /** Log in an existing user */
  const login = async ({ email, password }) => {
    const data = await authService.login({ email, password });
    localStorage.setItem('eduflow_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  /** Log out — clear token and user state, redirect handled by caller */
  const logout = () => {
    localStorage.removeItem('eduflow_token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
