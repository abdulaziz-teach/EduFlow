import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass, ArrowLeft, Home, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function NotFound() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Visual Icon Badge */}
        <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto shadow-xl shadow-primary/5">
          <Compass className="w-10 h-10 text-primary animate-pulse" />
        </div>

        {/* 404 Heading */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-primary/80 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            404 Error
          </span>
          <h1 className="text-3xl font-extrabold text-text tracking-tight mt-3">
            {t('common.notFoundTitle')}
          </h1>
          <p className="text-sm text-muted leading-relaxed max-w-sm mx-auto">
            {t('common.notFoundDesc')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all shadow-lg shadow-primary/20 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              {t('nav.dashboard')}
            </Link>
          ) : (
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all shadow-lg shadow-primary/20 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              {t('common.backHome')}
            </Link>
          )}

          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text text-sm font-medium border border-white/5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
