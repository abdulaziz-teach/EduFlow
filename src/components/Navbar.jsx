import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, GraduationCap, LogOut, Search, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';
import NotificationCenter from './notifications/NotificationCenter';
import LanguageSwitcher from './ui/LanguageSwitcher';
import GlobalSearchModal from './search/GlobalSearchModal';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, loading } = useAuth();
  const { t } = useTranslation();
  const isLanding = pathname === '/';

  // Global Ctrl+K / Cmd+K listener to trigger search modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleLogout = async () => {
    await logout();
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

          {!loading && isAuthenticated && (
            <nav className="hidden md:flex 2xl:hidden items-center gap-0.5" aria-label={t('nav.primary')}>
              {[
                { path: '/dashboard', key: 'dashboard' },
                { path: '/study-plan', key: 'studyPlan' },
                { path: '/practice', key: 'practice' },
              ].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-2 sm:px-2.5 py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                    pathname.startsWith(item.path)
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t(`nav.${item.key}`)}
                </Link>
              ))}
              <Link
                to="/mentor"
                className={`hidden xl:inline-flex px-2.5 py-2 text-sm rounded-lg transition-colors ${
                  pathname === '/mentor'
                    ? 'text-primary font-medium bg-primary/10'
                    : 'text-muted hover:text-text hover:bg-white/5'
                }`}
              >
                {t('nav.mentor')}
              </Link>
            </nav>
          )}

          {/* Desktop actions */}
          <div className="hidden 2xl:flex items-center gap-1.5">
            {/* Quick Global Search Trigger Button */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-muted hover:text-text text-xs transition-colors cursor-pointer mr-1"
              title={`${t('nav.search')} (Ctrl+K)`}
              aria-label={t('nav.search')}
            >
              <Search className="w-3.5 h-3.5 text-primary" />
              <span className="hidden xl:inline">{t('nav.searchPlaceholder')}</span>
              <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-muted">
                Ctrl K
              </kbd>
            </button>
            <Link
              to="/search"
              className={`text-sm transition-colors px-2.5 py-1.5 rounded-lg mr-1 ${
                pathname.startsWith('/search')
                  ? 'text-primary font-medium bg-primary/10'
                  : 'text-muted hover:text-text hover:bg-white/5'
              }`}
            >
              {t('nav.discover')}
            </Link>

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
                  className={`text-sm transition-colors px-2.5 py-1.5 rounded-lg ${
                    pathname.startsWith('/practice')
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.practice')}
                </Link>
                <Link
                  to="/flashcards"
                  className={`text-sm transition-colors px-2.5 py-1.5 rounded-lg ${
                    pathname.startsWith('/flashcards')
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.flashcards')}
                </Link>
                <Link
                  to="/focus"
                  className={`text-sm transition-colors px-2.5 py-1.5 rounded-lg ${
                    pathname === '/focus'
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.focusRoom')}
                </Link>
                <Link
                  to="/smart-notes"
                  className={`text-sm transition-colors px-2.5 py-1.5 rounded-lg ${
                    pathname === '/smart-notes'
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.smartNotes')}
                </Link>
                <Link
                  to="/mentor"
                  className={`text-sm transition-colors px-2.5 py-1.5 rounded-lg ${
                    pathname === '/mentor'
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.mentor')}
                </Link>
                <Link
                  to="/leaderboard"
                  className={`text-sm transition-colors px-2.5 py-1.5 rounded-lg ${
                    pathname === '/leaderboard'
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.leaderboard')}
                </Link>
                <Link
                  to="/progress"
                  className={`text-sm transition-colors px-2.5 py-1.5 rounded-lg ${
                    pathname === '/progress'
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.progress')}
                </Link>
                <Link
                  to="/profile"
                  className={`text-sm transition-colors px-2.5 py-1.5 rounded-lg ${
                    pathname === '/profile'
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.profile')}
                </Link>
                <Link
                  to="/billing"
                  className={`text-sm transition-colors px-2.5 py-1.5 rounded-lg ${
                    pathname === '/billing'
                      ? 'text-primary font-medium bg-primary/10'
                      : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.billing')}
                </Link>
                {user?.role && user.role !== 'user' && (
                  <Link
                    to="/admin"
                    className={`text-sm transition-colors px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-semibold ${
                      pathname.startsWith('/admin')
                        ? 'text-indigo-400 font-medium bg-indigo-500/10'
                        : 'text-indigo-400/80 hover:text-indigo-300 hover:bg-white/5'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    {t('nav.admin')}
                  </Link>
                )}
                <NotificationCenter />
                <LanguageSwitcher className="ml-1" />
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-danger transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer ml-1"
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
          <div className="flex 2xl:hidden items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setSearchModalOpen(true)}
              className="p-2 text-muted hover:text-text transition-colors rounded-lg hover:bg-white/5 cursor-pointer"
              aria-label={t('nav.search')}
            >
              <Search className="w-5 h-5 text-primary" />
            </button>
            <LanguageSwitcher />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-muted hover:text-text transition-colors rounded-lg hover:bg-white/5"
              aria-expanded={isOpen}
              aria-controls="mobile-navigation"
              aria-label={isOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-navigation"
        className={`2xl:hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[calc(100vh-4rem)] overflow-y-auto opacity-100' : 'max-h-0 overflow-hidden opacity-0'
        }`}
      >
        <div className="px-4 pb-4 pt-2 bg-dark/95 backdrop-blur-xl border-t border-subtle">
          {isLanding && !isAuthenticated &&
            landingLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 text-sm text-muted hover:text-text transition-colors rounded-lg hover:bg-white/5"
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
                  className={`md:hidden block px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathname === '/dashboard' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.dashboard')}
                </Link>
                <Link
                  to="/study-plan"
                  onClick={() => setIsOpen(false)}
                  className={`md:hidden block px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathname === '/study-plan' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.studyPlan')}
                </Link>
                <Link
                  to="/practice"
                  onClick={() => setIsOpen(false)}
                  className={`md:hidden block px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathname.startsWith('/practice') ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.practice')}
                </Link>
                <Link
                  to="/flashcards"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathname.startsWith('/flashcards') ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.flashcards')}
                </Link>
                <Link
                  to="/focus"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathname === '/focus' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.focusRoom')}
                </Link>
                <Link
                  to="/smart-notes"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathname === '/smart-notes' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.smartNotes')}
                </Link>
                <Link
                  to="/mentor"
                  onClick={() => setIsOpen(false)}
                  className={`md:hidden block px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathname === '/mentor' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.mentor')}
                </Link>
                <Link
                  to="/leaderboard"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathname === '/leaderboard' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.leaderboard')}
                </Link>
                <Link
                  to="/progress"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathname === '/progress' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.progress')}
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathname === '/profile' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.profile')}
                </Link>
                <Link
                  to="/billing"
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                    pathname === '/billing' ? 'bg-primary/10 text-primary font-medium' : 'text-muted hover:text-text hover:bg-white/5'
                  }`}
                >
                  {t('nav.billingSubscriptions')}
                </Link>
                {user?.role && user.role !== 'user' && (
                  <Link
                    to="/admin"
                    onClick={() => setIsOpen(false)}
                    className={`block px-3 py-2 text-sm rounded-lg transition-colors font-semibold ${
                      pathname.startsWith('/admin')
                        ? 'bg-indigo-500/20 text-indigo-400 font-medium'
                        : 'text-indigo-400/80 hover:text-indigo-300 hover:bg-white/5'
                    }`}
                  >
                    {t('nav.adminOperations')}
                  </Link>
                )}
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
      <GlobalSearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </nav>
  );
}

export default Navbar;
