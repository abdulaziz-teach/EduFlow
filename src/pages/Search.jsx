import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Search as SearchIcon,
  X,
  Filter,
  BookOpen,
  Layers,
  HelpCircle,
  Tag,
  ArrowRight,
  Sparkles,
  Flame,
  Clock,
  Compass,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  PlayCircle,
  RotateCcw,
} from 'lucide-react';
import { searchCourses, getDiscoveryFeed, trackSearchTelemetry } from '../services/search';
import Button from '../components/ui/Button';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryParam = searchParams.get('q') || '';
  const typeParam = searchParams.get('type') || 'all';
  const categoryParam = searchParams.get('category') || '';
  const levelParam = searchParams.get('level') || '';
  const sortParam = searchParams.get('sort') || 'relevance';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [inputVal, setInputVal] = useState(queryParam);
  const [results, setResults] = useState([]);
  const [facets, setFacets] = useState({ types: {}, categories: {}, levels: {} });
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [didYouMean, setDidYouMean] = useState(null);
  const [intentAnalysis, setIntentAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [discovery, setDiscovery] = useState(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  // Sync search input with URL query param
  useEffect(() => {
    setInputVal(queryParam);
  }, [queryParam]);

  // Load discovery feed if no search query
  useEffect(() => {
    if (!queryParam && !categoryParam && !levelParam && typeParam === 'all') {
      setDiscoveryLoading(true);
      getDiscoveryFeed()
        .then((data) => setDiscovery(data))
        .catch(() => {})
        .finally(() => setDiscoveryLoading(false));
    }
  }, [queryParam, categoryParam, levelParam, typeParam]);

  // Execute search when URL search params change
  useEffect(() => {
    if (!queryParam && !categoryParam && !levelParam && typeParam === 'all') {
      setResults([]);
      setTotalResults(0);
      setDidYouMean(null);
      setIntentAnalysis(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    searchCourses({
      q: queryParam,
      type: typeParam,
      category: categoryParam,
      level: levelParam,
      sort: sortParam,
      page: pageParam,
      limit: 12,
      signal: controller.signal,
    })
      .then((data) => {
        setResults(data.results || []);
        setFacets(data.facets || { types: {}, categories: {}, levels: {} });
        setTotalResults(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setDidYouMean(data.didYouMean || null);
        setIntentAnalysis(data.intentAnalysis || null);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError') {
          console.error('Search error:', err);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [queryParam, typeParam, categoryParam, levelParam, sortParam, pageParam]);

  // Update query params helper
  const updateParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val && val !== 'all') {
      next.set(key, val);
    } else {
      next.delete(key);
    }
    next.set('page', '1'); // Reset to page 1 on filter change
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    const clean = inputVal.trim();
    const next = new URLSearchParams(searchParams);
    if (clean) {
      next.set('q', clean);
    } else {
      next.delete('q');
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleResultClick = (item, index) => {
    trackSearchTelemetry({
      query: queryParam,
      eventType: 'result_click',
      selectedResult: {
        entityType: item.type,
        entityId: item.id,
        position: index,
        title: item.title,
      },
      filters: { type: typeParam, category: categoryParam, level: levelParam },
    });
  };

  const isDiscoveryView = !queryParam && !categoryParam && !levelParam && typeParam === 'all';

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header & Search Bar */}
      <div className="max-w-3xl mx-auto text-center space-y-4 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
          <Compass className="w-3.5 h-3.5" />
          <span>EduFlow Intelligent Search & Discovery</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-text tracking-tight">
          Find what you want to master today
        </h1>
        <p className="text-sm text-muted">
          Search across courses, structured lessons, quizzes, spaced-repetition flashcards, and knowledge topics.
        </p>

        {/* Global Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="relative mt-4">
          <div className="flex items-center bg-[#151922] border border-white/10 rounded-2xl p-2 shadow-xl focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <SearchIcon className="w-5 h-5 text-muted ml-3 shrink-0" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="e.g. Python for data science, React hooks, or 'learn backend beginner'..."
              className="flex-1 bg-transparent px-3 py-2 text-text placeholder:text-muted/60 text-sm sm:text-base outline-none"
            />
            {inputVal && (
              <button
                type="button"
                onClick={() => {
                  setInputVal('');
                  updateParam('q', '');
                }}
                className="p-1.5 text-muted hover:text-text rounded-lg hover:bg-white/5 mr-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <Button type="submit" size="sm" className="px-5 shrink-0">
              Search
            </Button>
          </div>
        </form>

        {/* AI Intent Understanding Pill */}
        {intentAnalysis && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>
              Understood intent:{' '}
              <strong className="capitalize">{intentAnalysis.domain || intentAnalysis.cleanedKeywords}</strong>
              {intentAnalysis.level && <span> • {intentAnalysis.level} level</span>}
            </span>
          </div>
        )}
      </div>

      {/* SEARCH VIEW (When user performed a search or applied a filter) */}
      {!isDiscoveryView && (
        <div className="space-y-6">
          {/* Entity Type Filter Tabs */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 overflow-x-auto gap-2">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'All Results' },
                { id: 'course', label: 'Courses', icon: BookOpen },
                { id: 'lesson', label: 'Lessons', icon: PlayCircle },
                { id: 'quiz', label: 'Quizzes', icon: HelpCircle },
                { id: 'flashcard', label: 'Flashcards', icon: Layers },
                { id: 'topic', label: 'Topics', icon: Tag },
              ].map((tab) => {
                const count = tab.id === 'all' ? totalResults : facets.types?.[tab.id] || 0;
                const isActive = typeParam === tab.id;
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    onClick={() => updateParam('type', tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-white/5 text-muted hover:text-text hover:bg-white/10'
                    }`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span
                        className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive ? 'bg-black/20 text-white' : 'bg-white/10 text-muted'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="sort-select" className="text-xs text-muted hidden sm:inline">Sort by:</label>
              <select
                id="sort-select"
                value={sortParam}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="bg-[#151922] border border-white/10 text-text text-xs rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
              >
                <option value="relevance">Best Match</option>
                <option value="popular">Most Popular</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>

          {/* Secondary Filters (Category & Difficulty Level) */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-muted/70">
                <Filter className="w-3.5 h-3.5" /> Filters:
              </span>

              {/* Level Filter */}
              <select
                aria-label="Filter by level"
                value={levelParam}
                onChange={(e) => updateParam('level', e.target.value)}
                className="bg-[#151922] border border-white/10 text-text text-xs rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>

              {/* Reset Active Filters Button */}
              {(categoryParam || levelParam || typeParam !== 'all') && (
                <button
                  onClick={() => {
                    const next = new URLSearchParams();
                    if (queryParam) next.set('q', queryParam);
                    setSearchParams(next);
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline ml-2 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset filters
                </button>
              )}
            </div>

            {/* Total Results Count */}
            <div>
              {loading ? (
                <span>Searching...</span>
              ) : (
                <span>
                  Showing <strong>{results.length}</strong> of <strong>{totalResults}</strong> result{totalResults === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>

          {/* "Did You Mean?" Typo Suggestion Banner */}
          {didYouMean && (
            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-primary shrink-0" />
                <span>
                  No direct matches for &ldquo;{queryParam}&rdquo;. Did you mean:{' '}
                  <button
                    onClick={() => {
                      setInputVal(didYouMean);
                      updateParam('q', didYouMean);
                    }}
                    className="font-bold text-primary underline hover:text-primary-hover cursor-pointer"
                  >
                    {didYouMean}
                  </button>
                  ?
                </span>
              </div>
            </div>
          )}

          {/* Results Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-48 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse p-4" />
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((item, idx) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="bg-[#151922] border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-primary/40 hover:shadow-lg transition-all group"
                >
                  <div className="space-y-3">
                    {/* Top Row: Type Badge + Score */}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-medium uppercase tracking-wider text-muted">
                        {item.type === 'course' && <BookOpen className="w-3 h-3 text-primary" />}
                        {item.type === 'lesson' && <PlayCircle className="w-3 h-3 text-emerald-400" />}
                        {item.type === 'quiz' && <HelpCircle className="w-3 h-3 text-amber-400" />}
                        {item.type === 'flashcard' && <Layers className="w-3 h-3 text-blue-400" />}
                        {item.type === 'topic' && <Tag className="w-3 h-3 text-purple-400" />}
                        <span>{item.type}</span>
                      </span>

                      {item.score && (
                        <span className="text-[11px] font-mono text-muted/60">
                          {Math.round(item.score * 100)}% match
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-semibold text-text group-hover:text-primary transition-colors line-clamp-2">
                      {item.title}
                    </h3>

                    {/* Description */}
                    {item.description && (
                      <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Metadata Chips */}
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-muted/80">
                      {item.category && (
                        <span className="px-2 py-0.5 rounded bg-white/5">{item.category}</span>
                      )}
                      {item.subject && (
                        <span className="px-2 py-0.5 rounded bg-white/5">{item.subject}</span>
                      )}
                      {item.level && (
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary capitalize">
                          {item.level}
                        </span>
                      )}
                      {item.duration > 0 && (
                        <span className="px-2 py-0.5 rounded bg-white/5">
                          {Math.round(item.duration / 60)} mins
                        </span>
                      )}
                      {item.questionsCount !== undefined && (
                        <span className="px-2 py-0.5 rounded bg-white/5">
                          {item.questionsCount} questions
                        </span>
                      )}
                      {item.cardsCount !== undefined && (
                        <span className="px-2 py-0.5 rounded bg-white/5">
                          {item.cardsCount} cards
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    {item.type === 'course' && (
                      <Link
                        to={`/study-plan`}
                        onClick={() => handleResultClick(item, idx)}
                        className="text-xs font-medium text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer"
                      >
                        <span>Start Course</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {item.type === 'lesson' && (
                      <Link
                        to={`/study-plan`}
                        onClick={() => handleResultClick(item, idx)}
                        className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Lesson</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {item.type === 'quiz' && (
                      <Link
                        to={`/practice`}
                        onClick={() => handleResultClick(item, idx)}
                        className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Take Quiz</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {item.type === 'flashcard' && (
                      <Link
                        to={`/flashcards`}
                        onClick={() => handleResultClick(item, idx)}
                        className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Study Deck</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {item.type === 'topic' && (
                      <Link
                        to={`/knowledge`}
                        onClick={() => handleResultClick(item, idx)}
                        className="text-xs font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Explore Topic</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ZERO RESULTS STATE (Section 11) */
            <div className="text-center py-16 px-4 bg-[#151922] rounded-3xl border border-white/10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-muted">
                <SearchIcon className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-text">
                No matching results found for &ldquo;{queryParam}&rdquo;
              </h2>
              <p className="text-sm text-muted max-w-md mx-auto">
                Try checking for typos, using broader keywords, or exploring one of our suggested learning categories below.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                {['JavaScript', 'Python', 'Web Development', 'Computer Science', 'Data Structures'].map((sug) => (
                  <button
                    key={sug}
                    onClick={() => {
                      setInputVal(sug);
                      updateParam('q', sug);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors text-xs text-muted cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <button
                disabled={pageParam <= 1}
                onClick={() => updateParam('page', String(pageParam - 1))}
                className="px-3 py-1.5 rounded-xl bg-white/5 text-xs text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs text-muted px-2">
                Page {pageParam} of {totalPages}
              </span>
              <button
                disabled={pageParam >= totalPages}
                onClick={() => updateParam('page', String(pageParam + 1))}
                className="px-3 py-1.5 rounded-xl bg-white/5 text-xs text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* DISCOVERY VIEW (When query is empty: Sections 7 & Discovery Feeds) */}
      {isDiscoveryView && (
        <div className="space-y-12 animate-in fade-in">
          {/* Section 1: Recommended For You */}
          {discovery?.recommended?.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-text">Recommended For You</h2>
                </div>
                <span className="text-xs text-muted">Personalized to your study profile</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {discovery.recommended.map((c) => (
                  <div
                    key={c._id}
                    className="bg-[#151922] border border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:border-primary/40 transition-all group"
                  >
                    <div className="space-y-2">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold uppercase">
                        {c.category}
                      </span>
                      <h3 className="font-semibold text-text text-sm group-hover:text-primary transition-colors line-clamp-2">
                        {c.title}
                      </h3>
                      <p className="text-xs text-muted line-clamp-2">{c.description}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-muted capitalize">{c.level}</span>
                      <Link
                        to="/study-plan"
                        className="text-xs text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Enroll <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Trending & Popular Courses */}
          {discovery?.popular?.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <h2 className="text-xl font-bold text-text">Trending Courses</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {discovery.popular.map((c) => (
                  <div
                    key={c._id}
                    className="bg-[#151922] border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-semibold uppercase">
                          {c.category}
                        </span>
                        <span className="text-[11px] text-muted capitalize">{c.level}</span>
                      </div>
                      <h3 className="font-semibold text-text text-base group-hover:text-amber-400 transition-colors line-clamp-2">
                        {c.title}
                      </h3>
                      <p className="text-xs text-muted line-clamp-2">{c.description}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-muted/70">
                        {c.instructorId?.displayName || 'EduFlow Faculty'}
                      </span>
                      <Link
                        to="/study-plan"
                        className="text-xs text-amber-400 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        View Course <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Popular Categories Grid */}
          {discovery?.categories?.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-text">Browse by Subject</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {discovery.categories.map((cat) => (
                  <button
                    key={cat.category}
                    onClick={() => updateParam('category', cat.category)}
                    className="p-3.5 rounded-2xl bg-[#151922] border border-white/10 hover:border-primary/50 text-left transition-all group cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-text group-hover:text-primary transition-colors truncate">
                      {cat.category}
                    </div>
                    <div className="text-xs text-muted mt-1">
                      {cat.count} course{cat.count === 1 ? '' : 's'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Popular Topics Cloud */}
          {discovery?.popularTopics?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-text">Popular Topics</h2>
              <div className="flex flex-wrap gap-2">
                {discovery.popularTopics.map((top) => (
                  <button
                    key={top}
                    onClick={() => {
                      setInputVal(top);
                      updateParam('q', top);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors text-xs text-muted flex items-center gap-1.5 cursor-pointer"
                  >
                    <Tag className="w-3 h-3 text-primary" />
                    <span>{top}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
