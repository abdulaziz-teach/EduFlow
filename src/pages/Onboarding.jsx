import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/auth';

const STEPS = [
  { num: '01', label: 'Goal', icon: Target },
  { num: '02', label: 'Subjects', icon: BookOpen },
  { num: '03', label: 'Time', icon: Clock },
  { num: '04', label: 'Target', icon: CalendarDays },
];

const GOALS = [
  { value: 'grades', label: 'Improve my grades', description: 'Get better results in your current courses' },
  { value: 'exam', label: 'Prepare for an exam', description: 'Focused prep for an upcoming test' },
  { value: 'learn', label: 'Learn a new subject', description: 'Explore a topic from scratch' },
  { value: 'habit', label: 'Build a study habit', description: 'Create a consistent daily routine' },
];

const SUBJECTS = [
  'Mathematics', 'English', 'Physics', 'Biology',
  'Chemistry', 'History', 'Computer Science', 'Other',
];

const TIME_OPTIONS = [
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '3+ hours', value: 180 },
];

function Onboarding() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [goalType, setGoalType] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [dailyMinutes, setDailyMinutes] = useState(null);
  const [goalDescription, setGoalDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const toggleSubject = (s) => {
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const canContinue = () => {
    switch (step) {
      case 0: return !!goalType;
      case 1: return subjects.length > 0;
      case 2: return dailyMinutes !== null;
      case 3: return true; // description/date are optional for some goals
      default: return false;
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    setError('');

    const payload = {
      subjects,
      dailyStudyMinutes: dailyMinutes,
      goal: {
        type: goalType,
        description:
          goalDescription.trim() ||
          GOALS.find((g) => g.value === goalType)?.label ||
          '',
        ...(targetDate ? { targetDate } : {}),
      },
    };

    try {
      await authService.updateMe(payload);
      await refreshUser();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const next = () => {
    if (step < 3) setStep(step + 1);
    else handleFinish();
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <span className="text-lg font-bold text-text">EduFlow</span>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  i === step
                    ? 'bg-primary text-white'
                    : i < step
                      ? 'bg-primary/15 text-primary'
                      : 'bg-white/5 text-muted'
                } disabled:cursor-default`}
              >
                {i < step ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <s.icon className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.num}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-px ${i < step ? 'bg-primary/40' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-subtle bg-card p-6 md:p-8">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Step 0: Goal */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold text-text mb-2">What do you want to achieve?</h2>
              <p className="text-sm text-muted mb-6">This helps us create the right plan for you.</p>
              <div className="space-y-3">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGoalType(g.value)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      goalType === g.value
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-subtle bg-white/[0.02] hover:border-white/10'
                    }`}
                  >
                    <p className={`text-sm font-medium ${goalType === g.value ? 'text-text' : 'text-text/80'}`}>
                      {g.label}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{g.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Subjects */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-text mb-2">What subjects do you study?</h2>
              <p className="text-sm text-muted mb-6">Select all that apply.</p>
              <div className="grid grid-cols-2 gap-3">
                {SUBJECTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleSubject(s)}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                      subjects.includes(s)
                        ? 'border-primary/50 bg-primary/5 text-text'
                        : 'border-subtle bg-white/[0.02] text-muted hover:border-white/10 hover:text-text'
                    }`}
                  >
                    {subjects.includes(s) && <Check className="w-3.5 h-3.5 inline mr-1.5 text-primary" />}
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Study Time */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-text mb-2">How much time can you study each day?</h2>
              <p className="text-sm text-muted mb-6">We&apos;ll build your plan around this.</p>
              <div className="space-y-3">
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setDailyMinutes(t.value)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      dailyMinutes === t.value
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-subtle bg-white/[0.02] hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${dailyMinutes === t.value ? 'text-text' : 'text-text/80'}`}>
                        {t.label}
                      </span>
                      <Clock className={`w-4 h-4 ${dailyMinutes === t.value ? 'text-primary' : 'text-muted/40'}`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Target */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-text mb-2">
                {goalType === 'exam' ? 'Tell us about your exam' : 'Set your target'}
              </h2>
              <p className="text-sm text-muted mb-6">
                {goalType === 'exam'
                  ? 'We\'ll plan your prep around the exam date.'
                  : 'Add a description and optional deadline.'}
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="goalDesc" className="block text-sm font-medium text-text mb-1.5">
                    {goalType === 'exam' ? 'Exam name' : 'Goal description'}
                  </label>
                  <input
                    id="goalDesc"
                    type="text"
                    value={goalDescription}
                    onChange={(e) => setGoalDescription(e.target.value)}
                    placeholder={goalType === 'exam' ? 'e.g. Mathematics Final Exam' : 'e.g. Master calculus fundamentals'}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark border border-subtle text-sm text-text placeholder:text-muted/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="targetDate" className="block text-sm font-medium text-text mb-1.5">
                    Target date {goalType !== 'exam' && <span className="text-muted font-normal">(optional)</span>}
                  </label>
                  <input
                    id="targetDate"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark border border-subtle text-sm text-text outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-subtle">
            <button
              onClick={back}
              disabled={step === 0}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={next}
              disabled={!canContinue() || saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-primary/20"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : step === 3 ? (
                <>
                  Create my profile
                  <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Continue
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
