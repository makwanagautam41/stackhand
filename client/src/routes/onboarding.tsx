import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { OnboardingWizard } from "@/components/onboarding-wizard";

const search = z.object({ add: z.boolean().optional() });

export const Route = createFileRoute("/onboarding")({
  validateSearch: (s) => search.parse(s),
  component: OnboardingRoute,
});

function OnboardingRoute() {
  const navigate = useNavigate();
  return <OnboardingWizard onDone={() => navigate({ to: "/dashboard" })} />;
}
