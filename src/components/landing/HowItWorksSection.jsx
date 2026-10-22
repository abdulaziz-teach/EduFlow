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
    },
    {
      number: '02',
      icon: Map,
      title: t('landing.howItWorks.step2Title'),
      description: t('landing.howItWorks.step2Desc'),
    },
    {
      number: '03',
      icon: Rocket,
      title: t('landing.howItWorks.step3Title'),
      description: t('landing.howItWorks.step3Desc'),
    },
  ];

  return (
    <section id="how-it-works" className="py-16 md:py-24 border-t border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label={t('common.howItWorks') || 'How it works'}
          title={t('landing.howItWorks.title')}
          description={t('landing.howItWorks.subtitle')}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, i) => (
            <div key={step.number} className="relative group">
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-subtle to-transparent z-0" />
              )}

              <div className="relative p-6 md:p-8 rounded-2xl border border-subtle bg-card hover:bg-white/[0.02] transition-all duration-300">
                <span className="text-4xl font-extrabold text-white/[0.04] absolute top-4 right-5 select-none">
                  {step.number}
                </span>
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">{step.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
