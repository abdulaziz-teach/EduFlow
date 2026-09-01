import { CalendarDays, Brain, TrendingUp, CheckCircle2, Clock, BookOpen } from 'lucide-react';
import SectionHeading from '../ui/SectionHeading';

const features = [
  {
    icon: CalendarDays,
    title: 'AI Study Plans',
    description:
      'Get a personalized plan based on your goals, subjects, available time, and deadline.',
    preview: StudyPlanPreview,
  },
  {
    icon: Brain,
    title: 'AI Mentor',
    description:
      'Ask questions, get explanations, and learn step by step instead of simply receiving answers.',
    preview: MentorMiniPreview,
  },
  {
    icon: TrendingUp,
    title: 'Progress Tracking',
    description:
      'See what you\'ve completed, where you\'re improving, and which subjects need more attention.',
    preview: ProgressMiniPreview,
  },
];

function StudyPlanPreview() {
  const items = [
    { time: '09:00', task: 'Quadratic Equations', subject: 'Math', done: true },
    { time: '10:30', task: 'Essay Writing', subject: 'English', done: true },
    { time: '13:00', task: 'Newton\'s Laws', subject: 'Physics', done: false },
    { time: '15:00', task: 'Review & Practice', subject: 'All', done: false },
  ];

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-subtle">
          <span className="text-[11px] text-muted w-10 shrink-0">{item.time}</span>
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
              item.done ? 'bg-emerald-500/20 text-emerald-400' : 'border border-subtle'
            }`}
          >
            {item.done && <CheckCircle2 className="w-3 h-3" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-xs ${item.done ? 'text-muted line-through' : 'text-text'}`}>
              {item.task}
            </p>
          </div>
          <span className="text-[10px] text-muted/60">{item.subject}</span>
        </div>
      ))}
    </div>
  );
}

function MentorMiniPreview() {
  return (
    <div className="space-y-2.5">
      <div className="flex justify-end">
        <div className="bg-primary/15 border border-primary/20 rounded-xl rounded-br-sm px-3 py-2 max-w-[80%]">
          <p className="text-xs text-text">What is the Pythagorean theorem?</p>
        </div>
      </div>
      <div className="flex justify-start">
        <div className="bg-white/[0.04] border border-subtle rounded-xl rounded-bl-sm px-3 py-2 max-w-[85%]">
          <div className="flex items-center gap-1.5 mb-1">
            <Brain className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-primary font-medium">AI Mentor</span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            The Pythagorean theorem states that in a right triangle, a² + b² = c², where c is the hypotenuse.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProgressMiniPreview() {
  const subjects = [
    { name: 'Mathematics', pct: 72, color: 'bg-primary' },
    { name: 'English', pct: 51, color: 'bg-sky-500' },
    { name: 'Physics', pct: 84, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-3">
      {subjects.map((s) => (
        <div key={s.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text">{s.name}</span>
            <span className="text-xs text-muted">{s.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full ${s.color}`}
              style={{ width: `${s.pct}%` }}
            />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4 pt-2 border-t border-subtle">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted" />
          <span className="text-[11px] text-muted">6h 42m this week</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3 h-3 text-muted" />
          <span className="text-[11px] text-muted">38 tasks</span>
        </div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="Features"
          title="Built around the way you learn."
          description="Every feature is designed to help you study more effectively, not just more."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-subtle bg-card p-5 md:p-6 hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-text">{feature.title}</h3>
              </div>
              <p className="text-sm text-muted leading-relaxed mb-5">
                {feature.description}
              </p>
              <div className="rounded-xl border border-subtle bg-dark/50 p-3">
                <feature.preview />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
