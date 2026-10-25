import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  User,
  Mail,
  BookOpen,
  Target,
  Clock,
  Pencil,
  X,
  Check,
  Loader2,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/auth';
import notificationsService from '../services/notifications';
import AchievementCard from '../components/achievements/AchievementCard';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';

const ALL_SUBJECTS = [
  'Mathematics', 'English', 'Physics', 'Biology',
  'Chemistry', 'History', 'Computer Science', 'Other',
];

const TIME_OPTIONS = [
  { value: 30, key: '30Minutes' },
  { value: 60, key: '1Hour' },
  { value: 120, key: '2Hours' },
  { value: 180, key: '3PlusHours' },
];

function Profile() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Notification and Achievement States
  const [preferences, setPreferences] = useState(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [loadingAch, setLoadingAch] = useState(true);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const data = await notificationsService.getPreferences();
        setPreferences(data.preferences);
      } catch (err) {
        console.error('Failed to load notification preferences:', err.message);
      } finally {
        setLoadingPrefs(false);
      }
    };

    const fetchAchievements = async () => {
      try {
        const data = await notificationsService.getAchievements();
        setUnlockedAchievements(data.unlocked || []);
      } catch (err) {
        console.error('Failed to load achievements:', err.message);
      } finally {
        setLoadingAch(false);
      }
    };

    fetchPrefs();
    fetchAchievements();
  }, []);

  const handleTogglePreference = async (field) => {
    if (!preferences) return;
    const updated = { ...preferences, [field]: !preferences[field] };
    setPreferences(updated);
    try {
      await notificationsService.updatePreferences({ [field]: updated[field] });
    } catch (err) {
      setError(t('profile.notifications.saveError'));
    }
  };

  const [form, setForm] = useState({
    name: user?.name || '',
    subjects: user?.subjects || [],
    goalType: user?.goal?.type || '',
    goalDescription: user?.goal?.description || '',
    dailyStudyMinutes: user?.dailyStudyMinutes || null,
    age: user?.age ?? '',
  });

  const startEdit = () => {
    setForm({
      name: user?.name || '',
      subjects: user?.subjects || [],
      goalType: user?.goal?.type || '',
      goalDescription: user?.goal?.description || '',
      dailyStudyMinutes: user?.dailyStudyMinutes || null,
      age: user?.age ?? '',
    });
    setEditing(true);
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
  };

  const toggleSubject = (s) => {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(s)
        ? prev.subjects.filter((x) => x !== s)
        : [...prev.subjects, s],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError(t('auth.fillAllFields'));
      return;
    }
    if (form.age !== '' && (!Number.isInteger(Number(form.age)) || Number(form.age) < 6 || Number(form.age) > 30)) {
      setError(t('profile.ageInvalid'));
      return;
    }

    setSaving(true);
    setError('');

    try {
      await authService.updateMe({
        name: form.name.trim(),
        subjects: form.subjects,
        goal: {
          type: form.goalType,
          description: form.goalDescription,
        },
        dailyStudyMinutes: form.dailyStudyMinutes,
        age: form.age === '' ? null : Number(form.age),
      });
      await refreshUser();
      setEditing(false);
      setSuccess(t('profile.planPreferencesChanged'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const goalLabel =
    user?.goal?.description ||
    (user?.goal?.type ? t(`onboarding.goals.${user.goal.type}.label`) : t('profile.notProvided'));

  const selectedTimeOption = TIME_OPTIONS.find((option) => option.value === user?.dailyStudyMinutes);
  const studyTimeLabel = user?.dailyStudyMinutes
    ? selectedTimeOption
      ? t(`profile.timeOptions.${selectedTimeOption.key}`)
      : t('profile.minutesValue', { count: user.dailyStudyMinutes })
    : t('profile.notProvided');

  const formatSubject = (subject) => {
    const key = subject.replace(/\s+/g, '').replace(/^[A-Z]/, (letter) => letter.toLowerCase());
    return t(`onboarding.subjectNames.${key}`, { defaultValue: subject });
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text">{t('profile.title')}</h1>
            <p className="text-sm text-muted mt-1">{t('profile.subtitle')}</p>
          </div>
          {!editing ? (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-subtle text-sm text-muted hover:text-text transition-all cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
              {t('profile.edit')}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-subtle text-sm text-muted hover:text-text transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-primary/20"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
            <p>{success}</p>
            <Link to="/study-plan" className="inline-block mt-2 underline underline-offset-2">
              {t('studyPlan.title')}
            </Link>
          </div>
        )}

        {/* Personal info & Preferences */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 space-y-6">
          {/* Name */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted mb-1">{t('auth.fullName')}</p>
              {editing ? (
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-dark border border-subtle text-sm text-text outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              ) : (
                <p className="text-sm font-medium text-text">{user?.name}</p>
              )}
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="w-5 h-5 text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted mb-1">{t('auth.email')}</p>
              <p className="text-sm font-medium text-text break-all">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-fuchsia-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-5 h-5 text-fuchsia-400" />
            </div>
            <div className="flex-1 min-w-0">
              <label htmlFor="profile-age" className="block text-xs text-muted mb-1">{t('profile.age')}</label>
              {editing ? (
                <input
                  id="profile-age"
                  type="number"
                  inputMode="numeric"
                  min="6"
                  max="30"
                  step="1"
                  value={form.age}
                  onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))}
                  className="w-full sm:max-w-xs px-3 py-2 rounded-lg bg-dark border border-subtle text-sm text-text outline-none focus:border-primary"
                />
              ) : (
                <p className="text-sm font-medium text-text">{user?.age ?? t('profile.notProvided')}</p>
              )}
            </div>
          </div>

          <div className="border-t border-subtle" />

          {/* Subjects */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted mb-1.5">{t('onboarding.step1Title')}</p>
              {editing ? (
                <div className="flex flex-wrap gap-2">
                  {ALL_SUBJECTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleSubject(s)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer ${
                        form.subjects.includes(s)
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-subtle bg-white/[0.02] text-muted hover:text-text'
                      }`}
                    >
                      {formatSubject(s)}
                    </button>
                  ))}
                </div>
              ) : user?.subjects?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {user.subjects.map((s) => (
                    <span key={s} className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-white/5 border border-subtle text-text">
                      {formatSubject(s)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">{t('profile.notProvided')}</p>
              )}
            </div>
          </div>

          {/* Goal */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Target className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted mb-1">{t('onboarding.step2Title')}</p>
              {editing ? (
                <input
                  type="text"
                  value={form.goalDescription}
                  onChange={(e) => setForm((p) => ({ ...p, goalDescription: e.target.value }))}
                  placeholder={t('profile.goalPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg bg-dark border border-subtle text-sm text-text placeholder:text-muted/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              ) : (
                <p className="text-sm font-medium text-text">{goalLabel}</p>
              )}
            </div>
          </div>

          {/* Daily study time */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted mb-1.5">{t('onboarding.step3Title')}</p>
              {editing ? (
                <div className="flex flex-wrap gap-2">
                  {TIME_OPTIONS.map((tOpt) => (
                    <button
                      key={tOpt.value}
                      onClick={() => setForm((p) => ({ ...p, dailyStudyMinutes: tOpt.value }))}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer ${
                        form.dailyStudyMinutes === tOpt.value
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-subtle bg-white/[0.02] text-muted hover:text-text'
                      }`}
                    >
                      {tOpt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-text">{studyTimeLabel}</p>
              )}
            </div>
          </div>
        </div>

        {/* Language Selection Card */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text">{t('profile.language')}</h3>
                <p className="text-xs text-muted">{t('profile.languageOptions')}</p>
              </div>
            </div>
            <LanguageSwitcher isMobile={false} />
          </div>
        </div>

        {/* Notification Settings Preferences Card */}
        {preferences && (
          <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mt-6 space-y-5 select-none">
            <div>
              <h3 className="text-sm font-bold text-text uppercase tracking-wider text-muted">
                🔔 {t('notifications.title')}
              </h3>
              <p className="text-xs text-muted mt-1">{t('profile.notifications.description')}</p>
            </div>

            <div className="space-y-3.5 divide-y divide-white/[0.04] pt-1">
              {/* Enabled Toggler */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-semibold text-text">{t('profile.notifications.enabled')}</p>
                  <p className="text-xs text-muted">{t('profile.notifications.enabledDescription')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.enabled}
                  onChange={() => handleTogglePreference('enabled')}
                  className="w-4 h-4 text-primary bg-dark border-subtle rounded focus:ring-primary/20 cursor-pointer"
                />
              </div>

              {/* Task Reminders */}
              <div className="flex items-center justify-between pt-3.5">
                <div>
                  <p className="text-sm font-semibold text-text">{t('profile.notifications.studyReminders')}</p>
                  <p className="text-xs text-muted">{t('profile.notifications.studyRemindersDescription')}</p>
                </div>
                <input
                  type="checkbox"
                  disabled={!preferences.enabled}
                  checked={preferences.taskReminders}
                  onChange={() => handleTogglePreference('taskReminders')}
                  className="w-4 h-4 text-primary bg-dark border-subtle rounded focus:ring-primary/20 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                />
              </div>

              {/* Review Recommendations */}
              <div className="flex items-center justify-between pt-3.5">
                <div>
                  <p className="text-sm font-semibold text-text">{t('profile.notifications.reviewRecommendations')}</p>
                  <p className="text-xs text-muted">{t('profile.notifications.reviewRecommendationsDescription')}</p>
                </div>
                <input
                  type="checkbox"
                  disabled={!preferences.enabled}
                  checked={preferences.reviewRecommendations}
                  onChange={() => handleTogglePreference('reviewRecommendations')}
                  className="w-4 h-4 text-primary bg-dark border-subtle rounded focus:ring-primary/20 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                />
              </div>

              {/* Practice Recommendations */}
              <div className="flex items-center justify-between pt-3.5">
                <div>
                  <p className="text-sm font-semibold text-text">{t('profile.notifications.practiceSuggestions')}</p>
                  <p className="text-xs text-muted">{t('profile.notifications.practiceSuggestionsDescription')}</p>
                </div>
                <input
                  type="checkbox"
                  disabled={!preferences.enabled}
                  checked={preferences.practiceRecommendations}
                  onChange={() => handleTogglePreference('practiceRecommendations')}
                  className="w-4 h-4 text-primary bg-dark border-subtle rounded focus:ring-primary/20 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                />
              </div>

              {/* Streak Notifications */}
              <div className="flex items-center justify-between pt-3.5">
                <div>
                  <p className="text-sm font-semibold text-text">{t('profile.notifications.streakNotifications')}</p>
                  <p className="text-xs text-muted">{t('profile.notifications.streakNotificationsDescription')}</p>
                </div>
                <input
                  type="checkbox"
                  disabled={!preferences.enabled}
                  checked={preferences.streakNotifications}
                  onChange={() => handleTogglePreference('streakNotifications')}
                  className="w-4 h-4 text-primary bg-dark border-subtle rounded focus:ring-primary/20 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                />
              </div>

              {/* Achievement Notifications */}
              <div className="flex items-center justify-between pt-3.5">
                <div>
                  <p className="text-sm font-semibold text-text">{t('profile.notifications.achievementAlerts')}</p>
                  <p className="text-xs text-muted">{t('profile.notifications.achievementAlertsDescription')}</p>
                </div>
                <input
                  type="checkbox"
                  disabled={!preferences.enabled}
                  checked={preferences.achievementNotifications}
                  onChange={() => handleTogglePreference('achievementNotifications')}
                  className="w-4 h-4 text-primary bg-dark border-subtle rounded focus:ring-primary/20 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                />
              </div>

              {/* Study Plan Notifications */}
              <div className="flex items-center justify-between pt-3.5">
                <div>
                  <p className="text-sm font-semibold text-text">{t('profile.notifications.studyPlanUpdates')}</p>
                  <p className="text-xs text-muted">{t('profile.notifications.studyPlanUpdatesDescription')}</p>
                </div>
                <input
                  type="checkbox"
                  disabled={!preferences.enabled}
                  checked={preferences.studyPlanNotifications}
                  onChange={() => handleTogglePreference('studyPlanNotifications')}
                  className="w-4 h-4 text-primary bg-dark border-subtle rounded focus:ring-primary/20 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        {/* Achievements Card Grid */}
        <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 mt-6">
          {loadingAch ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : (
            <AchievementCard unlocked={unlockedAchievements} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
