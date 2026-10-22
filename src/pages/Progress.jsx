import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Flame,
  BookOpen,
  Loader2,
  Award,
} from 'lucide-react';
import progressService from '../services/progress';
import studyPlanService from '../services/studyPlan';
import knowledgeService from '../services/knowledge';

function Progress() {
  const { t, i18n } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [activity, setActivity] = useState([]);
  const [weeklyDigest, setWeeklyDigest] = useState(null);
  const [plan, setPlan] = useState(null);
  const [knowledgeSubjects, setKnowledgeSubjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Fetch all analytics data on mount
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        const [sumRes, subjRes, actRes, planRes, knowRes, digRes] = await Promise.all([
          progressService.getProgressSummary(),
          progressService.getSubjectProgress(),
          progressService.getActivity(),
          studyPlanService.getCurrent().catch(() => ({ plan: null })),
          knowledgeService.getSubjects().catch(() => ({ subjects: [] })),
          progressService.getWeeklyDigest().catch(() => ({ digest: null })),
        ]);

        setSummary(sumRes.summary);
        setSubjects(subjRes.subjects);
        setActivity(actRes.activity);
        setPlan(planRes.plan);
        setKnowledgeSubjects(knowRes.subjects || []);
        setWeeklyDigest(digRes.digest || null);
      } catch {
        setError(t('progress.loadError'));
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [t]);

  // 2. Format total time studied helper
  const formatTime = (totalMinutes) => {
    if (!totalMinutes) return '0h 0m';
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins}m`;
  };

  // 3. Format recent activity date labels helper
  const formatActivityDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('progress.today');
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return t('progress.yesterday');
    }

    const localeCode = i18n.language === 'uz' ? 'uz-UZ' : i18n.language === 'ru' ? 'ru-RU' : 'en-US';
    return date.toLocaleDateString(localeCode, {
      month: 'short',
      day: 'numeric',
    });
  };

  // 4. Heatmap generator (past 30 days grid)
  const generateHeatmapCells = () => {
    const cells = [];
    const today = new Date();
    
    // Sort activity by date string for easy index map
    const activityMap = {};
    activity.forEach((act) => {
      activityMap[act.date] = act.studyMinutes;
    });

    for (let i = 29; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      
      const year = day.getFullYear();
      const month = String(day.getMonth() + 1).padStart(2, '0');
      const dateNum = String(day.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dateNum}`;

      const minutes = activityMap[dateStr] || 0;
      cells.push({
        date: day,
        dateStr,
        minutes,
      });
    }

    return cells;
  };

  // Skeletons for Loading States
  if (loading) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center gap-4 bg-[#0B0F19]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted">{t('progress.loading')}</p>
      </div>
    );
  }

  // Error States
  if (error) {
    return (
      <div className="pt-24 pb-16 px-4 text-center max-w-md mx-auto bg-[#0B0F19]">
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-xs font-semibold rounded bg-primary hover:bg-primary-hover text-white transition-all cursor-pointer"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  // Overall empty state (no sessions completed yet)
  const hasActivity = summary && (summary.totalStudyMinutes > 0 || summary.totalSessions > 0);
  
  // Heatmap cells list
  const heatmapCells = generateHeatmapCells();

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-[#0B0F19] min-h-screen text-text">
      <div className="max-w-3xl mx-auto space-y-6 min-w-0">
        {/* Header Title */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">{t('progress.title')}</h1>
          <p className="text-sm text-muted">{t('progress.subtitle')}</p>
        </div>

        {!hasActivity ? (
          /* Empty Session State */
          <div className="rounded-2xl border border-white/5 bg-[#111827] p-6 sm:p-8 text-center max-w-md mx-auto select-none">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-text mb-3">{t('progress.noActivity')}</h2>
            <p className="text-muted text-sm leading-relaxed mb-6">
              {t('progress.startFirstSession')}
            </p>
            {plan ? (
              <Link
                to="/study-plan"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all shadow-lg shadow-primary/20 cursor-pointer"
              >
                {t('progress.goToPlan')}
              </Link>
            ) : (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all shadow-lg shadow-primary/20 cursor-pointer"
              >
                {t('progress.createPlanFirst')}
              </Link>
            )}
          </div>
        ) : (
          /* Real Database-Backed Analytics View (Mobile-responsive vertical stack) */
          <div className="space-y-6">
            
            {/* 7-Day Weekly Digest Banner */}
            {weeklyDigest && (
              <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-primary/20 text-primary uppercase tracking-wider">
                      {t('progress.digestTitle')}
                    </span>
                    <span className="text-xs text-muted">
                      {weeklyDigest.weekStart} – {weeklyDigest.weekEnd}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-text">
                    {weeklyDigest.currentWeekMinutes > 0
                      ? t('progress.weekMinutesStudied', { minutes: weeklyDigest.currentWeekMinutes })
                      : t('progress.noWeekSessions')}
                  </h3>
                  {weeklyDigest.topSubject && (
                    <p className="text-xs text-muted mt-1">
                      {t('progress.topFocus', { subject: weeklyDigest.topSubject.subject, minutes: weeklyDigest.topSubject.minutes })}
                    </p>
                  )}
                </div>
                {weeklyDigest.weeklyAccuracy !== null && (
                  <div className="shrink-0 flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="text-[10px] text-muted uppercase font-semibold">{t('progress.weeklyAccuracy')}</p>
                      <p className="text-sm font-bold text-emerald-400">{weeklyDigest.weeklyAccuracy}%</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 1. Summary Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Study Time Card */}
              <div className="rounded-2xl border border-white/5 bg-[#111827] p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] text-muted uppercase font-semibold tracking-wider">{t('progress.studyTime')}</p>
                  <p className="text-base font-bold mt-1 text-text">{formatTime(summary.totalStudyMinutes)}</p>
                </div>
              </div>

              {/* Tasks Completed Card */}
              <div className="rounded-2xl border border-white/5 bg-[#111827] p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] text-muted uppercase font-semibold tracking-wider">{t('progress.tasksDone')}</p>
                  <p className="text-base font-bold mt-1 text-text">{summary.completedTasks} / {summary.totalTasks}</p>
                </div>
              </div>

              {/* Current Streak Card */}
              <div className="rounded-2xl border border-white/5 bg-[#111827] p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-[11px] text-muted uppercase font-semibold tracking-wider">{t('progress.streak')}</p>
                  <p className="text-base font-bold mt-1 text-orange-400">🔥 {summary.currentStreak} {t('dashboard.daysCount', { count: summary.currentStreak })}</p>
                </div>
              </div>

              {/* Total Sessions Card */}
              <div className="rounded-2xl border border-white/5 bg-[#111827] p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <p className="text-[11px] text-muted uppercase font-semibold tracking-wider">{t('progress.sessions')}</p>
                  <p className="text-base font-bold mt-1 text-text">{summary.totalSessions}</p>
                </div>
              </div>
            </div>

            {/* Practice Analytics Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Practice Sessions Completed */}
              <div className="rounded-2xl border border-white/5 bg-[#111827] p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[11px] text-muted uppercase font-semibold tracking-wider">{t('progress.practiceSessions')}</p>
                  <p className="text-base font-bold mt-1 text-text">{summary.practiceSessionsCount || 0}</p>
                </div>
              </div>

              {/* Questions Answered */}
              <div className="rounded-2xl border border-white/5 bg-[#111827] p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-[11px] text-muted uppercase font-semibold tracking-wider">{t('progress.questionsAnswered')}</p>
                  <p className="text-base font-bold mt-1 text-text">{summary.questionsAnsweredCount || 0}</p>
                </div>
              </div>

              {/* Recent Accuracy */}
              <div className="rounded-2xl border border-white/5 bg-[#111827] p-4 flex items-start gap-3 sm:col-span-2 lg:col-span-1">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] text-muted uppercase font-semibold tracking-wider">{t('progress.recentAccuracy')}</p>
                  <p className="text-base font-bold mt-1 text-emerald-400">
                    {summary.recentAccuracy !== null ? `${summary.recentAccuracy}%` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Plan Progress Card */}
            {plan ? (
              <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 md:p-6">
                <h3 className="text-sm font-semibold text-text uppercase tracking-wider text-muted mb-4">{t('progress.planProgress')}</h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text">{plan.title}</span>
                  <span className="text-sm font-semibold text-text">{summary.completionRate}%</span>
                </div>
                <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${summary.completionRate}%` }}
                  />
                </div>
                <p className="text-xs text-muted mt-2">{t('progress.tasksCompletedRatio', { completed: summary.completedTasks, total: summary.totalTasks })}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 text-center select-none">
                <h3 className="text-sm font-semibold text-muted mb-2">{t('progress.noActivePlan')}</h3>
                <Link to="/dashboard" className="text-xs text-primary hover:text-primary-hover font-medium cursor-pointer">
                  {t('progress.createPlanToTrack')}
                </Link>
              </div>
            )}

            {/* Subject Focus & Learning Consistency Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Subject Focus */}
              <div className="rounded-2xl border border-white/5 bg-[#111827] p-5">
                <h3 className="text-xs font-semibold text-text uppercase tracking-wider text-muted mb-3">{t('progress.subjectFocus')}</h3>
                {(() => {
                  if (subjects.length === 0) {
                    return <p className="text-sm text-muted">Building your study history...</p>;
                  }
                  const maxSub = [...subjects].sort((a, b) => b.studyMinutes - a.studyMinutes)[0];
                  if (!maxSub || maxSub.studyMinutes === 0) {
                    return <p className="text-sm text-muted">{t('progress.noActivity')}</p>;
                  }

                  const hrs = Math.floor(maxSub.studyMinutes / 60);
                  const mins = maxSub.studyMinutes % 60;
                  const timeLabel = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

                  return (
                    <div>
                      <p className="text-sm font-semibold text-text">{t('progress.mostStudied')}</p>
                      <p className="text-xl font-bold text-primary mt-1">{maxSub.subject}</p>
                      <p className="text-xs text-muted mt-1">{t('progress.timeStudied', { time: timeLabel })}</p>
                    </div>
                  );
                })()}
              </div>

              {/* Learning Consistency */}
              <div className="rounded-2xl border border-white/5 bg-[#111827] p-5">
                <h3 className="text-xs font-semibold text-text uppercase tracking-wider text-muted mb-3">{t('progress.learningConsistency')}</h3>
                {(() => {
                  if (!plan || !plan.startDate || activity.length === 0) {
                    return <p className="text-sm text-muted">{t('progress.noActivity')}</p>;
                  }

                  const startMs = new Date(plan.startDate).getTime();
                  const diffDays = Math.ceil((Date.now() - startMs) / (1000 * 60 * 60 * 24));

                  if (diffDays < 3) {
                    return <p className="text-sm text-muted">{t('progress.noActivity')}</p>;
                  }

                  const studyDays = activity.filter(a => a.studyMinutes > 0).length;
                  const consistency = Math.round((studyDays / diffDays) * 100);

                  return (
                    <div>
                      <p className="text-sm font-semibold text-text">{t('progress.activityRatio')}</p>
                      <p className="text-xl font-bold text-emerald-400 mt-1">{consistency}%</p>
                      <p className="text-xs text-muted mt-1">{t('progress.daysActiveRatio', { active: studyDays, total: diffDays })}</p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 3. Subject Breakdown Card */}
            <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 md:p-6">
              <h3 className="text-sm font-semibold text-text uppercase tracking-wider text-muted mb-4">{t('progress.studyBySubject')}</h3>
              {subjects.length === 0 ? (
                <p className="text-sm text-muted/50 py-4">{t('progress.noSubjectActivity')}</p>
              ) : (
                <div className="space-y-4">
                  {subjects.map((subObj) => {
                    // Normalize relative bar percentages against the highest time studied
                    const maxMins = Math.max(...subjects.map((s) => s.studyMinutes), 1);
                    const widthPct = Math.max(5, Math.min(100, (subObj.studyMinutes / maxMins) * 100));

                    return (
                      <div key={subObj.subject} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-text">{subObj.subject}</span>
                          <span className="text-muted">{subObj.studyMinutes} min</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/75"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-muted w-12 text-right font-medium">
                            {t('progress.tasksDoneCount', { count: subObj.completedTasks })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Learning Areas (Knowledge Mapping Shortcut) */}
            {knowledgeSubjects && knowledgeSubjects.length > 0 && (
              <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 md:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text uppercase tracking-wider text-muted">{t('progress.learningAreas')}</h3>
                  <Link
                    to="/knowledge"
                    className="text-xs text-primary hover:text-primary-hover font-semibold transition-colors cursor-pointer"
                  >
                    {t('progress.viewMap')}
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {knowledgeSubjects.map((kb) => (
                    <div key={kb.subject} className="p-3 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between">
                      <p className="text-xs font-semibold text-text truncate">{kb.subject}</p>
                      <p className="text-[11px] text-muted mt-1">
                        {t('progress.topicsTracked', { count: kb.topics })}
                        {kb.needsReview > 0 && ` (${kb.needsReview} ${t('progress.needsReview')})`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Heatmap Activity Grid Chart */}
            <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 md:p-6">
              <h3 className="text-sm font-semibold text-text uppercase tracking-wider text-muted mb-4">{t('progress.studyActivity')}</h3>
              
              {/* Activity Grid cells */}
              <div className="flex flex-wrap gap-2 py-2">
                {heatmapCells.map((cell) => {
                  let cellBg = 'bg-white/[0.03] border-white/5';
                  if (cell.minutes > 0 && cell.minutes <= 20) {
                    cellBg = 'bg-primary/20 border-primary/30';
                  } else if (cell.minutes > 20 && cell.minutes <= 45) {
                    cellBg = 'bg-primary/50 border-primary/60';
                  } else if (cell.minutes > 45) {
                    cellBg = 'bg-primary border-primary';
                  }

                  const loc = i18n.language === 'uz' ? 'uz-UZ' : i18n.language === 'ru' ? 'ru-RU' : 'en-US';
                  const formattedTip = `${cell.date.toLocaleDateString(loc, { month: 'short', day: 'numeric' })}: ${cell.minutes} min`;

                  return (
                    <div
                      key={cell.dateStr}
                      className={`w-6 h-6 rounded-md border transition-colors cursor-help shrink-0`}
                      style={{ contentVisibility: 'auto' }}
                      title={formattedTip}
                    >
                      <div className={`w-full h-full rounded-[4px] ${cellBg}`} />
                    </div>
                  );
                })}
              </div>

              {/* Heatmap Legend */}
              <div className="flex items-center justify-between mt-4 text-[10px] text-muted">
                <span>{t('progress.daysAgo30')}</span>
                <div className="flex items-center gap-1.5 select-none">
                  <span>{t('progress.less')}</span>
                  <div className="w-2.5 h-2.5 rounded bg-white/[0.03] border border-white/5" />
                  <div className="w-2.5 h-2.5 rounded bg-primary/20 border border-primary/30" />
                  <div className="w-2.5 h-2.5 rounded bg-primary/50 border border-primary/60" />
                  <div className="w-2.5 h-2.5 rounded bg-primary border border-primary" />
                  <span>{t('progress.more')}</span>
                </div>
                <span>{t('progress.today')}</span>
              </div>
            </div>

            {/* 5. Recent Activity List */}
            <div className="rounded-2xl border border-white/5 bg-[#111827] p-5 md:p-6">
              <h3 className="text-sm font-semibold text-text uppercase tracking-wider text-muted mb-4">{t('progress.recentActivity')}</h3>
              {summary.recentSessions.length === 0 ? (
                <p className="text-sm text-muted/50 py-4">{t('progress.noRecentSessions')}</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {summary.recentSessions.map((session) => (
                    <div key={session.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4 text-muted" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text">{session.subject}</p>
                          <p className="text-xs text-muted mt-0.5">{t('progress.minStudied', { minutes: session.durationMinutes })}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted font-medium">
                        {formatActivityDate(session.completedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default Progress;
