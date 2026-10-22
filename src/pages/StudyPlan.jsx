import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  BookOpen,
  Brain,
  Sparkles,
  ArrowLeft,
  Download,
} from 'lucide-react';
import studyPlanService from '../services/studyPlan';
import studySessionService from '../services/studySession';
import AdaptPlanButton from '../components/study-plan/AdaptPlanButton';

const TYPE_COLORS = {
  learning: 'bg-primary/10 text-primary',
  practice: 'bg-emerald-500/10 text-emerald-400',
  revision: 'bg-sky-500/10 text-sky-400',
  quiz: 'bg-orange-500/10 text-orange-400',
};

const LOADING_STEP_KEYS = ['dashboard.loadingGoals', 'dashboard.loadingSessions', 'dashboard.balancingWorkload'];

function StudyPlan() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [togglingTask, setTogglingTask] = useState(null);
  const [error, setError] = useState('');

  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [filter, setFilter] = useState('All');

  // Intercept state parameters from Dashboard redirects
  useEffect(() => {
    if (location.state) {
      if (location.state.filter) {
        setFilter(location.state.filter);
      }
      if (location.state.startTaskId && plan) {
        handleStartSession(location.state.startTaskId);
        // Clear history state to prevent starting session repeatedly on back actions
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, plan]);

  const fetchPlan = useCallback(async () => {
    try {
      const data = await studyPlanService.getCurrent();
      setPlan(data.plan);

      // Recover active session
      const sessData = await studySessionService.getActiveSession();
      setActiveSession(sessData.session);
    } catch {
      // no plan or session fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // Animate loading steps
  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setGenStep((prev) => (prev + 1) % LOADING_STEP_KEYS.length);
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
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportICS = async () => {
    if (!plan?._id) return;
    try {
      const token = localStorage.getItem('eduflow_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiUrl}/study-plans/${plan._id}/export-ics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to export calendar');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eduflow-study-plan.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError('Failed to export calendar');
    }
  };

  // Study session timer interval
  useEffect(() => {
    if (!activeSession) return;

    const updateTimer = () => {
      const ms = Date.now() - new Date(activeSession.startedAt).getTime();
      setElapsed(Math.max(0, Math.floor(ms / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleStartSession = async (taskId) => {
    try {
      const data = await studySessionService.startSession(plan._id, taskId);
      setActiveSession(data.session);
    } catch (err) {
      alert(err.message || 'Failed to start study session.');
    }
  };

  const handleFinishSession = async () => {
    if (!activeSession) return;
    try {
      const data = await studySessionService.completeSession(activeSession.id);
      
      // Auto complete the task in the study plan
      await studyPlanService.completeTask(plan._id, activeSession.taskId);
      
      await fetchPlan();
      setActiveSession(null);
    } catch (err) {
      alert(err.message || 'Failed to complete study session.');
    }
  };

  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleToggleTask = async (taskId) => {
    if (!plan || togglingTask) return;
    setTogglingTask(taskId);
    try {
      const data = await studyPlanService.completeTask(plan._id, taskId);
      setPlan(data.plan);
    } catch {
      // silently fail — task state unchanged
    } finally {
      setTogglingTask(null);
    }
  };

  const getCategorizedTasks = () => {
    const categories = {
      Overdue: [],
      Today: [],
      Upcoming: [],
      Completed: [],
    };

    if (!plan || !plan.days) return categories;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    plan.days.forEach((day) => {
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);

      day.tasks.forEach((task) => {
        const taskWithMeta = {
          ...task,
          dayDate: day.date,
          dayNumber: day.dayNumber,
        };

        if (task.completed) {
          categories.Completed.push(taskWithMeta);
        } else if (dayDate.getTime() < today.getTime()) {
          categories.Overdue.push(taskWithMeta);
        } else if (dayDate.getTime() === today.getTime()) {
          categories.Today.push(taskWithMeta);
        } else {
          categories.Upcoming.push(taskWithMeta);
        }
      });
    });

    return categories;
  };

  const categorizedTasks = getCategorizedTasks();

  // Calculate progress
  const totalTasks = plan?.days?.reduce((sum, d) => sum + d.tasks.length, 0) || 0;
  const completedTasks = plan?.days?.reduce(
    (sum, d) => sum + d.tasks.filter((t) => t.completed).length,
    0
  ) || 0;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Empty state
  if (!plan && !generating) {
    return (
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 min-w-0">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text mb-3">{t('studyPlan.noPlanTitle')}</h1>
          <p className="text-muted mb-8 leading-relaxed">
            {t('studyPlan.noPlanSubtitle')}
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all cursor-pointer shadow-lg shadow-primary/20"
          >
            <Sparkles className="w-4 h-4" />
            {t('studyPlan.createPlan')}
          </button>
        </div>
      </div>
    );
  }

  // Generating state
  if (generating) {
    return (
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 min-w-0">
        <div className="max-w-md mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <h2 className="text-lg font-semibold text-text mb-2">{t('studyPlan.creatingPlan')}</h2>
          <div className="space-y-2 mt-6 max-w-xs mx-auto">
            {LOADING_STEP_KEYS.map((key, i) => (
              <div
                key={key}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-lg transition-all duration-500 ${
                  i === genStep ? 'bg-primary/5 border border-primary/20' : i < genStep ? 'opacity-50' : 'opacity-30'
                }`}
              >
                {i < genStep ? (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                ) : i === genStep ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-subtle shrink-0" />
                )}
                <span className="text-sm text-muted">{t(key)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Plan view
  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('nav.dashboard')}
        </button>

        {/* Header */}
        <div className="mb-8 flex min-w-0 flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-text mb-1">{plan.title}</h1>
            <p className="text-sm font-medium text-primary mb-1">{t('studyPlan.personalizedRoadmap')}</p>
            <p className="text-xs text-muted mb-3">{t('studyPlan.ruleBased')}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted mb-4">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {t('studyPlan.dailySchedule', { minutes: plan.dailyMinutes })}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                {plan.totalDays} days
              </span>
              {plan.adaptation?.lastAdaptedAt && (
                <span className="text-xs text-muted font-medium">
                  {t('studyPlan.lastAdjusted', { date: new Date(plan.adaptation.lastAdaptedAt).toLocaleDateString(i18n.resolvedLanguage) })}
                </span>
              )}
            </div>
            <p className="text-sm text-muted leading-relaxed">{plan.summary}</p>
          </div>
          <div className="w-full min-w-0 pt-1 flex flex-wrap items-center gap-2 md:w-auto md:shrink-0">
            <button
              onClick={handleExportICS}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-subtle bg-white/[0.03] hover:bg-white/[0.06] text-muted hover:text-text transition-colors cursor-pointer"
              title={t('studyPlan.exportCalendar')}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('studyPlan.exportCalendar')}</span>
            </button>
            <AdaptPlanButton
              planId={plan._id}
              plan={plan}
              onAdapted={async () => {
                await fetchPlan();
              }}
            />
          </div>
        </div>

        {/* Progress bar */}
        <div className="rounded-xl border border-subtle bg-card p-4 md:p-5 mb-8">
          <h3 className="text-sm font-medium text-text mb-3">{t('studyPlan.planProgress')}</h3>
          <div className="flex items-center gap-4 mb-2">
            <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-text shrink-0">{progressPct}%</span>
          </div>
          <p className="text-xs text-muted">{t('studyPlan.tasksCompletedCount', { completed: completedTasks, total: totalTasks })}</p>
          {plan.breakMinutes > 0 && (
            <p className="text-xs text-muted mt-2">{t('studyPlan.takeBreak', { minutes: plan.breakMinutes })}</p>
          )}
        </div>

        {/* Category Filters Tabs */}
        <div className="flex w-full min-w-0 max-w-full items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-white/[0.04] scrollbar-none select-none">
          {['All', 'Today', 'Upcoming', 'Completed', 'Overdue'].map((tab) => {
            const count = tab === 'All'
              ? totalTasks
              : categorizedTasks[tab]?.length || 0;

            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                  filter === tab
                    ? 'bg-primary text-white shadow shadow-primary/20'
                    : 'bg-white/5 border border-subtle text-muted hover:text-text hover:bg-white/10'
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        {/* Categorized Tasks List */}
        <div className="space-y-8">
          {(() => {
            const groupsToRender = filter === 'All'
              ? ['Overdue', 'Today', 'Upcoming', 'Completed']
              : [filter];

            const TYPE_BORDER_COLORS = {
              learning: 'border-l-primary',
              practice: 'border-l-emerald-500',
              revision: 'border-l-sky-500',
              quiz: 'border-l-orange-500',
            };

            const CATEGORY_DETAILS = {
              Overdue: { title: 'Overdue Tasks', desc: 'Incomplete tasks from previous days.', color: 'text-rose-400', icon: '⚠️' },
              Today: { title: 'Today\'s Work', desc: 'Planned tasks for today. Focus on consistency!', color: 'text-primary', icon: '📅' },
              Upcoming: { title: 'Upcoming Roadmap', desc: 'Work planned for future dates.', color: 'text-muted', icon: '🚀' },
              Completed: { title: 'Completed Items', desc: 'Great job staying on track!', color: 'text-emerald-400', icon: '✓' },
            };

            let renderedAny = false;

            const renderedBlocks = groupsToRender.map((catKey) => {
              const tasks = categorizedTasks[catKey] || [];
              if (tasks.length === 0) return null;

              renderedAny = true;

              return (
                <div key={catKey} className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{CATEGORY_DETAILS[catKey].icon}</span>
                      <h3 className={`text-base font-bold ${CATEGORY_DETAILS[catKey].color}`}>
                        {CATEGORY_DETAILS[catKey].title}
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-white/5 border border-subtle text-muted rounded-full">
                        {tasks.length}
                      </span>
                    </div>
                    <p className="text-xs text-muted">{CATEGORY_DETAILS[catKey].desc}</p>
                  </div>

                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div
                        key={task._id}
                        className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-subtle border-l-4 transition-all ${
                          TYPE_BORDER_COLORS[task.type] || 'border-l-transparent'
                        } ${
                          task.completed
                            ? 'bg-white/[0.01] border-subtle/50'
                            : 'bg-white/[0.02] border-subtle hover:border-white/5'
                        }`}
                      >
                        {/* Left: Task Info */}
                        <div className="flex-1 flex items-start gap-3 min-w-0">
                          {/* Checkbox */}
                          <div
                            onClick={() => {
                              if (!activeSession || activeSession.taskId === task._id) {
                                handleToggleTask(task._id);
                              }
                            }}
                            className={`mt-0.5 shrink-0 select-none text-base leading-none font-medium cursor-pointer ${togglingTask === task._id ? 'pointer-events-none opacity-60' : ''}`}
                          >
                            {togglingTask === task._id ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : task.completed ? (
                              <span className="text-emerald-400">✓</span>
                            ) : (
                              <span className="text-muted/40">○</span>
                            )}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm truncate ${task.completed ? 'text-muted line-through' : 'text-text'}`}>
                              {task.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-xs text-muted font-sans">
                                {task.subject} &middot; {task.duration} min &middot; Day {task.dayNumber}
                              </span>
                              {activeSession && activeSession.taskId === task._id && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
                                  Studying &middot; {formatTime(elapsed)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {!task.completed && (
                            activeSession && activeSession.taskId === task._id ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFinishSession();
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer shadow shadow-emerald-500/20"
                              >
                                Finish session
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartSession(task._id);
                                }}
                                disabled={!!activeSession}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-primary hover:bg-primary-hover text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow shadow-primary/20"
                              >
                                Start studying
                              </button>
                            )
                          )}

                          {!task.completed && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const cleanTopic = task.title
                                  .replace(/^(study|review|practice|solve|revise|complete|read|write|learn)\s+/i, '')
                                  .replace(/^(key concepts of|problems on|problems for|notes for|introduction to|basics of|principles of|concept of)\s+/i, '')
                                  .trim()
                                  .replace(/\b\w/g, (c) => c.toUpperCase());
                                navigate(`/practice?subject=${encodeURIComponent(task.subject)}&topic=${encodeURIComponent(cleanTopic)}`);
                              }}
                              className="px-2.5 py-1 text-xs font-medium rounded bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/25 hover:text-white transition-all cursor-pointer"
                            >
                              Practice
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/mentor', {
                                state: {
                                  prefillMessage: `Help me with today's ${task.subject} task: ${task.title}.`,
                                  subject: task.subject,
                                },
                              });
                            }}
                            className="px-2.5 py-1 text-xs font-medium rounded bg-white/5 border border-subtle text-muted hover:text-text hover:bg-white/10 transition-all cursor-pointer"
                          >
                            Ask Mentor
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            });

            if (!renderedAny) {
              return (
                <div className="text-center py-12 rounded-2xl border border-dashed border-subtle bg-white/[0.01]">
                  <p className="text-sm text-muted">No tasks found matching this category.</p>
                </div>
              );
            }

            return renderedBlocks;
          })()}
        </div>
      </div>
    </div>
  );
}

export default StudyPlan;
