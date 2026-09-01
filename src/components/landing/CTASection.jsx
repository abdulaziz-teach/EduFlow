import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';

function CTASection() {
  const { t } = useTranslation();

  return (
    <section className="py-16 md:py-24 border-t border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl border border-subtle bg-card p-8 md:p-16 text-center overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-primary/[0.06] rounded-full blur-[80px] pointer-events-none" />

          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
              {t('landing.ctaTitle')}
            </h2>
            <p className="text-muted text-lg leading-relaxed max-w-md mx-auto mb-8">
              {t('landing.ctaSubtitle')}
            </p>
            <Button to="/register" size="lg">
              {t('landing.ctaButton')}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CTASection;
