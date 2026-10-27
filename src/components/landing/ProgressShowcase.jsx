import { useState } from 'react';
import { Clock, CheckCircle2, Flame, Calendar, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SectionHeading from '../ui/SectionHeading';

function ProgressShowcase() {
  const { t } = useTranslation();
  const [activePeriod, setActivePeriod] = useState('weekly');

  // Realistic sample demo datasets for illustrative purposes
  const demoData = {
    weekly: {
      overallPct: 72,
      timeSpent: '6h 42m',
      tasksCompleted: '38 / 50',
      streak: '5',
      descKey: 'landing.progressShowcase.descWeekly',
      subjects: [
        { nameKey: 'Mathematics', defaultName: 'Mathematics', pct: 72, color: 'bg-primary' },
        { nameKey: 'English', defaultName: 'English', pct: 51, color: 'bg-sky-400' },
        { nameKey: 'Physics', defaultName: 'Physics', pct: 84, color: 'bg-emerald-400' },
      ],
    },
    monthly: {
      overallPct: 79,
      timeSpent: '28h 15m',
      tasksCompleted: '142 / 180',
      streak: '18',
      descKey: 'landing.progressShowcase.descMonthly',
      subjects: [
        { nameKey: 'Mathematics', defaultName: 'Mathematics', pct: 82, color: 'bg-primary' },
        { nameKey: 'English', defaultName: 'English', pct: 70, color: 'bg-sky-400' },
        { nameKey: 'Physics', defaultName: 'Physics', pct: 86, color: 'bg-emerald-400' },
      ],
    },
    semester: {
      overallPct: 85,
      timeSpent: '94h 30m',
      tasksCompleted: '510 / 600',
      streak: '42',
      descKey: 'landing.progressShowcase.descSemester',
      subjects: [
        { nameKey: 'Mathematics', defaultName: 'Mathematics', pct: 89, color: 'bg-primary' },
        { nameKey: 'English', defaultName: 'English', pct: 80, color: 'bg-sky-400' },
        { nameKey: 'Physics', defaultName: 'Physics', pct: 91, color: 'bg-emerald-400' },
      ],
    },
  };

  const periods = [
    { id: 'weekly', labelKey: 'landing.progressShowcase.timeframe.weekly' },
    { id: 'monthly', labelKey: 'landing.progressShowcase.timeframe.monthly' },
    { id: 'semester', labelKey: 'landing.progressShowcase.timeframe.semester' },
  ];

  const current = demoData[activePeriod];
  const circleCircumference = 213.63; // 2 * PI * 34
  const strokeDashoffset = circleCircumference - (current.overallPct / 100) * circleCircumference;

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      const nextIndex = (index + 1) % periods.length;
      setActivePeriod(periods[nextIndex].id);
    } else if (e.key === 'ArrowLeft') {
      const prevIndex = (index - 1 + periods.length) % periods.length;
      setActivePeriod(periods[prevIndex].id);
    }
  };

  return (
    <section id="progress" className="relative py-16 md:py-24 border-t border-subtle overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/[0.03] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <SectionHeading
          label={t('progress.title') || 'Progress'}
          title={t('landing.progressShowcase.title')}
          description={t('landing.progressShowcase.subtitle')}
          descriptionClassName="text-slate-300"
        />

        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-subtle bg-card p-5 sm:p-6 md:p-8 shadow-2xl shadow-black/20">
            {/* Header: Tabs for timeframe selection + Honest Demo Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-subtle">
              {/* Keyboard accessible timeframe tabs */}
              <div
                role="tablist"
                aria-label={t('landing.progressShowcase.title')}
                className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/[0.03] border border-subtle"
              >
                {periods.map((p, i) => {
                  const isActive = activePeriod === p.id;
                  return (
                    <button
                      key={p.id}
                      role="tab"
                      id={`tab-${p.id}`}
                      aria-selected={isActive}
                      aria-controls={`panel-${p.id}`}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setActivePeriod(p.id)}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer text-center font-medium ${
                        isActive
                          ? 'bg-primary/20 text-white border border-primary/40 font-semibold shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      {t(p.labelKey)}
                    </button>
                  );
                })}
              </div>

              {/* Honest Demo indicator */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <span className="text-[10px] font-mono bg-primary/10 text-indigo-300 border border-primary/20 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  {t('landing.progressShowcase.demoBadge')}
                </span>
              </div>
            </div>

            {/* Overall progress card */}
            <div
              id={`panel-${activePeriod}`}
              role="tabpanel"
              aria-labelledby={`tab-${activePeriod}`}
              className="flex items-center gap-5 sm:gap-6 mb-7 p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-subtle"
            >
              {/* Smooth animated SVG circular indicator */}
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="#6366F1"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circleCircumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white font-mono">
                  {current.overallPct}%
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-text mb-1">
                  {t('progress.overallProgress') || 'Overall Progress'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {t(current.descKey)}
                </p>
              </div>
            </div>

            {/* Subject progress bars with smooth transition */}
            <div className="space-y-4 mb-7 p-4 sm:p-5 rounded-xl bg-white/[0.01] border border-subtle">
              {current.subjects.map((s) => (
                <div key={s.nameKey}>
                  <div className="flex items-center justify-between mb-1.5 text-xs sm:text-sm">
                    <span className="font-medium text-slate-200">
                      {t(`subjects.${s.nameKey.toLowerCase()}`) || s.defaultName}
                    </span>
                    <span className="font-mono text-slate-300 font-semibold">{s.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.color} transition-all duration-700 ease-out`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Stats row with responsive 3-column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border border-subtle text-center">
                <Clock className="w-5 h-5 text-primary mx-auto mb-1.5" />
                <p className="text-lg font-bold text-white mb-0.5 font-mono">{current.timeSpent}</p>
                <p className="text-xs text-slate-300">{t('progress.studyTime') || 'Study time'}</p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border border-subtle text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                <p className="text-lg font-bold text-white mb-0.5 font-mono">{current.tasksCompleted}</p>
                <p className="text-xs text-slate-300">{t('progress.tasksCompleted') || 'Tasks completed'}</p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border border-subtle text-center">
                <Flame className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                <p className="text-lg font-bold text-white mb-0.5 font-mono">
                  {current.streak} {t('landing.progressShowcase.streakUnit')}
                </p>
                <p className="text-xs text-slate-300">{t('progress.studyStreak') || 'Study streak'}</p>
              </div>
            </div>

            {/* Honest sample data disclaimer */}
            <p className="text-[11px] text-slate-400 mt-5 text-center leading-relaxed">
              {t('landing.progressShowcase.demoNotice')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProgressShowcase;
