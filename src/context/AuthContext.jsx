import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/auth.js';
import i18n from '../i18n/i18n.js';

const syncLanguage = (profile) => {
  const language = profile?.preferredLanguage;
  if (!['en', 'ru', 'uz'].includes(language)) return;
  localStorage.setItem('eduflow_language', language);
  i18n.changeLanguage(language).catch((error) => {
    console.error('Could not apply the saved language preference:', error.message);
  });
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('eduflow_token'));
  const [loading, setLoading] = useState(true); // true until initial auth check completes

  const isAuthenticated = !!user && !!token;

  useEffect(() => {
    const expireSession = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('eduflow:session-expired', expireSession);
    return () => window.removeEventListener('eduflow:session-expired', expireSession);
  }, []);

  /** Fetch current user from the server using stored JWT */
  const refreshUser = useCallback(async () => {
    try {
      const data = await authService.getMe();
      setUser(data.user);
      syncLanguage(data.user);
      return data.user;
    } catch (error) {
      // Token is invalid or expired — clear auth state
      localStorage.removeItem('eduflow_token');
      setToken(null);
      setUser(null);
      throw error;
    }
  }, []);

  const setAuthenticatedUser = (authenticatedUser) => {
    setUser(authenticatedUser);
    syncLanguage(authenticatedUser);
  };

  // On mount: restore session from localStorage token
  useEffect(() => {
    const init = async () => {
      if (token) {
        await refreshUser().catch(() => {});
      }
      setLoading(false);
    };
    init();
  }, [refreshUser, token]);

  /** Register a new user */
  const register = async ({ name, email, password, preferredLanguage }) => {
    const data = await authService.register({ name, email, password, preferredLanguage });
    localStorage.setItem('eduflow_token', data.token);
    setToken(data.token);
    setUser(data.user);
    syncLanguage(data.user);
    return data;
  };

  /** Log in an existing user */
  const login = async ({ email, password }) => {
    const data = await authService.login({ email, password });
    localStorage.setItem('eduflow_token', data.token);
    setToken(data.token);
    setUser(data.user);
    syncLanguage(data.user);
    return data;
  };

  /** Log out — revoke server session, clear refresh cookie, and reset local state */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn('Server logout failed:', error);
    } finally {
      localStorage.removeItem('eduflow_token');
      setToken(null);
      setUser(null);
    }
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
    setAuthenticatedUser,
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
