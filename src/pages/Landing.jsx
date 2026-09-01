import HeroSection from '../components/landing/HeroSection';
import TrustSection from '../components/landing/TrustSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import MentorShowcase from '../components/landing/MentorShowcase';
import ProgressShowcase from '../components/landing/ProgressShowcase';
import CTASection from '../components/landing/CTASection';

function Landing() {
  return (
    <>
      <HeroSection />
      <TrustSection />
      <FeaturesSection />
      <HowItWorksSection />
      <MentorShowcase />
      <ProgressShowcase />
      <CTASection />
    </>
  );
}

export default Landing;
