import { Hero } from "@/components/marketing/hero";
import { Problem } from "@/components/marketing/problem";
import { Workflow } from "@/components/marketing/workflow";
import { AgentsGrid } from "@/components/marketing/agents-grid";
import { Pricing } from "@/components/marketing/pricing";
import { CTA } from "@/components/marketing/cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <Workflow />
      <AgentsGrid />
      <Pricing />
      <CTA />
    </>
  );
}
