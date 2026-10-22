import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  X,
  BookOpen,
  Layers,
  HelpCircle,
  Tag,
  ArrowRight,
  Sparkles,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { getSearchSuggestions, trackSearchTelemetry } from '../../services/search';

const RECENT_SEARCHES_KEY = 'eduflow_recent_searches';

export default function GlobalSearchModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);

  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      if (Array.isArray(saved)) setRecentSearches(saved.slice(0, 5));
    } catch {
      setRecentSearches([]);
    }
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(-1);
    } else {
      setQuery('');
      setSuggestions([]);
    }
  }, [isOpen]);

  // Debounced search suggestions fetch
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await getSearchSuggestions(query, 7, controller.signal);
        setSuggestions(data.suggestions || []);
      } catch (_err) {
        // Ignored if aborted
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Keyboard navigation (Arrow up/down, Enter, Escape)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    const totalItems = suggestions.length > 0 ? suggestions.length : recentSearches.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelectSuggestion(suggestions[selectedIndex], selectedIndex);
      } else if (selectedIndex >= 0 && !query && recentSearches[selectedIndex]) {
        handleSelectRecent(recentSearches[selectedIndex]);
      } else if (query.trim()) {
        handleSubmitSearch();
      }
    }
  };

  const saveRecentSearch = (term) => {
    try {
      const clean = term.trim();
      if (!clean) return;
      const updated = [clean, ...recentSearches.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (_err) {
      // Ignored
    }
  };

  const handleSubmitSearch = () => {
    if (!query.trim()) return;
    saveRecentSearch(query);
    onClose();
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSelectRecent = (term) => {
    saveRecentSearch(term);
    onClose();
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleSelectSuggestion = (item, index) => {
    saveRecentSearch(item.title);
    trackSearchTelemetry({
      query,
      eventType: 'suggestion_select',
      selectedResult: {
        entityType: item.type,
        entityId: item.id || null,
        position: index,
        title: item.title,
      },
    });

    onClose();

    if (item.type === 'course' && item.slug) {
      navigate(`/search?q=${encodeURIComponent(item.title)}&type=course`);
    } else if (item.type === 'flashcard' && item.id) {
      navigate(`/flashcards`);
    } else if (item.type === 'topic') {
      navigate(`/search?q=${encodeURIComponent(item.title)}&type=topic`);
    } else {
      navigate(`/search?q=${encodeURIComponent(item.title)}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-24 px-2 sm:px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#121620] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-text flex flex-col max-h-[85vh] sm:max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-3 sm:px-4 py-3 sm:py-3.5 border-b border-white/10 gap-2.5 sm:gap-3 bg-white/[0.02]">
          <Search className="w-5 h-5 text-primary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent text-text placeholder:text-muted/60 text-sm sm:text-base outline-none min-w-0"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-muted hover:text-text hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-muted">
            ESC
          </span>
        </div>

        {/* Search Content & Suggestions */}
        <div className="overflow-y-auto p-2 sm:p-3 space-y-2 divide-y divide-white/5">
          {/* Autocomplete Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold tracking-wider text-muted/70 uppercase px-3 py-1">
                {t('search.suggestions') || 'Suggestions'}
              </div>
              {suggestions.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={`${item.type}-${item.id || idx}`}
                    onClick={() => handleSelectSuggestion(item, idx)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors group cursor-pointer ${
                      isSelected ? 'bg-primary/20 text-text' : 'hover:bg-white/5 text-muted hover:text-text'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-primary">
                        {item.type === 'course' && <BookOpen className="w-4 h-4" />}
                        {item.type === 'flashcard' && <Layers className="w-4 h-4" />}
                        {item.type === 'topic' && <Tag className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate text-text">{item.title}</div>
                        <div className="text-xs text-muted/70 truncate flex items-center gap-2">
                          <span className="capitalize">{item.type}</span>
                          {item.category && <span>• {item.category}</span>}
                          {item.subject && <span>• {item.subject}</span>}
                          {item.level && (
                            <span className="px-1.5 py-0.2 text-[10px] rounded bg-white/10 capitalize">
                              {item.level}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted/40 group-hover:text-primary transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick full search trigger */}
          {query.trim().length >= 2 && (
            <div className="pt-2">
              <button
                onClick={handleSubmitSearch}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 text-sm font-medium">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t('search.searchAllFor') || 'Search all results for'} &ldquo;{query.trim()}&rdquo;</span>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          )}

          {/* Recent searches when query is empty */}
          {!query && recentSearches.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between px-3 py-1">
                <span className="text-[11px] font-semibold tracking-wider text-muted/70 uppercase">
                  {t('search.recentSearches') || 'Recent Searches'}
                </span>
                <button
                  onClick={() => {
                    localStorage.removeItem(RECENT_SEARCHES_KEY);
                    setRecentSearches([]);
                  }}
                  className="text-[11px] text-muted hover:text-danger transition-colors cursor-pointer"
                >
                  {t('common.clear') || 'Clear'}
                </button>
              </div>
              {recentSearches.map((term, idx) => (
                <button
                  key={term}
                  onClick={() => handleSelectRecent(term)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-white/5 text-muted hover:text-text transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-sm">
                    <Clock className="w-4 h-4 text-muted/60 shrink-0" />
                    <span className="truncate">{term}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted/30 group-hover:text-primary transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Popular Search Shortcuts */}
          {!query && (
            <div className="space-y-1.5 pt-2">
              <div className="text-[11px] font-semibold tracking-wider text-muted/70 uppercase px-3 py-1">
                {t('search.popularCategories') || 'Popular Categories'}
              </div>
              <div className="flex flex-wrap gap-1.5 px-3">
                {['JavaScript', 'Python', 'React', 'Data Science', 'Backend', 'Algorithms'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      onClose();
                      navigate(`/search?category=${encodeURIComponent(cat)}`);
                    }}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors text-muted cursor-pointer"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-3 sm:px-4 py-2.5 bg-black/40 border-t border-white/5 text-[11px] text-muted flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="hidden sm:flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-text font-mono">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-text font-mono">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-text font-mono">↵</kbd> to select
            </span>
          </div>
          <button
            onClick={() => {
              onClose();
              navigate('/search');
            }}
            className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{t('search.discoverTitle') || 'Explore Discovery Hub'}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
