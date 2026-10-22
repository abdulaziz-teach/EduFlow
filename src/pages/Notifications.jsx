import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  ArrowLeft,
  Trash2,
  Check,
  BellRing,
  Settings2,
  Trophy,
  Flame,
  Sparkles,
  BookOpen,
  Clock,
  ShieldAlert,
  Layers,
  ChevronLeft,
  ChevronRight,
  Moon,
  Volume2,
  VolumeX,
  X,
  Sliders,
} from 'lucide-react';
import notificationsService from '../services/notifications';

function getCategoryIcon(type) {
  const t = String(type).toUpperCase();
  if (t.includes('ACHIEVEMENT') || t.includes('WALLET')) {
    return <Trophy className="w-4 h-4 text-amber-400" />;
  }
  if (t.includes('STREAK')) {
    return <Flame className="w-4 h-4 text-orange-400" />;
  }
  if (t.includes('INSIGHT') || t.includes('RECOMMENDATION') || t.includes('REVIEW_RECOMMENDATION')) {
    return <Sparkles className="w-4 h-4 text-purple-400" />;
  }
  if (t.includes('COURSE')) {
    return <BookOpen className="w-4 h-4 text-blue-400" />;
  }
  if (t.includes('FLASHCARD')) {
    return <Layers className="w-4 h-4 text-emerald-400" />;
  }
  if (t.includes('SECURITY') || t.includes('SYSTEM')) {
    return <ShieldAlert className="w-4 h-4 text-rose-400" />;
  }
  return <Clock className="w-4 h-4 text-primary" />;
}

