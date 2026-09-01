import { Clock, CheckCircle2, Flame, TrendingUp } from 'lucide-react';
import SectionHeading from '../ui/SectionHeading';

const subjects = [
  { name: 'Mathematics', pct: 72, color: 'bg-primary' },
  { name: 'English', pct: 51, color: 'bg-sky-500' },
  { name: 'Physics', pct: 84, color: 'bg-emerald-500' },
];

const stats = [
  { icon: Clock, label: 'Study time this week', value: '6h 42m' },
  { icon: CheckCircle2, label: 'Tasks completed', value: '38 / 50' },
  { icon: Flame, label: 'Study streak', value: '5 days' },
];

function ProgressShowcase() {
  return (
    <section id="progress" className="py-16 md:py-24 border-t border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="Progress"
          title="See exactly where you stand."
          description="Track your progress across all subjects and stay motivated with streaks and insights."
        />

        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-subtle bg-card p-6 md:p-8 shadow-2xl shadow-black/20">
            {/* Overall progress */}
            <div className="flex items-center gap-6 mb-8 p-5 rounded-xl bg-white/[0.02] border border-subtle">
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40" cy="40" r="34"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40" cy="40" r="34"
                    fill="none"
                    stroke="#6366F1"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${0.72 * 213.63} ${213.63}`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-text">
                  72%
                </span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-text mb-1">Overall Progress</h3>
                <p className="text-sm text-muted">Across all subjects this semester</p>
              </div>
            </div>

            {/* Subject progress */}
            <div className="space-y-5 mb-8">
              {subjects.map((s) => (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text">{s.name}</span>
                    <span className="text-sm text-muted">{s.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.color} transition-all duration-500`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="p-4 rounded-xl bg-white/[0.02] border border-subtle text-center"
                >
                  <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-lg font-bold text-text mb-0.5">{stat.value}</p>
                  <p className="text-xs text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProgressShowcase;
