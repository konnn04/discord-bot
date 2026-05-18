import { HeroSection } from "./landing/components/hero-section";
import { FeaturesSection } from "./landing/components/features-section";
import { SourceCodeSection } from "./landing/components/source-code-section";
import { LandingFooter } from "./landing/components/footer";

export function LandingPage() {
  return (
    <div>
      <HeroSection />
      <FeaturesSection />
      <SourceCodeSection />
      <LandingFooter />
    </div>
  );
}
