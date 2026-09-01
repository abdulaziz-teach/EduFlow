import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, GraduationCap, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';
import NotificationCenter from './notifications/NotificationCenter';
import LanguageSwitcher from './ui/LanguageSwitcher';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, loading } = useAuth();
  const { t } = useTranslation();
  const isLanding = pathname === '/';

  const landingLinks = [
    { label: t('nav.features'), href: '#features' },
    { label: t('nav.howItWorks'), href: '#how-it-works' },
    { label: t('nav.mentor'), href: '#mentor' },
    { label: t('nav.progress'), href: '#progress' },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-dark/80 backdrop-blur-xl border-b border-subtle shadow-lg shadow-black/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group" aria-label="EduFlow Home">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-bold text-text">EduFlow</span>
          </Link>

          {/* Desktop nav — landing links (only on landing page) */}
          {isLanding && !isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              {landingLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-3 py-2 text-sm text-muted hover:text-text transition-colors rounded-lg hover:bg-white/5"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-1.5">
            {loading ? null : isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className={`text-sm transition-colors px-3 py-2 rounded-lg ${
                    pathname === '/dashboard'
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.dashboard')}
                </Link>
                <Link
                  to="/study-plan"
                  className={`text-sm transition-colors px-3 py-2 rounded-lg ${
                    pathname === '/study-plan'
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.studyPlan')}
                </Link>
                <Link
                  to="/practice"
                  className={`text-sm transition-colors px-3 py-2 rounded-lg ${
                    pathname.startsWith('/practice')
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.practice')}
                </Link>
                <Link
                  to="/mentor"
                  className={`text-sm transition-colors px-3 py-2 rounded-lg ${
                    pathname === '/mentor'
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.mentor')}
                </Link>
                <Link
                  to="/knowledge"
                  className={`text-sm transition-colors px-3 py-2 rounded-lg ${
                    pathname === '/knowledge'
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.knowledge')}
                </Link>
                <Link
                  to="/progress"
                  className={`text-sm transition-colors px-3 py-2 rounded-lg ${
                    pathname === '/progress'
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.progress')}
                </Link>
                <Link
                  to="/profile"
                  className={`text-sm transition-colors px-3 py-2 rounded-lg ${
                    pathname === '/profile'
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.profile')}
                </Link>
                <NotificationCenter />
                <LanguageSwitcher className="ml-1" />
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-danger transition-colors px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer ml-1"
                >
                  <LogOut className="w-4 h-4" />
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <LanguageSwitcher className="mr-1" />
                <Link
                  to="/login"
                  className="text-sm text-muted hover:text-text transition-colors px-3 py-2"
                >
                  {t('nav.login')}
                </Link>
                <Button to="/register" size="sm">
                  {t('nav.startLearning')}
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-muted hover:text-text transition-colors rounded-lg hover:bg-white/5"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[550px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 pt-2 bg-dark/95 backdrop-blur-xl border-t border-subtle">
          {isLanding && !isAuthenticated &&
            landingLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2.5 text-sm text-muted hover:text-text transition-colors rounded-lg hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}

          <div className="mt-2 pt-2 border-t border-subtle flex flex-col gap-1">
            {loading ? null : isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    pathname === '/dashboard' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.dashboard')}
                </Link>
                <Link
                  to="/study-plan"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    pathname === '/study-plan' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.studyPlan')}
                </Link>
                <Link
                  to="/practice"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    pathname.startsWith('/practice') ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.practice')}
                </Link>
                <Link
                  to="/mentor"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    pathname === '/mentor' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.mentor')}
                </Link>
                <Link
                  to="/knowledge"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    pathname === '/knowledge' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.knowledge')}
                </Link>
                <Link
                  to="/progress"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    pathname === '/progress' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.progress')}
                </Link>
                <Link
                  to="/notifications"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    pathname === '/notifications' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.notifications')}
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    pathname === '/profile' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.profile')}
                </Link>
                <button
                  onClick={() => { setIsOpen(false); handleLogout(); }}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-muted hover:text-danger transition-colors rounded-lg hover:bg-white/5 w-full text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2.5 text-sm text-muted hover:text-text transition-colors rounded-lg hover:bg-white/5"
                >
                  {t('nav.login')}
                </Link>
                <Button to="/register" size="sm" className="w-full mt-1" onClick={() => setIsOpen(false)}>
                  {t('nav.startLearning')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
