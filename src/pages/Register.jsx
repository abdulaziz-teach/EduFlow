import { useState, useRef } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Register() {
  const { register, user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const justRegistered = useRef(false);

  // If already authenticated (and not just registered), redirect to dashboard
  if (!authLoading && isAuthenticated && !justRegistered.current) {
    return <Navigate to={user?.onboardingComplete ? '/dashboard' : '/onboarding'} replace />;
  }

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const validate = () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      return t('auth.fillAllFields');
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return t('auth.invalidCredentials');
    }
    if (form.password.length < 8) {
      return t('auth.passwordTooShort');
    }
    if (form.password !== form.confirmPassword) {
      return t('auth.passwordsDoNotMatch');
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    justRegistered.current = true;
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        preferredLanguage: i18n.resolvedLanguage || i18n.language,
      });
      navigate('/onboarding', { replace: true });
    } catch (err) {
      justRegistered.current = false;
      setError(err instanceof TypeError || err.message === 'Failed to fetch'
        ? t('auth.serverError')
        : err.message || t('auth.serverError'));
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
          <h1 className="text-2xl font-bold text-text mb-2">{t('auth.createAccount')}</h1>
          <p className="text-sm text-muted">{t('auth.registerSubtitle')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text mb-1.5">
              {t('auth.fullName')}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              placeholder={t('auth.fullNamePlaceholder')}
              className="w-full px-4 py-2.5 rounded-lg bg-card border border-subtle text-sm text-text placeholder:text-muted/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

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
                autoComplete="new-password"
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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text mb-1.5">
              {t('auth.confirmPassword')}
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-4 pr-11 py-2.5 rounded-lg bg-card border border-subtle text-sm text-text placeholder:text-muted/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors p-1 rounded-md cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
              t('auth.createAccountBtn')
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-primary hover:text-primary-hover transition-colors font-medium">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
