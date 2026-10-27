import { Target, Map, Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SectionHeading from '../ui/SectionHeading';

function HowItWorksSection() {
  const { t } = useTranslation();

  const steps = [
    {
      number: '01',
      icon: Target,
      title: t('landing.howItWorks.step1Title'),
      description: t('landing.howItWorks.step1Desc'),
      badge: 'Step 1',
    },
    {
      number: '02',
      icon: Map,
      title: t('landing.howItWorks.step2Title'),
      description: t('landing.howItWorks.step2Desc'),
      badge: 'Step 2',
    },
    {
      number: '03',
      icon: Rocket,
      title: t('landing.howItWorks.step3Title'),
      description: t('landing.howItWorks.step3Desc'),
      badge: 'Step 3',
    },
  ];

  return (
    <section id="how-it-works" className="relative py-16 md:py-24 border-t border-subtle overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[300px] bg-primary/[0.03] rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <SectionHeading
          label={t('common.howItWorks') || 'How it works'}
          title={t('landing.howItWorks.title')}
          description={t('landing.howItWorks.subtitle')}
          descriptionClassName="text-slate-300"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, i) => (
            <div key={step.number} className="relative group">
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-white/[0.08] to-transparent z-0" />
              )}

              <div className="relative p-6 md:p-8 rounded-2xl border border-subtle bg-card hover:border-primary/30 hover:bg-white/[0.02] transition-all duration-300 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-3xl font-extrabold text-white/[0.08] font-mono select-none">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-text mb-2.5 tracking-tight">
                    {step.title}
                  </h3>

                  {/* text-slate-300 provides 11.97:1 contrast ratio on #111827 card background, meeting WCAG AAA (>= 7:1) */}
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