function Notifications() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Preferences panel state
  const [showPreferences, setShowPreferences] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    enabled: true,
    dailyPlan: true,
    streaks: true,
    quizReminders: true,
    flashcardReminders: true,
    achievements: true,
    recommendations: true,
    aiInsights: true,
    courseProgress: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: 'UTC',
    },
  });

  const categoryFilters = [
    { id: 'all', label: t('notifications.filters.all') || 'All' },
    { id: 'dailyplan', label: t('notifications.filters.dailyplan') || 'Daily Plans' },
    { id: 'streaks', label: t('notifications.filters.streaks') || 'Streaks' },
    { id: 'quizzes', label: t('notifications.filters.quizzes') || 'Quizzes & Tasks' },
    { id: 'flashcards', label: t('notifications.filters.flashcards') || 'Flashcards' },
    { id: 'achievements', label: t('notifications.filters.achievements') || 'Achievements' },
    { id: 'recommendations', label: t('notifications.filters.recommendations') || 'Recommendations' },
    { id: 'system', label: t('notifications.filters.system') || 'System' },
  ];

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: 15,
        unreadOnly: unreadOnly ? true : undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
      };

      const res = await notificationsService.getNotifications(params);
      const data = res.data || res;
      setNotifications(data.notifications || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || (data.notifications || []).length);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      setError(t('notifications.fetchError') || 'Failed to load notifications list.');
    } finally {
      setLoading(false);
    }
  }, [page, selectedCategory, unreadOnly, t]);

  const fetchPreferences = async () => {
    try {
      const res = await notificationsService.getPreferences();
      const pref = res.data?.preferences || res.preferences;
      if (pref) {
        setPreferences((prev) => ({
          ...prev,
          ...pref,
          quietHours: {
            ...prev.quietHours,
            ...(pref.quietHours || {}),
          },
        }));
      }
    } catch (err) {
      console.error('Failed to load preferences:', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        await notificationsService.markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true, readAt: new Date() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark read:', err.message);
      }
    }
    if (notif.link && typeof notif.link === 'string' && notif.link.startsWith('/')) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date() })));
      setUnreadCount(0);
    } catch (err) {
      setError(t('notifications.markAllError') || 'Failed to mark all notifications as read.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError(t('notifications.deleteError') || 'Failed to delete notification.');
    }
  };

  const handleSavePreferences = async (updated) => {
    setPreferences(updated);
    setSavingPreferences(true);
    try {
      await notificationsService.updatePreferences(updated);
    } catch (err) {
      console.error('Failed to update preferences:', err.message);
    } finally {
      setSavingPreferences(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const localeMap = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };
    return new Date(dateStr).toLocaleString(localeMap[i18n.language] || 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-[#0B0F19] min-h-screen text-text">
      <div className="max-w-4xl mx-auto space-y-6 font-sans">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors cursor-pointer select-none"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.dashboard')}
          </button>

          <button
            onClick={() => setShowPreferences(!showPreferences)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-xs font-semibold text-text transition-all cursor-pointer"
          >
            <Settings2 className="w-4 h-4 text-primary" />
            {t('notifications.prefsTitle')}
          </button>
        </div>

        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none border-b border-white/5 pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text mb-1 flex items-center gap-2.5">
              <BellRing className="w-7 h-7 text-primary shrink-0" />
              <span>{t('notifications.title')}</span>
            </h1>
            <p className="text-xs text-muted">
              {t('notifications.subtitle') || 'Personalized learning updates, streak check-ins, and study milestones.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {t('notifications.markAllRead')} ({unreadCount})
              </button>
            )}
          </div>
        </div>

        {/* Preferences Drawer / Modal */}
        {showPreferences && (
          <div className="p-4 sm:p-6 rounded-2xl border border-white/10 bg-[#111827] space-y-6 animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-text">{t('notifications.prefsTitle')}</h3>
                {savingPreferences && (
                  <span className="text-[11px] text-primary flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> {t('common.saving')}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowPreferences(false)}
                className="p-1 rounded-lg text-muted hover:text-text hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Global toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="pr-2">
                <p className="text-sm font-semibold text-text">{t('notifications.enableAll') || 'Enable Notifications'}</p>
                <p className="text-xs text-muted">{t('notifications.enableAllDesc') || 'Master switch for all non-critical learning notifications'}</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.enabled}
                onChange={(e) =>
                  handleSavePreferences({ ...preferences, enabled: e.target.checked })
                }
                className="w-5 h-5 rounded accent-primary cursor-pointer shrink-0"
              />
            </div>

            {/* Category toggles grid */}
            <div>
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                {t('notifications.learningCategories') || 'Learning Categories'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { key: 'dailyPlan', label: 'Daily Study Plans', desc: 'Tasks & agenda reminders' },
                  { key: 'streaks', label: 'Streak Reminders', desc: 'Supportive momentum check-ins' },
                  { key: 'quizReminders', label: 'Quiz Reminders', desc: 'Pending quizzes and practice' },
                  { key: 'flashcardReminders', label: 'Flashcard Reviews', desc: 'Spaced repetition alerts' },
                  { key: 'achievements', label: 'Achievements & Badges', desc: 'Milestones and rewards' },
                  { key: 'recommendations', label: 'Study Recommendations', desc: 'Weak topic mastery tips' },
                  { key: 'aiInsights', label: 'AI Mentor Insights', desc: 'Velocity and performance analysis' },
                  { key: 'courseProgress', label: 'Course Milestones', desc: 'Progress celebration checkpoints' },
                ].map(({ key, label, desc }) => (
                  <label
                    key={key}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 cursor-pointer transition-all"
                  >
                    <div className="pr-2">
                      <p className="text-xs font-semibold text-text">{label}</p>
                      <p className="text-[11px] text-muted">{desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!preferences.enabled}
                      checked={preferences[key] !== false}
                      onChange={(e) =>
                        handleSavePreferences({
                          ...preferences,
                          [key]: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded accent-primary cursor-pointer disabled:opacity-40 shrink-0"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 pr-2">
                  <Moon className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-text">{t('notifications.quietHours') || 'Quiet Hours (Do Not Disturb)'}</p>
                    <p className="text-[11px] text-muted">
                      {t('notifications.quietHoursDesc') || 'Defer non-urgent notifications during rest hours'}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={!preferences.enabled}
                  checked={preferences.quietHours?.enabled}
                  onChange={(e) =>
                    handleSavePreferences({
                      ...preferences,
                      quietHours: {
                        ...preferences.quietHours,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded accent-primary cursor-pointer disabled:opacity-40 shrink-0"
                />
              </div>

              {preferences.quietHours?.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] text-muted block mb-1">{t('notifications.startTime') || 'Start Time'}</label>
                    <input
                      type="time"
                      value={preferences.quietHours.start || '22:00'}
                      onChange={(e) =>
                        handleSavePreferences({
                          ...preferences,
                          quietHours: {
                            ...preferences.quietHours,
                            start: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-text focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted block mb-1">{t('notifications.endTime') || 'End Time'}</label>
                    <input
                      type="time"
                      value={preferences.quietHours.end || '08:00'}
                      onChange={(e) =>
                        handleSavePreferences({
                          ...preferences,
                          quietHours: {
                            ...preferences.quietHours,
                            end: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-text focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted block mb-1">{t('notifications.timezone') || 'Timezone'}</label>
                    <input
                      type="text"
                      readOnly
                      value={preferences.quietHours.timezone || 'UTC'}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 text-xs text-muted cursor-default"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex items-center gap-1.5">
              {categoryFilters.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white/[0.02] border border-white/5 text-muted hover:text-text hover:bg-white/[0.05]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setUnreadOnly(!unreadOnly);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                unreadOnly
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-white/[0.02] border-white/5 text-muted hover:text-text'
              }`}
            >
              {unreadOnly ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {t('notifications.unreadOnly')}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs md:text-sm text-rose-400 select-none">
            {error}
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-[#111827] p-12 sm:p-16 text-center max-w-md mx-auto select-none">
            <div className="w-14 h-14 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-4">
              <BellRing className="w-6 h-6 text-muted/40" />
            </div>
            <h3 className="text-base font-bold text-text mb-1">{t('notifications.noNotifications')}</h3>
            <p className="text-xs text-muted">
              {unreadOnly
                ? (t('notifications.noUnread') || 'You have no unread notifications in this category.')
                : (t('notifications.emptyDesc') || 'Updates and study reminders will appear here.')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                onClick={() => handleNotificationClick(notif)}
                className={`rounded-2xl border p-4 sm:p-5 flex gap-3 sm:gap-4 transition-all cursor-pointer hover:bg-white/[0.02] ${
                  !notif.read
                    ? 'border-primary/20 bg-primary/[0.02]'
                    : 'border-white/5 bg-[#111827]/40'
                }`}
              >
                {/* Category Icon */}
                <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center self-start mt-0.5">
                  {getCategoryIcon(notif.type)}
                </div>

                {/* Message Body */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 select-none">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.04] text-muted border border-white/5 capitalize">
                      {String(notif.type).replace(/_/g, ' ').toLowerCase()}
                    </span>

                    {notif.priority === 'urgent' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {t('notifications.urgent') || 'Urgent'}
                      </span>
                    )}

                    <span className="text-[11px] text-muted/60">{formatDate(notif.createdAt)}</span>
                  </div>

                  <h4
                    className={`text-sm font-bold leading-tight break-words ${
                      !notif.read ? 'text-primary-hover' : 'text-text'
                    }`}
                  >
                    {notif.title}
                  </h4>
                  <p className="text-xs md:text-sm text-muted text-left leading-relaxed break-words">
                    {notif.message}
                  </p>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2 self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notif._id);
                    }}
                    className="p-2 rounded-lg hover:bg-white/[0.06] text-muted/40 hover:text-rose-400 transition-all cursor-pointer"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/5">
                <p className="text-xs text-muted">
                  Page {page} of {totalPages} ({totalCount} total)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] text-xs font-semibold text-text disabled:opacity-30 hover:bg-white/[0.06] transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('common.previous')}
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] text-xs font-semibold text-text disabled:opacity-30 hover:bg-white/[0.06] transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {t('common.next')}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
