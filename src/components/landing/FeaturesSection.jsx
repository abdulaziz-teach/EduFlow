import { CalendarDays, Brain, TrendingUp, CheckCircle2, Clock, BookOpen, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SectionHeading from '../ui/SectionHeading';

function StudyPlanPreview() {
  const { t } = useTranslation();
  const items = [
    { time: '09:00', task: t('landing.features.task1') || 'Quadratic Equations', subject: t('landing.features.mathSubject') || 'Math', done: true },
    { time: '10:30', task: t('landing.features.task2') || 'Essay Writing Practice', subject: t('landing.features.englishSubject') || 'English', done: true },
    { time: '13:00', task: t('landing.features.task3') || "Newton's Laws", subject: t('landing.features.physicsSubject') || 'Physics', done: false },
    { time: '15:00', task: t('landing.features.task4') || 'Review & Practice', subject: t('landing.features.allSubjects') || 'All', done: false },
  ];

  return (
    <div className="space-y-3">
      {/* Mini header inside preview */}
      <div className="flex items-center justify-between pb-2 border-b border-subtle">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 text-indigo-300" />
          <span className="text-xs font-semibold text-text">
            {t('landing.features.todaySchedule') || "Today's Schedule"}
          </span>
        </div>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
          {t('landing.features.completedBadge') || '2/4 done'}
        </span>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 sm:gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-subtle hover:bg-white/[0.05] transition-colors"
          >
            <span className="text-[11px] font-mono text-slate-300 w-11 shrink-0">{item.time}</span>
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                item.done ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'border border-slate-600 bg-white/[0.02]'
              }`}
            >
              {item.done && <CheckCircle2 className="w-3 h-3" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-medium truncate ${item.done ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                {item.task}
              </p>
            </div>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.04] border border-subtle text-slate-300 shrink-0">
              {item.subject}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom stats inside preview */}
      <div className="flex items-center justify-between pt-2 border-t border-subtle text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-indigo-300" />
          <span>{t('landing.features.scheduledHours') || '4.5h scheduled'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-indigo-300" />
          <span>{t('landing.features.streakDays') || '3-day streak'}</span>
        </div>
      </div>
    </div>
  );
}

function MentorMiniPreview() {
  const { t } = useTranslation();

  return (
    <div className="space-y-2.5">
      <div className="flex justify-end">
        <div className="bg-primary/15 border border-primary/25 rounded-2xl rounded-br-sm px-3 py-2 max-w-[88%]">
          <p className="text-xs text-text">
            {t('landing.features.mentorQuestion') || 'How is the Pythagorean theorem applied?'}
          </p>
        </div>
      </div>
      <div className="flex justify-start">
        <div className="bg-white/[0.04] border border-subtle rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[92%]">
          <div className="flex items-center gap-1.5 mb-1">
            <Brain className="w-3 h-3 text-indigo-300" />
            <span className="text-[10px] text-indigo-300 font-semibold tracking-wide">
              {t('landing.features.mentorTitle') || 'AI Mentor'}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {t('landing.features.mentorAnswer') || 'In a right triangle, the sum of squares of the legs equals the hypotenuse square: a² + b² = c².'}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProgressMiniPreview() {
  const { t } = useTranslation();
  const subjects = [
    { name: t('landing.features.mathSubject') || 'Mathematics', pct: 72, color: 'bg-primary' },
    { name: t('landing.features.englishSubject') || 'English', pct: 51, color: 'bg-sky-500' },
    { name: t('landing.features.physicsSubject') || 'Physics', pct: 84, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-3">
      {subjects.map((s) => (
        <div key={s.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-text">{s.name}</span>
            <span className="text-xs font-semibold text-slate-300">{s.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full ${s.color} transition-all duration-500`}
              style={{ width: `${s.pct}%` }}
            />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between pt-2 border-t border-subtle text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-indigo-300" />
          <span>{t('landing.features.weeklyTime') || '6h 42m this week'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3 h-3 text-indigo-300" />
          <span>{t('landing.features.tasksCount') || '38 tasks'}</span>
        </div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  const { t } = useTranslation();

  return (
    <section id="features" className="relative py-16 md:py-24 border-t border-subtle overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/[0.03] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <SectionHeading
          label={t('common.features') || 'Features'}
          title={t('landing.featuresTitle')}
          description={t('landing.featuresSubtitle')}
          descriptionClassName="text-slate-300"
        />

        {/* Bento Grid: 1 large hero card + 2 complementary cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-stretch">
          {/* Card 1: Large Main Hero Bento Card (Study Plans) */}
          <div className="lg:col-span-7 flex flex-col justify-between group rounded-2xl border border-subtle bg-card p-5 sm:p-6 md:p-8 hover:border-primary/30 transition-all duration-300 shadow-sm">
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <CalendarDays className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-text">
                      {t('landing.features.planTitle')}
                    </h3>
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/10 border border-primary/20 text-indigo-300">
                  <Sparkles className="w-3 h-3" />
                  {t('landing.features.heroBadge') || 'Core Module'}
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                {t('landing.features.planDesc')}
              </p>
            </div>

            <div className="rounded-xl border border-subtle bg-dark/60 p-3.5 sm:p-4 mt-auto">
              <StudyPlanPreview />
            </div>
          </div>

          {/* Right Column: 2 Secondary Bento Cards */}
          <div className="lg:col-span-5 flex flex-col gap-5 md:gap-6">
            {/* Card 2: AI Mentor */}
            <div className="flex-1 flex flex-col justify-between group rounded-2xl border border-subtle bg-card p-5 sm:p-6 hover:border-primary/30 transition-all duration-300 shadow-sm">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <Brain className="w-5 h-5 text-indigo-300" />
                  </div>
                  <h3 className="text-base font-semibold text-text">
                    {t('landing.features.mentorTitle')}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                  {t('landing.features.mentorDesc')}
                </p>
              </div>

              <div className="rounded-xl border border-subtle bg-dark/60 p-3 sm:p-3.5 mt-auto">
                <MentorMiniPreview />
              </div>
            </div>

            {/* Card 3: Progress Analytics */}
            <div className="flex-1 flex flex-col justify-between group rounded-2xl border border-subtle bg-card p-5 sm:p-6 hover:border-primary/30 transition-all duration-300 shadow-sm">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <TrendingUp className="w-5 h-5 text-indigo-300" />
                  </div>
                  <h3 className="text-base font-semibold text-text">
                    {t('landing.features.progressTitle')}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                  {t('landing.features.progressDesc')}
                </p>
              </div>

              <div className="rounded-xl border border-subtle bg-dark/60 p-3 sm:p-3.5 mt-auto">
                <ProgressMiniPreview />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
