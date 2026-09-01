import { BookOpen, Brain, CalendarDays, TrendingUp } from 'lucide-react';
import SectionHeading from '../ui/SectionHeading';

const benefits = [
  {
    icon: BookOpen,
    title: 'Personalized Learning',
    description: 'Study plans tailored to your goals, pace, and available time.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Guidance',
    description: 'Get explanations, not just answers. Understand concepts deeply.',
  },
  {
    icon: CalendarDays,
    title: 'Smart Study Planning',
    description: 'Organized schedules that adapt as you make progress.',
  },
  {
    icon: TrendingUp,
    title: 'Progress Tracking',
    description: 'Visualize your improvement and know where to focus next.',
  },
];

function TrustSection() {
  return (
    <section className="py-16 md:py-24 border-t border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Everything you need to study smarter."
          description="A complete toolkit designed to help you learn more effectively and stay on track."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="group p-5 md:p-6 rounded-xl border border-subtle bg-card hover:bg-white/[0.03] transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <benefit.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-text mb-2">{benefit.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustSection;
