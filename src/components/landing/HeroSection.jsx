import Button from '../ui/Button';
import DashboardPreview from '../DashboardPreview';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative pt-28 md:pt-36 pb-16 md:pb-24 overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/[0.07] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {t('landing.heroBadge')}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-text leading-[1.1] tracking-tight mb-6">
              {t('landing.heroTitle1')}{' '}
              <span className="text-primary">{t('landing.heroTitle2')}</span>
            </h1>

            <p className="text-lg text-muted leading-relaxed mb-8 max-w-md">
              {t('landing.heroSubtitle')}
            </p>

            <div className="flex flex-wrap gap-3">
              <Button to="/register" size="lg">
                {t('landing.getStarted')}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button href="#how-it-works" variant="secondary" size="lg">
                {t('landing.seeHowItWorks')}
              </Button>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="lg:pl-4">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
