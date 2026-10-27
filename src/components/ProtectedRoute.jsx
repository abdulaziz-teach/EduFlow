import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './ui/LoadingScreen';

/**
 * Wraps routes that require authentication.
 * Shows a loading screen while auth state is being restored,
 * redirects to /login if unauthenticated.
 * If requiredRole or allowedRoles is specified, non-matching roles are redirected to fallbackUrl (default /dashboard).
 */
function ProtectedRoute({
  children,
  onboardingOnly = false,
  requiredRole = null,
  allowedRoles = null,
  fallbackUrl = '/dashboard',
}) {
  const { isAuthenticated, loading, user } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <LoadingScreen message={t('common.loading')} />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!onboardingOnly && !user.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  // Role validation
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={fallbackUrl} replace />;
  }

  if (allowedRoles && Array.isArray(allowedRoles) && !allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackUrl} replace />;
  }

  return children;
}

export default ProtectedRoute;
