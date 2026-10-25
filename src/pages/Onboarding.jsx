import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Target,
  BookOpen,
  Clock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  GraduationCap,
  Zap,
  Sparkles,
  Layers,
  Brain,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/auth';

const STEPS = [
  { num: '01', key: 'goal', icon: Target },
  { num: '02', key: 'subjects', icon: BookOpen },
  { num: '03', key: 'level', icon: Zap },
  { num: '04', key: 'focus', icon: Brain },
  { num: '05', key: 'time', icon: Clock },
  { num: '06', key: 'schedule', icon: CalendarDays },
  { num: '07', key: 'language', icon: Sparkles },
  { num: '08', key: 'age', icon: GraduationCap },
];

const GOALS = [
  { value: 'exam', icon: '📝' },
  { value: 'grades', icon: '📈' },
  { value: 'learn', icon: '🚀' },
  { value: 'habit', icon: '🔥' },
];

const SUBJECTS = [
  'Mathematics',
  'English',
  'Computer Science',
  'Physics',
  'Biology',
  'Chemistry',
  'History',
  'Economics',
  'Psychology',
  'Other',
];

const LEVELS = [
  {
    value: 'beginner',
  },
  {
    value: 'intermediate',
  },
  {
    value: 'advanced',
  },
  {
    value: 'revision',
  },
];

const TIME_OPTIONS = [
  { value: 20 },
  { value: 45 },
  { value: 60 },
  { value: 120 },
];

const LEARNING_STYLES = [
  {
    value: 'practice',
    icon: Brain,
  },
  {
    value: 'theory',
    icon: BookOpen,
  },
  {
    value: 'flashcards',
    icon: Layers,
  },
  {
    value: 'mixed',
    icon: Sparkles,
  },
];

const STUDY_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];
const STUDY_TIMES = [
  'morning',
  'afternoon',
  'evening',
  'anytime',
];
const LANGUAGES = [
  'en',
  'ru',
  'uz',
];
const SUBJECT_TRANSLATION_KEYS = {
  Mathematics: 'mathematics',
  English: 'english',
  'Computer Science': 'computerScience',
  Physics: 'physics',
  Biology: 'biology',
  Chemistry: 'chemistry',
  History: 'history',
  Economics: 'economics',
  Psychology: 'psychology',
  Other: 'other',
};

