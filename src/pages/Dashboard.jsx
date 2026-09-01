import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import studyPlanService from '../services/studyPlan';
import progressService from '../services/progress';
import AdaptationBanner from '../components/study-plan/AdaptationBanner';
import knowledgeService from '../services/knowledge';
import ReviewRecommendation from '../components/knowledge/ReviewRecommendation';
import practiceService from '../services/practice';
import notificationsService from '../services/notifications';

const GOAL_LABELS = {
  grades: 'Improve my grades',
  exam: 'Prepare for an exam',
  learn: 'Learn a new subject',
  habit: 'Build a study habit',
};

const LOADING_STEPS = [
  'Analyzing your goals',
  'Planning your study sessions',
  'Balancing your workload',
];

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [error, setError] = useState('');
  
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [todayDay, setTodayDay] = useState(null);
  const [loadingToday, setLoadingToday] = useState(true);

  const [recommendation, setRecommendation] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(true);

  const [coach, setCoach] = useState(null);
  const [loadingCoach, setLoadingCoach] = useState(true);

  const [knowledgeSummary, setKnowledgeSummary] = useState(null);
  const [loadingKnowledge, setLoadingKnowledge] = useState(true);
  const [knowledgeRecs, setKnowledgeRecs] = useState([]);

  const [practiceRec, setPracticeRec] = useState(null);
  const [recentPractice, setRecentPractice] = useState(null);
  const [loadingPractice, setLoadingPractice] = useState(true);

  const [recentUpdates, setRecentUpdates] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(true);

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
      } catch {
        // silently fail
      } finally {
        setLoadingPractice(false);
      }
    };
    fetchPractice();

    const fetchUpdates = async () => {
      try {
        const data = await notificationsService.getNotifications();
        setRecentUpdates(data.notifications.slice(0, 3));
      } catch {
        // silently fail
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
      } catch {
        // silently fail
      } finally {
        setLoadingKnowledge(false);
      }
    };
    fetchKnowledge();
    const fetchSummary = async () => {
      try {
        const data = await progressService.getProgressSummary();
        setSummary(data.summary);
      } catch {
        // silently fail
      } finally {
        setLoadingSummary(false);
      }
    };

    const fetchTodayTasks = async () => {
      try {
        const data = await studyPlanService.getTodayStudyPlan();
        setTodayDay(data.day);
      } catch {
        // silently fail
      } finally {
        setLoadingToday(false);
      }
    };

    const fetchRecommendation = async () => {
      try {
        const data = await studyPlanService.getStudyRecommendation();
        setRecommendation(data.recommendation);
      } catch {
        // silently fail
      } finally {
        setLoadingRecommendation(false);
      }
    };

    const fetchDailyCoach = async () => {
      try {
        const data = await studyPlanService.getDailyCoach();
        setCoach(data.coach);
      } catch {
        // silently fail
      } finally {
        setLoadingCoach(false);
      }
    };

    fetchSummary();
    fetchTodayTasks();
    fetchRecommendation();
    fetchDailyCoach();
  }, []);

  // Fetch current plan on mount
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const data = await studyPlanService.getCurrent();
        setPlan(data.plan);
      } catch {
        // silently fail — plan just won't show
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

  const goalLabel =
    user?.goal?.description || GOAL_LABELS[user?.goal?.type] || 'Not set';

  const studyTime = user?.dailyStudyMinutes
    ? user.dailyStudyMinutes >= 60
      ? `${Math.floor(user.dailyStudyMinutes / 60)}h${user.dailyStudyMinutes % 60 ? ` ${user.dailyStudyMinutes % 60}min` : ''}`
      : `${user.dailyStudyMinutes} min`
    : 'Not set';

  const targetDate = user?.goal?.targetDate
    ? new Date(user.goal.targetDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">
            Good morning, {user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-muted">Your learning profile is ready.</p>
        </div>

        <AdaptationBanner plan={plan} />

        {/* Profile summary */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted mb-0.5">Goal</p>
                <p className="text-sm font-medium text-text">{goalLabel}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-xs text-muted mb-0.5">Daily study time</p>
                <p className="text-sm font-medium text-text">{studyTime}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Subjects</p>
                {user?.subjects?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {user.subjects.map((s) => (
                      <span key={s} className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/5 border border-subtle text-text">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-text">Not set</p>
                )}
              </div>
            </div>

            {targetDate && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted mb-0.5">Target</p>
                  <p className="text-sm font-medium text-text">{targetDate}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Today's Learning Card */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mb-5">
          <h3 className="text-base font-semibold text-text mb-4 font-sans tracking-wide">Today&apos;s Learning</h3>
          {loadingSummary ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : summary && (summary.todayStudyMinutes > 0 || summary.todayCompletedTasks > 0) ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-text">{summary.todayStudyMinutes} min studied</p>
                <p className="text-sm text-muted">{summary.todayCompletedTasks} tasks completed today</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <span className="text-lg">🔥</span>
                <div>
                  <p className="text-xs text-muted leading-none">Streak</p>
                  <p className="text-sm font-semibold text-orange-400 mt-1">{summary.currentStreak} day streak</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted">You haven&apos;t started studying today.</p>
              </div>
              <Link
                to="/study-plan"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover transition-colors cursor-pointer"
              >
                Start today&apos;s first task &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* AI Daily Coach Card */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mb-5">
          <h3 className="text-base font-semibold text-text mb-4">AI Coach</h3>
          {loadingCoach ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-xs text-muted ml-2">Loading advice...</span>
            </div>
          ) : coach ? (
            <div className="space-y-4">
              <p className="text-sm text-text italic leading-relaxed font-medium">
                &ldquo;{coach.message}&rdquo;
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${
                  coach.priority === 'high'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : coach.priority === 'low'
                      ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {coach.priority} priority
                </span>
                <button
                  onClick={() => {
                    navigate('/mentor', {
                      state: {
                        prefillMessage: `Hello Mentor! The Daily Coach suggested: "${coach.message}". Can you help me study this subject?`,
                      }
                    });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-primary hover:bg-primary-hover text-white transition-all cursor-pointer"
                >
                  Open Mentor
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">AI Coach advice is currently unavailable.</p>
          )}
        </div>

        {/* Overdue Alert Card */}
        {!loadingRecommendation && recommendation && recommendation.type === 'catch_up' && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⚠️</span>
              <h4 className="text-sm font-semibold text-rose-400">You have unfinished tasks</h4>
            </div>
            <p className="text-xs text-muted mb-4">
              {recommendation.tasks.length} task(s) from previous days are still incomplete. Let&apos;s catch up!
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
                    Study now
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
                <h3 className="text-base font-semibold text-text mb-1">Learning Map</h3>
                <p className="text-sm text-muted">{knowledgeSummary.totalTopics} topics tracked</p>
                {knowledgeSummary.needsReview > 0 && (
                  <p className="text-xs text-rose-400 mt-2 font-semibold">
                    ⚠️ {knowledgeSummary.needsReview} {knowledgeSummary.needsReview === 1 ? 'topic' : 'topics'} may need review
                  </p>
                )}
              </div>
              <Link
                to="/knowledge"
                className="px-3 py-1.5 text-xs font-semibold rounded bg-primary hover:bg-primary-hover text-white transition-all cursor-pointer"
              >
                View Learning Map
              </Link>
            </div>
          </div>
        )}

        {/* Smart Practice Card */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mb-5 space-y-4">
          <h3 className="text-base font-semibold text-text">Smart Practice</h3>
          {loadingPractice ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {practiceRec ? (
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Recommended Topic</span>
                    <h4 className="text-sm font-bold text-text mt-0.5">{practiceRec.topic}</h4>
                    <p className="text-xs text-muted text-left leading-relaxed">{practiceRec.reason}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/practice?subject=${encodeURIComponent(practiceRec.subject)}&topic=${encodeURIComponent(practiceRec.topic)}`)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded bg-primary hover:bg-primary-hover text-white transition-all cursor-pointer shrink-0 text-center"
                  >
                    Start Practice
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted">No specific practice recommendation yet. Choose a topic from your study plan.</p>
              )}

              {recentPractice && (
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-muted">Last practice:</span>
                  <span className="font-semibold text-text">
                    {recentPractice.subject} &middot; {recentPractice.accuracy}% accuracy
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent updates feed Card */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mb-5 space-y-4">
          <div className="flex items-center justify-between select-none">
            <h3 className="text-base font-semibold text-text">Recent Updates</h3>
            <Link
              to="/notifications"
              className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors cursor-pointer"
            >
              View all
            </Link>
          </div>
          {loadingUpdates ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : recentUpdates.length === 0 ? (
            <p className="text-xs text-muted select-none">You&apos;re all caught up. No recent updates.</p>
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
          <h3 className="text-base font-semibold text-text mb-4">Today&apos;s Tasks</h3>
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
                        Start studying
                      </button>
                    )}
                    <span className="text-xs text-muted min-w-[45px] text-right">{task.duration} min</span>
                  </div>
                </div>
              ))}
            </div>
          ) : plan ? (
            <p className="text-sm text-muted">You&apos;re all caught up 🎉 No study tasks scheduled for today.</p>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted mb-4">Your learning journey starts here. Create your personalized study plan.</p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 text-xs font-semibold rounded bg-primary hover:bg-primary-hover text-white transition-all cursor-pointer"
              >
                Create Study Plan
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
                Creating your personalized plan...
              </h3>
              <div className="space-y-2 mt-6 max-w-xs mx-auto">
                {LOADING_STEPS.map((step, i) => (
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
                  <h3 className="text-base font-semibold text-text mb-1">Your study plan</h3>
                  <p className="text-sm font-medium text-text mb-1">{plan.title}</p>
                  <p className="text-sm text-muted leading-relaxed mb-4">{plan.summary}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted mb-4">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {plan.totalDays} days
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {plan.dailyMinutes} min/day
                    </span>
                  </div>
                  <Link
                    to="/study-plan"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all shadow-lg shadow-primary/20"
                  >
                    Open study plan
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
                  Your personalized study plan
                </h3>
                <p className="text-sm text-muted leading-relaxed mb-4">
                  Create a plan based on your goals, subjects and available study time.
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
                  Create my study plan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Mentor Card */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mt-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-text mb-1">AI Mentor</h3>
              <p className="text-sm text-muted leading-relaxed mb-4">
                Need help understanding something? Ask your personal AI Mentor about today&apos;s study topics.
              </p>
              <Link
                to="/mentor"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all shadow-lg shadow-primary/20"
              >
                Ask AI Mentor &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
