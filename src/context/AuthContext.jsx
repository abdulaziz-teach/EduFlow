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
        // If this is a local demo session, restore directly from local storage
        const isDemo = token.startsWith('demo_local_session_') || localStorage.getItem('eduflow_is_demo') === 'true';
        if (isDemo) {
          const stored = localStorage.getItem('eduflow_local_user');
          if (stored) {
            try {
              const parsedUser = JSON.parse(stored);
              setUser(parsedUser);
              syncLanguage(parsedUser);
              setLoading(false);
              return;
            } catch {
              // Ignore invalid JSON and continue
            }
          }
        }
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

  /** Log in using 1-Click Demo account with guaranteed offline fallback */
  const loginWithDemo = async () => {
    try {
      const data = await authService.login({ email: 'demo@eduflow.uz', password: 'password123' });
      localStorage.setItem('eduflow_token', data.token);
      setToken(data.token);
      setUser(data.user);
      syncLanguage(data.user);
      return data;
    } catch {
      // Fallback: Activate explicit Local Demo Mode
      const demoUser = {
        _id: 'user_demo_local_' + Date.now(),
        name: 'Demo Talaba',
        email: 'demo@eduflow.uz',
        preferredLanguage: localStorage.getItem('eduflow_language') || 'uz',
        role: 'student',
        onboardingComplete: true,
        isLocalDemo: true,
        subjects: ['Computer Science', 'Mathematics', 'English'],
        studyStreak: 7,
        dailyMinutes: 45,
        stats: {
          totalStudyMinutes: 320,
          quizzesTaken: 12,
          accuracy: 88,
        },
        createdAt: new Date().toISOString(),
      };
      const demoToken = 'demo_local_session_' + Date.now();
      localStorage.setItem('eduflow_token', demoToken);
      localStorage.setItem('eduflow_local_user', JSON.stringify(demoUser));
      localStorage.setItem('eduflow_is_demo', 'true');
      setToken(demoToken);
      setUser(demoUser);
      syncLanguage(demoUser);
      return { success: true, token: demoToken, user: demoUser, isLocalDemo: true };
    }
  };

  /** Log out — revoke server session, clear refresh cookie, and reset local state */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn('Server logout failed:', error);
    } finally {
      localStorage.removeItem('eduflow_token');
      localStorage.removeItem('eduflow_local_user');
      localStorage.removeItem('eduflow_is_demo');
      setToken(null);
      setUser(null);
    }
  };

  const isLocalDemo = Boolean(user?.isLocalDemo || token?.startsWith('demo_local_session_'));

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    isLocalDemo,
    login,
    loginWithDemo,
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
