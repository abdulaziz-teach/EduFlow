import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './ui/LoadingScreen';

/**
 * Wraps routes that require authentication.
 * Shows a loading screen while auth state is being restored,
 * redirects to /login if unauthenticated.
 */
function ProtectedRoute({ children, onboardingOnly = false }) {
  const { isAuthenticated, loading, user } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <LoadingScreen message={t('common.loading')} />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (onboardingOnly && user.onboardingComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!onboardingOnly && !user.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

export default ProtectedRoute;
