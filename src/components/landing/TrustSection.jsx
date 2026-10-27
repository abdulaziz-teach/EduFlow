import { BookOpen, Brain, CalendarDays, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SectionHeading from '../ui/SectionHeading';

function TrustSection() {
  const { t } = useTranslation();

  const benefits = [
    {
      icon: BookOpen,
      title: t('landing.trust.spacedRepetition') || 'Spaced Repetition',
      description:
        t('landing.trust.spacedRepetitionDesc') ||
        'Presents concepts at calculated intervals to counteract the forgetting curve naturally.',
    },
    {
      icon: Brain,
      title: t('landing.trust.activeRecall') || 'Active Recall',
      description:
        t('landing.trust.activeRecallDesc') ||
        'Strengthens retrieval pathways through active questioning rather than passive re-reading.',
    },
    {
      icon: CalendarDays,
      title: t('landing.trust.adaptiveDifficulty') || 'Adaptive Difficulty',
      description:
        t('landing.trust.adaptiveDifficultyDesc') ||
        'Calibrates question and task complexity to match your current retention level.',
    },
    {
      icon: TrendingUp,
      title: t('landing.trust.microlearning') || 'Microlearning',
      description:
        t('landing.trust.microlearningDesc') ||
        'Structures study sessions into focused, manageable units to sustain cognitive attention.',
    },
  ];

  return (
    <section className="relative py-16 md:py-24 border-t border-subtle overflow-hidden">
      {/* Subtle atmospheric ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/[0.04] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <SectionHeading
          title={t('landing.trust.title')}
          description={t('landing.trust.subtitle')}
          descriptionClassName="text-slate-300"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="group p-5 md:p-6 rounded-2xl border border-subtle bg-card hover:border-primary/30 hover:bg-white/[0.03] transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-text mb-2.5 tracking-tight">
                  {benefit.title}
                </h3>
                {/* text-slate-300 provides 11.97:1 contrast ratio on #111827 card background, meeting WCAG AAA (>= 7:1) */}
                <p className="text-sm text-slate-300 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustSection;
