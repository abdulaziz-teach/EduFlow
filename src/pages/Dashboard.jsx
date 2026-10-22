import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Target,
  Clock,
  CalendarDays,
  Brain,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Layers,
  Headphones,
  FileText,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import studyPlanService from '../services/studyPlan';
import progressService from '../services/progress';
import AdaptationBanner from '../components/study-plan/AdaptationBanner';
import knowledgeService from '../services/knowledge';
import ReviewRecommendation from '../components/knowledge/ReviewRecommendation';
import practiceService from '../services/practice';
import notificationsService from '../services/notifications';
import NextActionCard from '../components/adaptive/NextActionCard';
import MasteryOverview from '../components/adaptive/MasteryOverview';
import MistakeReviewModal from '../components/adaptive/MistakeReviewModal';

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [plan, setPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [todayDay, setTodayDay] = useState(null);
  const [loadingToday, setLoadingToday] = useState(true);

  const [recommendation, setRecommendation] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(true);

  const [knowledgeSummary, setKnowledgeSummary] = useState(null);
  const [loadingKnowledge, setLoadingKnowledge] = useState(true);
  const [knowledgeRecs, setKnowledgeRecs] = useState([]);

  const [practiceRec, setPracticeRec] = useState(null);
  const [recentPractice, setRecentPractice] = useState(null);
  const [loadingPractice, setLoadingPractice] = useState(true);

  const [recentUpdates, setRecentUpdates] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(true);
  const [mistakeModalOpen, setMistakeModalOpen] = useState(false);

  useEffect(() => {
    const fetchPractice = async () => {
      try {
        const [recRes, histRes] = await Promise.all([
          practiceService.getRecommendation(),
          practiceService.getHistory()
        ]);
        setPracticeRec(recRes.recommendation);
        if (histRes.sessions && histRes.sessions.length > 0) {
          setRecentPractice(histRes.sessions[0]);
        }
      } catch (err) {
        console.error('Could not load practice summary:', err.message);
        setLoadError('Some dashboard data could not be loaded. Check your connection and refresh.');
      } finally {
        setLoadingPractice(false);
      }
    };
    fetchPractice();

    const fetchUpdates = async () => {
      try {
        const data = await notificationsService.getNotifications();
        setRecentUpdates(data.notifications.slice(0, 3));
      } catch (err) {
        console.error('Could not load recent notifications:', err.message);
        setLoadError('Some dashboard data could not be loaded. Check your connection and refresh.');
      } finally {
        setLoadingUpdates(false);
      }
    };
    fetchUpdates();

    const fetchKnowledge = async () => {
      try {
        const [sumRes, recsRes] = await Promise.all([
          knowledgeService.getSummary(),
          knowledgeService.getRecommendations()
        ]);
        setKnowledgeSummary(sumRes.summary);
        setKnowledgeRecs(recsRes.recommendations);
      } catch (err) {
        console.error('Could not load learning summary:', err.message);
        setLoadError('Some dashboard data could not be loaded. Check your connection and refresh.');
      } finally {
        setLoadingKnowledge(false);
      }
    };
    fetchKnowledge();
    const fetchSummary = async () => {
      try {
        const data = await progressService.getProgressSummary();
        setSummary(data.summary);
      } catch (err) {
        console.error('Could not load progress summary:', err.message);
        setLoadError('Some dashboard data could not be loaded. Check your connection and refresh.');
      } finally {
        setLoadingSummary(false);
      }
    };

    const fetchTodayTasks = async () => {
      try {
        const data = await studyPlanService.getTodayStudyPlan();
        setTodayDay(data.day);
      } catch (err) {
        console.error('Could not load today’s study plan:', err.message);
        setLoadError('Some dashboard data could not be loaded. Check your connection and refresh.');
      } finally {
        setLoadingToday(false);
      }
    };

    const fetchRecommendation = async () => {
      try {
        const data = await studyPlanService.getStudyRecommendation();
        setRecommendation(data.recommendation);
      } catch (err) {
        console.error('Could not load study recommendation:', err.message);
        setLoadError('Some dashboard data could not be loaded. Check your connection and refresh.');
      } finally {
        setLoadingRecommendation(false);
      }
    };

    fetchSummary();
    fetchTodayTasks();
    fetchRecommendation();
  }, []);

  // Fetch current plan on mount
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const data = await studyPlanService.getCurrent();
        setPlan(data.plan);
      } catch (err) {
        console.error('Could not load current study plan:', err.message);
        setLoadError('Some dashboard data could not be loaded. Check your connection and refresh.');
      } finally {
        setLoadingPlan(false);
      }
    };
    fetchPlan();
  }, []);

  // Animate loading steps while generating
  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setGenStep((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [generating]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenStep(0);
    setError('');

    try {
      const data = await studyPlanService.generate();
      setPlan(data.plan);
      setGenerating(false);
    } catch (err) {
      setError(err.message);
      setGenerating(false);
    }
  };

  const getGoalLabel = (goal) => {
    if (goal?.description) return goal.description;
    if (goal?.type) return t(`dashboard.goals.${goal.type}`, { defaultValue: goal.type });
    return t('dashboard.notSet');
  };

  const goalLabel = getGoalLabel(user?.goal);

  const studyTime = user?.dailyStudyMinutes
    ? user.dailyStudyMinutes >= 60
      ? `${Math.floor(user.dailyStudyMinutes / 60)}h${user.dailyStudyMinutes % 60 ? ` ${user.dailyStudyMinutes % 60}min` : ''}`
      : `${user.dailyStudyMinutes} min`
    : t('dashboard.notSet');

  const localeCode = i18n.language === 'uz' ? 'uz-UZ' : i18n.language === 'ru' ? 'ru-RU' : 'en-US';
  const targetDate = user?.goal?.targetDate
    ? new Date(user.goal.targetDate).toLocaleDateString(localeCode, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const currentHour = new Date().getHours();
  const greetingKey = currentHour < 12 ? 'greetingMorning' : currentHour < 18 ? 'greetingAfternoon' : 'greetingEvening';

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto min-w-0">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">
            {t(`dashboard.${greetingKey}`, { name: user?.name?.split(' ')[0] || user?.name || '' })}
          </h1>
          <p className="text-muted">{t('dashboard.profileReady')}</p>
        </div>

        {loadError && (
          <div role="status" className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
            {loadError}
          </div>
        )}

        <AdaptationBanner plan={plan} />

        {/* Profile summary */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted mb-0.5">{t('dashboard.goal')}</p>
                <p className="text-sm font-medium text-text">{goalLabel}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-xs text-muted mb-0.5">{t('dashboard.dailyStudyTime')}</p>
                <p className="text-sm font-medium text-text">{studyTime}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted mb-1">{t('dashboard.subjects')}</p>
                {user?.subjects?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {user.subjects.map((s) => (
                      <span key={s} className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/5 border border-subtle text-text">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-text">{t('dashboard.notSet')}</p>
                )}
              </div>
            </div>

            {targetDate && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted mb-0.5">{t('dashboard.target')}</p>
                  <p className="text-sm font-medium text-text">{targetDate}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted mb-0.5">{t('dashboard.currentLevel')}</p>
                <p className="text-sm font-medium text-text capitalize">{user?.level || t('dashboard.notSet')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <p className="text-xs text-muted mb-1">{t('dashboard.focusTopics')}</p>
                {user?.weakTopics?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {user.weakTopics.map((topic) => (
                      <span key={topic} className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/5 border border-subtle text-text">
                        {topic}
                      </span>
                    ))}
                  </div>
                ) : <p className="text-sm font-medium text-text">{t('dashboard.noFocusTopics')}</p>}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-muted mb-0.5">{t('dashboard.studySchedule')}</p>
                <p className="text-sm font-medium text-text">
                  {user?.studySchedule?.preferredDays?.length
                    ? user.studySchedule.preferredDays.map((day) => day.slice(0, 3)).join(', ')
                    : t('dashboard.flexibleDays')} · {user?.studySchedule?.preferredTime || 'anytime'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-muted mb-0.5">{t('dashboard.learningLanguage')}</p>
                <p className="text-sm font-medium text-text">
                  {{ en: 'English', ru: 'Русский', uz: "O'zbekcha" }[user?.preferredLanguage] || 'English'}
                </p>
              </div>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Link to="/profile" className="text-xs font-semibold text-primary hover:text-primary-hover">
                {t('dashboard.editProfile')}
              </Link>
            </div>
          </div>
        </div>

        {/* Adaptive Intelligence — Next Best Action */}
        <div className="mb-5 space-y-3">
          <NextActionCard />
          <div className="flex justify-end">
            <button
              onClick={() => setMistakeModalOpen(true)}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors cursor-pointer bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-xl hover:bg-white/[0.04]"
            >
              <span>{t('dashboard.reviewPastMistakes')}</span>
            </button>
          </div>
        </div>

        {/* Today's Learning Card */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mb-5">
          <h3 className="text-base font-semibold text-text mb-4 font-sans tracking-wide">{t('dashboard.todayLearning')}</h3>
          {loadingSummary ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : summary && (summary.todayStudyMinutes > 0 || summary.todayCompletedTasks > 0) ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-text">{t('dashboard.minStudied', { count: summary.todayStudyMinutes })}</p>
                <p className="text-sm text-muted">{t('dashboard.tasksCompletedCount', { count: summary.todayCompletedTasks })}</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <span className="text-lg">🔥</span>
                <div>
                  <p className="text-xs text-muted leading-none">{t('dashboard.streak')}</p>
                  <p className="text-sm font-semibold text-orange-400 mt-1">{t('dashboard.dayStreak', { count: summary.currentStreak })}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted">{t('dashboard.notStartedToday')}</p>
              </div>
              <Link
                to="/study-plan"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover transition-colors cursor-pointer"
              >
                {t('dashboard.startFirstTask')}
              </Link>
            </div>
          )}
        </div>

        {/* Topic Mastery Overview */}
        <div className="mb-5">
          <MasteryOverview />
        </div>

        {/* Deterministic study focus */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mb-5">
          <h3 className="text-base font-semibold text-text mb-4">{t('dashboard.studyFocus')}</h3>
          {loadingRecommendation ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-xs text-muted ml-2">{t('dashboard.loadingPlan')}</span>
            </div>
          ) : recommendation ? (
            <div className="space-y-4">
              <p className="text-sm text-text italic leading-relaxed font-medium">
                {recommendation.message}
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {recommendation.title}
                </span>
                <button
                  onClick={() => {
                    navigate('/study-plan');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-primary hover:bg-primary-hover text-white transition-all cursor-pointer"
                >
                  {t('dashboard.viewStudyPlan')}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">{t('dashboard.noPlanFocus')}</p>
          )}
        </div>

        {/* Overdue Alert Card */}
        {!loadingRecommendation && recommendation && recommendation.type === 'catch_up' && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⚠️</span>
              <h4 className="text-sm font-semibold text-rose-400">{t('dashboard.unfinishedTasks')}</h4>
            </div>
            <p className="text-xs text-muted mb-4">
              {t('dashboard.unfinishedTasksDesc', { count: recommendation.tasks.length })}
            </p>
            <div className="space-y-3">
              {recommendation.tasks.slice(0, 2).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-subtle bg-white/[0.02]"
                >
                  <div>
                    <p className="text-sm font-medium text-text">{task.title}</p>
                    <p className="text-xs text-muted mt-1">{task.subject} &middot; {task.duration} min</p>
                  </div>
                  <button
                    onClick={() => {
                      navigate('/study-plan', { state: { startTaskId: task.id, filter: 'Overdue' } });
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-500 hover:bg-rose-600 text-white transition-all cursor-pointer shrink-0"
                  >
                    {t('dashboard.studyNow')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Learning Map Overview Card */}
        {knowledgeSummary && (
          <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mb-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-text mb-1">{t('dashboard.learningMap')}</h3>
                <p className="text-sm text-muted">{t('dashboard.topicsTracked', { count: knowledgeSummary.totalTopics })}</p>
                {knowledgeSummary.needsReview > 0 && (
                  <p className="text-xs text-rose-400 mt-2 font-semibold">
                    {t('dashboard.topicsNeedReview', { count: knowledgeSummary.needsReview })}
                  </p>
                )}
              </div>
              <Link
                to="/knowledge"
                className="px-3 py-1.5 text-xs font-semibold rounded bg-primary hover:bg-primary-hover text-white transition-all cursor-pointer"
              >
                {t('dashboard.viewLearningMap')}
              </Link>
            </div>
          </div>
        )}

        {/* Smart Practice Card */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mb-5 space-y-4">
          <h3 className="text-base font-semibold text-text">{t('dashboard.smartPractice')}</h3>
          {loadingPractice ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {practiceRec ? (
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wide">{t('dashboard.recommendedTopic')}</span>
                    <h4 className="text-sm font-bold text-text mt-0.5">{practiceRec.topic}</h4>
                    <p className="text-xs text-muted text-left leading-relaxed">{practiceRec.reason}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/practice?subject=${encodeURIComponent(practiceRec.subject)}&topic=${encodeURIComponent(practiceRec.topic)}`)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded bg-primary hover:bg-primary-hover text-white transition-all cursor-pointer shrink-0 text-center"
                  >
                    {t('dashboard.startPractice')}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted">{t('dashboard.noPracticeRec')}</p>
              )}

              {recentPractice && (
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-muted">{t('dashboard.lastPractice')}</span>
                  <span className="font-semibold text-text">
                    {recentPractice.subject} &middot; {t('dashboard.accuracyValue', { accuracy: recentPractice.accuracy })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent updates feed Card */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mb-5 space-y-4">
          <div className="flex items-center justify-between select-none">
            <h3 className="text-base font-semibold text-text">{t('dashboard.recentUpdates')}</h3>
            <Link
              to="/notifications"
              className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors cursor-pointer"
            >
              {t('dashboard.viewAll')}
            </Link>
          </div>
          {loadingUpdates ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : recentUpdates.length === 0 ? (
            <p className="text-xs text-muted select-none">{t('dashboard.allCaughtUp')}</p>
          ) : (
            <div className="space-y-3">
              {recentUpdates.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => {
                    if (notif.link && notif.link.startsWith('/')) {
                      navigate(notif.link);
                    }
                  }}
                  className="flex gap-2.5 items-start text-left cursor-pointer hover:bg-white/[0.01] p-1.5 rounded-lg transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-text leading-tight">{notif.title}</p>
                    <p className="text-[11px] text-muted leading-normal">{notif.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommended Review Alert Card */}
        {!loadingKnowledge && knowledgeRecs && knowledgeRecs.length > 0 && (
          <div className="mb-5">
            <ReviewRecommendation recommendations={knowledgeRecs} />
          </div>
        )}

        {/* Today's Tasks Card */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mb-5">
          <h3 className="text-base font-semibold text-text mb-4">{t('dashboard.todayTasks')}</h3>
          {loadingToday ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : todayDay && todayDay.tasks && todayDay.tasks.length > 0 ? (
            <div className="space-y-3">
              {todayDay.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-subtle bg-white/[0.02] hover:border-white/5 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base font-medium shrink-0">
                      {task.completed ? (
                        <span className="text-emerald-400">✓</span>
                      ) : (
                        <span className="text-muted/40">○</span>
                      )}
                    </span>
                    <span className={`text-sm min-w-0 truncate ${task.completed ? 'text-muted line-through' : 'text-text'}`}>
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!task.completed && (
                      <button
                        onClick={() => {
                          navigate('/study-plan', { state: { startTaskId: task.id, filter: 'Today' } });
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-primary hover:bg-primary-hover text-white transition-all cursor-pointer"
                      >
                        {t('dashboard.startStudying')}
                      </button>
                    )}
                    <span className="text-xs text-muted min-w-[45px] text-right">{task.duration} min</span>
                  </div>
                </div>
              ))}
            </div>
          ) : plan ? (
            <p className="text-sm text-muted">{t('dashboard.noTasksScheduled')}</p>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted mb-4">{t('dashboard.journeyStartsHere')}</p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 text-xs font-semibold rounded bg-primary hover:bg-primary-hover text-white transition-all cursor-pointer"
              >
                {t('dashboard.createPlan')}
              </button>
            </div>
          )}
        </div>

        {/* Study Plan Card */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6">
          {/* Loading current plan */}
          {loadingPlan ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : generating ? (
            /* AI generation in progress */
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-7 h-7 text-primary animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">
                {t('dashboard.loadingPlan')}
              </h3>
              <div className="space-y-2 mt-6 max-w-xs mx-auto">
                {[
                  t('dashboard.loadingGoals'),
                  t('dashboard.loadingSessions'),
                  t('dashboard.balancingWorkload'),
                ].map((step, i) => (
                  <div
                    key={step}
                    className={`flex items-center gap-2.5 px-4 py-2 rounded-lg transition-all duration-500 ${
                      i === genStep
                        ? 'bg-primary/5 border border-primary/20'
                        : i < genStep
                          ? 'opacity-50'
                          : 'opacity-30'
                    }`}
                  >
                    {i < genStep ? (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    ) : i === genStep ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-subtle shrink-0" />
                    )}
                    <span className="text-sm text-muted">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : plan ? (
            /* Plan exists — show summary + link */
            <div>
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-text mb-1">{t('dashboard.yourPlan')}</h3>
                  <p className="text-sm font-medium text-text mb-1">{plan.title}</p>
                  <p className="text-sm text-muted leading-relaxed mb-4">{plan.summary}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted mb-4">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {t('dashboard.daysCount', { count: plan.totalDays })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {t('dashboard.minPerDay', { count: plan.dailyMinutes })}
                    </span>
                  </div>
                  <Link
                    to="/study-plan"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all shadow-lg shadow-primary/20"
                  >
                    {t('dashboard.openPlan')}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* No plan — generate CTA */
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-text mb-1">
                  {t('dashboard.personalizedPlan')}
                </h3>
                <p className="text-sm text-muted leading-relaxed mb-4">
                  {t('dashboard.createPlanDesc')}
                </p>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-primary/20"
                >
                  <Sparkles className="w-4 h-4" />
                  {t('dashboard.createMyPlan')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Smart Study Toolkit Section */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mt-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-text flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>{t('dashboard.toolkit.title')}</span>
            </h3>
            <span className="text-xs text-muted">{t('dashboard.toolkit.subtitle')}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/flashcards"
              className="p-3.5 rounded-xl bg-dark/60 hover:bg-white/5 border border-subtle hover:border-primary/40 transition-all flex flex-col items-center text-center group"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-2">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-text mb-0.5">{t('nav.flashcards')}</span>
              <span className="text-[10px] text-muted">{t('dashboard.toolkit.spacedRepetition')}</span>
            </Link>

            <Link
              to="/focus"
              className="p-3.5 rounded-xl bg-dark/60 hover:bg-white/5 border border-subtle hover:border-sky-500/40 transition-all flex flex-col items-center text-center group"
            >
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform mb-2">
                <Headphones className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-text mb-0.5">{t('nav.focusRoom')}</span>
              <span className="text-[10px] text-muted">{t('dashboard.toolkit.pomodoro')}</span>
            </Link>

            <Link
              to="/smart-notes"
              className="p-3.5 rounded-xl bg-dark/60 hover:bg-white/5 border border-subtle hover:border-purple-500/40 transition-all flex flex-col items-center text-center group"
            >
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform mb-2">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-text mb-0.5">{t('nav.smartNotes')}</span>
              <span className="text-[10px] text-muted">{t('dashboard.toolkit.aiSummarizer')}</span>
            </Link>

            <Link
              to="/leaderboard"
              className="p-3.5 rounded-xl bg-dark/60 hover:bg-white/5 border border-subtle hover:border-amber-500/40 transition-all flex flex-col items-center text-center group"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform mb-2">
                <Trophy className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-text mb-0.5">{t('nav.leaderboard')}</span>
              <span className="text-[10px] text-muted">{t('dashboard.toolkit.rankings')}</span>
            </Link>
          </div>
        </div>

        {/* AI Mentor Card */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mt-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-text mb-1">{t('dashboard.mentorCard.title')}</h3>
              <p className="text-sm text-muted leading-relaxed mb-4">
                {t('dashboard.mentorCard.desc')}
              </p>
              <Link
                to="/mentor"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all shadow-lg shadow-primary/20"
              >
                {t('dashboard.mentorCard.ask')}
              </Link>
            </div>
          </div>
        </div>

        {/* Mistake Review Modal */}
        <MistakeReviewModal
          isOpen={mistakeModalOpen}
          onClose={() => setMistakeModalOpen(false)}
        />
      </div>
    </div>
  );
}

export default Dashboard;
