import { HeroSection } from "./landing/components/hero-section";
import { FeaturesSection } from "./landing/components/features-section";
import { CommandsSection } from "./landing/components/commands-section";
import { DashboardPreviewSection } from "./landing/components/dashboard-preview-section";
import { SourceCodeSection } from "./landing/components/source-code-section";
import { LandingFooter } from "./landing/components/footer";

export function LandingPage() {
  return (
    <div className="bg-background text-foreground selection:bg-primary/30">
      <HeroSection />
      <FeaturesSection />
      <CommandsSection />
      <DashboardPreviewSection />
      <SourceCodeSection />
      <LandingFooter />
    </div>
  );
}
