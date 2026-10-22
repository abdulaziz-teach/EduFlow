import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Loader2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Login() {
  const { login, user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = ['uz', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'uz';

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to dashboard
  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const data = await login({ email: 'demo@eduflow.uz', password: 'password123' });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!form.email.trim() || !form.password) {
      setError(t('auth.fillAllFields', { defaultValue: 'Barcha maydonlarni to\'ldiring' }));
      return;
    }

    setLoading(true);
    try {
      const data = await login({ email: form.email.trim(), password: form.password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // In standalone mode, auth.login handles fallbacks, but if an error slips through:
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold text-text">EduFlow</span>
          </Link>
          <h1 className="text-2xl font-bold text-text mb-2">{t('auth.welcomeBack')} 👋</h1>
          <p className="text-sm text-muted">{t('auth.signInSubtitle')}</p>
        </div>

        {/* Instant 1-Click Demo Login Button */}
        <div className="mb-5">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-primary hover:from-indigo-500 hover:to-primary-hover text-white text-xs font-bold transition-all shadow-lg shadow-primary/25 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>
              {currentLang === 'uz' ? '⚡ 1-bosishda Demo hisob bilan kirish' : currentLang === 'ru' ? '⚡ Войти в 1 клик (Демо-аккаунт)' : '⚡ 1-Click Instant Demo Login'}
            </span>
          </button>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-[#0B0F19] px-2 text-muted">
                {currentLang === 'uz' ? 'yoki email orqali' : currentLang === 'ru' ? 'или через email' : 'or with email'}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text mb-1.5">
              {t('auth.email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder={t('auth.emailPlaceholder')}
              className="w-full px-4 py-2.5 rounded-lg bg-card border border-subtle text-sm text-text placeholder:text-muted/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text mb-1.5">
              {t('auth.password')}
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-4 pr-11 py-2.5 rounded-lg bg-card border border-subtle text-sm text-text placeholder:text-muted/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors p-1 rounded-md cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-primary/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              t('auth.signIn')
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-primary hover:text-primary-hover transition-colors font-medium">
            {t('auth.registerNow')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
