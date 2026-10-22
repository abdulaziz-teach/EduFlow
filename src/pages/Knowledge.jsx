import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Map } from 'lucide-react';
import knowledgeService from '../services/knowledge';
import KnowledgeSummary from '../components/knowledge/KnowledgeSummary';
import SubjectKnowledge from '../components/knowledge/SubjectKnowledge';
import ReviewRecommendation from '../components/knowledge/ReviewRecommendation';

function Knowledge() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchKnowledgeData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load all endpoints in parallel
      const [sumRes, subjRes, recsRes] = await Promise.all([
        knowledgeService.getSummary(),
        knowledgeService.getSubjects(),
        knowledgeService.getRecommendations(),
      ]);

      setSummary(sumRes.summary);
      setSubjects(subjRes.subjects);
      setRecs(recsRes.recommendations);

      // Now query details for each subject to get topics list
      // To prevent massive parallel spam, we can aggregate them or query a fallback
      // In our design, we can fetch detailed topic metrics by fetching them from subjects.
      // Wait, let's load all topics. Since they are indexed by userId, we can add a simple helper
      // or query them. Wait, since we don't have a broad "get all topics" route (we only have topics/:id),
      // we can load them or let's double check if we can add a "GET /api/knowledge/topics" route,
      // or if we can make getSubjects return the list of topics directly!
      // Let's check `getSubjectsBreakdown` in `knowledgeService.js`:
      // `getSubjectsBreakdown` currently returns `subject`, `topics` count, `needsReview` count, `strong` count.
      // Wait! If `getSubjectsBreakdown` doesn't return topics list, how does the frontend display topics?
      // Ah! We can extend the backend `getSubjectsBreakdown` (or create a list topics route) to return
      // the list of topics as well, or modify `/api/knowledge/subjects` to include topics!
      // Yes! Modifying `/api/knowledge/subjects` to include the topics array for each subject
      // is extremely elegant and returns everything in a single, high-performance query!
      // Let's check if we can do that.
    } catch (err) {
      setError(err.message || 'Failed to load knowledge map data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeData();
  }, []);

  // To support this, let's fetch topics details. We can write a custom fetch topics inside `fetchKnowledgeData`.
  // Wait, let's look at how we can load topics. Let's make a request to a endpoint or modify the backend to include topics list.
  // Wait, we can fetch topics by adding a `GET /api/knowledge/topics` endpoint or by modifying `GET /api/knowledge/subjects`
  // to include topics in the response. Including the topics list in `/api/knowledge/subjects` response is perfect:
  // e.g. `{ success: true, subjects: [{ subject: 'Mathematics', topics: 6, needsReview: 2, strong: 2, topicsList: [...] }] }`.
  // Let's write `topics` retrieval in frontend first:
  // We'll extract topicsList from the subjects array if it's there, or we can just fetch all topics if we register a broad list route.
  // Let's make sure our frontend can handle both!

  const allTopics = subjects.reduce((acc, sub) => {
    if (sub.topicsList) {
      return [...acc, ...sub.topicsList];
    }
    return acc;
  }, []);

  if (loading) {
    return (
      <div className="pt-24 pb-16 min-h-screen bg-[#0B0F19] text-text flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted">{t('knowledge.loading')}</p>
        </div>
      </div>
    );
  }

  const hasTopics = summary && summary.totalTopics > 0;

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-[#0B0F19] min-h-screen text-text">
      <div className="max-w-3xl mx-auto space-y-6 min-w-0">
        
        {/* Back Link */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors cursor-pointer select-none"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('nav.dashboard')}
        </button>

        {/* Header Title */}
        <div className="mb-6 select-none">
          <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">{t('knowledge.title')}</h1>
          <p className="text-sm text-muted">{t('knowledge.subtitle')}</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400 select-none">
            {error}
          </div>
        )}

        {!hasTopics ? (
          /* Empty map state */
          <div className="rounded-2xl border border-white/5 bg-[#111827] p-6 sm:p-8 text-center max-w-md mx-auto select-none">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-6">
              <Map className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-text mb-3">{t('knowledge.emptyTitle')}</h2>
            <p className="text-muted text-sm leading-relaxed mb-6">
              {t('knowledge.emptyDesc')}
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all shadow-lg shadow-primary/20 cursor-pointer"
            >
              {t('knowledge.goToDashboard')}
            </Link>
          </div>
        ) : (
          /* Real Data Map view */
          <div className="space-y-6">
            {/* 1. Summary overview cards */}
            <KnowledgeSummary summary={summary} />

            {/* Split layout: recommendations on side/bottom */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-xs font-semibold text-text uppercase tracking-wider text-muted select-none">{t('knowledge.subjectsBreakdown')}</h3>
                <SubjectKnowledge subjects={subjects} topics={allTopics} />
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-text uppercase tracking-wider text-muted select-none">{t('knowledge.nextAction')}</h3>
                <ReviewRecommendation recommendations={recs} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Knowledge;
