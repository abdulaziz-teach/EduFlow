import Button from '../ui/Button';
import StorytellingSlideTheater from './StorytellingSlideTheater';
import { ArrowRight, ShieldCheck, Sparkles, Globe, Brain } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative pt-28 md:pt-36 pb-16 md:pb-24 overflow-hidden">
      {/* Background ambient light aura */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[720px] max-w-full h-[450px] bg-primary/[0.08] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-48 left-1/4 w-[300px] h-[300px] bg-violet-600/[0.06] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Top Hero Narrative Header */}
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6 tracking-wide shadow-sm shadow-primary/5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {t('landing.heroBadge')}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-text leading-[1.1] tracking-tight mb-6">
            {t('landing.heroTitle1')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-300 to-primary-hover">
              {t('landing.heroTitle2')}
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto mb-8">
            {t('landing.heroSubtitle')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 mb-8">
            <Button
              to="/register"
              size="lg"
              className="!bg-[#5851E8] hover:!bg-[#4F46E5] text-white shadow-lg shadow-indigo-500/25"
            >
              {t('landing.getStarted')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button href="#interactive-theater" variant="secondary" size="lg">
              {t('landing.seeHowItWorks')}
            </Button>
          </div>

          {/* Trust badges strip */}
          <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {t('landing.trustBadge1') || 'Kognitiv fan asosida'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              {t('landing.trustBadge2') || "O'zbek, Rus va Ingliz tilida"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-indigo-300" />
              {t('landing.trustBadge3') || '24/7 Shaxsiy AI yordamchi'}
            </span>
          </div>
        </div>

        {/* Central Stage: The 4-Chapter Storytelling Slide Theater */}
        <div id="interactive-theater" className="relative scroll-mt-24">
          <StorytellingSlideTheater />
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
