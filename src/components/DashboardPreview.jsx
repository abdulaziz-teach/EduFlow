import {
  BookOpen,
  Brain,
  CheckCircle2,
  Flame,
  TrendingUp,
} from 'lucide-react';

const tasks = [
  { subject: 'Mathematics', topic: 'Quadratic Equations', done: true },
  { subject: 'English', topic: 'Essay Structure', done: false },
  { subject: 'Physics', topic: 'Newton\'s Laws', done: false },
];

function DashboardPreview() {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="rounded-2xl border border-subtle bg-card p-5 md:p-6 shadow-2xl shadow-black/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-muted mb-0.5">Good morning</p>
            <h3 className="text-sm font-semibold text-text">Today&apos;s Overview</h3>
          </div>
          <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-400 px-2.5 py-1 rounded-full">
            <Flame className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">5 day streak</span>
          </div>
        </div>

        {/* Progress ring */}
        <div className="flex items-center gap-5 mb-5 p-4 rounded-xl bg-white/[0.03] border border-subtle">
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="5"
              />
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="#6366F1"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${0.72 * 175.93} ${175.93}`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-text">
              72%
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-text mb-0.5">Today&apos;s Progress</p>
            <p className="text-xs text-muted">3 of 5 tasks completed</p>
          </div>
        </div>

        {/* Tasks */}
        <div className="space-y-2.5 mb-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Study Tasks</p>
          {tasks.map((task, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-subtle"
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  task.done
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'border border-subtle'
                }`}
              >
                {task.done && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${task.done ? 'text-muted line-through' : 'text-text'}`}>
                  {task.topic}
                </p>
                <p className="text-xs text-muted/60">{task.subject}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-text">AI Mentor</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Ready to help with your studies
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-subtle">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-text">Progress</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-text">72</span>
              <span className="text-xs text-muted">% overall</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPreview;