function Onboarding() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, setAuthenticatedUser } = useAuth();
  const userId = user?.id || user?._id || 'user';

  const [localDraft] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`eduflow_onboarding_${userId}`) || 'null');
    } catch {
      return null;
    }
  });
  const serverDraftAt = user?.onboardingDraftUpdatedAt
    ? new Date(user.onboardingDraftUpdatedAt).getTime()
    : 0;
  const localDraftAt = localDraft?.savedAt ? new Date(localDraft.savedAt).getTime() : 0;
  const initialDraft = localDraftAt > serverDraftAt
    ? localDraft
    : user?.onboardingDraft || localDraft || {};

  const [step, setStep] = useState(() => Math.min(initialDraft.step || 0, STEPS.length - 1));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draftError, setDraftError] = useState('');
  const saveTimer = useRef(null);
  const [answers, setAnswers] = useState(() => {
    const draft = initialDraft;
    return {
      goalType: draft.goalType || user?.goal?.type || '',
      goalDescription: draft.goalDescription || user?.goal?.description || '',
      subjects: draft.subjects || user?.subjects || [],
      level: draft.level || user?.level || 'intermediate',
      weakTopics: draft.weakTopics || user?.weakTopics || [],
      dailyStudyMinutes: draft.dailyStudyMinutes ?? user?.dailyStudyMinutes ?? null,
      learningStyle: draft.learningStyle || user?.learningStyle || 'mixed',
      targetDate: draft.targetDate || (user?.goal?.targetDate
        ? new Date(user.goal.targetDate).toISOString().slice(0, 10)
        : ''),
      preferredDays: draft.preferredDays || user?.studySchedule?.preferredDays || [],
      preferredTime: draft.preferredTime || user?.studySchedule?.preferredTime || 'anytime',
      preferredLanguage: draft.preferredLanguage || user?.preferredLanguage || 'en',
      age: draft.age ?? user?.age ?? '',
    };
  });
  const { goalType, subjects, level, weakTopics, dailyStudyMinutes, learningStyle, age,
    goalDescription, targetDate, preferredDays, preferredTime, preferredLanguage } = answers;

  const setAnswer = (field, value) => setAnswers((current) => ({ ...current, [field]: value }));

  const toggleSubject = (s) => {
    setAnswers((current) => ({
      ...current,
      subjects:
      current.subjects.includes(s)
        ? current.subjects.filter((x) => x !== s)
        : [...current.subjects, s],
    }));
  };

  const toggleStudyDay = (day) => {
    setAnswers((current) => ({
      ...current,
      preferredDays: current.preferredDays.includes(day)
        ? current.preferredDays.filter((value) => value !== day)
        : [...current.preferredDays, day],
    }));
  };

  const saveDraft = async (nextStep = step) => {
    const draft = { ...answers, step: nextStep, savedAt: new Date().toISOString() };
    try {
      localStorage.setItem(`eduflow_onboarding_${userId}`, JSON.stringify(draft));
    } catch (storageError) {
      console.error('Could not save onboarding draft in this browser:', storageError.message);
    }
    await authService.saveOnboardingDraft({
      ...draft,
      age: answers.age === '' ? null : Number(answers.age),
      weakTopics: answers.weakTopics.map((topic) => topic.trim()).filter(Boolean),
    });
    setDraftError('');
  };

  useEffect(() => {
    saveTimer.current = setTimeout(() => {
      saveDraft().catch((saveError) => {
        console.error('Could not persist onboarding draft:', saveError.message);
        setDraftError(t('onboarding.draftSyncError'));
      });
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [answers, step, userId]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const canContinue = () => {
    switch (step) {
      case 0:
        return !!goalType;
      case 1:
        return subjects.length > 0;
      case 2:
        return !!level;
      case 4:
        return dailyStudyMinutes !== null;
      case 5:
        return preferredDays.length > 0;
      case 7:
        return Number.isInteger(Number(age)) && Number(age) >= 5 && Number(age) <= 100;
      default:
        return true;
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    setError('');
    try {
      const result = await authService.completeOnboarding({
        ...answers,
        age: Number(age),
        goalDescription: goalDescription.trim(),
        weakTopics: weakTopics.map((topic) => topic.trim()).filter(Boolean),
      });
      if (!result.user) throw new Error('The saved learning profile could not be loaded.');
      setAuthenticatedUser(result.user);
      localStorage.removeItem(`eduflow_onboarding_${userId}`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || t('onboarding.saveError'));
      setSaving(false);
    }
  };

  const next = async () => {
    if (step < STEPS.length - 1) {
      clearTimeout(saveTimer.current);
      try {
        await saveDraft(step + 1);
      } catch (saveError) {
        setDraftError(t('onboarding.draftSyncError'));
      }
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="text-xl font-extrabold text-text tracking-tight">EduFlow</span>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-10 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  i === step
                    ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105'
                    : i < step
                    ? 'bg-primary/15 text-primary cursor-pointer hover:bg-primary/25'
                    : 'bg-white/5 text-muted'
                } disabled:cursor-default`}
              >
                {i < step ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <s.icon className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">{t(`onboarding.steps.${s.key}`)}</span>
                <span className="sm:hidden">{s.num}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-3 sm:w-5 h-0.5 ${
                    i < step ? 'bg-primary/50' : 'bg-white/10'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-subtle bg-card p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}
          {draftError && (
            <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
              {draftError}
            </div>
          )}

          {/* Question 1: Goal */}
          {step === 0 && (
            <div>
              <div className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-full mb-2">
                {t('onboarding.questionCount', { current: 1, total: STEPS.length })}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-text mb-1">
                {t('onboarding.goalQuestionTitle')}
              </h2>
              <p className="text-sm text-muted mb-6">
                {t('onboarding.goalQuestionSubtitle')}
              </p>
              <div className="space-y-3">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setAnswer('goalType', g.value)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                      goalType === g.value
                        ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                        : 'border-subtle bg-dark/40 hover:border-white/20'
                    }`}
                  >
                    <span className="text-2xl mt-0.5">{g.icon}</span>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-bold ${
                          goalType === g.value ? 'text-text' : 'text-text/90'
                        }`}
                      >
                        {t(`onboarding.goals.${g.value}.label`)}
                      </p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">
                        {t(`onboarding.goals.${g.value}.description`)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 2: Subjects */}
          {step === 1 && (
            <div>
              <div className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-full mb-2">
                {t('onboarding.questionCount', { current: 2, total: STEPS.length })}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-text mb-1">
                {t('onboarding.subjectsQuestionTitle')}
              </h2>
              <p className="text-sm text-muted mb-6">
                {t('onboarding.subjectsQuestionSubtitle')}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {SUBJECTS.map((s) => {
                  const isSelected = subjects.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSubject(s)}
                      className={`p-3.5 rounded-2xl border text-sm font-semibold transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary shadow-md shadow-primary/10'
                          : 'border-subtle bg-dark/40 text-muted hover:border-white/20 hover:text-text'
                      }`}
                    >
                      <span>{t(`onboarding.subjectNames.${SUBJECT_TRANSLATION_KEYS[s]}`)}</span>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question 3: Knowledge Level */}
          {step === 2 && (
            <div>
              <div className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-full mb-2">
                {t('onboarding.questionCount', { current: 3, total: STEPS.length })}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-text mb-1">
                {t('onboarding.levelQuestionTitle')}
              </h2>
              <p className="text-sm text-muted mb-6">
                {t('onboarding.levelQuestionSubtitle')}
              </p>
              <div className="space-y-3">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setAnswer('level', l.value)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      level === l.value
                        ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                        : 'border-subtle bg-dark/40 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-text">{t(`onboarding.levels.${l.value}.label`)}</p>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-white/5 rounded-md text-primary">
                        {t(`onboarding.levels.${l.value}.badge`)}
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{t(`onboarding.levels.${l.value}.description`)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 4: Weak subjects and topics */}
          {step === 3 && (
            <div>
              <div className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-full mb-2">
                {t('onboarding.questionCount', { current: 4, total: STEPS.length })}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-text mb-1">
                {t('onboarding.focusQuestionTitle')}
              </h2>
              <p className="text-sm text-muted mb-6">
                {t('onboarding.focusQuestionSubtitle')}
              </p>
              <label htmlFor="weakTopics" className="block text-xs font-semibold text-text mb-1.5">
                {t('onboarding.focusLabel')}
              </label>
              <textarea
                id="weakTopics"
                rows={4}
                maxLength={500}
                value={weakTopics.join(', ')}
                onChange={(event) => setAnswer('weakTopics', event.target.value.split(',').slice(0, 20))}
                placeholder={t('onboarding.focusPlaceholder')}
                className="w-full px-4 py-3 rounded-xl bg-dark border border-subtle text-sm text-text placeholder:text-muted/50 outline-none focus:border-primary transition-all resize-y"
              />
            </div>
          )}

          {/* Question 5: Daily Study Time */}
          {step === 4 && (
            <div>
              <div className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-full mb-2">
                {t('onboarding.questionCount', { current: 5, total: STEPS.length })}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-text mb-1">
                {t('onboarding.timeQuestionTitle')}
              </h2>
              <p className="text-sm text-muted mb-6">
                {t('onboarding.timeQuestionSubtitle')}
              </p>
              <div className="space-y-3">
                {TIME_OPTIONS.map((timeOption) => (
                  <button
                    key={timeOption.value}
                    onClick={() => setAnswer('dailyStudyMinutes', timeOption.value)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      dailyStudyMinutes === timeOption.value
                        ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                        : 'border-subtle bg-dark/40 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-text block">
                          {t(`onboarding.timeOptions.${timeOption.value}.label`)}
                        </span>
                        <span className="text-xs text-muted mt-0.5">{t(`onboarding.timeOptions.${timeOption.value}.description`)}</span>
                      </div>
                      <Clock
                        className={`w-5 h-5 ${
                          dailyStudyMinutes === timeOption.value ? 'text-primary' : 'text-muted/40'
                        }`}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 6: Learning style and schedule */}
          {step === 5 && (
            <div>
              <div className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-full mb-2">
                {t('onboarding.questionCount', { current: 6, total: STEPS.length })}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-text mb-1">
                {t('onboarding.scheduleQuestionTitle')}
              </h2>
              <p className="text-sm text-muted mb-6">
                {t('onboarding.scheduleQuestionSubtitle')}
              </p>

              <label className="block text-xs font-bold uppercase tracking-wider text-text mb-2.5">
                {t('onboarding.preferredDays')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                {STUDY_DAYS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={preferredDays.includes(value)}
                    onClick={() => toggleStudyDay(value)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      preferredDays.includes(value)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-subtle bg-dark/40 text-muted hover:border-white/20'
                    }`}
                  >
                    {t(`onboarding.weekdays.${value}`)}
                  </button>
                ))}
              </div>
              <label htmlFor="preferredTime" className="block text-xs font-bold uppercase tracking-wider text-text mb-2">
                {t('onboarding.preferredTime')}
              </label>
              <select
                id="preferredTime"
                value={preferredTime}
                onChange={(event) => setAnswer('preferredTime', event.target.value)}
                className="w-full px-4 py-2.5 mb-6 rounded-xl bg-dark border border-subtle text-sm text-text outline-none focus:border-primary"
              >
                {STUDY_TIMES.map((value) => <option key={value} value={value}>{t(`onboarding.times.${value}`)}</option>)}
              </select>

              {/* Style selector */}
              <label className="block text-xs font-bold uppercase tracking-wider text-text mb-2.5">
                {t('onboarding.learningStyleTitle')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
                {LEARNING_STYLES.map((style) => {
                  const Icon = style.icon;
                  const isSelected = learningStyle === style.value;
                  return (
                    <button
                      key={style.value}
                      type="button"
                      onClick={() => setAnswer('learningStyle', style.value)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-subtle bg-dark/40 text-muted hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-text">{t(`onboarding.styles.${style.value}.label`)}</span>
                      </div>
                      <span className="text-[11px] text-muted leading-tight">
                        {t(`onboarding.styles.${style.value}.description`)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Inputs */}
              <div className="space-y-4 pt-4 border-t border-subtle">
                <div>
                  <label
                    htmlFor="goalDesc"
                    className="block text-xs font-semibold text-text mb-1.5"
                  >
                    {goalType === 'exam' ? t('onboarding.examName') : t('onboarding.goalName')}
                  </label>
                  <input
                    id="goalDesc"
                    type="text"
                    value={goalDescription}
                    onChange={(e) => setAnswer('goalDescription', e.target.value)}
                    placeholder={
                      goalType === 'exam'
                        ? t('onboarding.examPlaceholder')
                        : t('onboarding.goalPlaceholder')
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-dark border border-subtle text-sm text-text placeholder:text-muted/50 outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label
                    htmlFor="targetDate"
                    className="block text-xs font-semibold text-text mb-1.5"
                  >
                    {t('onboarding.targetDate')} <span className="text-muted font-normal">({t('onboarding.optional')})</span>
                  </label>
                  <input
                    id="targetDate"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setAnswer('targetDate', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-dark border border-subtle text-sm text-text outline-none focus:border-primary transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Question 7: Language */}
          {step === 6 && (
            <div>
              <div className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-full mb-2">
                {t('onboarding.questionCount', { current: 7, total: STEPS.length })}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-text mb-1">
                {t('onboarding.languageQuestionTitle')}
              </h2>
              <p className="text-sm text-muted mb-6">
                {t('onboarding.languageQuestionSubtitle')}
              </p>
              <div className="space-y-3">
                {LANGUAGES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={preferredLanguage === value}
                    onClick={() => setAnswer('preferredLanguage', value)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      preferredLanguage === value
                        ? 'border-primary bg-primary/10 text-text'
                        : 'border-subtle bg-dark/40 text-muted hover:border-white/20'
                    }`}
                  >
                    {t(`onboarding.languageNames.${value}`)}
                  </button>
                ))}
              </div>
              <div className="mt-6 p-4 rounded-xl bg-white/[0.03] border border-subtle text-sm text-muted">
                {t('onboarding.profilePreview', {
                  subjects: subjects.join(', ') || t('onboarding.chooseSubjects'),
                  minutes: dailyStudyMinutes || t('onboarding.chooseStudyTime'),
                })}
              </div>
            </div>
          )}

          {step === 7 && (
            <div>
              <div className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-full mb-2">
                {t('onboarding.questionCount', { current: step + 1, total: STEPS.length })}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-text mb-1">{t('onboarding.ageTitle')}</h2>
              <p className="text-sm text-muted mb-6">{t('onboarding.ageSubtitle')}</p>
              <label htmlFor="onboarding-age" className="block text-sm font-semibold text-text mb-2">
                {t('onboarding.ageLabel')}
              </label>
              <input
                id="onboarding-age"
                type="number"
                inputMode="numeric"
                min="5"
                max="100"
                step="1"
                required
                value={age}
                onChange={(event) => setAnswer('age', event.target.value)}
                aria-describedby="onboarding-age-help"
                className="w-full min-h-12 px-4 py-3 rounded-xl bg-dark border border-subtle text-text outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
              <p id="onboarding-age-help" className="text-xs text-muted mt-2">{t('onboarding.ageHelp')}</p>
              {!!age && (!Number.isInteger(Number(age)) || Number(age) < 5 || Number(age) > 100) && (
                <p role="alert" className="text-sm text-red-400 mt-2">{t('onboarding.ageInvalid')}</p>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-subtle">
            <button
              onClick={back}
              disabled={step === 0}
              className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('onboarding.back')}
            </button>

            <button
              onClick={next}
              disabled={!canContinue() || saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-primary/25"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('onboarding.saving')}
                </>
              ) : step === STEPS.length - 1 ? (
                <>
                {t('onboarding.finish')}
                  <Sparkles className="w-4 h-4" />
                </>
              ) : (
                <>
                  {t('onboarding.continue')}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
