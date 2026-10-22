import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import authService from '../../services/auth';
import { useAuth } from '../../context/AuthContext';

const languages = [
  { code: 'uz', name: "O'zbekcha", short: 'UZ', flag: '🇺🇿' },
  { code: 'ru', name: 'Русский', short: 'RU', flag: '🇷🇺' },
  { code: 'en', name: 'English', short: 'EN', flag: 'EN' },
];

export default function LanguageSwitcher({ className = '', isMobile = false }) {
  const { i18n } = useTranslation();
  const { isAuthenticated, setAuthenticatedUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  const dropdownRef = useRef(null);

  const currentLang = languages.find((l) => i18n.language && i18n.language.startsWith(l.code)) || languages[0];

  const handleSelect = async (code) => {
    setSaveError('');
    localStorage.setItem('eduflow_language', code);
    document.documentElement.lang = code;
    await i18n.changeLanguage(code);
    setIsOpen(false);
    if (!isAuthenticated) return;
    try {
      const result = await authService.updateMe({ preferredLanguage: code });
      if (result.user) setAuthenticatedUser(result.user);
    } catch (error) {
      setSaveError(i18n.t('common.languageSaveError'));
      console.error('Could not save the language preference:', error.message);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isMobile) {
    return (
      <>
        <div className={`flex items-center gap-1.5 p-1 bg-surface border border-subtle rounded-xl ${className}`}>
          {languages.map((lang) => {
            const isActive = currentLang.code === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                aria-label={lang.name}
                aria-pressed={isActive}
                className={`flex-1 min-h-11 py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-text hover:bg-white/5'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.short}</span>
              </button>
            );
          })}
        </div>
        {saveError && <p role="alert" className="mt-2 text-xs text-red-400">{saveError}</p>}
      </>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted hover:text-text bg-surface/50 hover:bg-surface border border-subtle rounded-lg transition-all"
        aria-label={i18n.t('nav.changeLanguage')}
      >
        <span className="text-sm">{currentLang.flag}</span>
        <span className="text-xs uppercase font-semibold">{currentLang.short}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div role="listbox" className="absolute right-0 mt-2 w-36 py-1 bg-surface border border-subtle rounded-xl shadow-xl shadow-black/20 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {languages.map((lang) => {
            const isActive = currentLang.code === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                role="option"
                aria-selected={isActive}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted hover:text-text hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </div>
                {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
      {saveError && <p role="alert" className="absolute right-0 mt-2 w-48 text-xs text-red-400">{saveError}</p>}
    </div>
  );
}
